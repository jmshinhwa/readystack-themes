// Green Claim Lint - EU EmpCo 2026
// Directive (EU) 2024/825 ("empowering consumers for the green transition")
// amends UCPD 2005/29/EC + CRD 2011/83/EU. Member State measures apply from 2026-09-27.
// Same file runs in Node (VS Code extension) and in the browser (free web page).

(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.GCL_RULES;

  var APPLIES_FROM = RULES.applies_from;   // 2026-09-27

  function compile(rule) {
    if (rule._c) return rule._c;
    rule._c = {
      any: (rule.any || []).map(function (p) { return new RegExp(p, 'i'); }),
      not_line: (rule.not_line || []).map(function (p) { return new RegExp(p, 'i'); }),
      doc_not_any: (rule.doc_not_any || []).map(function (p) { return new RegExp(p, 'i'); })
    };
    return rule._c;
  }

  // Product copy arrives as HTML or Markdown. Strip tags, entities and code so a
  // class name like <span class="eco-box"> is never read as a marketing claim.
  function visibleText(line) {
    return line
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z]+;|&#\d+;/gi, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/\]\([^)]*\)/g, '] ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function daysBetween(a, b) {
    return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var raw = String(text == null ? '' : text).split(/\r?\n/);

    // Build the visible-text view once, skipping <script>/<style> blocks.
    var lines = [];
    var skip = null;
    for (var i = 0; i < raw.length; i++) {
      var l = raw[i];
      if (skip) { if (skip.test(l)) skip = null; lines.push(''); continue; }
      if (/<script\b/i.test(l) && !/<\/script>/i.test(l)) { skip = /<\/script>/i; lines.push(''); continue; }
      if (/<style\b/i.test(l) && !/<\/style>/i.test(l)) { skip = /<\/style>/i; lines.push(''); continue; }
      lines.push(visibleText(l));
    }
    var doc = lines.join('\n');

    var findings = [];
    for (var r = 0; r < RULES.rules.length; r++) {
      var rule = RULES.rules[r];
      var c = compile(rule);

      // A page-level escape hatch: "repairable" is fine when the page also
      // carries spare-parts / repair-manual information.
      var docExempt = false;
      for (var d = 0; d < c.doc_not_any.length; d++) {
        if (c.doc_not_any[d].test(doc)) { docExempt = true; break; }
      }
      if (docExempt) continue;

      for (var n = 0; n < lines.length; n++) {
        var line = lines[n];
        if (!line) continue;

        var hit = null;
        for (var a = 0; a < c.any.length; a++) {
          var m = line.match(c.any[a]);
          if (m) { hit = m[0]; break; }
        }
        if (!hit) continue;

        var excused = false;
        for (var x = 0; x < c.not_line.length; x++) {
          if (c.not_line[x].test(line)) { excused = true; break; }
        }
        if (excused) continue;

        findings.push({
          check: rule.id,
          sev: rule.sev,
          msg: rule.msg + ' Found: "' + hit + '".',
          line: n + 1,
          clause: rule.clause,
          phrase: hit,
          fix: rule.fix,
          text: line.length > 160 ? line.slice(0, 157) + '...' : line
        });
      }
    }

    findings.sort(function (p, q) { return p.line - q.line; });

    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return {
      findings: findings,
      summary: {
        law: RULES.law,
        applies_from: APPLIES_FROM,
        today: today,
        days_to_empco: daysBetween(today, APPLIES_FROM),
        rule_count: RULES.rules.length,
        errors: errors,
        warnings: findings.length - errors,
        penalty: RULES.penalty
      }
    };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.rules.length };
  root.GCLENGINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
