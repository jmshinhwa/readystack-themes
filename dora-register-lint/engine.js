// dora-register-lint — the brain. Same file runs in Node (the extension) and in the browser (the free web page).
// Every finding is computed from the file itself: format, ISO 7064 arithmetic, cross-row consistency. Nothing is uploaded, nothing is inferred.
'use strict';
var DOC = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.DORA_RULES;
var RULES = DOC.rules;
var COLS = DOC.columns;
var BY_ID = {};
for (var ri = 0; ri < RULES.length; ri++) BY_ID[RULES[ri].id] = RULES[ri];

// contract_ref must not swallow the "linked / overarching arrangement reference" column
var EXCLUDE = { contract_ref: ['linked', 'overarch', 'parent', 'subcontract', 'sub-contract'] };
var MOJI = /Ã.|â€|Å¡|Â[ºª§]/;

function fmt(id, vars, line) {
  var r = BY_ID[id] || { sev: 'error', msg: id };
  var msg = String(r.msg).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? String(vars[k]) : m; });
  return { check: id, sev: r.sev, msg: msg, line: line || 1 };
}

// ---- CSV ----------------------------------------------------------------
function pickDelim(text) {
  var head = text.split(/\r?\n/)[0] || '', c = 0, s = 0, q = false;
  for (var i = 0; i < head.length; i++) {
    var ch = head.charAt(i);
    if (ch === '"') q = !q;
    else if (!q && ch === ',') c++;
    else if (!q && ch === ';') s++;
  }
  return s > c ? ';' : ',';
}
function parseCsv(text, d) {
  var rows = [], field = '', row = [], q = false, line = 1, start = 1, i, ch, nx;
  for (i = 0; i < text.length; i++) {
    ch = text.charAt(i); nx = text.charAt(i + 1);
    if (q) {
      if (ch === '"' && nx === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else { if (ch === '\n') line++; field += ch; }
      continue;
    }
    if (ch === '"') { q = true; continue; }
    if (ch === d) { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push({ line: start, fields: row }); row = []; field = ''; line++; start = line; continue; }
    field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push({ line: start, fields: row }); }
  return rows.filter(function (r) { return r.fields.join('').trim() !== ''; });
}
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function mapHeader(cells) {
  var n = cells.map(norm), used = {}, map = {};
  Object.keys(COLS).forEach(function (key) {
    var col = COLS[key], ex = EXCLUDE[key] || [];
    for (var h = 0; h < n.length; h++) {
      if (used[h]) continue;
      var blocked = ex.some(function (t) { return n[h].indexOf(norm(t)) >= 0; });
      if (blocked) continue;
      var hit = (col.match || []).some(function (grp) {
        return grp.every(function (tok) { return n[h].indexOf(norm(tok)) >= 0; });
      });
      if (hit) { map[key] = h; used[h] = 1; return; }
    }
  });
  return map;
}

// ---- ISO 7064 MOD 97-10, the check digits inside every LEI (ISO 17442) ---
function mod97(s) {
  var rem = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i), v = /[0-9]/.test(c) ? c : String(c.charCodeAt(0) - 55);
    for (var j = 0; j < v.length; j++) rem = (rem * 10 + (v.charCodeAt(j) - 48)) % 97;
  }
  return rem;
}
function leiCheckDigits(first18) {
  var want = 98 - mod97(first18 + '00');
  return (want < 10 ? '0' : '') + want;
}

