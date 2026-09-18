/* Impressum & Shop-Pflichtangaben Lint (DE) — engine
   Eine Datei, zwei Leben: Node (VS Code) und Browser (Webversion).
   Regeln kommen aus rules.json bzw. window.ILD_RULES. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.ILD_RULES;

  function lineOf(text, index) {
    var n = 1;
    for (var i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
    return n;
  }

  // "2026-09-11" -> 20260911 ; leere/kaputte Angabe -> heute
  function dayNum(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) {
      var d = new Date();
      return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }
    return (+m[1]) * 10000 + (+m[2]) * 100 + (+m[3]);
  }

  function inForce(rule, today) {
    if (!rule.since) return true;
    return dayNum(today) >= dayNum(rule.since);
  }

  function check(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var today = opts.today || '';
    var findings = [];
    var counted = 0;

    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      if (!inForce(rule, today)) continue;
      counted++;

      if (rule.mode === 'forbid') {
        var re = new RegExp(rule.re, rule.flags.indexOf('g') < 0 ? rule.flags + 'g' : rule.flags);
        var m, seen = {};
        while ((m = re.exec(text)) !== null) {
          if (m[0] === '') { re.lastIndex++; continue; }
          var ln = lineOf(text, m.index);
          if (seen[ln]) continue;
          seen[ln] = 1;
          findings.push({
            check: rule.id, sev: rule.sev, line: ln,
            msg: rule.msg, found: m[0].trim(), fix: rule.fix || ''
          });
        }
      } else if (rule.mode === 'require') {
        var tre = new RegExp(rule.trigger, (rule.tflags || 'i'));
        var hit = tre.exec(text);
        if (!hit) continue;
        var need = new RegExp(rule.re, rule.flags || 'i');
        if (need.test(text)) continue;
        findings.push({
          check: rule.id, sev: rule.sev, line: lineOf(text, hit.index),
          msg: rule.msg, found: hit[0].trim(), fix: rule.fix || ''
        });
      }
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return {
      findings: findings,
      rules_checked: counted,
      today: today || '(heute)'
    };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.ILD_ENGINE = API;
})(typeof window !== 'undefined' ? window : globalThis);
