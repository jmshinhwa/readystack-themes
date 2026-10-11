/* Miniforge Migration Check engine — same file runs in VS Code (Node) and in the browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.MF_RULES;

  function compiled() {
    return RULES.map(r => Object.assign({}, r, { rx: new RegExp(r.re, r.flags || '') }));
  }

  // A setup-miniconda step is fine when its own with: block sets miniforge-version.
  function stepHasMiniforge(lines, i, win) {
    const indent = lines[i].search(/\S/);
    for (let j = i + 1; j < Math.min(lines.length, i + 1 + win); j++) {
      const l = lines[j];
      if (!l.trim()) continue;
      const ind = l.search(/\S/);
      if (ind <= indent && /^\s*-\s/.test(l)) break;     // next step
      if (ind < indent - 2) break;                        // left the step
      if (/^\s*miniforge-version\s*:/.test(l)) return true;
    }
    return false;
  }

  function check(text, opts) {
    opts = opts || {};
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const rules = compiled();
    const findings = [];
    lines.forEach((raw, i) => {
      const t = raw.trim();
      if (!t || t.startsWith('#')) return;               // comments in YAML and Dockerfiles
      rules.forEach(r => {
        if (!r.rx.test(raw)) return;
        if (r.id === 'setup-miniconda-default' && stepHasMiniforge(lines, i, r.step_window || 15)) return;
        findings.push({ check: r.id, sev: r.sev, line: i + 1, msg: r.title + ' → ' + r.fix, fix: r.fix, text: t.slice(0, 160) });
      });
    });
    const errors = findings.filter(f => f.sev === 'error').length;
    return { findings, errors, warnings: findings.length - errors, rule_count: RULES.length, as_of: opts.today || '' };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.MFENGINE = api;
})();
