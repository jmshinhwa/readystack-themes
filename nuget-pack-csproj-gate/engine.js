// NuGet Pack Gate engine: checks .csproj / .fsproj / .vbproj / Directory.Build.props pack metadata before dotnet pack.
// Same file runs in Node (VS Code extension, verify) and in the browser (free web page).
(function (root) {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.NP_RULES;
  const R = {};
  RULES.forEach(r => { R[r.check] = r; });
  const low = a => (a || []).map(s => s.toLowerCase());
  const SPDX = low(R['license-expression-invalid'].ids);
  const EXC = low(R['license-expression-invalid'].exceptions);
  const ALIAS = R['license-expression-invalid'].aliases || {};
  const NONOSI = low(R['license-not-osi-fsf'].ids);
  const EOS = R['tfm-end-of-support-2026'].eos || {};
  const OLD = low(R['tfm-out-of-support'].tfms);

  // XML comments become blanks so line numbers stay put
  const stripComments = s => s.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  const base = p => String(p || '').replace(/\\/g, '/').split('/').pop().toLowerCase();

  function props(lines, name) {
    const rx = new RegExp('<' + name + '(?:\\s[^>]*)?>([^<]*)</' + name + '>', 'i');
    const out = [];
    lines.forEach((l, i) => { const m = l.match(rx); if (m) out.push({ value: m[1].trim(), line: i + 1, text: l.trim() }); });
    return out;
  }

  function packedFiles(src) {
    const out = [];
    const rx = /<(None|Content|EmbeddedResource|Compile|Resource)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/gi;
    let m;
    while ((m = rx.exec(src))) {
      const attrs = m[2] || '', body = m[4] || '';
      const inc = (attrs.match(/\b(?:Include|Update)\s*=\s*"([^"]+)"/i) || [])[1];
      const pack = /\bPack\s*=\s*"true"/i.test(attrs) || /<Pack>\s*true\s*<\/Pack>/i.test(body);
      if (inc && pack) inc.split(';').forEach(p => out.push(base(p.trim())));
    }
    return out;
  }
  const globMatch = (pat, name) => new RegExp('^' + pat.replace(/[.+^${}()|[\]]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i').test(name);
  const isPacked = (packed, file) => packed.some(p => globMatch(p, base(file)));

  function parseExpr(expr) {
    const toks = expr.replace(/([()])/g, ' $1 ').trim().split(/\s+/).filter(Boolean);
    let expectId = true, afterWith = false, depth = 0, ok = toks.length > 0;
    const unknown = [], nonOsi = [];
    if (toks.length === 1 && toks[0] === 'UNLICENSED') return { ok: true, unknown, nonOsi };
    for (const t of toks) {
      if (t === '(') { if (!expectId) ok = false; depth++; continue; }
      if (t === ')') { if (expectId) ok = false; depth--; if (depth < 0) ok = false; continue; }
      if (t === 'AND' || t === 'OR' || t === 'WITH') { if (expectId) ok = false; expectId = true; afterWith = t === 'WITH'; continue; }
      if (/^(and|or|with)$/i.test(t)) { ok = false; continue; }
      if (!expectId) ok = false;
      expectId = false;
      const id = t.replace(/\+$/, '').toLowerCase();
      if (afterWith) { afterWith = false; if (!EXC.includes(id)) unknown.push(t); continue; }
      if (NONOSI.includes(id)) nonOsi.push(t);
      else if (!SPDX.includes(id)) { if (/^[A-Za-z0-9.\-]+$/.test(id)) unknown.push(t); else ok = false; }
    }
    if (expectId || depth !== 0) ok = false;
    return { ok, unknown, nonOsi };
  }

  function check(text, opts) {
    const today = String((opts && opts.today) || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const src = stripComments(String(text || ''));
    const lines = src.split(/\r?\n/);
    const packed = packedFiles(src);
    const findings = [];
    const add = (check, at, extra) => {
      const r = R[check];
      findings.push(Object.assign({ check, id: r.id, sev: r.sev, msg: r.msg, fix: r.fix, source: r.source, line: at.line, text: at.text }, extra || {}));
    };
    const dyn = v => /\$\(/.test(v);   // MSBuild property we cannot resolve from one file

    const expr = props(lines, 'PackageLicenseExpression');
    const lfile = props(lines, 'PackageLicenseFile');
    const lurl = props(lines, 'PackageLicenseUrl');
    const icon = props(lines, 'PackageIcon');
    const iconUrl = props(lines, 'PackageIconUrl');
    const readme = props(lines, 'PackageReadmeFile');

    lurl.forEach(p => {
      let fix;
      if (expr.length || lfile.length) fix = 'delete this line — only one licence property may be set, keep ' + (expr.length ? 'PackageLicenseExpression' : 'PackageLicenseFile');
      else if (/apache/i.test(p.value)) fix = '<PackageLicenseExpression>Apache-2.0</PackageLicenseExpression>';
      else if (/\bmit\b/i.test(p.value)) fix = '<PackageLicenseExpression>MIT</PackageLicenseExpression>';
      else fix = '<PackageLicenseExpression>SPDX id</PackageLicenseExpression>, or <PackageLicenseFile>LICENSE.txt</PackageLicenseFile> + <None Include="LICENSE.txt" Pack="true" PackagePath=""/>';
      add('license-url-deprecated', p, { fix });
    });
    if (!icon.length) iconUrl.forEach(p => add('icon-url-deprecated', p));

    expr.forEach(p => {
      if (!p.value || dyn(p.value)) return;
      const res = parseExpr(p.value);
      if (!res.ok) {
        const alias = ALIAS[p.value.toLowerCase().replace(/\s+/g, ' ')];
        add('license-expression-invalid', p, { msg: R['license-expression-invalid'].msg + ' Found: "' + p.value + '".',
          fix: '<PackageLicenseExpression>' + (alias || 'SPDX id, e.g. MIT or Apache-2.0') + '</PackageLicenseExpression>' });
      } else if (res.nonOsi.length) {
        add('license-not-osi-fsf', p, { msg: R['license-not-osi-fsf'].msg + ' Found: ' + res.nonOsi.join(', ') + '.' });
      } else if (res.unknown.length) {
        add('license-expression-invalid', p, { sev: 'warn', msg: 'Identifier ' + res.unknown.join(', ') + ' is not in this checker\'s list of common OSI/FSF licences; confirm the exact id on spdx.org/licenses before pack.', fix: 'check the id at https://spdx.org/licenses/' });
      }
    });
    if (expr.length && lfile.length) add('license-conflict', lfile[0]);
    lfile.forEach(p => { if (p.value && !dyn(p.value) && !isPacked(packed, p.value)) add('license-file-not-packed', p, { fix: '<None Include="' + p.value + '" Pack="true" PackagePath=""/>' }); });
    icon.forEach(p => {
      if (!p.value || dyn(p.value)) return;
      const badFmt = !/\.(png|jpe?g)$/i.test(p.value);
      if (badFmt || !isPacked(packed, p.value)) add('icon-not-packed', p, { fix: badFmt ? 'a PNG or JPEG icon, 128x128, under 1 MB' : '<None Include="' + p.value + '" Pack="true" PackagePath="\\"/>' });
    });
    readme.forEach(p => {
      if (!p.value || dyn(p.value)) return;
      const badFmt = !/\.md$/i.test(p.value);
      if (badFmt || !isPacked(packed, p.value)) add('readme-not-packed', p, { fix: badFmt ? 'a Markdown (.md) readme' : '<None Include="' + p.value + '" Pack="true" PackagePath="\\"/>' });
    });

    props(lines, 'TargetFrameworks?').forEach(p => {
      p.value.split(';').map(s => s.trim()).filter(Boolean).forEach(tfm => {
        const b = tfm.toLowerCase().replace(/-.*$/, '');
        if (EOS[b]) {
          const ended = today >= EOS[b];
          add('tfm-end-of-support-2026', p, { sev: ended ? 'error' : 'warn', tfm,
            msg: (ended ? tfm + ' ended support on ' : tfm + ' reaches end of support on ') + EOS[b] + ' (Microsoft .NET support policy: .NET 8 LTS and .NET 9 STS both end November 10, 2026). ' + (ended ? 'It gets no more security patches.' : 'After that date it gets no more patches.') });
        } else if (OLD.includes(b)) {
          add('tfm-out-of-support', p, { tfm, msg: tfm + ': ' + R['tfm-out-of-support'].msg });
        }
      });
    });

    findings.sort((a, b) => a.line - b.line);
    return {
      findings,
      errors: findings.filter(f => f.sev === 'error').length,
      warnings: findings.filter(f => f.sev === 'warn').length,
      as_of: today
    };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  root.NPENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
