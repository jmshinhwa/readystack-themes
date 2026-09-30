/* GitLab CI/CD migration check — one engine for the extension and the web page. */
(function () {
  var DOC = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.GLM_RULES;
  var RULES = Array.isArray(DOC) ? DOC : (DOC && DOC.rules) || [];
  var COMPILED = RULES.map(function (r) { return { r: r, re: new RegExp(r.re, r.flags || '') }; });
  var TIER = { 'premium': 'GitLab Premium', 'no-equivalent': 'no GitLab equivalent', 'free': 'GitLab Free' };

  function stripComment(line) {
    if (/^\s*#/.test(line)) return '';
    return line.replace(/\s+#[^'"]*$/, '');
  }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    var premium = 0;
    lines.forEach(function (raw, i) {
      var line = stripComment(raw);
      if (!line.trim()) return;
      COMPILED.forEach(function (c) {
        if (!c.re.test(line)) return;
        if (c.r.tier === 'premium') premium++;
        findings.push({ check: c.r.id, sev: c.r.sev, tier: c.r.tier, line: i + 1,
          msg: c.r.msg + ' [' + TIER[c.r.tier] + '] Fix: ' + c.r.fix, text: raw.trim() });
      });
    });
    var m = String(opts.today || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    var summary = findings.length + ' findings, ' + premium + ' need GitLab Premium' + (m ? ' (checked ' + m[0] + ')' : '');
    return { findings: findings, premium: premium, summary: summary };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.GLMENGINE = API;
})();
