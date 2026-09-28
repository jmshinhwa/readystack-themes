/* NuGet License Gate engine — same file runs in VS Code (node) and in the free web page. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.NLG_RULES;
  const PKG_RULES = RULES.filter(r => r.pkg !== '*');
  const FLOAT = RULES.find(r => r.id === 'floating-into-commercial');

  function parts(v) {
    return String(v).split(/[.\-+]/).slice(0, 4).map(x => /^\d+$/.test(x) ? +x : 0);
  }
  function cmp(a, b) {
    const x = parts(a), y = parts(b);
    for (let i = 0; i < 4; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
    return 0;
  }
  // NuGet restores the LOWEST version a range allows, except a floating "*" which takes the newest.
  function effective(raw) {
    const v = String(raw || '').trim();
    if (!v) return null;
    if (v.includes('*')) return { floating: true, base: v.replace(/\*.*$/, '').replace(/[\[\(]/g, '').replace(/\.$/, '') || '0' };
    const m = v.match(/^[\[\(]\s*([^,\]\)]*)/);
    if (m) return m[1].trim() ? { floating: false, base: m[1].trim() } : null;
    return { floating: false, base: v };
  }
  function ruleFor(id) {
    return PKG_RULES.find(r => new RegExp(r.pkg, 'i').test(id));
  }
  function pin(r) {
    return r.last_oss ? ' Last open-source version: ' + r.last_oss + ' (' + r.last_oss_licence + ').' : ' No open-source version to pin; buy the licence or replace the package.';
  }
  function judge(id, ver, line, out) {
    const r = ruleFor(id);
    if (!r) return;
    const e = effective(ver);
    if (!e) return;
    if (cmp(e.base, r.from) >= 0) {
      out.push({ check: r.id, sev: r.sev, line,
        msg: id + ' ' + ver + (r.from === '0.0.0' ? ' is not open source on any version (' + r.since + '): ' : ' is past the licence line (' + r.from + '+, since ' + r.since + '): ') + r.licence + '.' + pin(r) });
    } else if (e.floating) {
      out.push({ check: FLOAT.id, sev: FLOAT.sev, line,
        msg: id + ' ' + ver + ': ' + FLOAT.licence + ' (' + r.from + '+: ' + r.licence + ').' + pin(r).replace('Last', 'Pin the last') });
    }
  }
  const ATTR = (tag, name) => { const m = tag.match(new RegExp('\\b' + name + '\\s*=\\s*"([^"]*)"', 'i')); return m ? m[1] : null; };

  function check(text, opts) {
    const findings = [];
    const lines = String(text || '').split(/\r?\n/);
    let pending = null; // multi-line <PackageReference Include="X"> ... <Version>Y</Version>
    lines.forEach((ln, i) => {
      const no = i + 1;
      const tagRe = /<(PackageReference|PackageVersion|GlobalPackageReference|package)\b[^>]*>/gi;
      let m;
      while ((m = tagRe.exec(ln))) {
        const tag = m[0];
        const id = ATTR(tag, 'Include') || ATTR(tag, 'Update') || ATTR(tag, 'id');
        if (!id) continue;
        const ver = ATTR(tag, 'VersionOverride') || ATTR(tag, 'Version') || ATTR(tag, 'version');
        if (ver) judge(id, ver, no, findings);
        else if (!/\/>\s*$/.test(tag)) pending = { id, line: no };
      }
      if (pending) {
        const v = ln.match(/<Version>\s*([^<]+?)\s*<\/Version>/i);
        if (v) { judge(pending.id, v[1], no, findings); pending = null; }
        else if (/<\/PackageReference>|<\/PackageVersion>/i.test(ln)) pending = null;
      }
    });
    return { findings };
  }

  const API = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.NLGENGINE = API;
  if (typeof module !== 'undefined') module.exports = API;
})();
