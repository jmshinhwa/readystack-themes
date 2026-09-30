/* App Center -> Crashlytics migration lint. Same file runs in VS Code (node) and in the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.AC_RULES;
  var RETIRED = '2025-03-31';          // App Center retirement (learn.microsoft.com/appcenter/retirement)
  var DIAG_END = '2026-06-30';         // Analytics & Diagnostics extension end, same page
  var COMPILED = RULES.map(function (r) { return { r: r, re: new RegExp(r.pattern) }; });
  var ANALYTICS_RULES = { AC_TRACK_ERROR: 1, AC_TRACK_EVENT: 1, AC_START: 1, AC_ATTACH: 1, AC_CONSENT: 1 };

  function isComment(line) { return /^\s*(\/\/|#|\*|\/\*|<!--)/.test(line); }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    lines.forEach(function (line, i) {
      if (isComment(line)) return;
      COMPILED.forEach(function (c) {
        if (!c.re.test(line)) return;
        var sev = c.r.sev;
        var msg = c.r.msg;
        // Before the Diagnostics extension ended, crash/analytics calls still worked: warn only.
        if (ANALYTICS_RULES[c.r.id] && today < DIAG_END) { sev = 'warn'; msg += ' (still answering until ' + DIAG_END + ')'; }
        if (today < RETIRED && sev === 'error') sev = 'warn';
        findings.push({ check: c.r.id, sev: sev, msg: msg + ' Fix: ' + c.r.fix, line: i + 1, title: c.r.title, fix: c.r.fix });
      });
    });
    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return { findings: findings, summary: { total: findings.length, errors: errors, retired: RETIRED, diagnostics_end: DIAG_END, today: today } };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.ACENGINE = api;
})();
