/* Tailwind v4 Upgrade Blocker Lint - the one brain.
   Same file runs in Node (extension host) and in the browser (free web page). */
(function () {
  var DOC = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : (typeof window !== 'undefined' ? window.TWV4_RULES : []);
  var RULES = Array.isArray(DOC) ? DOC : ((DOC && DOC.rules) || []);

  var V4_RELEASED = '2025-01-22';

  function firstLine(lines, pattern) {
    if (!pattern) return 1;
    var re;
    try { re = new RegExp(pattern); } catch (e) { return 1; }
    for (var i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    return 1;
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text);
    var lines = src.split(/\r?\n/);
    // hard-wrapped markup splits a class string across lines: match the
    // presence gates against one flattened copy, keep line numbers on the original.
    var flat = src.replace(/\s+/g, ' ');
    var findings = [];

    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      var msg = rule.msg + (rule.fix ? ' -> ' + rule.fix : '');

      if (rule.bad) {
        var bad;
        try { bad = new RegExp(rule.bad); } catch (e) { continue; }
        for (var i = 0; i < lines.length; i++) {
          // trailing space so a token that ends the line still satisfies the lookahead
          if (bad.test(lines[i] + ' ')) {
            findings.push({ check: rule.id, sev: rule.sev || 'warn', msg: msg, line: i + 1 });
          }
        }
      } else if (rule.need) {
        var gateOn = true;
        if (rule.when) {
          try { gateOn = new RegExp(rule.when).test(flat); } catch (e) { gateOn = false; }
        }
        if (!gateOn) continue;
        var have;
        try { have = new RegExp(rule.need).test(flat); } catch (e) { have = true; }
        if (!have) {
          var hint = String(rule.when || '').split('[\\s\\S]*?').pop();
          findings.push({ check: rule.id, sev: rule.sev || 'warn', msg: msg, line: firstLine(lines, hint) });
        }
      }
    }

    findings.sort(function (a, b) { return a.line - b.line || (a.check < b.check ? -1 : 1); });

    return {
      findings: findings,
      summary: {
        lines: lines.length,
        rules: RULES.length,
        errors: findings.filter(function (f) { return f.sev === 'error'; }).length,
        since_v4: V4_RELEASED,
        today: opts.today || ''
      }
    };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.TWV4ENGINE = API;
})();
