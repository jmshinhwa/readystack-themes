// Lockfile due diligence engine: one file, used by the VS Code extension (node) and the web page (browser).
(function () {
  const RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.LDD_RULES;
  const BY = {};
  RULES.forEach(r => { BY[r.check] = r; });
  const CRA_DATE = '2027-12-11';
  const REGISTRY_HOSTS = ['registry.npmjs.org', 'registry.yarnpkg.com', 'registry.npmmirror.com'];
  const FLOATING = ['*', 'latest', 'x', 'X', '', 'next'];

  function daysLeft(today) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(today || '').trim());
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(t)) return null;
    return Math.round((Date.UTC(2027, 11, 11) - t) / 86400000);
  }

  function keyLines(text) {
    const map = {};
    text.split(/\r?\n/).forEach((ln, i) => {
      const m = /^\s*"([^"]+)"\s*:/.exec(ln);
      if (m && !(m[1] in map)) map[m[1]] = i + 1;
    });
    return map;
  }

  function hostOf(url) {
    const m = /^[a-z+]+:\/\/(?:[^@\/]*@)?([^\/:?#]+)/i.exec(url);
    return m ? m[1].toLowerCase() : '';
  }

  function check(text, opts) {
    opts = opts || {};
    const findings = [];
    const left = daysLeft(opts.today);
    const tail = left === null ? '' : (left > 0
      ? ` (CRA Art. 13(5) due diligence applies from ${CRA_DATE}: ${left} days)`
      : ` (CRA Art. 13(5) due diligence applies since ${CRA_DATE})`);
    let data;
    try { data = JSON.parse(String(text || '')); } catch (e) {
      return { findings: [], error: 'Not a valid package-lock.json: ' + e.message };
    }
    if (!data || typeof data !== 'object') return { findings: [], error: 'Not a package-lock.json object' };
    const lines = keyLines(String(text));
    const add = (check, line, what) => {
      const r = BY[check];
      findings.push({ check, sev: r.sev, line: line || 1, msg: `${r.id} ${r.title}: ${what}. Fix: ${r.fix}${tail}` });
    };

    const ver = data.lockfileVersion;
    let entries = [];
    if (data.packages && typeof data.packages === 'object' && ver !== 1) {
      Object.keys(data.packages).forEach(k => entries.push([k, data.packages[k]]));
    } else {
      add('lockfile-v1', lines.lockfileVersion, `lockfileVersion is ${ver === undefined ? 'missing' : ver}`);
      const walk = (deps, prefix) => {
        Object.keys(deps || {}).forEach(n => {
          const e = deps[n] || {};
          entries.push([prefix + 'node_modules/' + n, e]);
          walk(e.dependencies, prefix + 'node_modules/' + n + '/');
        });
      };
      walk(data.dependencies, '');
    }

    entries.forEach(([key, e]) => {
      if (!e || typeof e !== 'object') return;
      const name = key === '' ? (data.name || 'root') : key.replace(/^.*node_modules\//, '');
      const line = lines[key] || lines[name] || 1;
      const label = `${name}${e.version ? '@' + e.version : ''}`;
      if (key === '') {
        ['dependencies', 'devDependencies', 'optionalDependencies'].forEach(f => {
          const d = e[f] || {};
          Object.keys(d).forEach(n => {
            const range = String(d[n]).trim();
            if (FLOATING.indexOf(range) === -1) return;
            const src = String(text).split(/\r?\n/);
            const at = src.findIndex(l => l.indexOf('"' + n + '"') !== -1 && l.indexOf('"' + d[n] + '"') !== -1);
            add('floating-range', at >= 0 ? at + 1 : line, `"${n}": "${range}" in ${f}`);
          });
        });
        return;
      }
      if (e.link) return;
      if (e.hasInstallScript === true) add('install-script', line, `${label} runs a lifecycle script on npm install`);
      const res = typeof e.resolved === 'string' ? e.resolved.trim() : '';
      if (!res) return;
      const isGit = /^(git\+|git:|github:|gitlab:|bitbucket:)/i.test(res) || /^git@/i.test(res);
      if (isGit) { add('git-source', line, `${label} resolves to ${res.slice(0, 80)}`); return; }
      if (/^file:/i.test(res)) return;
      if (/^http:\/\//i.test(res)) add('http-resolved', line, `${label} resolves to ${res.slice(0, 80)}`);
      else if (/^https:\/\//i.test(res) && REGISTRY_HOSTS.indexOf(hostOf(res)) === -1) add('off-registry-tarball', line, `${label} comes from ${hostOf(res)}`);
      const integ = typeof e.integrity === 'string' ? e.integrity.trim() : '';
      if (!integ) add('missing-integrity', line, `${label} has resolved but no integrity`);
      else if (/^sha1-/i.test(integ) && !/sha(256|384|512)-/i.test(integ)) add('sha1-integrity', line, `${label} integrity is ${integ.slice(0, 16)}...`);
    });

    findings.sort((a, b) => a.line - b.line);
    return { findings };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.LDD_ENGINE = api;
})();
