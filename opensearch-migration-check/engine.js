/* OpenSearch migration check: one rule per Elastic-only line. Same file runs in VS Code and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.OSM_RULES;
  var DAY = 86400000;

  function toDay(v) {
    var s = String(v || '').slice(0, 10);
    var d = new Date(s + 'T00:00:00Z');
    if (isNaN(d.getTime())) { var n = new Date(); d = new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); }
    return d;
  }

  function eosNote(rule, m, today) {
    var e = rule.eos;
    if (!e || !m[1] || m[1].indexOf(e.tag_prefix) !== 0) return '';
    var cut = toDay(e.date);
    var days = Math.round(Math.abs(cut - today) / DAY);
    return ' ' + (today < cut ? e.before : e.after).replace('{days}', days) + '.';
  }

  function check(text, opts) {
    opts = opts || {};
    var today = toDay(opts.today);
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    lines.forEach(function (line, i) {
      var t = line.trim();
      if (!t || t.charAt(0) === '#' || t.indexOf('//') === 0) return;
      RULES.forEach(function (r) {
        var m = new RegExp(r.re, r.flags || '').exec(line);
        if (!m) return;
        findings.push({ check: r.id, sev: r.sev, line: i + 1,
          msg: r.msg + '.' + eosNote(r, m, today) + ' Fix: ' + r.fix + '.',
          text: t.slice(0, 120), fix: r.fix });
      });
    });
    return { findings: findings, errors: findings.filter(function (f) { return f.sev === 'error'; }).length,
      warnings: findings.filter(function (f) { return f.sev === 'warn'; }).length, rules: RULES.length };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.OSMENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
