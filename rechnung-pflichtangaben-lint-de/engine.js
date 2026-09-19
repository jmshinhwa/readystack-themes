// Rechnung Pflichtangaben Lint — das Gehirn. Dieselbe Datei läuft in Node und im Browser.
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.RPL_RULES;

function rx(p) { return new RegExp(p, 'i'); }
function anyMatch(text, pats) {
  pats = pats || [];
  for (var i = 0; i < pats.length; i++) { if (rx(pats[i]).test(text)) return true; }
  return false;
}
function firstLine(lines, pats) {
  pats = pats || [];
  for (var i = 0; i < lines.length; i++) {
    for (var j = 0; j < pats.length; j++) { if (rx(pats[j]).test(lines[i])) return i + 1; }
  }
  return 1;
}
function hitLines(lines, pats) {
  pats = pats || []; var hits = [];
  for (var i = 0; i < lines.length; i++) {
    for (var j = 0; j < pats.length; j++) {
      if (rx(pats[j]).test(lines[i])) { hits.push(i + 1); break; }
    }
  }
  return hits;
}
function message(r) { return r.msg + ' → ' + r.fix + ' [' + r.law + ']'; }

function check(text, opts) {
  text = String(text == null ? '' : text);
  var lines = text.split(/\r?\n/);
  var findings = [];
  function add(r, line) { findings.push({ check: r.id, sev: r.sev || 'error', msg: message(r), line: line || 1, law: r.law }); }
  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i], hits;
    if (r.kind === 'require') {
      if (!anyMatch(text, r.any)) add(r, 1);
    } else if (r.kind === 'require_when') {
      if (anyMatch(text, r.when) && !anyMatch(text, r.any)) add(r, firstLine(lines, r.when));
    } else if (r.kind === 'forbid') {
      hits = hitLines(lines, r.bad);
      for (var k = 0; k < hits.length; k++) add(r, hits[k]);
    } else if (r.kind === 'forbid_when') {
      if (anyMatch(text, r.when)) {
        hits = hitLines(lines, r.bad);
        if (hits.length) add(r, hits[0]);
      }
    }
  }
  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings, rule_count: RULES.length, checked_on: (opts && opts.today) || '' };
}

var RPLENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) { module.exports = RPLENGINE; } else { window.RPLENGINE = RPLENGINE; }
