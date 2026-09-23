/* Kassenbeleg-Lint — Prüfkern. Derselbe Kern läuft in VS Code und im Browser. */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined')
    ? require('./rules.json')
    : window.KBL_RULES;

  function rx(p, flags) { return new RegExp(p, flags || 'i'); }

  function anyHit(pats, text) {
    for (var i = 0; i < pats.length; i++) {
      if (rx(pats[i]).test(text)) return true;
    }
    return false;
  }

  function check(text, opts) {
    opts = opts || {};
    var src = (text == null) ? '' : String(text);
    var lines = src.split(/\r?\n/);
    var today = String(opts.today || '2026-09-19');
    var thisYear = parseInt(today.slice(0, 4), 10) || 2026;
    var findings = [];

    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];
      var label = r.msg + ' (' + r.law + ')';

      if (r.mode === 'require') {
        if (!anyHit(r.pat, src)) {
          findings.push({ check: r.id, sev: r.sev, msg: label, line: 1 });
        }
        continue;
      }

      if (r.mode === 'forbid') {
        var bad = rx(r.pat.join('|'));
        var near = r.near ? rx(r.near.join('|')) : null;
        for (var k = 0; k < lines.length; k++) {
          if (!bad.test(lines[k])) continue;
          if (near && !near.test(lines[k])) continue;
          findings.push({ check: r.id, sev: r.sev, msg: label, line: k + 1 });
        }
        continue;
      }

      if (r.mode === 'year') {
        for (var n = 0; n < lines.length; n++) {
          var m = lines[n].match(/\b20\d{2}\b/g);
          if (!m) continue;
          for (var j = 0; j < m.length; j++) {
            if (parseInt(m[j], 10) < thisYear) {
              findings.push({ check: r.id, sev: r.sev, msg: label + ' — ' + m[j], line: n + 1 });
              break;
            }
          }
        }
      }
    }

    findings.sort(function (a, b) { return (a.line - b.line) || (a.check < b.check ? -1 : 1); });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') { window.KBLENGINE = API; }
  if (typeof module !== 'undefined') { module.exports = API; }
})();
