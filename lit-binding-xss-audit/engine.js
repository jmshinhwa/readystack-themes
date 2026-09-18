/* Lit Template Binding Audit - one brain, used by the extension and by the web page. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.LITBIND_RULES;

  function rx(pattern, flags) { return new RegExp(pattern, flags || ''); }

  function lineRules() {
    return RULES.filter(function (r) { return r.kind === 'line'; });
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || '';
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var findings = [];
    var fired = {};
    var inStyle = false;
    var inScript = false;

    var styleRule = RULES.filter(function (r) { return r.kind === 'style'; })[0];
    var scriptRule = RULES.filter(function (r) { return r.kind === 'script'; })[0];
    var line = lineRules();

    for (var i = 0; i < lines.length; i++) {
      var src = lines[i];
      var no = i + 1;
      var seen = {};

      var opensStyle = /<style[\s>]/i.test(src);
      var opensScript = /<script[\s>]/i.test(src);

      if ((inStyle || opensStyle) && !/<style[^>]*>[^<]*<\/style>/i.test(src) && src.indexOf('${') !== -1 && styleRule) {
        findings.push(mk(styleRule, no, src));
        seen[styleRule.id] = 1;
      }
      if ((inScript || opensScript) && src.indexOf('${') !== -1 && scriptRule) {
        findings.push(mk(scriptRule, no, src));
        seen[scriptRule.id] = 1;
      }

      if (opensStyle) { inStyle = true; }
      if (/<\/style>/i.test(src)) { inStyle = false; }
      if (opensScript) { inScript = true; }
      if (/<\/script>/i.test(src)) { inScript = false; }

      for (var j = 0; j < line.length; j++) {
        var r = line[j];
        if (r.skip_if && seen[r.skip_if]) { continue; }
        var m = rx(r.re, 'i').exec(src);
        if (!m) { continue; }
        if (r.unless) {
          var probe = r.capture ? (m[r.capture] || '') : src;
          if (rx(r.unless, 'i').test(probe)) { continue; }
        }
        seen[r.id] = 1;
        fired[r.id] = fired[r.id] || no;
        findings.push(mk(r, no, src));
      }
      if (seen[styleRule && styleRule.id]) { fired[styleRule.id] = fired[styleRule.id] || no; }
      if (seen[scriptRule && scriptRule.id]) { fired[scriptRule.id] = fired[scriptRule.id] || no; }
    }

    RULES.filter(function (r) { return r.kind === 'file'; }).forEach(function (r) {
      var need = rx(r.needs, 'i');
      var at = 0;
      for (var i = 0; i < lines.length; i++) {
        if (need.test(lines[i])) { at = i + 1; break; }
      }
      if (!at) { return; }
      if (r.unless && rx(r.unless, 'i').test(text)) { return; }
      findings.push(mk(r, at, lines[at - 1]));
    });

    var high = findings.filter(function (f) { return f.sev === 'high'; });
    RULES.filter(function (r) { return r.kind === 'date'; }).forEach(function (r) {
      if (!high.length) { return; }
      if (!today || today < r.since) { return; }
      findings.push(mk(r, high[0].line, ''));
    });

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  function mk(rule, line, src) {
    return {
      check: rule.id,
      sev: rule.sev,
      msg: rule.msg,
      fix: rule.fix,
      line: line,
      snippet: String(src || '').trim().slice(0, 120)
    };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.LITBINDENGINE = api;
  if (typeof module !== 'undefined') { module.exports = api; }
})(typeof window !== 'undefined' ? window : globalThis);
