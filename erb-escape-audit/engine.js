/* ERB Escape Audit - one brain, used by the VS Code extension and by the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : window.ERBAUDIT_RULES;

  var SEV_ORDER = { critical: 0, high: 1, medium: 2 };

  function compiled() {
    return RULES.map(function (r) {
      return {
        id: r.id,
        sev: r.sev,
        ctx: r.ctx || 'any',
        msg: r.msg,
        re: new RegExp(r.re),
        not: r.not ? new RegExp(r.not) : null
      };
    });
  }

  /* Script/style context covers the lines between the tags. The opening tag's
     own attributes are markup, not JavaScript, so they keep the "any" context. */
  function contextOf(line, state) {
    var ctx = state.open || 'any';
    var opened = /<(script|style)\b[^>]*>/i.exec(line);
    var closed = /<\/(script|style)\s*>/i.test(line);
    if (opened && closed) {
      ctx = opened[1].toLowerCase();
      state.open = null;
    } else if (closed) {
      state.open = null;
    } else if (opened && !/\bsrc\s*=/i.test(opened[0])) {
      state.open = opened[1].toLowerCase();
    }
    return ctx;
  }

  function check(text, opts) {
    opts = opts || {};
    var rules = compiled();
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var state = { open: null };
    var findings = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var ctx = contextOf(line, state);
      if (/^\s*<%#/.test(line)) continue;
      for (var k = 0; k < rules.length; k++) {
        var r = rules[k];
        if (r.ctx !== 'any' && r.ctx !== ctx) continue;
        if (!r.re.test(line)) continue;
        if (r.not && r.not.test(line)) continue;
        findings.push({
          check: r.id,
          sev: r.sev,
          msg: r.msg,
          line: i + 1,
          excerpt: line.trim().slice(0, 120)
        });
      }
    }

    findings.sort(function (a, b) {
      var d = SEV_ORDER[a.sev] - SEV_ORDER[b.sev];
      return d !== 0 ? d : a.line - b.line;
    });
    return { findings: findings, scanned_on: opts.today || '' };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.ERBAUDIT = API;
})();
