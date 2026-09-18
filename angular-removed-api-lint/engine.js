// Angular Removed-API Lint — the whole brain. Same file runs in Node (the extension) and in the browser (the free web check).
'use strict';

var DATA = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.ANG_RULES;
var RULES = (DATA && DATA.rules) || [];
var SUPPORT = (DATA && DATA.support && DATA.support.majors) || {};
var POLICY = (DATA && DATA.policy) || '';

var SEV = { removed: 'error', support: 'error', deprecated: 'warning', advisory: 'info' };

// Blank out // and /* */ comments so a commented-out import is not a finding.
// Line breaks are preserved so reported line numbers stay true to the original file.
function stripComments(text) {
  var out = '', i = 0, n = text.length, ch, nx, q;
  while (i < n) {
    ch = text[i]; nx = text[i + 1];
    if (ch === '/' && nx === '/') {
      while (i < n && text[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (ch === '/' && nx === '*') {
      out += '  '; i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) { out += (text[i] === '\n' ? '\n' : ' '); i++; }
      if (i < n) { out += '  '; i += 2; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      q = ch; out += ch; i++;
      while (i < n) {
        if (text[i] === '\\') { out += text[i] + (text[i + 1] || ''); i += 2; continue; }
        out += text[i];
        if (text[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    out += ch; i++;
  }
  return out;
}

function toDay(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000;
}

function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

// The one date-sensitive check: an Angular major pinned in package.json is measured
// against its own 18-month window, as of the day you run the check.
function supportFinding(rule, line, major, today) {
  var info = SUPPORT[String(major)];
  var head = 'Angular ' + major + ' is pinned here. ';
  if (!info) {
    if (major < 12) {
      return { check: rule.id, sev: 'error', line: line,
        msg: head + 'Every major below 12 fell out of Angular’s 18-month support window before 2022-11-12: no patches, no security fixes. ' + rule.fix };
    }
    return null;
  }
  var end = toDay(info.lts_end), now = toDay(today);
  if (now === null || end === null) return null;
  var tail = 'Angular 18-month window: v' + major + ' shipped ' + info.released + ', support ended ' + info.lts_end + '. ';
  if (now > end) {
    return { check: rule.id, sev: 'error', line: line,
      msg: head + tail + 'That was ' + plural(Math.round(now - end), 'day') + ' before ' + today + ' — no patches and no security fixes are being published for this major. ' + rule.fix };
  }
  return null;
}

function check(text, opts) {
  text = String(text == null ? '' : text);
  opts = opts || {};
  var today = opts.today || new Date().toISOString().slice(0, 10);
  var lines = stripComments(text).split(/\r?\n/);
  var findings = [];

  for (var r = 0; r < RULES.length; r++) {
    var rule = RULES[r];
    if (!rule.re) continue;
    for (var i = 0; i < lines.length; i++) {
      var re = new RegExp(rule.re, rule.flags || '');
      var m = re.exec(lines[i]);
      if (!m) continue;
      if (rule.kind === 'support') {
        var f = supportFinding(rule, i + 1, parseInt(m[1], 10), today);
        if (f) findings.push(f);
        continue;
      }
      findings.push({
        check: rule.id,
        sev: SEV[rule.kind] || 'warning',
        line: i + 1,
        msg: rule.msg + ' ' + rule.fix
      });
    }
  }

  findings.sort(function (a, b) { return (a.line - b.line) || (a.check < b.check ? -1 : 1); });
  return { findings: findings, today: today, rule_count: RULES.length, policy: POLICY };
}

var ANGENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, stripComments: stripComments };
if (typeof module !== 'undefined' && module.exports) module.exports = ANGENGINE;
else window.ANGENGINE = ANGENGINE;
