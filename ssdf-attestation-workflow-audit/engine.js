/* SSDF Attestation Audit - one brain, used by the extension and by the free web page. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : (root.SSDF_RULES || []);

  // Federal obligations cluster at the end of the US federal fiscal year (30 September).
  function fiscalTail(today) {
    var m = String(today == null ? '' : today).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    var now = Date.UTC(y, mo - 1, d);
    if (isNaN(now)) return '';
    var end = Date.UTC(y, 8, 30); // 30 September of the same year
    if (end < now) end = Date.UTC(y + 1, 8, 30);
    var days = Math.round((end - now) / 86400000);
    var iso = (new Date(end)).toISOString().slice(0, 10);
    return ' Federal obligations cluster at fiscal-year end ' + iso + ' - ' + days + ' days from ' + m[0] + '.';
  }

  function check(text, opts) {
    var src = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
    var lines = src.split('\n');
    var tail = fiscalTail((opts && opts.today) || '');
    var findings = [];

    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      var flags = rule.flags || '';
      if (rule.mode === 'absent') {
        var whole = new RegExp(rule.re, flags.indexOf('m') >= 0 ? flags : flags);
        if (!whole.test(src)) {
          findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg + tail, line: 1 });
        }
        continue;
      }
      var per = new RegExp(rule.re, flags);
      for (var l = 0; l < lines.length; l++) {
        var line = lines[l];
        if (/^\s*#/.test(line)) continue;           // a comment is not a build step
        if (per.test(line)) {
          findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: l + 1 });
        }
      }
    }

    findings.sort(function (a, b) { return a.line - b.line || (a.check < b.check ? -1 : 1); });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.SSDFENGINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
