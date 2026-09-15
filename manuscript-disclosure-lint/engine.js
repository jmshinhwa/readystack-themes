// Manuscript Disclosure Lint — the brain. Same file runs in Node (VS Code) and in the browser (free web page).
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.MDL_RULES;

function rx(p) { return new RegExp(p, 'i'); }
function lineOf(lines, re) { for (var i = 0; i < lines.length; i++) { if (re.test(lines[i])) return i + 1; } return 0; }
function slice(text, re, n) { var m = re.exec(text); return m ? text.slice(m.index, m.index + (n || 400)) : null; }
function days(from, to) { return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000); }

// {since:YYYY-MM-DD} -> "in force since 2026-07-01, 75 days ago" / "takes effect 2027-01-01, in 109 days"
function fmt(msg, today) {
  return String(msg).replace(/\{since:(\d{4}-\d{2}-\d{2})\}/g, function (_, d) {
    var n = days(d, today);
    return n >= 0 ? ('in force since ' + d + ', ' + n + ' day' + (n === 1 ? '' : 's') + ' ago')
                  : ('takes effect ' + d + ', in ' + (-n) + ' day' + (n === -1 ? '' : 's'));
  });
}

function check(text, opts) {
  opts = opts || {};
  var today = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today || '')) ? opts.today : new Date().toISOString().slice(0, 10);
  var src = String(text == null ? '' : text);
  var lines = src.split(/\r?\n/);
  var findings = [];
  function hit(r, line) {
    findings.push({ check: r.check, sev: r.sev || 'error', line: line || 1,
      msg: fmt(r.msg, today) + (r.fix ? ' → ' + r.fix : '') });
  }
  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i], anchor = 1, hay = src, whenRe;
    if (r.when) {
      whenRe = rx(r.when);
      if (!whenRe.test(src)) continue;
      anchor = lineOf(lines, whenRe) || 1;
    }
    if (r.scope) {
      var scopeRe = rx(r.scope);
      var s = slice(src, scopeRe, r.scope_chars || 400);
      if (s === null) continue;
      hay = s;
      anchor = lineOf(lines, scopeRe) || anchor;
    }
    if (r.ban) {
      var banRe = rx(r.ban);
      if (banRe.test(hay)) hit(r, lineOf(lines, banRe) || anchor);
      continue;
    }
    if (r.need && !rx(r.need).test(hay)) hit(r, anchor);
  }
  findings.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
  return { findings: findings, rule_count: RULES.length, today: today };
}

var MDLENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = MDLENGINE;
else window.MDLENGINE = MDLENGINE;
