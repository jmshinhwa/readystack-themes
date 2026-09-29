// Torihiki-tekiseika (取適法 2026) purchase-order linter — same file runs in VS Code and the browser.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.TORITEKI_RULES;
  function rx(s) { return new RegExp(s, 'u'); }
  function toAscii(s) { return s.replace(/[０-９．％]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }); }
  function check(text, opts) {
    text = toAscii(String(text || ''));
    var lines = text.split(/\r?\n/), findings = [];
    RULES.forEach(function (r) {
      if (r.kind === 'missing') {
        if (r.when && !rx(r.when).test(text)) return;
        if (!rx(r.re).test(text)) findings.push({ check: r.id, sev: r.sev, msg: r.msg, fix: r.fix, law: r.law, line: 1, text: '' });
        return;
      }
      var re = rx(r.re), not = r.not ? rx(r.not) : null;
      lines.forEach(function (l, i) {
        var m = l.match(re);
        if (!m || (not && not.test(l))) return;
        if (r.kind === 'max' && !(parseFloat(m[r.group]) > r.limit)) return;
        if (r.kind === 'min' && !(parseFloat(m[r.group]) < r.limit)) return;
        findings.push({ check: r.id, sev: r.sev, msg: r.msg, fix: r.fix, law: r.law, line: i + 1, text: l.trim().slice(0, 120) });
      });
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, rule_count: RULES.length };
  }
  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.TORITEKI_ENGINE = api;
})();
