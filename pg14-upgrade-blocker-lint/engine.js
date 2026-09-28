// PostgreSQL 14 upgrade-blocker engine: flags lines that PostgreSQL 15, 16 or 17 removed or renamed.
// Sources: postgresql.org release notes 15.0 / 16.0 / 17.0 ("Migration to Version N") and the
// AWS Aurora/RDS PostgreSQL release calendars (14: end of standard support 28 February 2027).
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PGU_RULES;
  var COMPILED = RULES.map(function (r) { return { r: r, re: new RegExp(r.re, 'i') }; });
  var CLIFF = {
    version: 14, end_standard: '2027-02-28', es_year1: '2027-03-01', es_year3: '2029-03-01', es_end: '2030-02-28',
    rate_y1: 0.100, rate_y3: 0.200, region: 'US East (Ohio)'
  };
  // Extended Support per year for N vCPUs, running 8,760 hours (rate per vCPU-hour from the AWS pricing page).
  function extendedSupportPerYear(vcpus, year3) {
    return Math.round((+vcpus || 0) * (year3 ? CLIFF.rate_y3 : CLIFF.rate_y1) * 8760 * 100) / 100;
  }
  function stripComment(line) {
    var t = line.trim();
    if (t.charAt(0) === '#' || t.indexOf('//') === 0) return '';
    var out = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line.charAt(i);
      if (c === "'") q = !q;
      if (!q && c === '-' && line.charAt(i + 1) === '-' && !/[A-Za-z0-9]/.test(line.charAt(i + 2) || '')) break;
      if (!q && c === '#' && /^\s*$/.test(line.slice(0, i)) ) break;
      out += c;
    }
    return out;
  }
  function check(text, opts) {
    opts = opts || {};
    var target = +opts.target || 17;
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    for (var n = 0; n < lines.length; n++) {
      var code = stripComment(lines[n]);
      if (!code.trim()) continue;
      for (var k = 0; k < COMPILED.length; k++) {
        var c = COMPILED[k];
        if (c.r.v > target) continue;
        if (c.re.test(code)) {
          findings.push({ check: c.r.id, sev: c.r.sev, line: n + 1, removed_in: c.r.v,
            msg: c.r.msg + ' — fix: ' + c.r.fix + '. Blocks the 14 → ' + target + ' upgrade (Aurora/RDS PostgreSQL 14 standard support ends 28 February 2027).' });
        }
      }
    }
    var res = { findings: findings, target: target, cliff: CLIFF };
    if (opts.vcpus) res.extended_support_usd_per_year = extendedSupportPerYear(opts.vcpus, false);
    return res;
  }
  var api = { engine: { check: check, extendedSupportPerYear: extendedSupportPerYear }, RULES: RULES, RULE_COUNT: RULES.length, CLIFF: CLIFF };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.PGUENGINE = api;
})();
