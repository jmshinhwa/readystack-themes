/* RED Cybersecurity DoC Lint — one brain, used by the extension and by the free web page.
   Reads the rule table from ext/rules.json (node) or window.RED_RULES (browser). */
var RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : (typeof window !== 'undefined' ? window.RED_RULES : []);

/* Delegated Regulation (EU) 2022/30 first applied on this date, after (EU) 2023/2444 postponed it. */
var APPLICABLE_FROM = '2025-08-01';

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}
function rx(pattern, flags) {
  return new RegExp(pattern, flags || 'i');
}
function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86400000);
}
function issueDate(text) {
  var m = /(?:place and date of issue|date of issue|issued on|date)\s*:?\s*[^\n]*?(\d{4}-\d{2}-\d{2})/i.exec(text);
  return m ? { iso: m[1], line: lineOf(text, m.index) } : null;
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || '2026-09-17';
  var maxAge = Number(opts.review_days) > 0 ? Number(opts.review_days) : 0;
  text = String(text || '');
  var findings = [];
  var date = issueDate(text);

  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i];
    if (r.kind === 'require') {
      if (!rx(r.need).test(text)) findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: 1 });

    } else if (r.kind === 'forbid') {
      var re = rx(r.bad, 'gi'), m;
      while ((m = re.exec(text)) !== null) {
        findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: lineOf(text, m.index) });
        if (m.index === re.lastIndex) re.lastIndex++;
      }

    } else if (r.kind === 'pair') {
      var w = rx(r.when).exec(text);
      if (w && !rx(r.need).test(text)) {
        findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: lineOf(text, w.index) });
      }

    } else if (r.kind === 'date_min') {
      if (date) {
        var early = daysBetween(date.iso, r.min || APPLICABLE_FROM);
        if (early > 0) {
          findings.push({
            check: r.id, sev: r.sev, line: date.line,
            msg: r.msg + ' Dated ' + date.iso + ', ' + early + ' days before ' + (r.min || APPLICABLE_FROM) + '.'
          });
        }
      }

    } else if (r.kind === 'date_age') {
      var limit = maxAge || Number(r.max_days) || 365;
      if (date) {
        var age = daysBetween(date.iso, today);
        if (age > limit) {
          findings.push({
            check: r.id, sev: r.sev, line: date.line,
            msg: r.msg + ' Dated ' + date.iso + ', ' + age + ' days old on ' + today + ' (limit ' + limit + ').'
          });
        }
      }
    }
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.RED_ENGINE = API;
