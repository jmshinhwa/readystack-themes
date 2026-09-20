/* EU Health Claim Lint — one brain, used by the VS Code extension and by the free web page.
   Rules live in rules.json; this file only decides what counts as a finding. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.EUHC_RULES;

  function stripLine(s) {
    return String(s)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&#\d+;/g, ' ')
      .replace(/[*_`#>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function re(src, flags) {
    return new RegExp(src, flags || 'i');
  }

  // A rule tied to a date that has not arrived yet still reports, but as advance notice.
  function timed(rule, today) {
    if (!rule.from || !today || today >= rule.from) {
      return { sev: rule.sev, prefix: '' };
    }
    return { sev: 'info', prefix: 'From ' + rule.from + ': ' };
  }

  function firstScopeLine(lines, scope) {
    var rx = re(scope);
    for (var i = 0; i < lines.length; i++) {
      if (rx.test(lines[i])) return i + 1;
    }
    return 1;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || '';
    var lines = String(text == null ? '' : text).split(/\r?\n/).map(stripLine);
    var doc = lines.join('\n');
    var findings = [];

    RULES.forEach(function (rule) {
      var t = timed(rule, today);
      if (rule.scope && !re(rule.scope).test(doc)) return;

      if (rule.type === 'doc') {
        var missing = (rule.needs || []).filter(function (n) {
          return !re(n.pat).test(doc);
        }).map(function (n) { return n.label; });
        if (!missing.length) return;
        findings.push({
          check: rule.id,
          sev: t.sev,
          msg: t.prefix + rule.msg.replace('{missing}', missing.join(' · ')),
          line: firstScopeLine(lines, rule.scope)
        });
        return;
      }

      if (rule.need && re(rule.need).test(doc)) return;

      var rx = re(rule.pat, 'gi');
      for (var i = 0; i < lines.length; i++) {
        rx.lastIndex = 0;
        var m = rx.exec(lines[i]);
        if (!m) continue;
        findings.push({
          check: rule.id,
          sev: t.sev,
          msg: t.prefix + rule.msg.replace('{hit}', m[0].trim()),
          line: i + 1
        });
      }
    });

    findings.sort(function (a, b) {
      return (a.line - b.line) || (a.check < b.check ? -1 : a.check > b.check ? 1 : 0);
    });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.EUHCENGINE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
