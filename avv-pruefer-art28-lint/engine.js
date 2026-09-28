/* AVV-Prüfer engine: runs in Node (VS Code) and in the browser (index.html). */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.AV_RULES;
  function rx(s) { return new RegExp(s, 'i'); }
  function firstLine(lines, re) {
    for (var i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    return 0;
  }
  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/);
    var all = lines.join('\n');
    var out = [];
    RULES.forEach(function (r) {
      var re = rx(r.re);
      var and = r.and ? rx(r.and) : null;
      var unless = r.unless ? rx(r.unless) : null;
      var hit = function (line) { out.push({ check: r.id, sev: r.sev, msg: r.msg, line: line, ref: r.ref }); };
      if (r.kind === 'require') {
        if (!re.test(all) || (and && !and.test(all))) hit(1);
      } else if (r.kind === 'forbid') {
        lines.forEach(function (l, i) {
          if (re.test(l) && (!and || and.test(l)) && (!unless || !unless.test(l))) hit(i + 1);
        });
      } else if (r.kind === 'if_without') {
        var n = firstLine(lines, re);
        if (n && !unless.test(all)) hit(n);
      }
    });
    out.sort(function (a, b) { return a.line - b.line; });
    return { findings: out };
  }
  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.AVENGINE = api;
})();
