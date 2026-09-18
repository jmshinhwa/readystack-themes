/* Cargo.toml Publish Gate - crates.io
   Same brain in VS Code and in the browser. No dependencies. */
var RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : window.CARGO_RULES;

var RULE_COUNT = RULES.length;

function rule(id) {
  for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i];
  return { id: id, sev: 'warn', msg: id };
}

/* --- tiny TOML reader: enough for a Cargo manifest ------------------ */

function stripComment(line) {
  var out = '', q = null;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (q) { out += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; out += c; continue; }
    if (c === '#') break;
    out += c;
  }
  return out;
}

function unquote(v) {
  v = String(v == null ? '' : v).trim();
  if (v.length > 1 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) {
    return v.slice(1, -1);
  }
  return v;
}

function parseArray(v) {
  v = String(v).trim();
  if (v[0] !== '[') return null;
  var inner = v.slice(1, v.lastIndexOf(']'));
  var items = [], cur = '', q = null;
  for (var i = 0; i < inner.length; i++) {
    var c = inner[i];
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === ',') { items.push(cur); cur = ''; continue; }
    cur += c;
  }
  items.push(cur);
  var out = [];
  for (var j = 0; j < items.length; j++) {
    var s = unquote(items[j]);
    if (s !== '') out.push(s);
  }
  return out;
}

/* inline table  { version = "1", path = "../x" }  ->  {version:"1", path:"../x"} */
function parseInline(v) {
  var spec = {};
  var inner = String(v).trim();
  inner = inner.slice(1, inner.lastIndexOf('}'));
  var parts = [], cur = '', q = null, depth = 0;
  for (var i = 0; i < inner.length; i++) {
    var c = inner[i];
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  for (var j = 0; j < parts.length; j++) {
    var eq = parts[j].indexOf('=');
    if (eq < 0) continue;
    spec[parts[j].slice(0, eq).trim()] = parts[j].slice(eq + 1).trim();
  }
  return spec;
}

function depKind(section) {
  if (section.indexOf('dev-dependencies') >= 0) return 'dev';
  if (section.indexOf('build-dependencies') >= 0) return 'build';
  return 'normal';
}

function parse(text) {
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var section = '';
  var pkg = {};          /* field -> {value, line} */
  var pkgSeen = false;
  var deps = [];         /* {name, kind, line, spec} */
  var subDep = null;

  for (var i = 0; i < lines.length; i++) {
    var raw = stripComment(lines[i]);
    var line = i + 1;
    var t = raw.trim();
    if (t === '') continue;

    var head = t.match(/^\[\[?([^\]]+)\]\]?$/);
    if (head) {
      section = head[1].trim().replace(/["']/g, '');
      subDep = null;
      if (section === 'package') pkgSeen = true;
      var sub = section.match(/(^|\.)(dev-|build-)?dependencies\.(.+)$/);
      if (sub) {
        subDep = { name: sub[3], kind: depKind(section), line: line, spec: {} };
        deps.push(subDep);
      }
      continue;
    }

    var kv = t.match(/^([A-Za-z0-9_.\-"']+)\s*=\s*(.*)$/);
    if (!kv) continue;
    var key = kv[1].replace(/["']/g, '');
    var val = kv[2].trim();

    /* keep multi-line arrays / inline tables together */
    var open = (val.match(/[\[{]/g) || []).length;
    var close = (val.match(/[\]}]/g) || []).length;
    var j = i;
    while (open > close && j + 1 < lines.length) {
      j++;
      var more = stripComment(lines[j]);
      val += ' ' + more.trim();
      open += (more.match(/[\[{]/g) || []).length;
      close += (more.match(/[\]}]/g) || []).length;
    }
    i = j;

    if (subDep) { subDep.spec[key] = val; continue; }

    if (section === 'package') {
      var field = key.split('.')[0];
      if (!pkg[field]) pkg[field] = { value: val, line: line, key: key };
      continue;
    }

    if (/(^|\.)(dev-|build-)?dependencies$/.test(section)) {
      var spec = {};
      if (val[0] === '{') spec = parseInline(val);
      else spec.version = val;
      deps.push({ name: key, kind: depKind(section), line: line, spec: spec });
    }
  }

  return { pkg: pkg, pkgSeen: pkgSeen, deps: deps };
}

/* --- the gate ------------------------------------------------------- */

function check(text, opts) {
  opts = opts || {};
  var m = parse(text);
  var f = [];
  function add(id, line, extra) {
    var r = rule(id);
    f.push({ check: r.id, sev: r.sev, msg: extra ? r.msg + ' ' + extra : r.msg, line: line });
  }

  if (m.pkgSeen) {
    var pkgLine = 1;
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '[package]') { pkgLine = i + 1; break; }
    }
    var has = function (k) { return !!m.pkg[k]; };

    if (!has('description')) add('missing_description', pkgLine);
    if (!has('license') && !has('license-file')) add('missing_license', pkgLine);
    if (!has('repository')) add('missing_repository', pkgLine);
    if (!has('readme')) add('missing_readme', pkgLine);

    var ed = m.pkg['edition'];
    if (!ed) add('edition_missing_or_2015', pkgLine);
    else if (unquote(ed.value) === '2015') add('edition_missing_or_2015', ed.line);

    var ver = m.pkg['version'];
    if (ver && unquote(ver.value) === '0.0.0') add('version_zero', ver.line);

    var pub = m.pkg['publish'];
    if (pub && /^false$/i.test(unquote(pub.value).trim())) add('publish_false', pub.line);

    var kw = m.pkg['keywords'];
    if (kw) {
      var ks = parseArray(kw.value) || [];
      var maxK = rule('too_many_keywords').max;
      if (ks.length > maxK) add('too_many_keywords', kw.line, '(' + ks.length + ' listed)');
      var maxLen = rule('keyword_too_long').max_len;
      for (var k = 0; k < ks.length; k++) {
        if (ks[k].length > maxLen) add('keyword_too_long', kw.line, '("' + ks[k] + '")');
      }
    }

    var cat = m.pkg['categories'];
    if (cat) {
      var cs = parseArray(cat.value) || [];
      if (cs.length > rule('too_many_categories').max) {
        add('too_many_categories', cat.line, '(' + cs.length + ' listed)');
      }
    }
  }

  for (var d = 0; d < m.deps.length; d++) {
    var dep = m.deps[d];
    var s = dep.spec || {};
    var v = s.version ? unquote(s.version) : '';
    if (v === '*') add('wildcard_dep', dep.line, '[' + dep.name + ']');
    if (s.git && dep.kind !== 'dev') add('git_dep', dep.line, '[' + dep.name + ']');
    if (s.path && !s.version && dep.kind !== 'dev') {
      add('path_dep_no_version', dep.line, '[' + dep.name + ']');
    }
  }

  f.sort(function (a, b) { return a.line - b.line; });
  return { findings: f };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULE_COUNT };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.CARGOGATE = API;
