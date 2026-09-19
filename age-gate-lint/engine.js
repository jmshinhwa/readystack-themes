/* Age Gate Lint — reads one HTML file and names every age gate Ofcom would not call
   highly effective. Same file runs in Node (extension) and in the browser (web page). */
(function (root, factory) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.AGEGATE_RULES;
  var api = factory(RULES);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AGEGATE_ENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis, function (RULES) {

  var HEAA_IN_FORCE = '2025-07-25';           // Ofcom HEAA duties applied from this date
  var GATE_MARK = /(age-?gate|age-?wall|age-?verif|age-?check|over-?18|18\+|21\+|adult\s*content)/i;

  function lineOf(text, index) {
    var n = 1;
    for (var i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
    return n;
  }

  function daysBetween(a, b) {
    var ms = Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z');
    if (isNaN(ms)) return null;
    return Math.round(ms / 86400000);
  }

  function check(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var findings = [];
    var gateSignals = 0;
    var firstGateLine = 1;

    if (GATE_MARK.test(text)) {
      gateSignals++;
      firstGateLine = lineOf(text, text.search(GATE_MARK));
    }

    RULES.forEach(function (rule) {
      if (rule.mode !== 'line') return;
      var re = new RegExp(rule.re, (rule.flags || '') + 'g');
      var m;
      while ((m = re.exec(text)) !== null) {
        if (m[0] === '') { re.lastIndex++; continue; }
        gateSignals++;
        findings.push({
          check: rule.id,
          sev: rule.sev,
          msg: rule.msg + ' [' + rule.clause + ']',
          line: lineOf(text, m.index),
          fix: rule.fix,
          hit: m[0].trim().slice(0, 60)
        });
      }
    });

    RULES.forEach(function (rule) {
      if (rule.mode !== 'absent_when_gate') return;
      if (gateSignals === 0) return;
      var re = new RegExp(rule.re, rule.flags || '');
      if (re.test(text)) return;
      findings.push({
        check: rule.id,
        sev: rule.sev,
        msg: rule.msg + ' [' + rule.clause + ']',
        line: firstGateLine,
        fix: rule.fix,
        hit: ''
      });
    });

    findings.sort(function (a, b) { return a.line - b.line; });

    var today = opts.today || null;
    var exposedDays = today ? daysBetween(HEAA_IN_FORCE, today) : null;
    var high = findings.filter(function (f) { return f.sev === 'high'; }).length;

    return {
      findings: findings,
      summary: {
        gate_signals: gateSignals,
        high: high,
        med: findings.length - high,
        heaa_in_force: HEAA_IN_FORCE,
        exposed_days: exposedDays,
        rule_count: RULES.length
      }
    };
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, HEAA_IN_FORCE: HEAA_IN_FORCE };
});
