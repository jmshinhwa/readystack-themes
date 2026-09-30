/* Sentry -> GlitchTip migration lint. Same file runs in VS Code (node) and in the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.GT_RULES;
  // Item types GlitchTip ingest accepts vs. ignores: glitchtip-backend apps/event_ingest/schema.py (SupportedItemType / IgnoredItemType)
  var INGESTED = ['event', 'transaction', 'user_report', 'feedback', 'log', 'otel_log'];
  var COMPILED = RULES.map(function (r) { return { r: r, re: new RegExp(r.pattern) }; });

  function isComment(line) { return /^\s*(\/\/|#(?!\s*!)|\*|\/\*|<!--|;)/.test(line); }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    var dropped = {};
    lines.forEach(function (line, i) {
      if (isComment(line)) return;
      COMPILED.forEach(function (c) {
        if (!c.re.test(line)) return;
        if (c.r.item && c.r.item !== 'transaction') dropped[c.r.item] = 1;
        var what = c.r.item ? ' [envelope item: ' + c.r.item + ']' : '';
        findings.push({ check: c.r.id, sev: c.r.sev, msg: c.r.msg + what + ' Fix: ' + c.r.fix, line: i + 1, title: c.r.title, fix: c.r.fix, item: c.r.item });
      });
    });
    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return { findings: findings, summary: { total: findings.length, errors: errors, dropped_item_types: Object.keys(dropped), ingested: INGESTED } };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.GTENGINE = api;
})();
