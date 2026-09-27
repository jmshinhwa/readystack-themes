/*
 * BEM Class Auditor - engine
 *
 * One brain for the extension commands and the automatic first-minute check (auto.js).
 * Input  : the text of an HTML file (or the selected lines of one)
 * Output : {findings: [{line, msg, sev, check, fix}]}
 *
 * Rules live in rules.json. Extra rules (the extraRules setting) arrive through opts.extraRules;
 * keyed customers' feed rules arrive through globalThis.__yjFeed. Order: shipped, extra, feed.
 */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.BEM_RULES;

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var extra = Array.isArray(opts.extraRules) ? opts.extraRules : [];
    var feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
    var rules = RULES.concat(extra, feed);
    var findings = [];
    var i, k, r, re;

    for (i = 0; i < lines.length; i++) {
      for (k = 0; k < rules.length; k++) {
        r = rules[k];
        try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
        if (re.test(lines[i])) {
          findings.push({
            line: i + 1,
            msg: r.message,
            sev: r.sev || 'warn',
            check: r.id || ('bem-' + (k + 1)),
            fix: r.fix || null
          });
        }
      }
    }
    return {findings: findings};
  }

  var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};

  if (typeof module !== 'undefined') { module.exports = API; }
  if (typeof window !== 'undefined') { window.BEMENGINE = API; }
})();
