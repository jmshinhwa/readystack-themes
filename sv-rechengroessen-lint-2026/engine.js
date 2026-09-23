// SV-Rechengroessen 2026 Lint — das Gehirn. Dieselbe Datei laeuft in VS Code und im Browser.
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.SV_RULES;

function rx(p) { return new RegExp(p, 'i'); }

// Kommentare weg, damit ein "# 2025: 8.050" in der Doku keinen Fund erzeugt.
function stripComment(line) {
  var s = String(line == null ? '' : line);
  s = s.replace(/\/\/.*$/, '').replace(/#.*$/, '').replace(/;.*$/, '');
  return s.replace(/[\t ]+/g, ' ').trim();
}

function check(text, opts) {
  opts = opts || {};
  var src = String(text == null ? '' : text);
  var raw = src.split(/\r\n|\r|\n/);
  var lines = [];
  for (var i = 0; i < raw.length; i++) lines.push(stripComment(raw[i]));
  var body = lines.join('\n');
  var findings = [];

  for (var r = 0; r < RULES.length; r++) {
    var rule = RULES[r];
    if (rule.kind === 'missing') {
      var trig = rx(rule.trigger), need = rx(rule.need), at = -1;
      for (var t = 0; t < lines.length; t++) { if (lines[t] && trig.test(lines[t])) { at = t; break; } }
      if (at >= 0 && !need.test(body)) {
        findings.push({ check: rule.id, sev: rule.sev || 'warn', msg: rule.msg, line: at + 1 });
      }
      continue;
    }
    var keyRe = rx(rule.key), badRe = rx(rule.bad);
    for (var k = 0; k < lines.length; k++) {
      var L = lines[k];
      if (!L) continue;
      if (keyRe.test(L) && badRe.test(L)) {
        findings.push({ check: rule.id, sev: rule.sev || 'error', msg: rule.msg, line: k + 1 });
      }
    }
  }

  findings.sort(function (a, b) { return (a.line - b.line) || (a.check < b.check ? -1 : 1); });
  return { findings: findings, rules: RULES.length, today: opts.today || '' };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: (RULES || []).length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.SVENGINE = API;
