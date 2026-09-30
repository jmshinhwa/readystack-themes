// Yosys migration check engine: finds Vivado-only constructs in Verilog/SystemVerilog.
// Same file runs in node (VS Code) and in the browser (web page).
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.YOSYS_RULES;
  var COMPILED = RULES.map(function (r) { return { rule: r, re: new RegExp(r.re, 'i') }; });

  // Blank out // and /* */ comments but keep line numbers, so a comment that names
  // xpm_cdc_single does not count. `pragma / `protect directives are not comments.
  function stripComments(text) {
    var out = '', i = 0, n = text.length, inStr = false;
    while (i < n) {
      var c = text[i], d = text[i + 1];
      if (inStr) { out += c; if (c === '\\') { out += d || ''; i += 2; continue; } if (c === '"') inStr = false; i++; continue; }
      if (c === '"') { inStr = true; out += c; i++; continue; }
      if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') { out += ' '; i++; } continue; }
      if (c === '/' && d === '*') {
        i += 2; out += '  ';
        while (i < n && !(text[i] === '*' && text[i + 1] === '/')) { out += text[i] === '\n' ? '\n' : ' '; i++; }
        i += 2; out += '  '; continue;
      }
      out += c; i++;
    }
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    var src = stripComments(String(text || '').replace(/\r\n?/g, '\n'));
    var lines = src.split('\n');
    var findings = [];
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li].replace(/[\t\f\v ]+/g, ' ');
      if (!line.trim()) continue;
      for (var k = 0; k < COMPILED.length; k++) {
        var m = COMPILED[k].re.exec(line);
        if (!m) continue;
        var r = COMPILED[k].rule;
        findings.push({ check: r.id, sev: r.sev, line: li + 1,
          msg: m[0].trim() + ': ' + r.msg + ' → ' + r.fix });
      }
    }
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.YOSYSENGINE = api;
})();
