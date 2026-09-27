/*
 * Firmware Release Gate - engine
 *
 * One brain for the VS Code extension and auto.js.
 * Input  : the text of an sdkconfig, sdkconfig.defaults or prj.conf
 * Output : {findings: [{check, sev, msg, line, fix}]}
 *
 * Rules live in rules.json (pattern · flags · sev · message). Every line is tested against every rule,
 * plus the user's extraRules (setExtra) and the subscription feed (globalThis.__yjFeed.rules).
 */
(function () {
  'use strict';

  var RULES = require('./rules.json');
  var EXTRA = [];

  function setExtra(arr) { EXTRA = Array.isArray(arr) ? arr : []; }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text).split(/\r?\n/);
    var extra = Array.isArray(opts.extraRules) ? opts.extraRules : EXTRA;
    var feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
    var rules = RULES.concat(extra, feed);
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      for (var k = 0; k < rules.length; k++) {
        var r = rules[k], re;
        try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
        if (re.test(lines[i])) {
          findings.push({ line: i + 1, msg: r.message, sev: r.sev || 'warn', check: String(r.id || ('rule_' + (k + 1))), fix: r.fix || null });
        }
      }
    }
    return { findings: findings };
  }

  module.exports = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, setExtra: setExtra };
})();
