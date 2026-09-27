/*
 * AI Act Transparency Audit - Article 50 - engine
 *
 * Input  : the text of a source file, a system prompt or a config file
 * Output : {findings: [{line, msg, sev, check, fix}]}
 *
 * Every line is tested against every rule in rules.json (plus opts.extra and the keyed rules feed).
 * A line may hit more than one rule; each hit is its own finding.
 */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.AIACT50_RULES;

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
    var rules = RULES.concat(Array.isArray(opts.extra) ? opts.extra : [], feed);
    var findings = [];
    var i, r, re;
    for (i = 0; i < lines.length; i++) {
      for (r = 0; r < rules.length; r++) {
        if (!rules[r]) continue;
        try { re = new RegExp(rules[r].pattern, rules[r].flags || ''); } catch (e) { continue; }
        if (re.test(lines[i])) {
          findings.push({
            line: i + 1,
            msg: rules[r].message,
            sev: rules[r].sev || 'warn',
            check: rules[r].id || ('rule-' + (r + 1)),
            fix: rules[r].fix || null
          });
        }
      }
    }
    return {findings: findings};
  }

  var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else window.AIACT50_ENGINE = API;
})();
