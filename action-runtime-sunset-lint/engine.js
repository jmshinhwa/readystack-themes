// Action Runtime Sunset Lint — one brain, used by the editor extension and by the free web page.
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.ARS_RULES;

// The runtime clock this linter is built around: GitHub retires the node20 action runtime on 2026-09-23.
var SUNSET = { runtime: 'node20', date: '2026-09-23', successor: 'node24' };

function dayDiff(from, to) {
  var a = Date.parse(from + 'T00:00:00Z'), b = Date.parse(to + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || new Date().toISOString().slice(0, 10);
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var findings = [], counts = { dead: 0, due: 0, aging: 0 };

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (/^\s*#/.test(line)) continue;
    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      if (!new RegExp(rule.re).test(line)) continue;

      var state = rule.state, sev = rule.sev, left = null;
      if (state === 'due' && rule.due) {
        left = dayDiff(today, rule.due);
        if (left !== null && left <= 0) { state = 'dead'; sev = 'high'; }
      }
      var msg = rule.msg + ' Move to: ' + rule.fix + '.';
      if (left !== null) {
        msg = (left > 0 ? 'In ' + left + ' day' + (left === 1 ? '' : 's') + ': ' : 'Already retired: ') + msg;
      }
      findings.push({
        check: rule.id, sev: sev, msg: msg, line: i + 1,
        state: state, fix: rule.fix, days_left: left,
        evidence: line.replace(/^\s+/, '').slice(0, 120)
      });
      if (state === 'dead' || state === 'archived') counts.dead++;
      else if (state === 'due') counts.due++;
      else counts.aging++;
    }
  }

  var toSunset = dayDiff(today, SUNSET.date);
  return {
    findings: findings,
    counts: counts,
    rule_count: RULES.length,
    today: today,
    sunset: SUNSET.date,
    sunset_runtime: SUNSET.runtime,
    days_to_sunset: toSunset,
    verdict: findings.length === 0 ? 'green' : (counts.dead ? 'red' : 'amber')
  };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, SUNSET: SUNSET };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.ARSENGINE = API;
