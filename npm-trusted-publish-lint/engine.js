// npm Trusted Publish Lint - one brain, used by the extension and by the free web page.
(function (root) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.NPM_PUB_RULES;
  var LIST = (RULES && RULES.rules) ? RULES.rules : (RULES || []);

  // A granular npm write token cannot be given a lifetime longer than 90 days,
  // so the honest answer to "when does this break" is today + 90.
  var TOKEN_MAX_DAYS = 90;
  var CLASSIC_TOKENS_REVOKED = '2025-12-09';

  function addDays(iso, days) {
    var d = new Date(String(iso) + 'T00:00:00Z');
    if (isNaN(d.getTime())) return '';
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function fill(msg, today) {
    return String(msg)
      .replace(/\{today\}/g, today || 'today')
      .replace(/\{expiry90\}/g, addDays(today, TOKEN_MAX_DAYS) || 'the day it expires')
      .replace(/\{revoked\}/g, CLASSIC_TOKENS_REVOKED);
  }

  function check(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var lines = text.split(/\r?\n/);
    var findings = [];
    var seen = {};

    function push(rule, line) {
      var key = rule.id + '@' + line;
      if (seen[key]) return;
      seen[key] = 1;
      findings.push({ check: rule.id, sev: rule.sev || 'error', msg: fill(rule.msg, today), line: line });
    }

    LIST.forEach(function (rule) {
      if (rule.kind === 'file') {
        if (!new RegExp(rule.need, 'i').test(text)) return;
        if (rule.unless && new RegExp(rule.unless, 'i').test(text)) return;
        var at = 1;
        if (rule.anchor) {
          var re = new RegExp(rule.anchor, 'i');
          for (var i = 0; i < lines.length; i++) { if (re.test(lines[i])) { at = i + 1; break; } }
        }
        push(rule, at);
        return;
      }
      if (rule.unless && new RegExp(rule.unless, 'i').test(text)) return;
      var lre = new RegExp(rule.re, 'i');
      var ure = rule.unless_line ? new RegExp(rule.unless_line, 'i') : null;
      for (var j = 0; j < lines.length; j++) {
        var ln = lines[j];
        if (/^\s*#/.test(ln) && rule.id !== 'literal_npm_token') continue;
        if (!lre.test(ln)) continue;
        if (ure && ure.test(ln)) continue;
        push(rule, j + 1);
      }
    });

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = {
    engine: { check: check, addDays: addDays },
    RULES: LIST,
    RULE_COUNT: LIST.length,
    TOKEN_MAX_DAYS: TOKEN_MAX_DAYS,
    CLASSIC_TOKENS_REVOKED: CLASSIC_TOKENS_REVOKED
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof root !== 'undefined') root.NPMPUBENGINE = api;
  return api;
})(typeof window !== 'undefined' ? window : globalThis);
