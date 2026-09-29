/* js-licence-key-gate engine: one file in, licence-key findings out. Same file runs in node and the browser. */
(function () {
  var DOC = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : (typeof window !== 'undefined' ? window.JLK_RULES : []);
  var RULES = Array.isArray(DOC) ? DOC : (DOC && DOC.rules) || [];

  function lineAt(text, idx) {
    var n = 1;
    for (var i = 0; i < idx && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
    return n;
  }

  function check(text, opts) {
    text = String(text || '').replace(/\r\n?/g, '\n');
    var findings = [];
    RULES.forEach(function (r) {
      var flags = 'g' + (r.flags || '');
      if (r.type === 'present') {
        var re = new RegExp(r.pattern, flags), m;
        while ((m = re.exec(text)) !== null) {
          findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' Fix: ' + r.fix, line: lineAt(text, m.index) });
          if (m[0] === '') re.lastIndex++;
        }
      } else if (r.type === 'absent') {
        var w = new RegExp(r.when, flags).exec(text);
        if (w && !new RegExp(r.need, r.flags || '').test(text)) {
          findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' Fix: ' + r.fix, line: lineAt(text, w.index) });
        }
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.JLKENGINE = API;
})();
