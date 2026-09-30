/* FerretDB migration lint: SSPL MongoDB server images + commands FerretDB 2.7 does not implement.
   Same file runs in VS Code (node) and in the free web page. Sources: mongodb.com SSPL FAQ, docs.ferretdb.io/migration/compatibility (v2.7). */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FD_RULES;
  var SSPL_FROM = '2018-10-16';
  var LINE = [], DOC = [];
  RULES.forEach(function (r) {
    if (r.doc) DOC.push({ r: r, when: new RegExp(r.doc.when), unless: new RegExp(r.doc.unless) });
    else LINE.push({ r: r, res: r.pats.map(function (p) { return new RegExp(p); }) });
  });

  function isComment(line) { return /^\s*(#|\/\/|\*|\/\*)/.test(line); }

  function push(out, r, line) {
    out.push({ check: r.id, sev: r.sev, msg: r.msg + ' Fix: ' + r.fix, line: line, title: r.title, fix: r.fix });
  }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    lines.forEach(function (line, i) {
      if (isComment(line)) return;
      LINE.forEach(function (c) {
        for (var k = 0; k < c.res.length; k++) { if (c.res[k].test(line)) { push(findings, c.r, i + 1); return; } }
      });
    });
    var live = lines.map(function (l) { return isComment(l) ? '' : l; });
    DOC.forEach(function (c) {
      var at = -1;
      for (var i = 0; i < live.length; i++) { if (c.when.test(live[i])) { at = i; break; } }
      if (at >= 0 && !c.unless.test(live.join('\n'))) push(findings, c.r, at + 1);
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return { findings: findings, summary: { total: findings.length, errors: errors, sspl_from: SSPL_FROM, ferretdb: '2.7' } };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.FDENGINE = api;
})();
