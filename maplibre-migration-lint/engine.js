/* MapLibre migration lint: one engine for VS Code and the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.ML_RULES;
  var COMMENT = /^\s*(\/\/|\/\*|\*|<!--|#)/;

  var COMPILED = RULES.map(function (r) {
    return {
      rule: r,
      pats: (r.pats || []).map(function (p) {
        return { re: new RegExp(p.re), near: p.near ? new RegExp(p.near) : null, within: p.within || 0 };
      })
    };
  });

  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (COMMENT.test(l)) continue;
      for (var k = 0; k < COMPILED.length; k++) {
        var r = COMPILED[k].rule;
        for (var p = 0; p < COMPILED[k].pats.length; p++) {
          var pat = COMPILED[k].pats[p];
          if (!pat.re.test(l)) continue;
          // Lockfile rules: the version line only counts under a mapbox-gl entry a few lines up.
          if (pat.near) {
            var ok = false;
            for (var b = i - 1; b >= 0 && b >= i - pat.within; b--) if (pat.near.test(lines[b])) { ok = true; break; }
            if (!ok) continue;
          }
          findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' Fix: ' + r.fix, line: i + 1 });
          break;
        }
      }
    }
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.MLENGINE = api;
})();
