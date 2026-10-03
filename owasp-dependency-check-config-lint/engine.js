/* OWASP Dependency Check Config Lint — one brain for the extension and the free web page. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.ODC_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });

  function cmpVer(a, b) {
    const pa = String(a).split(/[.\-]/).map(n => parseInt(n, 10) || 0), pb = String(b).split(/[.\-]/).map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); }
    return 0;
  }
  function day(s) { const d = new Date(String(s || '').slice(0, 10) + 'T00:00:00Z'); return isNaN(d) ? null : d; }

  // Every place this file pulls Dependency-Check, with the version it pins: [{line, version, kind}]
  function map(text) {
    const lines = String(text || '').split(/\r?\n/), out = [];
    const props = {};
    lines.forEach(l => { const m = l.match(/<([\w.\-]+)>\s*([\d][\w.\-]*)\s*<\/\1>/); if (m) props[m[1]] = m[2]; });
    lines.forEach((l, i) => {
      let m;
      if (/<artifactId>\s*dependency-check-(maven|ant)\s*<\/artifactId>/i.test(l)) {
        for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
          const v = lines[j].match(/<version>\s*([^<\s]+)\s*<\/version>/i);
          if (v) { let ver = v[1]; const p = ver.match(/^\$\{([^}]+)\}$/); if (p) ver = props[p[1]] || ver; out.push({ line: j + 1, version: ver, kind: 'maven', raw: v[1] }); break; }
        }
      } else if ((m = l.match(/org\.owasp\.dependencycheck['"]?\)?\s*version\s*\(?\s*['"]([\d.]+)['"]/i))) out.push({ line: i + 1, version: m[1], kind: 'gradle-plugin' });
      else if ((m = l.match(/org\.owasp:dependency-check-(?:gradle|maven|ant|cli|core):([\d.]+)/i))) out.push({ line: i + 1, version: m[1], kind: 'coordinate' });
      else if ((m = l.match(/owasp\/dependency-check:v?([\d.]+)/i))) out.push({ line: i + 1, version: m[1], kind: 'docker' });
      else if ((m = l.match(/dependency-check-([\d.]+)-release\.zip/i))) out.push({ line: i + 1, version: m[1], kind: 'cli' });
    });
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    const today = day(opts.today) || day(new Date().toISOString());
    const src = String(text || ''), lines = src.split(/\r?\n/), findings = [];
    const add = (id, line, msg, sev) => findings.push({ check: id, sev: sev || R[id].sev, msg: R[id].title + ': ' + msg + ' Source: ' + R[id].source + '.', line });
    const uses = map(src);
    const mentions = /dependency-?check/i.test(src);

    // ODC001 version below the mandatory upgrade
    uses.forEach(u => {
      if (cmpVer(u.version, R.ODC001.mandatory) < 0) {
        const h2 = cmpVer(u.version, R.ODC001.h2_break) < 0 ? ' Crossing 11.0.0 also needs Java 11 and a one-time purge of the H2 database.' : '';
        add('ODC001', u.line, u.version + ' can no longer update NVD data. Replace with ' + R.ODC001.latest + ' (released ' + R.ODC001.latest_date + ').' + h2);
      }
    });
    let hasKey = false;
    lines.forEach((l, i) => {
      const n = i + 1; let m;
      if (/nvdApiKey|nvdApiServerId|NVD_API_KEY|\bapiKey\s*[=:(]/i.test(l)) hasKey = true;
      // ODC002 legacy feed properties
      if (/cveUrl(12|20)?(Modified|Base)|\b(urlModified|urlBase)\b/i.test(l)) add('ODC002', n, 'this setting points at the retired NVD data feed. Fix: ' + R.ODC002.fix + '.');
      // ODC003 hardcoded secrets
      if ((m = l.match(/<(nvdApiKey|ossIndexPassword)>\s*([^<\s][^<]*?)\s*<\/\1>/i)) && !/^\$\{/.test(m[2])) add('ODC003', n, m[1] + ' is a literal value committed to the repo. Fix: ' + R.ODC003.fix + '.');
      else if ((m = l.match(/\b(apiKey|password)\s*=\s*['"]([^'"$]+)['"]/i)) && mentions) add('ODC003', n, m[1] + ' is a literal string in the build file. Fix: System.getenv("NVD_API_KEY").');
      else if ((m = l.match(/--nvdApiKey[=\s]+([^\s$'"][^\s]*)/i))) add('ODC003', n, '--nvdApiKey is passed as a literal on the command line. Fix: --nvdApiKey "$NVD_API_KEY".');
      // ODC005 never-failing threshold
      if ((m = l.match(/(?:failBuildOnCVSS|failOnCVSS)\s*(?:>|=|\s)\s*['"]?(\d+(?:\.\d+)?)/i)) && parseFloat(m[1]) > 10) add('ODC005', n, 'CVSS ' + m[1] + ' is above the 10.0 maximum, so no CVE can ever fail the build. Fix: ' + R.ODC005.fix + '.');
      // ODC006 suppression until
      if ((m = l.match(/<suppress\b[^>]*\buntil\s*=\s*["'](\d{4}-\d{2}-\d{2})/i))) {
        const u = day(m[1]);
        if (u && today) {
          const dd = Math.round((u - today) / 86400000);
          if (dd <= 0) add('ODC006', n, 'expired on ' + m[1] + '; the CVEs it hid are reported again from that day. Fix: ' + R.ODC006.fix + '.');
          else if (dd <= R.ODC006.warn_days) add('ODC006', n, 'expires on ' + m[1] + ' (' + dd + ' days); the next scan after that reports the hidden CVEs again. Fix: ' + R.ODC006.fix + '.', 'warn');
        }
      }
      // ODC007 OSS Index on without credentials
      if (/ossindexAnalyzerEnabled\s*(?:>|=|:)\s*['"]?true/i.test(l) && !/ossIndex(Username|ServerId)|ossIndex[\s\S]{0,300}username/i.test(src)) add('ODC007', n, 'OSS Index is switched on, but no token is configured, so the analyzer is silently disabled. Fix: ' + R.ODC007.fix + '.');
      // ODC008 legacy OSS Index credentials
      if (/<ossIndex(Username|ServerId)>|--ossIndexUsername/i.test(l)) {
        const late = today && today >= day(R.ODC008.date);
        add('ODC008', n, late ? 'the end-of-2026 replacement date has passed; legacy OSS Index tokens may be rejected. Fix: ' + R.ODC008.fix + '.' : 'plan the switch before the end of 2026. Fix: ' + R.ODC008.fix + '.', late ? 'error' : 'warn');
      }
      // ODC009 Java 8 runtime in a file that runs Dependency-Check
      if (mentions && (/java-version\s*:\s*['"]?(1\.)?8(\.|['"\s]|$)/i.test(l) || /(eclipse-temurin|openjdk|amazoncorretto):8\b/i.test(l))) add('ODC009', n, 'Dependency-Check 11+ will not start on Java 8. Fix: ' + R.ODC009.fix + '.');
      // ODC010 Nexus v2
      if (/nexusAnalyzerEnabled\s*(?:>|=|:)\s*['"]?true|<nexusUrl>|\bnexusUrl\s*=/i.test(l)) add('ODC010', n, 'Nexus v2 support is marked for removal. Fix: ' + R.ODC010.fix + '.');
    });
    // ODC004 plugin present but no key anywhere
    if (uses.length && !hasKey) add('ODC004', uses[0].line, 'updates without a key are extremely slow and hit NVD rate limits in CI. Fix: ' + R.ODC004.fix + '.');
    findings.sort((a, b) => a.line - b.line);
    return { findings, uses };
  }

  const api = { engine: { check, map }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.ODCENGINE = api;
})();
