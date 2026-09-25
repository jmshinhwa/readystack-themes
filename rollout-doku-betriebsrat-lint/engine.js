/* Rollout-Doku Lint engine: runs in Node (VS Code) and in the browser (index.html). */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.RD_RULES;
  var DATE = /(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\.(\d{1,2})\.(\d{4})/;
  function rx(s) { return new RegExp(s, 'i'); }
  function pad(n) { return (n.length < 2 ? '0' : '') + n; }
  function isoDate(s) {
    var m = DATE.exec(s);
    if (!m) return null;
    return m[1] ? m[1] + '-' + m[2] + '-' + m[3] : m[6] + '-' + pad(m[5]) + '-' + pad(m[4]);
  }
  function firstLine(lines, re) {
    for (var i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    return 0;
  }
  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/);
    var all = lines.join('\n');
    var out = [];
    RULES.forEach(function (r) {
      var re = rx(r.re);
      var hit = function (line, msg) { out.push({ check: r.id, sev: r.sev, msg: msg || r.msg, line: line, ref: r.ref }); };
      if (r.kind === 'require') {
        if (!re.test(all)) hit(1);
      } else if (r.kind === 'forbid') {
        lines.forEach(function (l, i) { if (re.test(l)) hit(i + 1); });
      } else if (r.kind === 'if_without') {
        var n = firstLine(lines, re);
        if (n && !rx(r.unless).test(all)) hit(n);
      } else if (r.kind === 'order') {
        var g = firstLine(lines, re);
        if (!g) return;
        var gd = isoDate(lines[g - 1]);
        var u = firstLine(lines, rx(r.unless));
        var ud = u ? isoDate(lines[u - 1]) : null;
        if (!ud) hit(g, r.msg_missing);
        else if (ud >= gd) hit(u, r.msg.replace('{u}', ud).replace('{g}', gd));
      }
    });
    out.sort(function (a, b) { return a.line - b.line; });
    return { findings: out };
  }
  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.RDENGINE = api;
})();
