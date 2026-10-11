/* Podman Desktop Laptop Check engine — same file runs in VS Code (Node) and in the browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PDL_RULES;

  // Docker's terms: free under 250 employees AND under US$10M revenue; paid Pro/Team/Business otherwise.
  const SEAT_PRICE = { business: 24, team: 15, pro: 9 };   // USD per user per month, annual plan, docker.com/pricing read 2026-10-10

  function compiled() {
    return RULES.map(r => Object.assign({}, r, { rx: new RegExp(r.re, r.flags || '') }));
  }

  // A file may say the seats are already paid: "# docker-subscription: business" (or team / pro).
  function covered(lines) {
    for (const l of lines) {
      const m = /docker-subscription\s*[:=]\s*["']?(business|team|pro)\b/i.exec(l);
      if (m) return m[1].toLowerCase();
    }
    return '';
  }

  function check(text, opts) {
    opts = opts || {};
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const rules = compiled();
    const plan = covered(lines);
    const findings = [];
    lines.forEach((raw, i) => {
      const t = raw.trim();
      if (!t || t.startsWith('#') || t.startsWith('//') || t.startsWith('<!--')) return;
      rules.forEach(r => {
        if (!r.rx.test(raw)) return;
        const sev = (plan && r.sev === 'error') ? 'info' : r.sev;
        const note = (plan && r.sev === 'error') ? ' (seat covered by Docker ' + plan + ' — count it in the seat report)' : '';
        findings.push({ check: r.id, sev, line: i + 1, msg: r.title + note + ' → ' + r.fix, fix: r.fix, text: t.slice(0, 160) });
      });
    });
    const errors = findings.filter(f => f.sev === 'error').length;
    const warnings = findings.filter(f => f.sev === 'warn').length;
    return { findings, errors, warnings, info: findings.length - errors - warnings, covered_by: plan, seat_price: SEAT_PRICE, rule_count: RULES.length, as_of: opts.today || '' };
  }

  // Annual cost of keeping Docker Desktop on N laptops at a list price.
  function seatCost(laptops, plan) {
    const p = SEAT_PRICE[plan || 'business'] || SEAT_PRICE.business;
    return Math.max(0, Math.round(Number(laptops) || 0)) * p * 12;
  }

  const api = { engine: { check, seatCost }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.PDLENGINE = api;
})();
