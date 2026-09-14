// LaTeX Submission Lint - one engine, used by the VS Code extension and by the free web page.
// check(text, opts) -> { findings: [{check, sev, msg, line}], checked, today }

var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.LSL_RULES;

function lineOf(text, index) {
  var n = 1;
  for (var i = 0; i < index && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) n++;
  }
  return n;
}

function check(text, opts) {
  opts = opts || {};
  var src = String(text == null ? '' : text);
  var today = String(opts.today || '2026-09-13');
  var todayYear = parseInt(today.slice(0, 4), 10) || 2026;
  var findings = [];

  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i];

    if (r.kind === 'require_any') {
      if (!new RegExp(r.pattern, 'i').test(src)) {
        findings.push({ check: r.check, sev: r.sev, msg: r.msg, line: 1 });
      }

    } else if (r.kind === 'forbid') {
      var re = new RegExp(r.pattern, 'gi');
      var m, hits = 0;
      while ((m = re.exec(src)) !== null) {
        findings.push({ check: r.check, sev: r.sev, msg: r.msg, line: lineOf(src, m.index) });
        if (m.index === re.lastIndex) re.lastIndex++;
        if (++hits >= 25) break;
      }

    } else if (r.kind === 'stale_date') {
      var dm = new RegExp(r.pattern, 'i').exec(src);
      if (dm) {
        var year = parseInt(dm[1], 10);
        if (year && year < todayYear) {
          findings.push({
            check: r.check, sev: r.sev, line: lineOf(src, dm.index),
            msg: r.msg.replace('{year}', String(year)).replace('{today}', today)
          });
        }
      }
    }
  }

  findings.sort(function (a, b) { return (a.line - b.line) || a.check.localeCompare(b.check); });
  return { findings: findings, checked: RULES.length, today: today };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.LSLENGINE = API;
