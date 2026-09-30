/* PySide6 Migration Lint engine: PyQt5/PyQt6 licence gate + PyQt-only API breaks. Same file runs in node and the browser. */
(function () {
  var DOC = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.PYS6_RULES;
  var RULES = Array.isArray(DOC) ? DOC : (DOC && DOC.rules) || [];
  var QT515_EOS = Date.UTC(2025, 4, 26);

  function dateTail(today) {
    var m = String(today || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(t)) return '';
    var d = Math.round((t - QT515_EOS) / 86400000);
    if (d > 0) return ' On ' + m[0] + ' that is ' + d + ' days without Qt 5.15 standard support.';
    if (d < 0) return ' On ' + m[0] + ' Qt 5.15 standard support ends in ' + (-d) + ' days.';
    return ' Qt 5.15 standard support ends today.';
  }

  // blank out '#' comments that are not inside a string literal
  function stripComment(line) {
    var q = null;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === '#') return line.slice(0, i);
    }
    return line;
  }

  var COMPILED = RULES.map(function (r) { return { r: r, re: new RegExp(r.re) }; });

  function check(text, opts) {
    opts = opts || {};
    var tail = dateTail(opts.today);
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      var code = stripComment(lines[i]);
      if (!code.trim()) continue;
      for (var k = 0; k < COMPILED.length; k++) {
        var r = COMPILED[k].r;
        if (!COMPILED[k].re.test(code)) continue;
        findings.push({ check: r.id, sev: r.sev, line: i + 1,
          msg: r.msg + (r.date ? tail : '') + ' Fix: ' + r.fix, src: lines[i].trim() });
      }
    }
    return { findings: findings, rule_count: RULES.length };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PYS6ENGINE = API;
})();
