// EU AI Act Article 50 Disclosure Lint — the brain. The same file runs in Node (the extension) and in the browser (the free web page).
'use strict';
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.AIACT50_RULES;
var STANDARD = 'Regulation (EU) 2024/1689 (EU AI Act), Article 50';
var APPLIES_FROM = '2026-08-02';
var DEADLINE_RULE = 'art50-deadline';
var COMMENT = /^\s*(\/\/|#|\*|\/\*|<!--)/;

function compile(list) {
  return (list || []).map(function (s) { return new RegExp(s, 'i'); });
}
function anyMatch(res, s) {
  for (var i = 0; i < res.length; i++) { if (res[i].test(s)) return true; }
  return false;
}
function daysUntil(today, target) {
  var a = Date.parse(today + 'T00:00:00Z'), b = Date.parse(target + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}
function quote(line) {
  var t = String(line).trim();
  return t.length > 70 ? t.slice(0, 70) + '…' : t;
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || new Date().toISOString().slice(0, 10);
  text = String(text === null || text === undefined ? '' : text);
  var lines = text.split(/\r?\n/);
  // A disclosure that lives in a comment reaches nobody, so comment lines never count as evidence.
  var codeText = lines.filter(function (l) { return !COMMENT.test(l); }).join('\n');
  var findings = [];

  RULES.forEach(function (rule) {
    if (rule.id === DEADLINE_RULE) return;
    var when = compile(rule.when);
    if (!when.length) return;
    if (anyMatch(compile(rule.unless), codeText)) return;
    if (rule.needs && rule.needs.length && !anyMatch(compile(rule.needs), text)) return;
    for (var i = 0; i < lines.length; i++) {
      if (anyMatch(when, lines[i])) {
        findings.push({
          check: rule.id,
          sev: rule.sev,
          line: i + 1,
          msg: rule.art + ' — ' + rule.msg + ' Line: "' + quote(lines[i]) + '"'
        });
      }
    }
  });

  findings.sort(function (a, b) { return (a.line - b.line) || a.check.localeCompare(b.check); });

  if (findings.length) {
    var d = null;
    RULES.forEach(function (r) { if (r.id === DEADLINE_RULE) d = r; });
    var left = daysUntil(today, APPLIES_FROM);
    var clock = left === null ? 'The date could not be read from the given today value.'
      : left > 0 ? left + ' days left as of ' + today + ' to close the ' + findings.length + ' finding(s) in this file.'
      : left === 0 ? 'Today is ' + today + ': Article 50 applies from this day, with ' + findings.length + ' finding(s) still open in this file.'
      : 'Article 50 has applied for ' + (-left) + ' days as of ' + today + ', with ' + findings.length + ' finding(s) still open in this file.';
    findings.unshift({ check: DEADLINE_RULE, sev: d ? d.sev : 'info', line: 1, msg: (d ? d.msg : '') + ' ' + clock });
  }

  var counts = { error: 0, warn: 0, info: 0 };
  findings.forEach(function (f) { counts[f.sev] = (counts[f.sev] || 0) + 1; });

  return {
    findings: findings,
    standard: STANDARD,
    applies_from: APPLIES_FROM,
    days_left: daysUntil(today, APPLIES_FROM),
    today: today,
    counts: counts,
    rule_count: RULES.length
  };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.AIACT50ENGINE = API;
