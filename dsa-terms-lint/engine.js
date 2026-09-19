/* dsa-terms-lint engine - EU Digital Services Act (Regulation (EU) 2022/2065)
   Same file runs in Node (VS Code extension) and in the browser (free web page). */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.DSA_RULES;

  /* The DSA has applied to all providers of intermediary services since this date. */
  var DSA_APPLIES = '2024-02-17';
  var STALE_MONTHS = 18;

  var DATE_RE = /(last\s+updated|last\s+revised|effective\s+(?:date|from)|version\s+date|in\s+force\s+from)\s*[:–—-]*\s*(\d{4}-\d{2}-\d{2})/i;

  function rx(pattern) {
    return new RegExp(pattern, 'i');
  }

  function lineOfMatch(text, pattern) {
    if (!pattern) return 1;
    var re = new RegExp(pattern, 'i');
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) return i + 1;
    }
    return 1;
  }

  function monthsBetween(fromISO, toISO) {
    var a = fromISO.split('-').map(Number);
    var b = toISO.split('-').map(Number);
    return (b[0] - a[0]) * 12 + (b[1] - a[1]) - (b[2] < a[2] ? 1 : 0);
  }

  function dateFindings(rule, text, today) {
    var out = [];
    var m = text.replace(/\s+/g, ' ').match(DATE_RE);
    if (!m) {
      out.push({
        check: rule.check,
        sev: 'err',
        msg: 'No version date found. ' + rule.msg + ' Add a "Last updated: YYYY-MM-DD" line.',
        line: 1
      });
      return out;
    }
    var found = m[2];
    var line = lineOfMatch(text, m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (found < DSA_APPLIES) {
      out.push({
        check: rule.check,
        sev: 'err',
        msg: 'Version date ' + found + ' is before ' + DSA_APPLIES + '. ' + rule.msg,
        line: line
      });
    } else if (monthsBetween(found, today) >= STALE_MONTHS) {
      out.push({
        check: rule.check,
        sev: 'warn',
        msg: 'Version date ' + found + ' is ' + monthsBetween(found, today) + ' months old as of ' + today +
             '. Art. 14(2) DSA expects the published terms to match what you actually do.',
        line: line
      });
    }
    return out;
  }

  function check(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var today = opts.today || '2026-09-18';
    var findings = [];

    /* Real terms files are hard-wrapped, so a clause routinely straddles two lines.
       Rules are matched against a whitespace-flattened copy; line numbers stay on the original. */
    var flat = text.replace(/\s+/g, ' ');

    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      if (rule.when && !rx(rule.when).test(flat)) continue;

      if (rule.kind === 'date') {
        findings = findings.concat(dateFindings(rule, text, today));
        continue;
      }

      var satisfied = false;
      var need = rule.need || [];
      for (var j = 0; j < need.length; j++) {
        if (rx(need[j]).test(flat)) { satisfied = true; break; }
      }
      if (!satisfied) {
        findings.push({
          check: rule.check,
          sev: rule.sev || 'warn',
          msg: rule.msg,
          line: lineOfMatch(text, rule.anchor)
        });
      }
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.DSAENGINE = api;
})();
