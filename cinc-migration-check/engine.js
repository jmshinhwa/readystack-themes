/* Cinc migration check: one rule per line that pulls licensed Chef. Same file runs in VS Code and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.CINC_RULES;
  var DAY = 86400000;

  function toDay(v) {
    var s = String(v || '').slice(0, 10);
    var d = new Date(s + 'T00:00:00Z');
    if (isNaN(d.getTime())) { var n = new Date(); d = new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); }
    return d;
  }

  function eolNote(rule, today) {
    var e = rule.eol;
    if (!e) return '';
    var cut = toDay(e.date);
    var days = Math.round(Math.abs(cut - today) / DAY);
    return ': ' + (today < cut ? e.before : e.after).replace('{days}', days);
  }

  function check(text, opts) {
    opts = opts || {};
    var today = toDay(opts.today);
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    lines.forEach(function (line, i) {
      var t = line.trim();
      if (!t || t.charAt(0) === '#' || t.indexOf('//') === 0 || t.indexOf('REM ') === 0) return;
      RULES.forEach(function (r) {
        if (!new RegExp(r.re, r.flags || '').test(line)) return;
        findings.push({ check: r.id, sev: r.sev, line: i + 1,
          msg: r.msg + eolNote(r, today) + '. Fix: ' + r.fix + '.',
          text: t.slice(0, 120), fix: r.fix });
      });
    });
    return { findings: findings, errors: findings.filter(function (f) { return f.sev === 'error'; }).length,
      warnings: findings.filter(function (f) { return f.sev === 'warn'; }).length, rules: RULES.length };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.CINCENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
