// IoT Data Notice Lint engine: EU Data Act (Regulation (EU) 2023/2854) Article 3 pre-contract notice.
// Same file runs in VS Code (require) and in the free web page (window).
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.IOT_RULES;
  // Art. 50: Art. 3(1) applies to connected products placed on the market after 12 September 2026.
  const ART31_FROM = '2026-09-13';

  function frontMatter(text) {
    const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    const out = {};
    if (!m) return out;
    m[1].split(/\r?\n/).forEach(l => { const k = /^([\w-]+):\s*(.*)$/.exec(l); if (k) out[k[1]] = k[2].replace(/^["']|["']$/g, '').trim(); });
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    text = String(text || '');
    const findings = [];
    if (!/data act|product data|connected (product|device)/i.test(text)) {
      return { findings, skipped: 'not a Data Act product notice (no "product data", "connected product" or "Data Act")' };
    }
    const lines = text.split(/\r?\n/);
    let anchor = lines.findIndex(l => /^#+ .*data/i.test(l));
    anchor = anchor < 0 ? 1 : anchor + 1;
    const fm = frontMatter(text);
    const marketDate = fm.placed_on_market || opts.today || new Date().toISOString().slice(0, 10);
    const art31Live = marketDate >= ART31_FROM;

    for (const r of RULES) {
      if (r.need) {
        const missing = r.need.filter(p => !new RegExp(p, 'i').test(text));
        if (missing.length) findings.push({ check: r.id, sev: r.sev, ref: r.ref, line: anchor, msg: r.ref + ': ' + r.msg + ' Fix: ' + r.fix });
        continue;
      }
      const all = r.line_all.map(p => new RegExp(p, 'i'));
      const unless = r.unless ? new RegExp(r.unless, 'i') : null;
      lines.forEach((l, i) => {
        if (all.every(re => re.test(l)) && !(unless && unless.test(l))) {
          let sev = r.sev, note = '';
          if (r.art31 && !art31Live) { sev = 'warning'; note = ' (placed on the market ' + marketDate + ': Art. 3(1) binds products placed after 12 September 2026)'; }
          findings.push({ check: r.id, sev, ref: r.ref, line: i + 1, text: l.trim().slice(0, 160), msg: r.ref + ': ' + r.msg + note + ' Fix: ' + r.fix });
        }
      });
    }
    findings.sort((a, b) => a.line - b.line);
    return { findings, art31Live, marketDate, rules: RULES.length };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.IOTENGINE = api;
})();
