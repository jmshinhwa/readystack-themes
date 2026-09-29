/* OpenBao migration lint: one engine for VS Code and the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.OB_RULES;
  var IMG = /\bhashicorp\/vault(-enterprise)?(?![\w-])(?::([0-9A-Za-z._+-]+))?/;
  var SKIP_IMG = /^\s*source\s*=|\bhelm\b|^\s*chart:/;

  function compile(r) {
    return (r.pats || []).map(function (p) {
      return { re: new RegExp(p.re), near: p.near ? new RegExp(p.near) : null, within: p.within || 5 };
    });
  }
  var COMPILED = RULES.map(function (r) { return { rule: r, pats: compile(r) }; });

  // bsl = Vault 1.15.0+ / latest / enterprise · old = before 1.14.1 · null = 1.14.1-1.14.x
  function imageVerdict(line) {
    if (SKIP_IMG.test(line)) return null;
    var m = IMG.exec(line);
    if (!m) return null;
    if (m[1]) return 'bsl';
    var tag = m[2] || 'latest';
    var v = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(tag);
    if (!v) return 'bsl';
    var maj = +v[1], min = +v[2], pat = v[3] ? +v[3] : 0;
    if (maj > 1 || min >= 15) return 'bsl';
    if (min < 14 || (min === 14 && pat < 1)) return 'old';
    return null;
  }

  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var img = imageVerdict(line);
      for (var k = 0; k < COMPILED.length; k++) {
        var r = COMPILED[k].rule, hit = false;
        if (r.kind === 'vault_image') {
          hit = img === r.when;
        } else {
          for (var p = 0; p < COMPILED[k].pats.length && !hit; p++) {
            var pat = COMPILED[k].pats[p];
            if (!pat.re.test(line)) continue;
            if (!pat.near) { hit = true; break; }
            for (var b = i - 1; b >= 0 && b >= i - pat.within; b--) {
              if (pat.near.test(lines[b])) { hit = true; break; }
            }
          }
        }
        if (hit) findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' Fix: ' + r.fix, line: i + 1 });
      }
    }
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.OBENGINE = api;
})();
