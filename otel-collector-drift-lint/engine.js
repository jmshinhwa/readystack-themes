/* OTel Collector Drift Lint - engine
 * One brain, two homes: this same file runs in the VS Code extension (require)
 * and in the free web page (window.OTEL_RULES).
 */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.OTEL_RULES;

  // `service:` pipelines repeat the component keys, so the section that matters
  // is the nearest component key, not the nearest top-level key.
  var SUBSECTION = {
    receivers: 'receivers',
    processors: 'processors',
    exporters: 'exporters',
    extensions: 'extensions',
    connectors: 'connectors',
    telemetry: 'service'
  };

  var compiled = null;
  function compile() {
    if (compiled) return compiled;
    compiled = RULES.map(function (r) {
      return {
        id: r.id,
        sev: r.sev,
        msg: r.msg,
        kind: r.kind || 'line',
        section: r.section || null,
        re: new RegExp(r.re),
        requires: r.requires ? new RegExp(r.requires, 'm') : null
      };
    });
    return compiled;
  }

  function stripComment(line) {
    var out = '';
    var quote = null;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '#') {
        break;
      }
      out += c;
    }
    return out;
  }

  function sectionOf(line, current) {
    var top = /^([A-Za-z_][A-Za-z0-9_]*):/.exec(line);
    if (top) return SUBSECTION[top[1]] || top[1];
    var nested = /^\s+([A-Za-z_][A-Za-z0-9_]*):/.exec(line);
    if (nested && SUBSECTION[nested[1]]) return SUBSECTION[nested[1]];
    return current;
  }

  function check(text, opts) {
    opts = opts || {};
    var rules = compile();
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var findings = [];
    var section = '';
    var i, j, rule, code;

    for (i = 0; i < lines.length; i++) {
      code = stripComment(lines[i]);
      if (!code.trim()) continue;
      section = sectionOf(code, section);
      for (j = 0; j < rules.length; j++) {
        rule = rules[j];
        if (rule.kind !== 'line') continue;
        if (rule.section && rule.section.indexOf(section) === -1) continue;
        var m = rule.re.exec(code);
        if (!m) continue;
        findings.push({
          check: rule.id,
          sev: rule.sev,
          msg: rule.msg,
          line: i + 1,
          excerpt: code.trim().slice(0, 120)
        });
      }
    }

    for (j = 0; j < rules.length; j++) {
      rule = rules[j];
      if (rule.kind !== 'absent') continue;
      if (rule.requires && !rule.requires.test(text)) continue;
      if (rule.re.test(text)) continue;
      findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: 1, excerpt: '' });
    }

    findings.sort(function (a, b) { return a.line - b.line; });

    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return {
      findings: findings,
      errors: errors,
      warnings: findings.length - errors,
      lines: lines.length,
      ruleCount: rules.length,
      today: opts.today || ''
    };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OTELDRIFT = api;
})(typeof window !== 'undefined' ? window : globalThis);
