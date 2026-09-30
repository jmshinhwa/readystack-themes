// Forgejo migration check: compose YAML -> Gitea-to-Forgejo blockers. Same file runs in VS Code and the web page.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FJ_RULES;
  const R = {};
  RULES.forEach(function (r) { R[r.id] = r; });

  function fill(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; }); }

  function parseToday(t) {
    const s = String(t || '').slice(0, 10);
    const d = new Date(s + 'T00:00:00Z');
    return isNaN(d) ? new Date().toISOString().slice(0, 10) : s;
  }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }

  // image: [registry/]path[:tag][@digest]
  function parseImage(line) {
    const m = line.replace(/\s+#.*$/, '').match(/^\s*-?\s*image\s*:\s*["']?([^\s"']+)["']?/i);
    if (!m) return null;
    let ref = m[1].split('@')[0];
    const slash = ref.lastIndexOf('/');
    const colon = ref.lastIndexOf(':');
    let path = ref, tag = '';
    if (colon > slash) { path = ref.slice(0, colon); tag = ref.slice(colon + 1); }
    path = path.toLowerCase();
    let kind = null;
    if (/(^|\/)gitea\/gitea$/.test(path)) kind = 'gitea';
    else if (/(^|\/)gitea\/act_runner$/.test(path)) kind = 'act_runner';
    else if (/(^|\/)forgejo\/forgejo$/.test(path)) kind = 'forgejo';
    return kind ? { kind: kind, path: path, tag: tag } : null;
  }

  function check(text, opts) {
    opts = opts || {};
    const today = parseToday(opts.today);
    const lines = String(text || '').split(/\r?\n/);
    const findings = [];
    function add(id, line, v) {
      const r = R[id];
      findings.push({ check: id, sev: r.sev, msg: fill(r.msg, v), fix: fill(r.fix, v), line: line, title: r.title });
    }
    const images = [];
    let giteaContext = false, hasBuild = false, hasForgejo = false;
    lines.forEach(function (ln, i) {
      if (/^\s*#/.test(ln)) return;
      const img = parseImage(ln);
      if (img) { img.line = i + 1; images.push(img); if (img.kind === 'gitea') giteaContext = true; if (img.kind === 'forgejo') hasForgejo = true; }
      // a volume whose host side is Gitea data, e.g. ./gitea:/data or gitea-data:/data
      if (/^\s*-\s*["']?[^\s:"']*gitea[^\s:"']*:\/data/i.test(ln)) giteaContext = true;
      if (/^\s*build\s*:/i.test(ln)) hasBuild = true;
    });
    const eol = R['forgejo-eol'].eol;
    const soon = R['forgejo-eol-soon'].window_days;
    let firstHopDone = false;
    images.forEach(function (img) {
      const bare = img.tag.replace(/-rootless$/i, '');
      if (img.kind === 'gitea') {
        const v = bare.match(/^(\d+)\.(\d+)/);
        if (!v) add('gitea-floating-tag', img.line, { tag: img.tag || '(no tag)' });
        else if (+v[1] > 1 || (+v[1] === 1 && +v[2] > 22)) add('gitea-past-1-22', img.line, { tag: img.tag });
      } else if (img.kind === 'act_runner') {
        add('gitea-act-runner', img.line, { tag: img.tag || '(no tag)' });
      } else if (img.kind === 'forgejo') {
        const v = bare.match(/^(\d+)(?:\.|$)/);
        if (!v) { add('forgejo-floating-tag', img.line, { tag: img.tag || '(no tag)' }); return; }
        const major = v[1];
        const hop = giteaContext && !firstHopDone;
        if (hop) { firstHopDone = true; if (major !== '10') add('forgejo-first-hop', img.line, { tag: img.tag }); else return; }
        const end = eol[major];
        if (!end) return;
        const left = daysBetween(today, end);
        if (left < 0) add('forgejo-eol', img.line, { major: major, eol: end });
        else if (left <= soon) add('forgejo-eol-soon', img.line, { major: major, eol: end, days: left, today: today });
      }
    });
    if (hasBuild && hasForgejo) {
      const b = lines.findIndex(function (ln) { return /^\s*build\s*:/i.test(ln); });
      add('forgejo-gpl-build', b + 1, {});
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, today: today, images: images.length };
  }

  const api = { engine: { check: check, parseImage: parseImage }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.FJENGINE = api;
})();
