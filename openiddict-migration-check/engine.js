/* OpenIddict Migration Check engine: maps Duende IdentityServer / IdentityServer4 calls to OpenIddict and prices the Duende edition a setup needs. Runs in node and in the browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.OIDM_RULES;

  // Blank out comments but keep newlines so line numbers stay true. "://" inside URLs is not a comment.
  function stripComments(text) {
    const keepLines = (m) => m.replace(/[^\n]/g, ' ');
    return String(text || '')
      .replace(/\/\*[\s\S]*?\*\//g, keepLines)
      .replace(/<!--[\s\S]*?-->/g, keepLines)
      .replace(/(^|[^:])(\/\/[^\n]*)/g, (m, a, b) => a + keepLines(b));
  }

  function lineOf(src, idx) { return src.slice(0, idx).split('\n').length; }

  function parseDay(v) {
    const m = String(v || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(t) ? null : t;
  }

  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function fill(tpl, vars) { return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)); }

  function check(text, opts) {
    opts = opts || {};
    const src = stripComments(text);
    const todayT = parseDay(opts.today) ?? parseDay(new Date().toISOString());
    const today = new Date(todayT).toISOString().slice(0, 10);
    const findings = [];
    const fired = {};

    for (const r of RULES) {
      if (r.kind === 'edition') continue;
      const re = new RegExp(r.re, 'g');
      const hits = [...src.matchAll(re)];
      if (!hits.length) continue;
      if (r.unless && new RegExp(r.unless).test(src)) continue;
      const found = [...new Set(hits.map((h) => h[1] || h[0].replace(/\s*[(<]$/, '')))].join(', ');
      const vars = { found, today };
      if (r.kind === 'eol') vars.days = Math.floor((todayT - parseDay(r.eol)) / 864e5);
      const line = lineOf(src, hits[0].index);
      fired[r.id] = { line, tier: r.tier, label: r.msg.split(/[:(]/)[0].trim() };
      findings.push({ check: r.id, sev: r.sev, msg: fill(r.msg, vars) + ' → OpenIddict: ' + r.oi, line });
    }

    const ed = RULES.find((r) => r.kind === 'edition');
    const trigger = ed && ed.when.map((id) => fired[id]).find(Boolean);
    if (trigger) {
      const n = (src.match(new RegExp(ed.client_re, 'g')) || []).length;
      const tiers = Object.values(fired).filter((f) => f.tier);
      const need = Math.max(1, ...tiers.map((f) => (f.tier === 'advanced' ? 3 : 2)));
      const akm = tiers.some((f) => f.tier === 'akm');
      let pick = null;
      for (const e of ed.editions) {
        if (e.rank < need || n > e.clients) continue;
        if (akm && e.rank < 2) continue;
        const price = e.price + (akm && e.rank === 2 ? ed.akm_addon : 0);
        const name = e.name + (akm && e.rank === 2 ? ' + key management add-on' : '');
        if (!pick || price < pick.price) pick = { name, price };
      }
      const clients = n ? n + ' client' + (n > 1 ? 's' : '') : 'client count not in this file';
      const features = tiers.length ? tiers.map((f) => f.label).join(', ') : 'core protocol only';
      findings.push({
        check: ed.id, sev: ed.sev, line: trigger.line,
        msg: pick
          ? fill(ed.msg, { clients, features, edition: pick.name, price: money(pick.price) }) + ' → OpenIddict: ' + ed.oi
          : 'Running this setup on Duende: ' + clients + ' + ' + features + ' is past the Advanced edition (30 clients), so the Custom edition is quoted by Duende → OpenIddict: ' + ed.oi
      });
    }
    return { findings };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.OIDMENGINE = api;
})();
