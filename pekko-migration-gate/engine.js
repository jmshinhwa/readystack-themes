// Pekko Migration Gate — one engine for the VS Code extension and the free web page.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PEKKO_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });
  const CORE = R['akka-core-bsl-active'];
  const MODULES = R['akka-module-bsl-line'].modules.map(m => Object.assign({ re: new RegExp(m.match) }, m));
  const AKKA_GROUP = /^com\.(typesafe|lightbend)\.akka(\.[\w.]+)?$/;
  const PEKKO_GROUP = 'org.apache.pekko';

  function vparts(v) { return String(v).split(/[.\-]/).map(x => parseInt(x, 10)).filter(n => !isNaN(n)); }
  function vcmp(a, b) {
    const x = vparts(a), y = vparts(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return d < 0 ? -1 : 1;
    }
    return 0;
  }
  function pekkoName(artifact, mod) {
    if (!mod) return artifact.replace(/^akka-/, 'pekko-');
    if (mod.pekko.endsWith('-')) return artifact.replace(mod.re, mod.pekko);
    return artifact.replace(/^akka-[a-z]+(-[a-z]+)?/, m => m.startsWith('akka-stream-kafka') ? mod.pekko : m.replace(/^akka-/, 'pekko-'));
  }
  function pekkoLine(artifact, mod) {
    return '"org.apache.pekko" %% "' + pekkoName(artifact, mod) + '" % <Pekko 1.x version>';
  }

  function collectVars(lines) {
    const vars = {};
    lines.forEach(l => {
      let m;
      const a = /\b([A-Za-z_][\w]*)\s*=\s*["']([0-9][\w.\-]*)["']/.exec(l);
      if (a) vars[a[1]] = a[2];
      const re = /<([\w.\-]+)>([0-9][\w.\-]*)<\/\1>/g;
      while ((m = re.exec(l))) vars[m[1]] = m[2];
    });
    return vars;
  }
  function resolve(tok, vars) {
    if (!tok) return null;
    const t = tok.replace(/^\$\{?|\}$/g, '');
    if (/^[0-9]/.test(t)) return t;
    return vars[t] || null;
  }

  function findDeps(lines, vars) {
    const deps = [];
    const sbt = /"([\w.]+)"\s*%{1,3}\s*"([\w.\-]+)"\s*%\s*(?:"([^"]+)"|([A-Za-z_]\w*))/g;
    const gradle = /["']([\w.]+):([\w.\-]+?)(?:_[23](?:\.\d+)?)?:([^"':]+)["']/g;
    lines.forEach((l, i) => {
      let m;
      sbt.lastIndex = 0;
      while ((m = sbt.exec(l))) deps.push({ group: m[1], artifact: m[2].replace(/_[23](\.\d+)?$/, ''), version: resolve(m[3] || m[4], vars), raw: m[3] || m[4], line: i + 1 });
      gradle.lastIndex = 0;
      if (!/%/.test(l)) while ((m = gradle.exec(l))) deps.push({ group: m[1], artifact: m[2], version: resolve(m[3], vars), raw: m[3], line: i + 1 });
      const g = /<groupId>\s*([\w.]+)\s*<\/groupId>/.exec(l);
      if (g) {
        let artifact = null, aline = i + 1, ver = null, raw = null;
        for (let j = Math.max(0, i - 3); j < Math.min(lines.length, i + 7); j++) {
          if (j > i && /<\/(dependency|plugin)>/.test(lines[j])) break;
          const a = /<artifactId>\s*([\w.\-]+)\s*<\/artifactId>/.exec(lines[j]);
          if (a && !artifact) { artifact = a[1].replace(/_[23](\.\d+)?$/, ''); aline = j + 1; }
          const v = /<version>\s*([^<\s]+)\s*<\/version>/.exec(lines[j]);
          if (v && j >= i) { raw = v[1]; ver = resolve(v[1], vars); }
        }
        if (artifact) deps.push({ group: g[1], artifact, version: ver, raw, line: aline });
      }
    });
    return deps;
  }

  function coreFinding(d, today) {
    const v = d.version, p = vparts(v);
    const line = p[0] + '.' + p[1];
    const exact = CORE.change_dates[v];
    const to = pekkoLine(d.artifact);
    if (exact) {
      if (today < exact) return { check: 'akka-core-bsl-active', sev: 'error', msg: d.artifact + ' ' + v + ' is BSL 1.1 until ' + exact + ' → ' + to };
      return { check: 'akka-core-converted', sev: 'info', msg: d.artifact + ' ' + v + ' turned Apache 2.0 on ' + exact + '; any later patch is BSL again → pin it or ' + to };
    }
    if (p[0] === 2 && p[1] === 7) return { check: 'akka-core-bsl-unresolved', sev: 'warning', msg: d.artifact + ' ' + v + ': the 2.7.x LICENSE gives Change Date "TBD (3 years after 2.7.0 release)" → confirm in the jar or ' + to };
    const min = CORE.line_min[line];
    if (!min && (p[0] > 2 || p[1] > 10)) return { check: 'akka-core-bsl-active', sev: 'error', msg: d.artifact + ' ' + v + ' is newer than 2.10.0, whose BSL runs until ' + CORE.change_dates['2.10.0'] + ' → ' + to };
    if (min && today < min) return { check: 'akka-core-bsl-active', sev: 'error', msg: d.artifact + ' ' + v + ' is BSL 1.1 until at least ' + min + ' (the ' + line + '.0 Change Date; later patches convert later) → ' + to };
    if (min) return { check: 'akka-core-bsl-unresolved', sev: 'warning', msg: d.artifact + ' ' + v + ': ' + line + '.0 converted on ' + min + ' but each patch has its own later date (2.8.8: 2027-10-28) → read its LICENSE or ' + to };
    return null;
  }

  function check(text, opts) {
    opts = opts || {};
    const today = String(opts.today || new Date().toISOString()).slice(0, 10);
    const lines = String(text || '').split(/\r?\n/);
    const vars = collectVars(lines);
    const findings = [];
    const deps = findDeps(lines, vars);
    let akkaSeen = null, pekkoSeen = null;
    deps.forEach(d => {
      if (d.group === PEKKO_GROUP) { if (!pekkoSeen) pekkoSeen = d; return; }
      if (!AKKA_GROUP.test(d.group) || !/^akka/.test(d.artifact)) return;
      if (!akkaSeen) akkaSeen = d;
      const mod = MODULES.find(m => m.re.test(d.artifact));
      if (!d.version) {
        findings.push({ check: 'akka-core-bsl-unresolved', sev: 'warning', msg: d.artifact + ': version "' + (d.raw || '?') + '" is not set in this file, so its licence cannot be dated → ' + pekkoLine(d.artifact, mod), line: d.line });
        return;
      }
      if (mod) {
        if (vcmp(d.version, mod.from) >= 0) findings.push({ check: 'akka-module-bsl-line', sev: 'warning', msg: mod.line + ' ' + d.version + ' is on the BSL line (from ' + mod.from + ') → ' + pekkoLine(d.artifact, mod), line: d.line });
        return;
      }
      if (vcmp(d.version, '2.7.0') < 0) return;
      const f = coreFinding(d, today);
      if (f) { f.line = d.line; findings.push(f); }
    });
    if (akkaSeen && pekkoSeen) findings.push({ check: 'akka-pekko-mixed', sev: 'error', msg: pekkoSeen.artifact + ' sits next to ' + akkaSeen.artifact + ' (line ' + akkaSeen.line + '): half-migrated build, the BSL jars are still shipped', line: pekkoSeen.line });

    lines.forEach((l, i) => {
      const s = l.replace(/^\s+/, '');
      if (/^(\/\/|#|\*)/.test(s) || /%|<groupId>|com\.typesafe|com\.lightbend/.test(l)) return;
      if (/^akka\s*(\{|\.[\w-])/.test(s)) findings.push({ check: 'akka-config-ignored', sev: 'error', msg: 'Pekko never reads "' + s.split(/\s*[{=:]/)[0].trim() + '" → rename the root to pekko', line: i + 1 });
      if (/akka:\/\//.test(l)) findings.push({ check: 'akka-seed-protocol', sev: 'error', msg: 'akka:// address: a default Pekko node accepts only pekko:// → write pekko:// or set accept-protocol-names = ["akka", "pekko"]', line: i + 1 });
      const port = /(?:port\s*[=:]\s*|:)(25520|2552)\b/.exec(l);
      if (port) findings.push({ check: 'akka-default-port', sev: 'warning', msg: 'Port ' + port[1] + ' is the Akka default; Pekko listens on ' + (port[1] === '25520' ? '17355' : '7355') + ' unless you set it', line: i + 1 });
      if (/^import\s+akka[.{]/.test(s)) findings.push({ check: 'akka-import', sev: 'warning', msg: s.replace(/;$/, '') + ' → ' + s.replace(/^import\s+akka/, 'import org.apache.pekko').replace(/;$/, ''), line: i + 1 });
    });
    findings.sort((a, b) => a.line - b.line);
    return { findings };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.PEKKOENGINE = api;
})();
