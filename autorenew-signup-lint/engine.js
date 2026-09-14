// Auto-Renewal Checkout Lint — the brain. Same file runs in Node (VS Code) and in the browser (free web page).
// Rules live in rules.json; this file decides how each rule reads the page.
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.ARL_RULES;

function rx(p) { return new RegExp(p, 'i'); }
function anyMatch(pats, s) { for (var i = 0; i < (pats || []).length; i++) { if (rx(pats[i]).test(s)) return true; } return false; }
function allMatch(pats, s) { for (var i = 0; i < (pats || []).length; i++) { if (!rx(pats[i]).test(s)) return false; } return true; }
function firstLine(pats, lines) { for (var i = 0; i < lines.length; i++) { if (anyMatch(pats, lines[i])) return i + 1; } return 0; }
function days(a, b) { return Math.round((Date.parse(a) - Date.parse(b)) / 86400000); }

function check(text, opts) {
  text = String(text == null ? '' : text);
  opts = opts || {};
  var today = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today || '')) ? String(opts.today) : new Date().toISOString().slice(0, 10);
  var lines = text.split(/\r?\n/);
  var findings = [];
  var add = function (r, line, msg) { findings.push({ check: r.check, sev: r.sev || 'error', msg: msg || r.msg, line: line || 1 }); };

  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i];
    var mode = r.mode || 'doc';

    if (mode === 'doc') {
      var t = firstLine(r.trigger, lines);
      if (!t) continue;
      if (anyMatch(r.required, text)) continue;
      add(r, t);

    } else if (mode === 'line') {
      var hits = 0;
      for (var j = 0; j < lines.length && hits < 5; j++) {
        var ln = lines[j];
        if (r.any && !anyMatch(r.any, ln)) continue;
        if (r.all && !allMatch(r.all, ln)) continue;
        if (r.unless && anyMatch(r.unless, ln)) continue;
        add(r, j + 1); hits++;
      }

    } else if (mode === 'near') {
      var win = r.window || 12, shown = 0;
      for (var k = 0; k < lines.length && shown < 3; k++) {
        if (!anyMatch(r.trigger, lines[k])) continue;
        var near = false;
        for (var m = Math.max(0, k - win); m <= Math.min(lines.length - 1, k + win); m++) {
          if (anyMatch(r.near, lines[m])) { near = true; break; }
        }
        if (!near) { add(r, k + 1); shown++; }
      }

    } else if (mode === 'deadline') {
      var d = firstLine(r.trigger, lines);
      if (!d) continue;
      var gap = days(today, r.date);
      var when = gap >= 0
        ? ('has been in force since ' + r.date + ' — ' + gap + ' day' + (gap === 1 ? '' : 's') + ', so every point above is already enforceable')
        : ('takes effect ' + r.date + ' — ' + (-gap) + ' day' + (gap === -1 ? '' : 's') + ' left to ship the fixes');
      add(r, d, r.msg.replace('{when}', when));
    }
  }

  findings.sort(function (a, b) { return (a.line - b.line) || a.check.localeCompare(b.check); });
  return { findings: findings, checked: RULES.length, today: today };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else window.ARLENGINE = API;
