// pyproject.toml Release Gate — the brain. One file, runs in Node and in the browser.
'use strict';

var DATA = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.PJ_RULES;
var RULES = DATA.rules;
var EOL = DATA.python_eol;
var SPDX_FIX = DATA.spdx_replacements;
var SETUPTOOLS_MIN = DATA.setuptools_spdx_min;

var SPDX_KNOWN = ['MIT', 'MIT-0', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'BSD-4-Clause', 'ISC', 'MPL-2.0',
  'GPL-2.0-only', 'GPL-2.0-or-later', 'GPL-3.0-only', 'GPL-3.0-or-later', 'LGPL-2.1-only', 'LGPL-2.1-or-later',
  'LGPL-3.0-only', 'LGPL-3.0-or-later', 'AGPL-3.0-only', 'AGPL-3.0-or-later', 'Unlicense', 'CC0-1.0', 'CC-BY-4.0',
  'CC-BY-SA-4.0', 'Zlib', 'PSF-2.0', 'Python-2.0', 'BSL-1.0', 'EPL-2.0', 'Artistic-2.0', 'PostgreSQL', 'OFL-1.1',
  'Apache-2.0-WITH-LLVM-exception', 'LicenseRef-Proprietary'];

function byId(id) { for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i]; return { id: id, sev: 'error', fix: '' }; }
function days(fromISO, toISO) { return Math.round((Date.parse(toISO + 'T00:00:00Z') - Date.parse(fromISO + 'T00:00:00Z')) / 86400000); }
function verKey(v) { var p = String(v).split('.'); return parseInt(p[0], 10) * 1000 + (parseInt(p[1], 10) || 0); }
function eolVersions() { var out = []; for (var k in EOL) if (EOL.hasOwnProperty(k)) out.push(k); out.sort(function (a, b) { return verKey(a) - verKey(b); }); return out; }

// Recommend the lowest listed Python that still has at least a year of upstream security support left.
function recommendFloor(today) {
  var vs = eolVersions();
  for (var i = 0; i < vs.length; i++) if (days(today, EOL[vs[i]]) >= 365) return vs[i];
  return vs[vs.length - 1];
}

