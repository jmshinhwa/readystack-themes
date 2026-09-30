/* SeaweedFS migration lint: one engine for VS Code and the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SW_RULES;
  var COMPILED = RULES.map(function (r) {
    return { rule: r, pats: (r.pats || []).map(function (p) { return new RegExp(p.re); }) };
  });

  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*(#|\/\/)/.test(line)) continue;
      for (var k = 0; k < COMPILED.length; k++) {
        var r = COMPILED[k].rule;
        for (var p = 0; p < COMPILED[k].pats.length; p++) {
          if (COMPILED[k].pats[p].test(line)) {
            findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' Fix: ' + r.fix, line: i + 1 });
            break;
          }
        }
      }
    }
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.SWENGINE = api;
})();
