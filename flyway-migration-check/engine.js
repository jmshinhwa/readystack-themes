// Flyway Migration Check engine: finds Liquibase Community 5.x (FSL) ties line by line.
// Same file runs in Node (VS Code extension, verify) and in the browser (free web page).
(function (root) {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.FW_RULES;

  const VER_RES = [
    /<liquibase(?:[.-][\w]+)*[.-]version>\s*(\d+)\.(\d+)\.?(\d+)?/i,          // <liquibase.version>5.0.1</liquibase.version>
    /org\.liquibase:liquibase-[\w-]+:\s*["']?(\d+)\.(\d+)\.?(\d+)?/,           // Gradle coordinate
    /liquibase(?:Version|[._-]version)\s*[=:]\s*["']?(\d+)\.(\d+)\.?(\d+)?/i,  // gradle.properties / ext
    /liquibase\/liquibase:(\d+)\.?(\d+)?\.?(\d+)?/                              // Docker image tag
  ];
  const PLAIN_VER = /<version>\s*(\d+)\.(\d+)\.?(\d+)?\s*<\/version>/;

  function addYears(iso, n) { return (+iso.slice(0, 4) + n) + iso.slice(4); }
  function asOf(opts) {
    const t = String((opts && opts.today) || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(t) && !isNaN(Date.parse(t)) ? t : new Date().toISOString().slice(0, 10);
  }

  function versionAt(lines, i) {
    const line = lines[i];
    for (const rx of VER_RES) { const m = line.match(rx); if (m) return m; }
    const m = line.match(PLAIN_VER);
    if (m && lines.slice(Math.max(0, i - 3), i).some(l => /<artifactId>\s*liquibase-/.test(l))) return m;
    return null;
  }

  function check(text, opts) {
    const lines = String(text || '').split(/\r?\n/);
    const today = asOf(opts);
    const findings = [];
    const verRule = RULES.find(r => r.kind === 'lbver');
    const compiled = RULES.map(r => r.re ? Object.assign({ rx: new RegExp(r.re, r.flags || '') }, r) : r);
    // file-level Liquibase major decides how hard the artifact lines hit
    let fileMajor = 0, fileFsl = false;
    lines.forEach((l, i) => {
      const m = versionAt(lines, i); if (!m) return;
      const major = +m[1]; fileMajor = Math.max(fileMajor, major);
      if (major >= 5) {
        const v = `${m[1]}.${m[2] || 0}.${m[3] || 0}`, rel = verRule.releases[v];
        if (!(rel && today >= addYears(rel, 2))) fileFsl = true;
      }
    });
    lines.forEach((line, i) => {
      if (/^\s*(#|\/\/|<!--)/.test(line)) return;
      for (const r of compiled) {
        if (r.kind === 'lbver') {
          const m = versionAt(lines, i); if (!m) continue;
          const v = `${m[1]}.${m[2] || 0}.${m[3] || 0}`, rel = r.releases[v];
          let sev = 'error', msg = r.msg;
          if (+m[1] < 5) { sev = 'warn'; msg = r.msg_v4; }
          else if (rel && today >= addYears(rel, 2)) { sev = 'info'; msg = r.msg_converted + ` (${v} released ${rel}, Apache-2.0 from ${addYears(rel, 2)})`; }
          else if (rel) msg += ` ${v} was released ${rel}; it turns Apache-2.0 on ${addYears(rel, 2)}.`;
          findings.push({ check: r.check, id: r.id, sev, msg, line: i + 1, text: line.trim() });
          continue;
        }
        if (!r.rx.test(line)) continue;
        let sev = r.sev;
        if (r.kind === 'lbart') sev = fileFsl ? 'error' : 'warn';
        findings.push({ check: r.check, id: r.id, sev, msg: r.msg, line: i + 1, text: line.trim() });
      }
    });
    return {
      findings,
      errors: findings.filter(f => f.sev === 'error').length,
      warnings: findings.filter(f => f.sev === 'warn').length,
      infos: findings.filter(f => f.sev === 'info').length,
      liquibase_major: fileMajor || null,
      as_of: today
    };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  root.FWENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