// ---- field checks -------------------------------------------------------
function isPlaceholder(v) { return DOC.placeholders.indexOf(String(v).toLowerCase().trim()) >= 0; }
function dateParts(v) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  var y = +m[1], mo = +m[2], d = +m[3], dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== mo || dt.getUTCDate() !== d) return { bad: true };
  return { y: y, m: mo, d: d };
}
function dateStyle(v) {
  if (/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}$/.test(v)) return 'dd/mm/yyyy';
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(v)) return 'yyyy/mm/dd';
  if (/[A-Za-z]/.test(v)) return 'a written month';
  return 'this';
}
function plainAmount(v) {
  var s = String(v).replace(/[^0-9.,\-]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  var m = /-?\d+(\.\d+)?/.exec(s);
  return m ? m[0] : '0';
}

function checkCell(key, val, line, out) {
  var col = COLS[key], label = col.label, v = String(val == null ? '' : val).trim();
  if (col.required && !v) { out.push(fmt('empty_required', { label: label }, line)); return; }
  if (!v) return;
  if (MOJI.test(v)) out.push(fmt('mojibake', { value: v }, line));
  if (col.kind === 'lei') {
    if (isPlaceholder(v)) { out.push(fmt('lei_placeholder', { label: label, value: v }, line)); return; }
    if (v.length !== 20) { out.push(fmt('lei_length', { label: label, value: v, got: v.length }, line)); return; }
    if (!/^[A-Z0-9]{20}$/.test(v)) { out.push(fmt('lei_charset', { label: label, value: v }, line)); return; }
    if (mod97(v) !== 1) out.push(fmt('lei_checksum', { label: label, value: v, want: leiCheckDigits(v.slice(0, 18)), got: v.slice(18) }, line));
  } else if (col.kind === 'date') {
    var p = dateParts(v);
    if (!p) { out.push(fmt('date_format', { label: label, value: v, got: dateStyle(v) }, line)); return; }
    if (p.bad) out.push(fmt('date_impossible', { label: label, value: v }, line));
  } else if (col.kind === 'country') {
    if (!/^[A-Z]{2}$/.test(v)) out.push(fmt('country_shape', { label: label, value: v }, line));
    else if (DOC.iso3166.indexOf(v) < 0) out.push(fmt('country_unknown', { value: v }, line));
  } else if (col.kind === 'currency') {
    if (!/^[A-Z]{3}$/.test(v)) out.push(fmt('currency_shape', { label: label, value: v }, line));
    else if (DOC.iso4217.indexOf(v) < 0) out.push(fmt('currency_unknown', { value: v }, line));
  } else if (col.kind === 'bool') {
    var lv = v.toLowerCase();
    if (DOC.bool_true.indexOf(lv) < 0 && DOC.bool_false.indexOf(lv) < 0) out.push(fmt('bool_token', { label: label, value: v }, line));
  } else if (col.kind === 'amount') {
    if (!/^-?\d+(\.\d+)?$/.test(v)) out.push(fmt('amount_format', { label: label, value: v, want: plainAmount(v) }, line));
  } else if (col.required && isPlaceholder(v)) {
    out.push(fmt('empty_required', { label: label }, line));
  }
}

function check(text, opts) {
  opts = opts || {};
  var today = /^\d{4}-\d{2}-\d{2}$/.test(opts.today || '') ? opts.today : new Date().toISOString().slice(0, 10);
  var out = [];
  var src = String(text == null ? '' : text);
  if (!src.trim()) return { findings: [], rows: 0, today: today };
  var d = pickDelim(src);
  if (d === ';') out.push(fmt('delimiter_not_comma', {}, 1));
  var rows = parseCsv(src, d);
  if (!rows.length) return { findings: out, rows: 0, today: today };
  var head = rows[0], body = rows.slice(1), map = mapHeader(head.fields);
  Object.keys(COLS).forEach(function (key) {
    if (COLS[key].required && map[key] == null) out.push(fmt('missing_column', { label: COLS[key].label }, head.line));
  });
  var refs = {}, seenRow = {}, leiName = {}, r, i;
  for (i = 0; i < body.length; i++) {
    r = body[i];
    if (map.contract_ref != null) {
      var rf = String(r.fields[map.contract_ref] || '').trim();
      if (rf && refs[rf] == null) refs[rf] = r.line;
    }
  }
  for (i = 0; i < body.length; i++) {
    r = body[i];
    if (r.fields.length !== head.fields.length) {
      out.push(fmt('row_field_count', { got: r.fields.length, want: head.fields.length }, r.line));
      continue;
    }
    var joined = r.fields.join('');
    if (seenRow[joined] != null) out.push(fmt('duplicate_row', { other: seenRow[joined] }, r.line));
    else seenRow[joined] = r.line;
    (function (row) {
      Object.keys(map).forEach(function (key) { checkCell(key, row.fields[map[key]], row.line, out); });
    })(r);

    var ref = map.contract_ref != null ? String(r.fields[map.contract_ref] || '').trim() : '';
    if (ref && refs[ref] != null && refs[ref] !== r.line) out.push(fmt('duplicate_contract_ref', { value: ref, other: refs[ref] }, r.line));
    var link = map.linked_ref != null ? String(r.fields[map.linked_ref] || '').trim() : '';
    if (link && !isPlaceholder(link)) {
      if (link === ref) out.push(fmt('self_link', { value: link }, r.line));
      else if (refs[link] == null) out.push(fmt('unresolved_link', { value: link }, r.line));
    }
    var lei = map.provider_lei != null ? String(r.fields[map.provider_lei] || '').trim() : '';
    var nm = map.provider_name != null ? String(r.fields[map.provider_name] || '').trim() : '';
    if (/^[A-Z0-9]{20}$/.test(lei) && nm) {
      if (leiName[lei] && leiName[lei].name.toLowerCase() !== nm.toLowerCase()) {
        out.push(fmt('lei_name_conflict', { value: lei, got: nm, want: leiName[lei].name, other: leiName[lei].line }, r.line));
      } else if (!leiName[lei]) leiName[lei] = { name: nm, line: r.line };
    }
    var sd = map.start_date != null ? String(r.fields[map.start_date] || '').trim() : '';
    var ed = map.end_date != null ? String(r.fields[map.end_date] || '').trim() : '';
    var sp = dateParts(sd), ep = dateParts(ed);
    if (sp && ep && !sp.bad && !ep.bad) {
      if (ed < sd) out.push(fmt('date_order', { got: ed, want: sd }, r.line));
      else if (ed < today) out.push(fmt('contract_expired', { value: ed, want: today }, r.line));
    }
  }
  out.sort(function (a, b) { return (a.line - b.line) || 0; });
  return { findings: out, rows: body.length, columns: Object.keys(map).length, today: today };
}

var DORAENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, leiCheckDigits: leiCheckDigits, mod97: mod97 };
if (typeof module !== 'undefined' && module.exports) module.exports = DORAENGINE;
else window.DORAENGINE = DORAENGINE;
