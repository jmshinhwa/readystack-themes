/* Pytest Deprecation Lint — one brain, used by the extension and by the free web page. */
(function (root) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.PYTEST_DEP_RULES;

  function compiled(r) {
    if (!r._re) {
      r._re = new RegExp(r.re);
      if (r.ctx) r._ctx = new RegExp(r.ctx, 'm');
      if (r.prev_not) r._prev = new RegExp(r.prev_not);
      if (r.next_re) r._next = new RegExp(r.next_re);
    }
    return r;
  }

  function codeLine(s) {
    var t = s.trim();
    return t !== '' && t.charAt(0) !== '#';
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text);
    var lines = src.split(/\r?\n/);
    var findings = [];

    for (var i = 0; i < RULES.length; i++) {
      var r = compiled(RULES[i]);
      if (r._ctx && !r._ctx.test(src)) continue;
      for (var n = 0; n < lines.length; n++) {
        var line = lines[n];
        if (!codeLine(line)) continue;
        if (!r._re.test(line)) continue;
        if (r._prev) {
          var p = n - 1;
          while (p >= 0 && lines[p].trim() === '') p--;
          if (p >= 0 && r._prev.test(lines[p])) continue;
        }
        if (r._next) {
          var q = n + 1;
          while (q < lines.length && lines[q].trim() === '') q++;
          if (q >= lines.length || !r._next.test(lines[q])) continue;
        }
        findings.push({
          check: r.id,
          sev: r.sev,
          line: n + 1,
          msg: r.msg,
          fix: r.fix,
          text: line.trim().slice(0, 160)
        });
      }
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return {
      findings: findings,
      scanned_lines: lines.length,
      rule_count: RULES.length,
      errors: findings.filter(function (f) { return f.sev === 'error'; }).length,
      warnings: findings.filter(function (f) { return f.sev === 'warn'; }).length,
      today: opts.today || ''
    };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.PYTESTDEPENGINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
