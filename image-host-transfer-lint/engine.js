/* Image Host Transfer Lint - engine
 * One brain, two homes: Node (VS Code extension) and the browser (free web page).
 * It reads docs text line by line and names every asset URL that hands an EU
 * reader's IP address to a host outside the EEA.
 */
'use strict';

var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.IHT_RULES;

var URL_RE = /https?:\/\/|\/\//;
var FENCE_RE = /^\s*(?:```|~~~)/;

function compiled(rule) {
  if (!rule._re) rule._re = new RegExp(rule.pattern, 'i');
  return rule._re;
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || '2026-09-21';
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var findings = [];
  var inFence = false;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (FENCE_RE.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;                    // fenced blocks are examples, not live assets
    if (!URL_RE.test(line)) continue;         // a host named in prose is not a request

    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      if (!compiled(rule).test(line)) continue;
      findings.push({
        check: rule.check,
        sev: rule.sev,
        line: i + 1,
        msg: rule.msg,
        host: rule.host,
        country: rule.country,
        snippet: line.trim().slice(0, 120)
      });
      break;                                   // one line, one verdict
    }
  }

  return { findings: findings };
}

var engine = { check: check };

var API = { engine: engine, check: check, RULES: RULES, RULE_COUNT: RULES.length };

if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.IHTENGINE = API;
