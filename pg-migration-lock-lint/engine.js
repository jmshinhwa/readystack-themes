'use strict';
// Postgres Migration Lock Lint - one brain, used by the VS Code extension and by the free web page.
// Rules live in rules.json so the same file can be read by node or injected into the browser page.
var PGML_DOC = (typeof module !== 'undefined') ? require('./rules.json') : window.PGML_RULES;
var PGML_RULE_LIST = Array.isArray(PGML_DOC) ? PGML_DOC : PGML_DOC.rules;
var PGML_TARGET_PG = 'PostgreSQL 12-17';

// Blank out comments without moving any character, so reported line numbers stay exact.
function pgmlStrip(text) {
  function blank(m) { return m.replace(/[^\n]/g, ' '); }
  return String(text)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/--[^\n]*/g, blank)
    .replace(/^[ \t]*#[^\n]*/gm, blank);
}

function pgmlLineAt(text, offset) {
  var n = 1;
  for (var i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) { n++; }
  }
  return n;
}

// SQL is graded per statement (a statement can span many lines); frameworks are graded per line.
function pgmlStatements(text) {
  var out = [], start = 0;
  for (var i = 0; i <= text.length; i++) {
    if (i === text.length || text.charAt(i) === ';') {
      var raw = text.slice(start, i);
      if (raw.trim()) { out.push({ text: raw, offset: start }); }
      start = i + 1;
    }
  }
  return out;
}

function pgmlCheck(text, opts) {
  opts = opts || {};
  var src = pgmlStrip(text == null ? '' : text);
  var stmts = pgmlStatements(src);
  var lines = src.split(/\r?\n/);
  var findings = [], seen = {};

  function push(rule, line) {
    var key = rule.id + '@' + line;
    if (seen[key]) { return; }
    seen[key] = 1;
    findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: line });
  }
  function rx(pattern, flags) { return new RegExp(pattern, flags); }

  for (var r = 0; r < PGML_RULE_LIST.length; r++) {
    var rule = PGML_RULE_LIST[r];
    var pf = rule.flags || 'i', af = 'im';
    if (rule.on === 'file') {
      if (rule.require && !rx(rule.require, af).test(src)) { continue; }
      var fm = rx(rule.pattern, pf).exec(src);
      if (!fm) { continue; }
      if (rule.absent && rx(rule.absent, af).test(src)) { continue; }
      push(rule, pgmlLineAt(src, fm.index));
    } else if (rule.on === 'line') {
      for (var i = 0; i < lines.length; i++) {
        var lm = rx(rule.pattern, pf).exec(lines[i]);
        if (!lm) { continue; }
        if (rule.absent && rx(rule.absent, af).test(lines[i])) { continue; }
        if (rule.present && !rx(rule.present, af).test(lines[i])) { continue; }
        push(rule, i + 1);
      }
    } else {
      for (var s = 0; s < stmts.length; s++) {
        var st = stmts[s];
        var sm = rx(rule.pattern, pf).exec(st.text);
        if (!sm) { continue; }
        if (rule.absent && rx(rule.absent, af).test(st.text)) { continue; }
        if (rule.present && !rx(rule.present, af).test(st.text)) { continue; }
        push(rule, pgmlLineAt(src, st.offset + sm.index));
      }
    }
  }
  findings.sort(function (a, b) {
    return (a.line - b.line) || (a.check < b.check ? -1 : a.check > b.check ? 1 : 0);
  });
  return { findings: findings, rule_count: PGML_RULE_LIST.length, target_pg: PGML_TARGET_PG };
}

var PGML_API = { engine: { check: pgmlCheck }, RULES: PGML_RULE_LIST, RULE_COUNT: PGML_RULE_LIST.length };
if (typeof module !== 'undefined' && module.exports) { module.exports = PGML_API; }
if (typeof window !== 'undefined') { window.PGMLENGINE = PGML_API; }
