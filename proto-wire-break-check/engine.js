// Proto Wire Break Check - one brain, used by the VS Code extension and by the free web page.
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.PWB_RULES;

var PWB_BY_ID = {};
for (var pwb_i = 0; pwb_i < RULES.length; pwb_i++) { PWB_BY_ID[RULES[pwb_i].id] = RULES[pwb_i]; }

var PWB_SCALAR = { double: 1, float: 1, int32: 1, int64: 1, uint32: 1, uint64: 1, sint32: 1, sint64: 1,
  fixed32: 1, fixed64: 1, sfixed32: 1, sfixed64: 1, bool: 1, string: 1, bytes: 1 };

// Names where "absent" and "zero/false/empty" mean different things to the reader.
var PWB_PRESENCE_HINT = /(^is_|^has_|^id$|_id$|_enabled$|_count$|_amount$|_cents$|_price$|_total$|_at$|_quantity$|_score$|_percent$)/;

var PWB_MAX_FIELD = 536870911;
var PWB_GAP_MAX = 16;          // a hole wider than this is a deliberate block allocation, not a deleted field

var PWB_FIELD_RE = /^\s*(repeated\s+|optional\s+|required\s+)?(map\s*<[^>]*>|\.?[A-Za-z_][\w.]*)\s+([A-Za-z_]\w*)\s*=\s*(\d+)\s*(\[[^\]]*\])?\s*;/;
var PWB_ENUMV_RE = /^\s*([A-Za-z_]\w*)\s*=\s*(-?\d+)\s*(\[[^\]]*\])?\s*;/;
var PWB_OPEN_RE  = /^\s*(message|enum|oneof|service|extend)\b\s*([A-Za-z_]\w*)?/;

function pwbCamel(n) {
  return n.replace(/_+([a-zA-Z0-9])/g, function (m, c) { return c.toUpperCase(); }).replace(/_/g, '');
}

function pwbStripComments(raw) {
  var out = [], inBlock = false;
  for (var i = 0; i < raw.length; i++) {
    var s = raw[i];
    if (inBlock) {
      var e = s.indexOf('*/');
      if (e < 0) { out.push(''); continue; }
      s = s.slice(e + 2); inBlock = false;
    }
    var b = s.indexOf('/*');
    while (b >= 0) {
      var e2 = s.indexOf('*/', b + 2);
      if (e2 < 0) { s = s.slice(0, b); inBlock = true; break; }
      s = s.slice(0, b) + ' ' + s.slice(e2 + 2);
      b = s.indexOf('/*');
    }
    var c = s.indexOf('//');
    if (c >= 0) s = s.slice(0, c);
    out.push(s);
  }
  return out;
}

function pwbBlock(kind, name, line) {
  return { kind: kind, name: name || '(anonymous)', line: line,
    fields: {}, fnames: {}, jnames: {}, nums: [],
    resNums: {}, resRanges: [], resNames: {},
    enumVals: [], enumNums: {}, allowAlias: false };
}

function pwbReserved(b, n) {
  if (b.resNums[n]) return true;
  for (var i = 0; i < b.resRanges.length; i++) {
    if (n >= b.resRanges[i][0] && n <= b.resRanges[i][1]) return true;
  }
  return false;
}

