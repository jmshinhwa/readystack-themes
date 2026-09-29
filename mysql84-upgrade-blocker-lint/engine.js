// MySQL 8.4 upgrade-blocker engine: flags SQL, my.cnf and parameter-group lines that MySQL 8.4 removed.
// Sources: dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html ("Features Removed in MySQL 8.4") and the
// Amazon RDS for MySQL release calendar (8.0: end of standard support 31 July 2026).
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.MYU_RULES;
  var COMPILED = RULES.map(function (r) { return { r: r, re: new RegExp(r.re, 'i'), un: r.unless ? new RegExp(r.unless, 'i') : null }; });
  var CLIFF = {
    version: '8.0', end_standard: '2026-07-31', es_year1: '2026-08-01', es_year3: '2028-08-01', es_end: '2029-07-31',
    rate_y1: 0.100, region: 'US East (Ohio)'
  };
  // RDS Extended Support per year for N vCPUs running 8,760 hours, at the year 1-2 rate per vCPU-hour.
  function extendedSupportPerYear(vcpus) {
    return Math.round((+vcpus || 0) * CLIFF.rate_y1 * 8760 * 100) / 100;
  }
  function stripComment(line) {
    var t = line.trim();
    if (t.charAt(0) === '#' || t.charAt(0) === ';' || t.indexOf('//') === 0) return '';
    var out = '', q = '';
    for (var i = 0; i < line.length; i++) {
      var c = line.charAt(i);
      if (!q && (c === "'" || c === '"')) q = c; else if (q && c === q) q = '';
      if (!q && c === '-' && line.charAt(i + 1) === '-' && /\s|$/.test(line.charAt(i + 2) || ' ')) break;
      if (!q && c === '/' && line.charAt(i + 1) === '*') break;
      if (!q && c === '#' && i > 0) break;
      out += c;
    }
    return out;
  }
  function check(text, opts) {
    opts = opts || {};
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    for (var n = 0; n < lines.length; n++) {
      var code = stripComment(lines[n]);
      if (!code.trim()) continue;
      for (var k = 0; k < COMPILED.length; k++) {
        var c = COMPILED[k];
        if (c.re.test(code) && !(c.un && c.un.test(code))) {
          findings.push({ check: c.r.id, sev: c.r.sev, line: n + 1,
            msg: c.r.msg + ' — fix: ' + c.r.fix + '. Blocks the RDS MySQL 8.0 → 8.4 upgrade (8.0 standard support ended 31 July 2026).' });
        }
      }
    }
    var res = { findings: findings, cliff: CLIFF };
    if (opts.vcpus) res.extended_support_usd_per_year = extendedSupportPerYear(opts.vcpus);
    return res;
  }
  var api = { engine: { check: check, extendedSupportPerYear: extendedSupportPerYear }, RULES: RULES, RULE_COUNT: RULES.length, CLIFF: CLIFF };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.MYUENGINE = api;
})();