// A deliberately line-oriented reader: enough to see every [project] key, small enough to run in a browser tab.
function parse(text) {
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var tables = {};              // table name -> { key: {raw, line} }
  var order = [];
  var table = '';
  var pending = null;           // multi-line array/inline table being collected
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    var line = raw.replace(/(^|\s)#(?![^"']*["'][^"']*$).*$/, '').trim();
    if (pending) {
      pending.raw += ' ' + line;
      if (balanced(pending.raw)) { store(pending.table, pending.key, pending.raw, pending.line); pending = null; }
      continue;
    }
    if (!line) continue;
    var th = line.match(/^\[\[?([^\]]+)\]\]?/);
    if (th) { table = th[1].trim(); if (order.indexOf(table) < 0) order.push(table); if (!tables[table]) tables[table] = { __line: i + 1 }; continue; }
    var kv = line.match(/^["']?([A-Za-z0-9_.-]+)["']?\s*=\s*(.*)$/);
    if (!kv) continue;
    if (!balanced(kv[2])) { pending = { table: table, key: kv[1], raw: kv[2], line: i + 1 }; continue; }
    store(table, kv[1], kv[2], i + 1);
  }
  function store(t, k, v, ln) { if (!tables[t]) { tables[t] = { __line: ln }; if (order.indexOf(t) < 0) order.push(t); } tables[t][k] = { raw: String(v).trim(), line: ln }; }
  function balanced(s) {
    var d = 0, q = null;
    for (var j = 0; j < s.length; j++) {
      var c = s[j];
      if (q) { if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '[' || c === '{') d++;
      if (c === ']' || c === '}') d--;
    }
    return d <= 0 && !q;
  }
  return { tables: tables, order: order, lines: lines };
}

function get(doc, table, key) { var t = doc.tables[table]; return (t && t[key]) ? t[key] : null; }
function strval(cell) { if (!cell) return null; var m = cell.raw.match(/^["'](.*)["']\s*,?$/); return m ? m[1] : null; }
function arrval(cell) {
  if (!cell) return [];
  var out = [], re = /["']([^"']*)["']/g, m;
  while ((m = re.exec(cell.raw))) out.push(m[1]);
  return out;
}
function isTable(cell) { return !!cell && /^\{/.test(cell.raw); }

// ">=3.9,<4" -> {floor:"3.9", cap:"4"}
function pyBounds(spec) {
  var floor = null, cap = null;
  var re = /(>=|>|~=|==|<=|<)\s*([0-9]+(?:\.[0-9]+)?)/g, m;
  while ((m = re.exec(spec))) {
    var op = m[1], v = m[2];
    if (op === '>=' || op === '~=' || op === '==') { if (!floor || verKey(v) < verKey(floor)) floor = v; }
    else if (op === '>') { var bumped = bumpMinor(v); if (!floor || verKey(bumped) < verKey(floor)) floor = bumped; }
    else if (op === '<' || op === '<=') { if (!cap || verKey(v) > verKey(cap)) cap = v; }
  }
  return { floor: floor, cap: cap, capOp: /<=?/.test(spec) ? (spec.indexOf('<=') >= 0 ? '<=' : '<') : null };
}
function bumpMinor(v) { var p = String(v).split('.'); return p[0] + '.' + ((parseInt(p[1], 10) || 0) + 1); }

function pinnedSetuptools(reqs) {
  for (var i = 0; i < reqs.length; i++) {
    var m = reqs[i].match(/^\s*setuptools\s*(?:\[[^\]]*\])?\s*(.*)$/i);
    if (!m) continue;
    var sp = m[1] || '';
    var lo = sp.match(/>=\s*([0-9][0-9.]*)/);
    var eq = sp.match(/==\s*([0-9][0-9.]*)/);
    var cap = sp.match(/<\s*([0-9][0-9.]*)/);
    return { spec: reqs[i].trim(), lo: lo ? lo[1] : (eq ? eq[1] : null), cap: cap ? cap[1] : null, any: !sp.trim() };
  }
  return null;
}
function major(v) { return parseInt(String(v).split('.')[0], 10) || 0; }

function check(text, opts) {
  opts = opts || {};
  var today = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today || '')) ? opts.today : new Date().toISOString().slice(0, 10);
  var doc = parse(text);
  var F = [];
  function add(id, msg, line) { var r = byId(id); F.push({ check: id, sev: r.sev, msg: msg + (r.fix ? ' → ' + r.fix : ''), line: line || 1, spec: r.spec || '' }); }

  var proj = doc.tables['project'];
  if (!proj) {
    add('project_table_missing', 'This pyproject.toml has no [project] table, so the build back end takes its metadata from somewhere else (setup.py, setup.cfg) and nothing here is authoritative.', 1);
    return { findings: F, today: today, rule_count: RULES.length };
  }

  // --- build-system -------------------------------------------------------
  var bs = doc.tables['build-system'];
  var bsReq = get(doc, 'build-system', 'requires');
  if (!bs || !bsReq) add('build_system_missing', 'No [build-system] requires, so pip guesses a legacy setuptools build and your wheel metadata depends on whatever setuptools the machine happens to have.', bs ? bs.__line : 1);

  // --- requires-python ----------------------------------------------------
  var rpCell = get(doc, 'project', 'requires-python');
  var rp = strval(rpCell);
  var floorRec = recommendFloor(today);
  var bounds = rp ? pyBounds(rp) : { floor: null, cap: null };
  if (!rp) {
    add('requires_python_missing', 'No requires-python, so pip will install this on interpreters you have never tested, including ones past end of life.', proj.__line);
  } else {
    if (bounds.floor && EOL[bounds.floor]) {
      var d = days(EOL[bounds.floor], today);
      if (d > 0) add('requires_python_eol', 'requires-python = "' + rp + '" still promises Python ' + bounds.floor + ', whose upstream security support ended ' + EOL[bounds.floor] + ' — ' + d + ' days before ' + today + '. The lowest floor with a year of support left is ' + floorRec + '.', rpCell.line);
      else if (-d <= 365) add('requires_python_eol_soon', 'requires-python = "' + rp + '" floors at Python ' + bounds.floor + ', which reaches end of life ' + EOL[bounds.floor] + ' — ' + (-d) + ' days after ' + today + '.', rpCell.line);
    }
    if (bounds.cap) add('requires_python_upper_cap', 'requires-python = "' + rp + '" caps the interpreter at ' + bounds.cap + '. On the next Python release, resolvers will silently pick an older version of your package, or none.', rpCell.line);
  }

  // --- classifiers --------------------------------------------------------
  var clsCell = get(doc, 'project', 'classifiers');
  var cls = arrval(clsCell);
  var licClassifiers = [];
  for (var i = 0; i < cls.length; i++) {
    var c = cls[i];
    var pv = c.match(/^Programming Language :: Python :: ([0-9]+\.[0-9]+)$/);
    if (pv) {
      var v = pv[1];
      if (EOL[v] && days(EOL[v], today) > 0) add('classifier_python_eol', 'Classifier "' + c + '" tells PyPI you support Python ' + v + ', which went end of life ' + EOL[v] + '.', clsCell.line);
      if (bounds.floor && verKey(v) < verKey(bounds.floor)) add('classifier_python_mismatch', 'Classifier "' + c + '" advertises Python ' + v + ' but requires-python = "' + rp + '" refuses it, so pip and your PyPI page disagree.', clsCell.line);
    }
    if (/^License :: /.test(c)) licClassifiers.push(c);
  }
  if (!clsCell) { /* classifiers are optional; no rule fires */ }

  // --- licence (PEP 639) ---------------------------------------------------
  var licCell = get(doc, 'project', 'license');
  var licStr = strval(licCell);
  var lfCell = get(doc, 'project', 'license-files');
  if (isTable(licCell)) {
    var kind = /file\s*=/.test(licCell.raw) ? 'file' : 'text';
    add('license_table_deprecated', 'license = { ' + kind + ' = ... } is the pre-PEP-639 form. setuptools ' + SETUPTOOLS_MIN + ' and later deprecate it, and the wheel it produces carries no SPDX expression for tools to read.', licCell.line);
  }
  if (licClassifiers.length) {
    if (licStr) add('license_classifier_conflict', 'Both license = "' + licStr + '" and ' + licClassifiers.length + ' License :: classifier' + (licClassifiers.length === 1 ? '' : 's') + ' ("' + licClassifiers[0] + '") are present. Under PEP 639 setuptools refuses that combination and the build stops.', clsCell.line);
    else add('license_classifier_deprecated', licClassifiers.length + ' License :: classifier' + (licClassifiers.length === 1 ? '' : 's') + ' ("' + licClassifiers[0] + '") carry the licence. PEP 639 deprecates them in favour of an SPDX expression.', clsCell.line);
  }
  if (licStr) {
    var expr = licStr.trim();
    if (/(^|\s)(and|or|with)(\s|$)/.test(expr)) add('spdx_operator_case', 'license = "' + expr + '" uses a lower-case operator. SPDX expressions only accept AND, OR and WITH in upper case, so this expression does not parse.', licCell.line);
    var atoms = expr.replace(/[()]/g, ' ').split(/\s+(?:AND|OR|WITH|and|or|with)\s+/);
    for (var a = 0; a < atoms.length; a++) {
      var at = atoms[a].trim().replace(/\+$/, '');
      if (!at) continue;
      var fixKey = SPDX_FIX[at] ? at : (SPDX_FIX[at.toUpperCase()] ? at.toUpperCase() : null);
      if (fixKey) add('license_expression_not_spdx', 'license = "' + expr + '" uses "' + at + '", which is not a current SPDX identifier. Use ' + SPDX_FIX[fixKey] + '.', licCell.line);
      else if (SPDX_KNOWN.indexOf(at) < 0 && !/^LicenseRef-[A-Za-z0-9.-]+$/.test(at)) add('license_expression_not_spdx', 'license = "' + expr + '" contains "' + at + '", which is not on the SPDX licence list, so PyPI cannot validate the expression.', licCell.line);
    }
  }
  var lf = arrval(lfCell);
  for (var k = 0; k < lf.length; k++) {
    if (/^[\\/]/.test(lf[k]) || lf[k].indexOf('..') >= 0 || /^[A-Za-z]:/.test(lf[k])) add('license_files_invalid_pattern', 'license-files entry "' + lf[k] + '" is not a relative glob inside the project. PEP 639 rejects absolute paths and parent traversal.', lfCell.line);
  }
  if (licStr && bsReq) {
    var st = pinnedSetuptools(arrval(bsReq));
    if (st && (st.any || (st.lo && major(st.lo) < major(SETUPTOOLS_MIN)) || (st.cap && major(st.cap) <= major(SETUPTOOLS_MIN)))) {
      add('setuptools_too_old_for_spdx', 'license = "' + licStr + '" needs setuptools ' + SETUPTOOLS_MIN + '+, but [build-system] requires says "' + st.spec + '". A fresh build box can resolve an older setuptools that drops the field.', bsReq.line);
    }
  }

  // --- dynamic vs static ---------------------------------------------------
  var dynCell = get(doc, 'project', 'dynamic');
  var dyn = arrval(dynCell);
  for (var y = 0; y < dyn.length; y++) {
    var f = dyn[y];
    if (get(doc, 'project', f)) add('dynamic_version_conflict', '"' + f + '" is listed in dynamic and also set statically on line ' + get(doc, 'project', f).line + '. PEP 621 makes that a hard build error.', dynCell.line);
  }

  // --- name, readme, urls ---------------------------------------------------
  var nameCell = get(doc, 'project', 'name');
  var name = strval(nameCell);
  if (name) {
    var norm = name.toLowerCase().replace(/[-_.]+/g, '-');
    if (norm !== name) add('project_name_not_normalized', 'name = "' + name + '" normalises to "' + norm + '" on PyPI, so the page, the install command and your docs can all disagree.', nameCell.line);
  }
  if (!get(doc, 'project', 'readme')) add('readme_missing', 'No readme, so the project page on PyPI opens with an empty description.', proj.__line);
  if (!doc.tables['project.urls']) add('urls_missing', 'No [project.urls], so the PyPI sidebar has no Source, Issues or Changelog link.', proj.__line);

  F.sort(function (p, q) { return (p.line || 0) - (q.line || 0); });
  return { findings: F, today: today, rule_count: RULES.length };
}

var PJENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, parse: parse };
if (typeof module !== 'undefined' && module.exports) module.exports = PJENGINE;
else window.PJENGINE = PJENGINE;
