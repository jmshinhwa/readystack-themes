// Brave Search API migration check — one brain for the VS Code extension and the free web page.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.BSM_RULES;
  // Parameter and response rules only run in files that talk to a search API.
  const SEARCH_FILE = /customsearch|googleapis\.com|bing\.microsoft\.com|cognitive\.microsoft\.com\/bing|api\.search\.brave\.com/i;

  function check(text, opts) {
    opts = opts || {};
    const today = String(opts.today || new Date().toISOString()).slice(0, 10);
    const isSearch = SEARCH_FILE.test(text);
    const lines = String(text).split(/\r?\n/);
    const findings = [];
    lines.forEach((raw, i) => {
      const line = raw.replace(/^\s*(\/\/|#).*$/, '');
      if (!line.trim()) return;
      for (const r of RULES) {
        if (r.scope === 'search' && !isSearch) continue;
        const m = new RegExp(r.re, r.flags || '').exec(line);
        if (!m) continue;
        if (r.max != null && !(Number(m[r.num_group]) > r.max)) continue;
        const past = r.cutoff && !isNaN(Date.parse(today)) && today >= r.cutoff;
        findings.push({ check: r.id, sev: r.sev, msg: (past && r.msg_after ? r.msg_after : r.msg) + ' → Brave: ' + r.fix,
                        fix: r.fix, line: i + 1, text: raw.trim() });
      }
    });
    return { findings };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.BSMENGINE = api;
})();
