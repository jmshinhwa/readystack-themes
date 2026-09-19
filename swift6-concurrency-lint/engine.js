/* Swift 6 Concurrency Migration Lint — one brain, used by the VS Code extension and by the free web page. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : (root.SWIFT6_RULES || []);

  function compiled(rule) {
    if (!rule._re) {
      rule._re = new RegExp(rule.pattern);
      rule._not = rule.not ? new RegExp(rule.not) : null;
      rule._needs = rule.needs ? new RegExp(rule.needs) : null;
    }
    return rule;
  }

  function isComment(line) {
    var t = line.replace(/^\s+/, '');
    return t.indexOf('//') === 0 || t.indexOf('*') === 0 || t.indexOf('/*') === 0;
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text);
    var lines = src.split(/\r?\n/);
    var findings = [];
    for (var r = 0; r < RULES.length; r++) {
      var rule = compiled(RULES[r]);
      if (rule._needs && !rule._needs.test(src)) continue;
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (isComment(line) && rule.check !== 'tools_version_5') continue;
        if (!rule._re.test(line)) continue;
        if (rule._not && rule._not.test(line)) continue;
        findings.push({
          check: rule.check,
          sev: rule.sev,
          msg: rule.msg,
          fix: rule.fix,
          line: i + 1,
          text: line.replace(/^\s+/, '').slice(0, 120)
        });
      }
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, today: opts.today || '', rule_count: RULES.length };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.SWIFT6ENGINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
