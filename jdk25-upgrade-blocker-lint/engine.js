/* JDK 25 Upgrade Blocker Lint — one brain, used by the extension and by the web page. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.JDK25_RULES;

  // The LTS this is measured against, and the date the upgrade is scheduled by.
  var TARGET = 'JDK 25 LTS (September 2025) from Java 17';
  var SUPPORT_ENDS = '2026-09-30';

  // Comments are not code. Strip them so a JEP number quoted in a javadoc is not a finding.
  function strip(lines) {
    var out = [], inBlock = false;
    for (var i = 0; i < lines.length; i++) {
      var s = lines[i], keep = '', j = 0;
      while (j < s.length) {
        if (inBlock) {
          var end = s.indexOf('*/', j);
          if (end === -1) { j = s.length; } else { inBlock = false; j = end + 2; }
        } else {
          var b = s.indexOf('/*', j), l = s.indexOf('//', j);
          if (l !== -1 && (b === -1 || l < b)) { keep += s.slice(j, l); j = s.length; }
          else if (b !== -1) { keep += s.slice(j, b); inBlock = true; j = b + 2; }
          else { keep += s.slice(j); j = s.length; }
        }
      }
      out.push(keep);
    }
    return out;
  }

  function daysBetween(fromISO, toISO) {
    var a = Date.parse(fromISO + 'T00:00:00Z'), b = Date.parse(toISO + 'T00:00:00Z');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var raw = String(text == null ? '' : text).split(/\r?\n/);
    var code = strip(raw);
    var findings = [];

    for (var i = 0; i < code.length; i++) {
      var line = code[i];
      if (!line || !line.trim()) continue;
      for (var r = 0; r < RULES.length; r++) {
        var rule = RULES[r];
        var re = new RegExp(rule.re);
        if (re.test(line)) {
          findings.push({
            check: rule.id,
            sev: rule.sev,
            msg: rule.msg,
            line: i + 1,
            excerpt: raw[i].trim().slice(0, 120)
          });
        }
      }
    }

    var errors = 0, warns = 0;
    for (var f = 0; f < findings.length; f++) {
      if (findings[f].sev === 'error') errors++; else warns++;
    }

    return {
      findings: findings,
      summary: {
        today: today,
        target: TARGET,
        lines_scanned: raw.length,
        rules_run: RULES.length,
        errors: errors,
        warnings: warns,
        days_left: daysBetween(today, SUPPORT_ENDS),
        support_ends: SUPPORT_ENDS
      }
    };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JDK25ENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
