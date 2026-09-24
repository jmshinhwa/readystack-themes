// Python upgrade lint: stdlib modules and APIs removed in Python 3.12, 3.13 and 3.14.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PYUP_RULES;
  var COMPILED = RULES.map(function (r) {
    return { r: r, res: r.patterns.map(function (p) { return new RegExp(p); }) };
  });
  var TARGETS = ['3.12', '3.13', '3.14'];

  function ver(v) { var p = String(v).split('.'); return (+p[0]) * 100 + (+p[1] || 0); }

  // Blank out string literals and trailing comments so "cgi" inside a docstring does not fire.
  function codeOnly(line) {
    return line.replace(/("""|''').*?\1/g, '""').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""').replace(/#.*$/, '');
  }

  function check(text, opts) {
    opts = opts || {};
    var target = TARGETS.indexOf(String(opts.target)) >= 0 ? String(opts.target) : '3.14';
    var tv = ver(target);
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    var inDoc = null;
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (inDoc) { if (raw.indexOf(inDoc) >= 0) inDoc = null; continue; }
      var m = raw.match(/^\s*[rbuRBU]{0,2}("""|''')/);
      if (m && raw.split(m[1]).length === 2) { inDoc = m[1]; continue; }
      var code = codeOnly(raw);
      if (!code.trim()) continue;
      for (var k = 0; k < COMPILED.length; k++) {
        var c = COMPILED[k], r = c.r;
        if (ver(r.removed_in) > tv) continue;
        for (var j = 0; j < c.res.length; j++) {
          if (c.res[j].test(code)) {
            var verb = r.sev === 'warn' ? 'Deprecated since' : 'Removed in';
            findings.push({ check: r.id, sev: r.sev, line: i + 1, removed_in: r.removed_in,
              msg: r.msg + ' ' + verb + ' Python ' + r.removed_in + ' (' + r.source + '). Fix: ' + r.fix });
            break;
          }
        }
      }
    }
    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return { findings: findings, target: target, errors: errors, warnings: findings.length - errors };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, TARGETS: TARGETS };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.PYUPENGINE = api;
})();
