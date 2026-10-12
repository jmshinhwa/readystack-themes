// ArangoDB Migration Check engine: finds Neo4j images, licence lines, Bolt URIs and drivers, dates each against Neo4j end of life.
// Same file runs in Node (VS Code extension, verify) and in the browser (free web page).
(function (root) {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.AQ_RULES;
  const byKind = k => RULES.filter(r => r.kind === k);
  const one = k => byKind(k)[0];

  const IMAGE = /(?:^\s*(?:-\s*)?image\s*[:=]\s*|^\s*FROM\s+(?:--platform=\S+\s+)?|"image"\s*:\s*)["']?(?:docker\.io\/)?(?:library\/)?neo4j(?::([\w.-]+))?["']?(?:\s|$|#|,)/i;
  const LICENCE = /NEO4J_ACCEPT_LICENSE_AGREEMENT\s*[:=]\s*["']?(\w+)/;
  const URI = /\b((?:bolt|neo4j)(?:\+s|\+ssc)?:\/\/[\w.\-:@]+)/i;
  const APOC = /NEO4J_PLUGINS\s*[:=].*apoc|NEO4JLABS_PLUGINS\s*[:=].*apoc/i;

  function fill(s, vars) { return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : ''); }
  function days(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  function push(out, r, i, lines, vars, sev) {
    out.push({ check: r.check, id: r.id, sev: sev || r.sev, msg: fill(r.msg, vars), fix: r.fix, source: r.source, line: i + 1, text: lines[i].trim() });
  }

  // tag -> release cycle: "2026.06.0-enterprise" -> 2026.06 · "5.26.12" -> 5.26 · "5" -> 5.26 (newest 5.x) · "4.4-enterprise" -> 4.4
  function cycleOf(tag) {
    if (!tag || /^(latest|enterprise|community|ubi\d*|bullseye|trixie)$/i.test(tag)) return null;
    const m = tag.match(/^(\d{4})\.(\d{2})/) || tag.match(/^(\d)\.(\d+)/);
    if (m) return m[1] + '.' + m[2];
    if (/^5(?:-|$)/.test(tag)) return '5.26';
    if (/^4(?:-|$)/.test(tag)) return '4.4';
    return null;
  }

  function image(out, i, lines, tag, today) {
    const eolR = one('image-eol'), table = eolR.eol_table, prev_eol = table['2026.08'];
    const cycle = cycleOf(tag);
    if (!cycle) return push(out, one('image-floating'), i, lines, { tag: tag || 'latest', prev_eol });
    if (cycle === '5.26') {
      const r = one('image-lts'), left = days(today, r.lts_eol);
      const sev = left <= 0 ? 'error' : left <= r.warn_days ? 'warn' : r.sev;
      return push(out, r, i, lines, { cycle, eol: r.lts_eol, days: Math.max(left, 0), today }, sev);
    }
    const eol = table[cycle];
    if (eol && eol <= today) return push(out, eolR, i, lines, { cycle, eol });
    return push(out, one('image-current'), i, lines, { cycle, prev_eol }, eol && days(today, eol) <= 30 ? 'warn' : null);
  }

  function check(text, opts) {
    const today = ((opts && opts.today) || new Date().toISOString()).slice(0, 10);
    const lines = String(text || '').split(/\r?\n/);
    const deps = byKind('dep').map(r => [r, new RegExp(r.rx, 'i')]);
    const out = [];
    lines.forEach((l, i) => {
      if (/^\s*(#|\/\/|<!--)/.test(l)) return;
      let m;
      if ((m = l.match(IMAGE))) return image(out, i, lines, m[1], today);
      if ((m = l.match(LICENCE))) return push(out, one('licence'), i, lines, { val: m[1] });
      if (APOC.test(l)) return push(out, one('apoc'), i, lines, {});
      if ((m = l.match(URI))) return push(out, one('uri'), i, lines, { uri: m[1] });
      const d = deps.find(([, rx]) => rx.test(l));
      if (d) push(out, d[0], i, lines, {});
    });
    return { findings: out, today, rules: RULES.length };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length, cycleOf };
  if (typeof module !== 'undefined') module.exports = api;
  root.AQENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
