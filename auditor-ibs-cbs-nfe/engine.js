/*
 * Auditor IBS/CBS NF-e - engine
 *
 * Input  : the text of an NF-e / NFC-e XML
 * Output : {findings: [{line, msg, sev, check, fix}]}
 *
 * Same scan the old extension.js ran inline: every line against every rule
 * (shipped rules.json + the subscription feed + opts.extra, the user's extraRules setting).
 */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.IBSCBS_RULES;

  function check(text, opts) {
    opts = opts || {};
    var feed = (typeof globalThis !== 'undefined' && globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
    var rules = RULES.concat(Array.isArray(opts.extra) ? opts.extra : [], feed);
    var lines = String(text).split(/\r?\n/);
    var findings = [];
    var i, r, re;

    for (i = 0; i < lines.length; i++) {
      for (r = 0; r < rules.length; r++) {
        try { re = new RegExp(rules[r].pattern, rules[r].flags || ''); } catch (e) { continue; }
        if (re.test(lines[i])) {
          findings.push({
            line: i + 1,
            msg: rules[r].message,
            sev: rules[r].sev || 'warn',
            check: String(rules[r].id || ('rule_' + (r + 1))),
            fix: rules[r].fix || null
          });
        }
      }
    }
    return {findings: findings};
  }

  var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};

  if (typeof module !== 'undefined') { module.exports = API; }
  if (typeof window !== 'undefined') { window.IBSCBSENGINE = API; }
})();
