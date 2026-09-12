'use strict';
// CRA 24/72/14 Reporting Lint — the engine. The same bytes run in VS Code and in the free web page.
var RULES = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
  ? require('./rules.json')
  : (typeof CRA_RULES !== 'undefined' ? CRA_RULES : []);

var TODAY_DEFAULT = '2026-09-11';          // the day Article 14 reporting started applying
var SUPPORT_MIN_YEARS = 5;                 // Art. 13(8) default expectation

function lineOf(text, index) {
  var n = 1;
  for (var i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function ymd(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  var y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return y * 10000 + mo * 100 + d;
}

function plusYears(n, years) {
  return n + years * 10000;
}

function supportDates(text) {
  var out = [];
  var re = /(?:support period|end of support|end-of-support|supported until|security updates)[^\n]{0,90}?(\d{4}-\d{2}-\d{2})/gi;
  var m;
  while ((m = re.exec(text)) !== null) {
    var v = ymd(m[1]);
    if (v) out.push({ raw: m[1], val: v, line: lineOf(text, m.index) });
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  return out;
}

function finding(rule, line, extra) {
  return {
    check: rule.id,
    sev: rule.sev,
    line: line,
    msg: extra ? rule.msg + ' ' + extra : rule.msg,
    fix: rule.fix,
    cite: rule.cite
  };
}

function check(text, opts) {
  opts = opts || {};
  var src = String(text == null ? '' : text);
  var today = ymd(opts.today) || ymd(TODAY_DEFAULT);
  var lines = src.split(/\r?\n/);
  var findings = [];
  var dates = supportDates(src);

  for (var r = 0; r < RULES.length; r++) {
    var rule = RULES[r];
    if (rule.kind === 'date') {
      for (var d = 0; d < dates.length; d++) {
        var dt = dates[d];
        if (rule.mode === 'past' && dt.val < today) {
          findings.push(finding(rule, dt.line, 'Declared end ' + dt.raw + ', today ' + (opts.today || TODAY_DEFAULT) + '.'));
        } else if (rule.mode === 'short' && dt.val >= today && dt.val < plusYears(today, SUPPORT_MIN_YEARS)) {
          findings.push(finding(rule, dt.line, 'Declared end ' + dt.raw + ', five years from today is ' + String(plusYears(today, SUPPORT_MIN_YEARS)).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') + '.'));
        }
      }
      continue;
    }
    if (!rule.re) continue;
    if (rule.kind === 'wrong') {
      var re = new RegExp(rule.re, 'i');
      for (var i = 0; i < lines.length; i++) if (re.test(lines[i])) findings.push(finding(rule, i + 1));
    } else {
      if (!(new RegExp(rule.re, 'i')).test(src)) findings.push(finding(rule, 0));
    }
  }

  findings.sort(function (a, b) { return (a.line - b.line) || (a.check < b.check ? -1 : a.check > b.check ? 1 : 0); });
  return {
    findings: findings,
    counted: RULES.length,
    errors: findings.filter(function (f) { return f.sev === 'error'; }).length,
    warnings: findings.filter(function (f) { return f.sev === 'warn'; }).length,
    today: opts.today || TODAY_DEFAULT
  };
}

var CRAENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, VERSION: '1.0.0' };
if (typeof module !== 'undefined' && module.exports) module.exports = CRAENGINE;
else window.CRAENGINE = CRAENGINE;
