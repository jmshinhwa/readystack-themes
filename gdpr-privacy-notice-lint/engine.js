/* GDPR Privacy Notice Lint — one brain, used by the VS Code extension and by the free web page. */
var RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : (typeof window !== 'undefined' ? window.GDPRNOTICE_RULES : []);

var STALE_DAYS = 730;          // two years — a notice older than this describes a company that has changed
var DATE_RE = /(?:last updated|last revised|effective date|effective as of|version date)\s*[:\-–]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i;

function firstLineOf(lines, re) {
  for (var i = 0; i < lines.length; i++) { if (re.test(lines[i])) return i + 1; }
  return 1;
}

function daysBetween(a, b) { return Math.round((a - b) / 86400000); }

function check(text, opts) {
  opts = opts || {};
  text = String(text == null ? '' : text);
  var lines = text.split(/\r?\n/);
  var findings = [];

  for (var r = 0; r < RULES.length; r++) {
    var rule = RULES[r];

    if (rule.forbid) {
      var fre = new RegExp(rule.forbid, 'i');
      var hits = 0;
      for (var i = 0; i < lines.length && hits < 20; i++) {
        var m = lines[i].match(fre);
        if (m) {
          hits++;
          findings.push({ check: rule.id, sev: rule.sev, line: i + 1,
            msg: rule.msg + ' Found: ' + String(m[0]).slice(0, 40) + ' [' + rule.art + ']' });
        }
      }
      continue;
    }

    if (rule.all) {
      var missing = [];
      for (var a = 0; a < rule.all.length; a++) {
        if (!new RegExp(rule.all[a][1], 'i').test(text)) missing.push(rule.all[a][0]);
      }
      if (missing.length) {
        findings.push({ check: rule.id, sev: rule.sev, line: firstLineOf(lines, /right|rights/i),
          msg: rule.msg + ' ' + missing.join(', ') + ' (' + missing.length + ' of ' + rule.all.length + ') [' + rule.art + ']' });
      }
      continue;
    }

    if (rule.any) {
      var ok = false;
      for (var k = 0; k < rule.any.length; k++) {
        if (new RegExp(rule.any[k], 'i').test(text)) { ok = true; break; }
      }
      if (!ok) {
        findings.push({ check: rule.id, sev: rule.sev, line: 1, msg: rule.msg + ' [' + rule.art + ']' });
        continue;
      }
      if (rule.id === 'notice_date') {
        var dm = text.match(DATE_RE);
        var today = new Date((opts.today || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z');
        var when = dm ? new Date(Date.parse(dm[1] + ' UTC')) : null;
        if (!dm || !when || isNaN(when.getTime())) {
          findings.push({ check: 'notice_date', sev: 'warn', line: firstLineOf(lines, /last updated|last revised|effective/i),
            msg: 'The notice says it was updated but carries no readable date. [' + rule.art + ']' });
        } else {
          var age = daysBetween(today, when);
          if (age > STALE_DAYS) {
            findings.push({ check: 'notice_date', sev: 'warn', line: firstLineOf(lines, DATE_RE),
              msg: 'Notice last updated ' + dm[1] + ' — ' + age + ' days old, past the ' + STALE_DAYS + '-day mark. [' + rule.art + ']' });
          }
        }
      }
    }
  }

  findings.sort(function (x, y) { return (x.line || 0) - (y.line || 0); });
  return {
    findings: findings,
    errors: findings.filter(function (f) { return f.sev === 'error'; }).length,
    warnings: findings.filter(function (f) { return f.sev === 'warn'; }).length,
    ruleCount: RULES.length
  };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.GDPRNOTICE = API;
