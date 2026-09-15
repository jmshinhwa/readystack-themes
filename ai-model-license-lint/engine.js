/* AI Model License Lint - engine.
   One brain, two homes: require()d by the VS Code extension, and read off
   window.MLL_RULES by the single-page web edition. */
(function (root) {
  'use strict';

  var DATA = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.MLL_RULES;

  var RULES = Array.isArray(DATA) ? DATA : ((DATA && DATA.rules) || []);
  var RULES_VERSION = '2026-09-14';

  var cache = {};
  function rx(src, flags) {
    var key = flags + ' ' + src;
    if (!cache[key]) cache[key] = new RegExp(src, flags);
    return cache[key];
  }
  function hit(src, text) { return !!src && rx(src, 'i').test(text); }

  /* A model id pasted into a docstring or a README is still the identifier
     procurement reads, so comment lines count. Blank lines never do. */
  function check(text, opts) {
    opts = opts || {};
    text = String(text == null ? '' : text);
    var lines = text.split(/\r?\n/);
    var findings = [];

    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      if (rule.needs_file && !hit(rule.needs_file, text)) continue;
      if (rule.not_file && hit(rule.not_file, text)) continue;
      if (!rule.re) continue;

      var re = rx(rule.re, 'i');

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.trim()) continue;
        if (!re.test(line)) continue;
        if (rule.not_line && hit(rule.not_line, line)) continue;

        findings.push({
          check: rule.id,
          sev: rule.sev || 'warn',
          msg: rule.msg,
          line: i + 1
        });
        if (rule.once || rule.scope === 'file') break;
      }
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return {
      findings: findings,
      rules_version: RULES_VERSION,
      today: opts.today || ''
    };
  }

  var API = {
    engine: { check: check },
    check: check,
    RULES: RULES,
    RULE_COUNT: RULES.length,
    RULES_VERSION: RULES_VERSION
  };

  root.MLLENGINE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
