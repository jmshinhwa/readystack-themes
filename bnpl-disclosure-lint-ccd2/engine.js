/* BNPL Checkout Lint - engine for Directive (EU) 2023/2225 (CCD2), applying 20 November 2026.
   Same file runs in the VS Code extension (require) and in the free web page (window). */
(function (root) {
  'use strict';

  var RULES_DOC = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.BNPL_RULES;

  var RULES = RULES_DOC.rules;
  var APPLIES_FROM = RULES_DOC.applies_from;

  function rx(src, flags) { return new RegExp(src, flags || 'i'); }

  function stripped(text) {
    // comments never reach the shopper, so they never satisfy a disclosure duty
    return text.replace(/<!--[\s\S]*?-->/g, function (m) {
      return m.replace(/[^\n]/g, ' ');
    });
  }

  function contextLines(lines, ctx) {
    var hits = [];
    for (var i = 0; i < lines.length; i++) { if (ctx.test(lines[i])) hits.push(i + 1); }
    return hits;
  }

  function daysBetween(from, to) {
    var a = Date.parse(from + 'T00:00:00Z'), b = Date.parse(to + 'T00:00:00Z');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || '2026-09-17';
    var src = stripped(String(text == null ? '' : text));
    var lines = src.split(/\r?\n/);
    var ctx = rx(RULES_DOC.bnpl_context, 'i');
    var ctxLines = contextLines(lines, ctx);
    var hasCredit = ctxLines.length > 0;
    var findings = [];

    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];

      if (rule.kind === 'requires') {
        if (!hasCredit) continue;
        var satisfied = false;
        for (var a = 0; a < rule.any.length; a++) {
          if (rx(rule.any[a], 'i').test(src)) { satisfied = true; break; }
        }
        if (!satisfied) {
          findings.push({ check: rule.id, sev: rule.sev, line: ctxLines[0],
                          msg: rule.msg + ' [' + rule.art + ']' });
        }
        continue;
      }

      var pat = rx(rule.pattern, 'i');
      for (var i = 0; i < lines.length; i++) {
        if (pat.test(lines[i])) {
          findings.push({ check: rule.id, sev: rule.sev, line: i + 1,
                          msg: rule.msg + ' [' + rule.art + ']' });
        }
      }
    }

    findings.sort(function (x, y) { return x.line - y.line || (x.check < y.check ? -1 : 1); });

    var left = daysBetween(today, APPLIES_FROM);
    return {
      findings: findings,
      creditOffer: hasCredit,
      appliesFrom: APPLIES_FROM,
      daysLeft: left,
      summary: hasCredit
        ? findings.length + ' CCD2 findings, ' + left + ' days to 20 November 2026'
        : 'no pay-later offer found in this file'
    };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length,
              APPLIES_FROM: APPLIES_FROM };
  root.BNPLENGINE = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
})(typeof window !== 'undefined' ? window : globalThis);
