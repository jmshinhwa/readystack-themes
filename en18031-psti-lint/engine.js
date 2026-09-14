// EN 18031 / PSTI Device Config Lint - the brain. Same file runs in Node (the extension) and in the browser (the free web tool).
'use strict';
(function (root) {
  var DATA = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : root.EN18031_RULES;
  var RULES = DATA.rules || DATA;
  var META = {
    law: 'Delegated Regulation (EU) 2022/30 under Directive 2014/53/EU (RED) Art. 3(3)(d)(e)(f), harmonised standards EN 18031-1/-2/-3, and the UK Product Security and Telecommunications Infrastructure regime',
    red_applies_from: '2025-08-01',
    psti_in_force: '2024-04-29'
  };

  function fill(msg, map) {
    return String(msg).replace(/\{(\w+)\}/g, function (m, k) { return (map[k] === undefined ? m : String(map[k])); });
  }
  function daysBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  // A commented-out line is not a shipped default. C preprocessor lines are code, not comments.
  function isComment(line) {
    if (/^\s*(?:;|\/\/|--)/.test(line)) return true;
    return /^\s*#/.test(line) && !/^\s*#\s*(?:define|include|if|ifdef|ifndef|endif|pragma)/.test(line);
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var raw = String(text == null ? '' : text).split(/\r?\n/);
    var lines = raw.map(function (l) { return isComment(l) ? '' : l; });
    var findings = [];

    function push(rule, line, msg, sev) {
      findings.push({ check: rule.id, sev: sev || rule.sev, msg: rule.article + ' - ' + msg, line: line });
    }

    RULES.forEach(function (rule) {
      var re = new RegExp(rule.pattern, 'i');
      var unless = rule.unless ? new RegExp(rule.unless, 'i') : null;
      var i, m;

      if (rule.kind === 'require_if') {
        var trigger = 0;
        for (i = 0; i < lines.length; i++) { if (re.test(lines[i])) { trigger = i + 1; break; } }
        if (!trigger) return;
        var need = new RegExp(rule.require, 'i');
        for (i = 0; i < lines.length; i++) { if (need.test(lines[i])) return; }
        push(rule, trigger, rule.msg);
        return;
      }

      if (rule.kind === 'date_field') {
        for (i = 0; i < lines.length; i++) {
          m = lines[i].match(re);
          if (!m) continue;
          var left = daysBetween(today, m[1]);
          if (left < 0) push(rule, i + 1, fill(rule.msg_past, { date: m[1], days: -left, today: today }), 'error');
          else if (left <= (rule.warn_days || 0)) push(rule, i + 1, fill(rule.msg_soon, { date: m[1], days: left, today: today }), rule.sev);
        }
        return;
      }

      // kind: forbid - the line itself is the defect
      for (i = 0; i < lines.length; i++) {
        if (!re.test(lines[i])) continue;
        if (unless && unless.test(lines[i])) continue;
        push(rule, i + 1, rule.msg);
      }
    });

    findings.sort(function (a, b) { return (a.line - b.line) || (a.check < b.check ? -1 : 1); });
    return { findings: findings, checked: RULES.length, today: today, law: META.law };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, META: META };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.EN18031ENGINE = API;
})(typeof window !== 'undefined' ? window : globalThis);
