// Testimonial Lint engine: 16 CFR Part 465 checks on landing-page source. Same file runs in VS Code and the browser.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.TL_RULES;
  var PENALTY_USD = 53088; // FTC Act 5(m)(1)(A), 16 CFR 1.98(d); 2025 level kept for 2026 (OMB M-26-11)

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    RULES.forEach(function (r) {
      if (r.ctx && !r.ctx.every(function (c) { return new RegExp(c, 'i').test(text); })) return;
      var re = new RegExp(r.re, r.flags || '');
      lines.forEach(function (ln, i) {
        if (!re.test(ln)) return;
        findings.push({ check: r.id, sev: r.sev, line: i + 1, section: r.section, fix: r.fix,
          text: ln.trim().slice(0, 120),
          msg: r.title + ' (' + r.section + '). Fix: ' + r.fix });
      });
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return { findings: findings, errors: errors, warnings: findings.length - errors,
      penalty_per_violation_usd: PENALTY_USD };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, PENALTY_USD: PENALTY_USD };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.TLENGINE = api;
})();
