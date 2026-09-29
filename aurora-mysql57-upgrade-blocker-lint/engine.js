/* Aurora MySQL 5.7 -> 8.0 upgrade blocker engine. Same file runs in VS Code (Node) and in the browser. */
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.AMY_RULES;
  var Y3 = '2026-12-01';

  // Blank out comments (keep length and newlines so line numbers stay true). /*! ... */ is executed by MySQL, so it stays.
  function mask(text) {
    return text
      .replace(/\/\*(?!!)[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, ' '); })
      .replace(/(^|[ \t])(--[ \t].*|#.*)$/gm, function (m, pre, c) { return pre + c.replace(/./g, ' '); })
      .replace(/^--$/gm, '  ');
  }

  function lineAt(text, idx) {
    var n = 1;
    for (var i = 0; i < idx; i++) if (text.charCodeAt(i) === 10) n++;
    return n;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var src = mask(String(text || '').replace(/\r\n?/g, '\n'));
    var findings = [], seen = {};
    RULES.forEach(function (r) {
      var re = new RegExp(r.re, 'gim'), m;
      while ((m = re.exec(src))) {
        if (m[0] === '') { re.lastIndex++; continue; }
        var line = lineAt(src, m.index + (m[0].length - m[0].replace(/^\s+/, '').length));
        var key = r.id + ':' + line;
        if (seen[key]) continue;
        seen[key] = 1;
        var msg = r.msg;
        if (r.id === 'aurora-v2-engine-version' && today >= Y3)
          msg = 'Aurora MySQL version 2 (MySQL 5.7): RDS Extended Support year 3 pricing is in effect since 1 Dec 2026 (end of Extended Support 30 Jun 2029).';
        findings.push({ check: r.id, sev: r.sev, msg: msg + ' Fix: ' + r.fix, line: line, match: m[0].trim().slice(0, 60) });
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.AMYENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
