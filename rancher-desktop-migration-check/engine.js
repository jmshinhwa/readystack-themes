// Rancher Desktop migration check: finds Docker Desktop-only lines and prints the Rancher Desktop line.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.RD_RULES;
  const COMPILED = RULES.map(r => Object.assign({}, r, { rx: new RegExp(r.re, r.flags || '') }));
  // Docker Business list price, docker.com/pricing (checked 2026-10-12)
  const SEAT_USD_MONTH = 24;

  function check(text, opts) {
    opts = opts || {};
    const findings = [];
    const lines = String(text || '').split(/\r?\n/);
    lines.forEach((ln, i) => {
      // a line that already names Rancher Desktop is the migrated line, not the old one
      const migrated = /rancher/i.test(ln);
      for (const r of COMPILED) {
        if (r.id === 'docs-docker-desktop' && migrated) continue;
        if (r.rx.test(ln)) {
          findings.push({ check: r.id, sev: r.sev, msg: r.msg, fix: r.fix, source: r.source, line: i + 1, text: ln.trim() });
        }
      }
    });
    const summary = {
      today: opts.today || null,
      blocking: findings.filter(f => f.sev === 'fail').length,
      total: findings.length,
      verdict: findings.some(f => f.sev !== 'info') ? 'Docker Desktop-only lines found' : 'Runs on Rancher Desktop as written'
    };
    return { findings, summary };
  }

  // seat cost of staying on Docker Desktop (paid report input)
  function exposure(devs, usdPerMonth) {
    const n = Math.max(0, Math.floor(Number(devs) || 0));
    const p = Number(usdPerMonth) || SEAT_USD_MONTH;
    return { devs: n, usd_month: p, usd_year: n * p * 12 };
  }

  const api = { engine: { check, exposure }, RULES, RULE_COUNT: RULES.length, SEAT_USD_MONTH };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.RDENGINE = api;
})();