function pwbReadReserved(b, line) {
  var m = line.match(/^\s*reserved\s+(.+?);/);
  if (!m) return false;
  var body = m[1];
  var names = body.match(/"([^"]+)"|'([^']+)'/g);
  if (names) {
    for (var i = 0; i < names.length; i++) { b.resNames[names[i].replace(/^["']|["']$/g, '')] = true; }
  }
  var parts = body.split(',');
  for (var j = 0; j < parts.length; j++) {
    var p = parts[j].trim();
    var rg = p.match(/^(\d+)\s+to\s+(\d+|max)$/);
    if (rg) { b.resRanges.push([parseInt(rg[1], 10), rg[2] === 'max' ? PWB_MAX_FIELD : parseInt(rg[2], 10)]); continue; }
    if (/^\d+$/.test(p)) b.resNums[parseInt(p, 10)] = true;
  }
  return true;
}

function pwbGaps(nums) {
  var s = nums.slice().sort(function (a, b) { return a - b; });
  var runs = [], i, n;
  if (s.length < 2) return runs;
  for (i = 0; i < s.length - 1; i++) {
    var lo = s[i] + 1, hi = s[i + 1] - 1;
    if (hi < lo) continue;
    runs.push([lo, hi, s[i + 1]]);
  }
  return runs;
}

function check(text, opts) {
  opts = opts || {};
  var lines = pwbStripComments(String(text == null ? '' : text).split(/\r?\n/));
  var findings = [];
  function add(id, line, msg) {
    var r = PWB_BY_ID[id] || {};
    findings.push({ check: id, sev: r.sev || 'warn', msg: msg, line: line });
  }

  var syntax = '', hasPackage = false;
  var depth = 0, blocks = {}, pending = null, closed = [];

  function nearestMessage() {
    for (var d = depth; d >= 1; d--) { if (blocks[d] && blocks[d].kind === 'message') return blocks[d]; }
    return null;
  }
  function inOneof() {
    for (var d = depth; d >= 1; d--) {
      if (blocks[d] && blocks[d].kind === 'oneof') return true;
      if (blocks[d] && blocks[d].kind === 'message') return false;
    }
    return false;
  }

  for (var li = 0; li < lines.length; li++) {
    var line = lines[li], ln = li + 1;
    if (!line.trim()) continue;

    var sm = line.match(/^\s*syntax\s*=\s*["']([^"']+)["']/);
    if (sm) { syntax = sm[1]; continue; }
    if (/^\s*package\s+[\w.]+\s*;/.test(line)) { hasPackage = true; continue; }

    var opens = (line.match(/\{/g) || []).length;
    var closes = (line.match(/\}/g) || []).length;

    if (opens > 0) {
      var om = line.match(PWB_OPEN_RE);
      if (om) pending = { kind: om[1], name: om[2], line: ln };
    }

    if (opens === 0 && closes === 0) {
      var cur = blocks[depth] || null;
      if (cur && pwbReadReserved(cur, line)) continue;

      if (cur && cur.kind === 'enum') {
        if (/^\s*option\s+allow_alias\s*=\s*true/.test(line)) { cur.allowAlias = true; continue; }
        var ev = line.match(PWB_ENUMV_RE);
        if (ev) {
          var vn = ev[1], vnum = parseInt(ev[2], 10);
          if (cur.enumVals.length === 0 && syntax === 'proto3' && vnum !== 0) {
            add('enum_first_not_zero', ln, 'Enum ' + cur.name + ' opens with ' + vn + ' = ' + vnum + '. In proto3 the first value must be 0, so every message that leaves this enum unset decodes as ' + vn + ' instead of "unspecified".');
          }
          if (cur.enumNums[vnum] !== undefined && !cur.allowAlias) {
            add('enum_dup_number_no_alias', ln, vn + ' and ' + cur.enumNums[vnum].name + ' (line ' + cur.enumNums[vnum].line + ') both use number ' + vnum + ' in ' + cur.name + ' without option allow_alias = true, so the two states are the same byte on the wire.');
          }
          if (pwbReserved(cur, vnum)) {
            add('reserved_number_reused', ln, 'Enum number ' + vnum + ' is reserved in ' + cur.name + '; a reader built before the deletion still reads that byte as the old state.');
          }
          if (cur.resNames[vn]) {
            add('reserved_name_reused', ln, 'Enum value name "' + vn + '" is reserved in ' + cur.name + ' and cannot be brought back.');
          }
          if (cur.enumNums[vnum] === undefined) cur.enumNums[vnum] = { name: vn, line: ln };
          cur.enumVals.push({ name: vn, num: vnum, line: ln });
          continue;
        }
      }

      var mb = nearestMessage();
      var fm = line.match(PWB_FIELD_RE);
      if (mb && fm) {
        var mod = (fm[1] || '').trim(), type = fm[2].trim(), name = fm[3], num = parseInt(fm[4], 10), o = fm[5] || '';

        if (num >= 19000 && num <= 19999) {
          add('internal_range_19000', ln, 'Field number ' + num + ' on "' + name + '" sits in 19000-19999, the range protobuf keeps for itself; protoc refuses to compile it.');
        } else if (num === 0) {
          add('field_number_over_max', ln, 'Field number 0 on "' + name + '" is not a legal tag - field numbers start at 1.');
        } else if (num > PWB_MAX_FIELD) {
          add('field_number_over_max', ln, 'Field number ' + num + ' on "' + name + '" is above the maximum ' + PWB_MAX_FIELD + '.');
        }

        if (mb.fields[num] !== undefined) {
          add('field_number_reuse', ln, 'Field number ' + num + ' already belongs to "' + mb.fields[num].name + '" on line ' + mb.fields[num].line + ' of ' + mb.name + '. One tag, two fields: a reader decodes "' + name + '" into ' + mb.fields[num].name + ' and never errors.');
        } else {
          mb.fields[num] = { name: name, line: ln };
          mb.nums.push(num);
        }
        if (pwbReserved(mb, num)) {
          add('reserved_number_reused', ln, 'Field number ' + num + ' is reserved in ' + mb.name + ', so it belonged to a deleted field. Every reader older than that deletion decodes tag ' + num + ' as the old type.');
        }
        if (mb.resNames[name]) {
          add('reserved_name_reused', ln, 'Field name "' + name + '" is reserved in ' + mb.name + '. Reusing it silently re-points old JSON payloads and generated accessors at new data.');
        }
        if (mb.fnames[name] !== undefined) {
          add('dup_field_name', ln, 'Field name "' + name + '" is already declared on line ' + mb.fnames[name] + ' of ' + mb.name + '; protoc rejects the file.');
        } else {
          mb.fnames[name] = ln;
        }
        var jm = o.match(/json_name\s*=\s*["']([^"']+)["']/);
        var jn = jm ? jm[1] : pwbCamel(name);
        if (mb.jnames[jn] !== undefined && mb.jnames[jn].name !== name) {
          add('json_name_collision', ln, '"' + name + '" and "' + mb.jnames[jn].name + '" (line ' + mb.jnames[jn].line + ') both serialise to the JSON key "' + jn + '" in ' + mb.name + ', so JSON transcoding loses one of them.');
        } else if (mb.jnames[jn] === undefined) {
          mb.jnames[jn] = { name: name, line: ln };
        }
        if (mod === 'required') {
          add('proto2_required', ln, '"' + name + '" is required. A required field can never be deleted or made optional later without breaking every reader that already validates it.');
        }
        if (syntax === 'proto3' && /\bdefault\s*=/.test(o)) {
          add('proto3_default_value', ln, '"' + name + '" carries a proto2 default option, which proto3 does not support; the generated reader returns the type zero instead of the value written here.');
        }
        if (mod === 'repeated' && PWB_SCALAR[type] && /\bpacked\s*=\s*false\b/.test(o)) {
          add('packed_explicit_override', ln, 'repeated ' + type + ' "' + name + '" turns packing off, which writes a different byte layout than the proto3 default for the same values.');
        }
        if (syntax === 'proto3' && !mod && PWB_SCALAR[type] && !inOneof() && PWB_PRESENCE_HINT.test(name)) {
          add('presence_sensitive_no_optional', ln, '"' + name + '" is a bare proto3 ' + type + ', so the reader cannot tell "not sent" from ' + (type === 'string' ? '""' : (type === 'bool' ? 'false' : '0')) + '. Mark it optional before a client starts omitting it.');
        }
        continue;
      }
      continue;
    }

    for (var oi = 0; oi < opens; oi++) {
      depth++;
      blocks[depth] = pending ? pwbBlock(pending.kind, pending.name, pending.line) : pwbBlock('other', null, ln);
      pending = null;
    }
    for (var ci = 0; ci < closes; ci++) {
      if (blocks[depth]) { closed.push(blocks[depth]); delete blocks[depth]; }
      if (depth > 0) depth--;
    }
  }

  for (var bi = 0; bi < closed.length; bi++) {
    var b = closed[bi];
    if (b.kind === 'message') {
      var runs = pwbGaps(b.nums);
      for (var ri = 0; ri < runs.length; ri++) {
        var lo = runs[ri][0], hi = runs[ri][1], nextNum = runs[ri][2];
        if (hi - lo + 1 > PWB_GAP_MAX) continue;
        var open = [];
        for (var n = lo; n <= hi; n++) { if (!pwbReserved(b, n)) open.push(n); }
        if (!open.length) continue;
        add('unreserved_field_gap', b.fields[nextNum] ? b.fields[nextNum].line : b.line,
          'Message ' + b.name + ' skips field ' + (open.length === 1 ? ('number ' + open[0]) : ('numbers ' + open[0] + '-' + open[open.length - 1])) + ' with no reserved statement. If a field was deleted there, the next edit will hand that tag to new data while old readers keep the old type.');
      }
    } else if (b.kind === 'enum') {
      var enums = [];
      for (var k in b.enumNums) { if (Object.prototype.hasOwnProperty.call(b.enumNums, k)) enums.push(parseInt(k, 10)); }
      var eruns = pwbGaps(enums);
      for (var ei = 0; ei < eruns.length; ei++) {
        var elo = eruns[ei][0], ehi = eruns[ei][1], enext = eruns[ei][2];
        if (ehi - elo + 1 > PWB_GAP_MAX) continue;
        var eopen = [];
        for (var m2 = elo; m2 <= ehi; m2++) { if (!pwbReserved(b, m2)) eopen.push(m2); }
        if (!eopen.length) continue;
        add('enum_unreserved_gap', b.enumNums[enext] ? b.enumNums[enext].line : b.line,
          'Enum ' + b.name + ' skips ' + (eopen.length === 1 ? ('number ' + eopen[0]) : ('numbers ' + eopen[0] + '-' + eopen[eopen.length - 1])) + ' with no reserved statement, so a removed state can be reissued with a new meaning on the same byte.');
      }
    }
  }

  if (!syntax) add('missing_syntax', 1, 'No syntax declaration, so protoc compiles this file as proto2: field presence, defaults and enum rules all change under you.');
  if (!hasPackage) add('missing_package', 1, 'No package declaration. Two files that both define a top-level name collide when they are linked into the same binary.');

  findings.sort(function (a, b2) { return (a.line - b2.line) || (a.check < b2.check ? -1 : 1); });

  var errors = 0, warns = 0;
  for (var fi = 0; fi < findings.length; fi++) { if (findings[fi].sev === 'error') errors++; else warns++; }

  return { findings: findings, errors: errors, warnings: warns,
    ok: findings.length === 0, rule_count: RULES.length, today: opts.today || '' };
}

var PWB_API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof window !== 'undefined') { window.PWBENGINE = PWB_API; }
if (typeof module !== 'undefined' && module.exports) { module.exports = PWB_API; }
