// PyMuPDF -> pypdf migration map. Same file runs in node (extension, CI) and in the browser page.
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.PYPDFMIG_RULES;
  var COMPILED = RULES.map(function (r) { return { rule: r, re: new RegExp(r.re, r.flags || '') }; });
  var IMPORT_RE = /^\s*(?:import\s+(?:fitz|pymupdf)\b|from\s+(?:fitz|pymupdf)(?:\.\w+)*\s+import\b)/m;
  var CHECKED = Date.UTC(2026, 8, 30); // PyPI versions in the fixes were read on 2026-09-30

  function daysSinceChecked(today) {
    var m = String(today || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(t)) return '';
    var d = Math.round((t - CHECKED) / 86400000);
    return d > 0 ? ' (versions read on PyPI 2026-09-30, ' + d + ' days before ' + m[0] + ': recheck the pin)' : '';
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
    var usesPyMuPDF = IMPORT_RE.test(src);
    var tail = daysSinceChecked(opts.today);
    var lines = src.split('\n');
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*#/.test(line) || !line.trim()) continue;
      for (var k = 0; k < COMPILED.length; k++) {
        var c = COMPILED[k];
        if (c.rule.needs_import && !usesPyMuPDF) continue;
        if (!c.re.test(line)) continue;
        findings.push({
          check: c.rule.id, sev: c.rule.sev, line: i + 1,
          msg: c.rule.what + ' -> ' + c.rule.fix + (c.rule.id.indexOf('req-') === 0 ? tail : ''),
          found: line.trim(), fix: c.rule.fix
        });
      }
    }
    return { findings: findings, uses_pymupdf: usesPyMuPDF || findings.length > 0 };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PYPDFMIG_ENGINE = API;
})();
