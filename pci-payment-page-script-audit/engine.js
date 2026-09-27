/*
 * PCI Payment Page Script Audit - engine
 *
 * One brain, two homes: Node (the VS Code extension) and the browser (the free web page).
 * Input  : the text of a payment page (HTML, a server template or a component file)
 * Output : {findings: [{check, sev, msg, line, fix}]}
 *
 * Every line is tested against every rule (rules.json + opts.extraRules + the keyed rules feed);
 * one finding per (line, rule) match, in line order then rule order.
 */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PCI_RULES;

  function feedRules() {
    var f = (typeof globalThis !== 'undefined') ? globalThis.__yjFeed : null;
    return (f && Array.isArray(f.rules)) ? f.rules : [];
  }

  function check(text, opts) {
    opts = opts || {};
    var extra = Array.isArray(opts.extraRules) ? opts.extraRules : [];
    var rules = RULES.concat(extra, feedRules());
    var lines = String(text).split(/\r?\n/);
    var findings = [];
    var i, r, re;

    for (i = 0; i < lines.length; i++) {
      for (r = 0; r < rules.length; r++) {
        try { re = new RegExp(rules[r].pattern, rules[r].flags || ''); } catch (e) { continue; }
        if (!re.test(lines[i])) continue;
        findings.push({
          check: rules[r].id || (r < RULES.length ? 'pci_' + (r + 1) : 'custom_' + (r - RULES.length + 1)),
          sev: rules[r].sev || 'warn',
          line: i + 1,
          msg: rules[r].message,
          fix: rules[r].fix || null
        });
      }
    }
    return {findings: findings};
  }

  var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};

  if (typeof module !== 'undefined') { module.exports = API; }
  if (typeof window !== 'undefined') { window.PCIENGINE = API; }
})();
