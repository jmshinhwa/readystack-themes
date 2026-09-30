/* OpenTofu migration lint: one engine for VS Code and the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.OT_RULES;
  var TOFU_OLD = [1, 11, 14];   // newest OpenTofu that still reads required_version as its own constraint
  var BSL_FROM = [1, 6, 0];     // Terraform LICENSE: "Terraform Version 1.6.0 or later"

  function compile(r) {
    return (r.pats || []).map(function (p) {
      return { re: new RegExp(p.re), near: p.near ? new RegExp(p.near) : null, within: p.within || 5 };
    });
  }
  var COMPILED = RULES.map(function (r) { return { rule: r, pats: compile(r) }; });

  function ver(s) {
    var v = String(s).split('.').map(function (x) { return parseInt(x, 10) || 0; });
    return [v[0] || 0, v[1] || 0, v[2] || 0];
  }
  function cmp(a, b) { for (var i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; } return 0; }

  // one clause: ">= 1.6", "~> 1.9.0", "= 1.9.8", "1.9.8"
  function satisfies(v, op, s) {
    var t = ver(s), c = cmp(v, t), parts = String(s).split('.').length;
    switch (op) {
      case '>=': return c >= 0;
      case '>': return c > 0;
      case '<=': return c <= 0;
      case '<': return c < 0;
      case '!=': return c !== 0;
      case '~>':
        if (c < 0) return false;
        return parts >= 3 ? (v[0] === t[0] && v[1] === t[1]) : v[0] === t[0];
      default: return c === 0;
    }
  }

  // pin = OpenTofu 1.11.14 fails it · bsl = its lower bound is Terraform 1.6.0+
  function reqVerdict(line) {
    var m = /^\s*required_version\s*=\s*"([^"]+)"/.exec(line);
    if (!m) return {};
    var out = { pin: false, bsl: false };
    m[1].split(',').forEach(function (cl) {
      var c = /^\s*(>=|<=|~>|!=|>|<|=)?\s*v?(\d+(?:\.\d+){0,2})\s*$/.exec(cl);
      if (!c) return;
      var op = c[1] || '=';
      if (!satisfies(TOFU_OLD, op, c[2])) out.pin = true;
      if (op !== '<' && op !== '<=' && op !== '!=' && cmp(ver(c[2]), BSL_FROM) >= 0) out.bsl = true;
    });
    return out;
  }

  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*(#|\/\/)/.test(line)) continue;
      var req = reqVerdict(line);
      for (var k = 0; k < COMPILED.length; k++) {
        var r = COMPILED[k].rule, hit = false;
        if (r.kind === 'req_version') {
          hit = !!req[r.when];
        } else {
          for (var p = 0; p < COMPILED[k].pats.length && !hit; p++) {
            var pat = COMPILED[k].pats[p];
            if (!pat.re.test(line)) continue;
            if (!pat.near) { hit = true; break; }
            for (var b = i; b >= 0 && b >= i - pat.within; b--) {
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
  if (typeof window !== 'undefined') window.OTENGINE = api;
})();
