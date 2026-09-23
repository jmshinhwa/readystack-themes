/* Aviso Legal ES — motor de reglas. El mismo archivo corre en Node (extension) y en el navegador (version web). */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.AVLEG_RULES;

  function lines(text) { return String(text == null ? '' : text).split(/\r?\n/); }

  function rx(src, flags) { return new RegExp(src, flags || 'i'); }

  function firstLine(ls, re) {
    for (var i = 0; i < ls.length; i++) { if (re.test(ls[i])) return i + 1; }
    return 1;
  }

  function currentYear(opts) {
    var t = (opts && opts.today) || '';
    var m = /^(\d{4})/.exec(String(t));
    return m ? parseInt(m[1], 10) : new Date().getFullYear();
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text);
    var ls = lines(src);
    var year = currentYear(opts);
    var findings = [];

    RULES.forEach(function (r) {
      var re, hit, i, m;

      if (r.kind === 'forbid') {
        re = rx(r.re, 'i');
        for (i = 0; i < ls.length; i++) {
          if (re.test(ls[i])) {
            findings.push({ check: r.check, sev: r.sev, msg: r.msg, line: i + 1 });
            break;
          }
        }
        return;
      }

      if (r.kind === 'stale_year') {
        re = rx(r.re, 'gi');
        for (i = 0; i < ls.length; i++) {
          re.lastIndex = 0;
          m = re.exec(ls[i]);
          if (m && parseInt(m[1], 10) < year) {
            findings.push({ check: r.check, sev: r.sev, msg: r.msg + ' (' + m[1] + ' frente a ' + year + ')', line: i + 1 });
            break;
          }
        }
        return;
      }

      if (r.kind === 'require') {
        hit = rx(r.re, 'i').test(src);
        if (!hit) findings.push({ check: r.check, sev: r.sev, msg: r.msg, line: 1 });
        return;
      }

      if (r.kind === 'require_if') {
        if (!rx(r.re_if, 'i').test(src)) return;
        if (rx(r.re, 'i').test(src)) return;
        findings.push({ check: r.check, sev: r.sev, msg: r.msg, line: firstLine(ls, rx(r.re_if, 'i')) });
      }
    });

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };

  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.AVLEGENGINE = api;
}(typeof window !== 'undefined' ? window : globalThis));
