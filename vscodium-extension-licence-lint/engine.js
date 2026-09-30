// VSCodium migration lint: flags Microsoft-only / Open VSX-missing extensions in extension lists.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.VSCL_RULES;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const COMPILED = RULES.map((r) => ({
    r,
    re: r.kind === 'ext' ? new RegExp('(^|[^\\w.-])' + esc(r.match) + '(?![\\w.-])', 'i') : new RegExp(r.match, 'i')
  }));

  function check(text, opts) {
    const findings = [];
    const lines = String(text || '').split(/\r?\n/);
    let unwanted = false;
    lines.forEach((raw, i) => {
      const line = raw.trim();
      if (/unwantedRecommendations/.test(line)) unwanted = true;
      if (unwanted) { if (/\]/.test(line)) unwanted = false; return; }
      if (line.startsWith('//') || line.startsWith('#')) return;
      for (const { r, re } of COMPILED) {
        if (!re.test(raw)) continue;
        const label = r.kind === 'ext' ? r.match : 'python.languageServer = Pylance';
        findings.push({
          check: r.id, sev: r.sev, line: i + 1,
          msg: label + ' — ' + r.why.replace(/'$/, '') + (r.kind === 'ext' && r.sev === 'error' ? "'. Also not on Open VSX" : (/'$/.test(r.why) ? "'" : '')) + '. Replace with: ' + r.fix + '.'
        });
      }
    });
    return { findings, errors: findings.filter((f) => f.sev === 'error').length, rules: RULES.length };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.VSCLENGINE = api;
})();
