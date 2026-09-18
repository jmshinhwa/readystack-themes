// EU Data Act Switching Clause Lint - the brain. Same file runs in Node (extension) and in the browser (free web tool).
'use strict';
(function (root) {
  var DATA = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : root.DAS_RULES;
  var RULES = DATA.rules || DATA;
  var META = { law: 'Regulation (EU) 2023/2854 (Data Act), Chapter VI - switching between data processing services',
               applies_from: '2025-09-12', charges_zero_from: '2027-01-12' };
  var UNIT = { day: 1, days: 1, week: 7, weeks: 7, month: 30, months: 30 };

  function days(n, unit) { return n * (UNIT[String(unit).toLowerCase()] || 1); }
  function daysBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  function fill(msg, map) {
    return msg.replace(/\{(\w+)\}/g, function (m, k) { return (map[k] === undefined ? m : String(map[k])); });
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var findings = [];

    RULES.forEach(function (rule) {
      var re = new RegExp(rule.pattern, 'i');
      var hitLine = 0;

      if (rule.kind === 'require') {
        for (var i = 0; i < lines.length; i++) { if (re.test(lines[i])) { hitLine = i + 1; break; } }
        if (!hitLine) findings.push({ check: rule.id, sev: rule.sev, msg: rule.article + ' - ' + rule.msg, line: 1 });
        return;
      }

      if (rule.kind === 'date_gate') {
        for (var j = 0; j < lines.length; j++) { if (re.test(lines[j])) { hitLine = j + 1; break; } }
        if (!hitLine) return;
        var left = daysBetween(today, rule.date);
        var msg = left > 0 ? fill(rule.msg_before, { days: left, today: today }) : fill(rule.msg_after, { today: today });
        findings.push({ check: rule.id, sev: left > 0 ? rule.sev : 'error', msg: rule.article + ' - ' + msg, line: hitLine });
        return;
      }

      var unless = rule.unless ? new RegExp(rule.unless, 'i') : null;
      for (var k = 0; k < lines.length; k++) {
        var m = lines[k].match(re);
        if (!m) continue;
        if (unless && unless.test(lines[k])) continue;

        if (rule.kind === 'forbid') {
          findings.push({ check: rule.id, sev: rule.sev, msg: rule.article + ' - ' + rule.msg, line: k + 1 });
          continue;
        }
        var n = parseInt(m[1], 10);
        if (isNaN(n)) continue;
        var d = days(n, m[2]);
        var found = m[1] + ' ' + m[2];
        if (rule.kind === 'max_days' && d > rule.limit_days) {
          findings.push({ check: rule.id, sev: rule.sev, msg: rule.article + ' - ' + fill(rule.msg, { found: found }), line: k + 1 });
        }
        if (rule.kind === 'min_days' && d < rule.limit_days) {
          findings.push({ check: rule.id, sev: rule.sev, msg: rule.article + ' - ' + fill(rule.msg, { found: found }), line: k + 1 });
        }
      }
    });

    findings.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
    return { findings: findings, checked: RULES.length, today: today, law: META.law };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, META: META };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.DASENGINE = API;
})(typeof window !== 'undefined' ? window : globalThis);
