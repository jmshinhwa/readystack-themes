/* 派遣契約書チェック — engine (Node + browser) */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.HAKEN_RULES;

  function lineOf(lines, re) {
    for (var i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    return 0;
  }
  function titleLine(lines) {
    for (var i = 0; i < lines.length; i++) if (lines[i].trim()) return i + 1;
    return 1;
  }
  function check(text, opts) {
    text = String(text || '').replace(/\r\n?/g, '\n');
    var lines = text.split('\n'), findings = [], top = titleLine(lines);
    RULES.forEach(function (r) {
      var msg = r.label + '（' + r.law + '）— 例：' + r.fix;
      if (r.type === 'require' || r.type === 'when_require') {
        if (r.type === 'when_require' && !new RegExp(r.when).test(text)) return;
        var ok = r.any.some(function (p) { return new RegExp(p).test(text); });
        if (!ok) findings.push({ check: r.id, sev: r.sev, line: top, msg: 'ありません：' + msg, label: r.label, law: r.law, fix: r.fix });
      } else if (r.type === 'forbid') {
        if (r.unless && new RegExp(r.unless).test(text)) return;
        var re = new RegExp(r.re), skip = r.skip ? new RegExp(r.skip) : null;
        lines.forEach(function (ln, i) {
          if (skip && skip.test(ln)) return;
          if (re.test(ln)) findings.push({ check: r.id, sev: r.sev, line: i + 1, msg: r.label + '（' + r.law + '）— 直し方：' + r.fix, label: r.label, law: r.law, fix: r.fix, text: ln.trim() });
        });
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return { findings: findings, errors: errors, warnings: findings.length - errors, rules: RULES.length };
  }
  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.HAKENENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
