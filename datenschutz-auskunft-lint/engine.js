/* Datenschutz-Auskunft Linter - engine
   Prueft ein Auskunftsschreiben (Art. 15 DSGVO) auf Pflichtangaben, verbotene
   Bausteine und die Monatsfrist ab Eingang des Antrags (Art. 12 Abs. 3 DSGVO).
   Laeuft unveraendert in Node (VS Code) und im Browser (freie Webseite). */
'use strict';

var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.AUSKUNFT_RULES;

function rx(src, flags) { return new RegExp(src, flags || 'i'); }

function parseDate(s) {
  if (!s) return null;
  var m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s));
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(String(s));
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return null;
}

function de(d) {
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return p(d.getUTCDate()) + '.' + p(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear();
}

function addMonths(d, n) {
  var first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  var last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d.getUTCDate(), last)));
}

function days(a, b) { return Math.round((a - b) / 86400000); }

function lineOf(lines, re) {
  for (var i = 0; i < lines.length; i++) { if (re.test(lines[i])) return i + 1; }
  return 1;
}

function check(text, opts) {
  text = String(text == null ? '' : text);
  opts = opts || {};
  var lines = text.split(/\r?\n/);
  var findings = [];

  for (var r = 0; r < RULES.length; r++) {
    var rule = RULES[r];

    if (rule.mode === 'require') {
      var parts = rule.re_all || [rule.re];
      var missing = false;
      for (var p = 0; p < parts.length; p++) {
        if (!rx(parts[p]).test(text)) { missing = true; break; }
      }
      if (missing) {
        findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: 1 });
      }

    } else if (rule.mode === 'forbid') {
      if (rule.not_doc && rx(rule.not_doc).test(text)) { continue; }
      var hit = rx(rule.re);
      var bad = rule.not_line ? rx(rule.not_line) : null;
      for (var i = 0; i < lines.length; i++) {
        if (hit.test(lines[i]) && !(bad && bad.test(lines[i]))) {
          findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: i + 1 });
          break;
        }
      }

    } else if (rule.mode === 'deadline') {
      var today = parseDate(opts.today);
      var dm = rx(rule.date_re).exec(text);
      if (!dm) {
        findings.push({
          check: rule.id, sev: 'warn', line: 1,
          msg: 'Kein Eingangsdatum im Schreiben - die Monatsfrist (Art. 12 Abs. 3 DSGVO) ist nicht nachweisbar.'
        });
        continue;
      }
      var eingang = parseDate(dm[1]);
      if (!eingang || !today) { continue; }
      var months = rx(rule.verlaengerung_re).test(text) ? rule.extended_months : rule.months;
      var frist = addMonths(eingang, months);
      var left = days(frist, today);
      if (left < 0) {
        findings.push({
          check: rule.id, sev: rule.sev, line: lineOf(lines, rx(rule.date_re)),
          msg: 'Frist am ' + de(frist) + ' abgelaufen (' + (-left) + ' Tage überfällig, Eingang ' +
               de(eingang) + ', ' + months + ' Monat(e) nach Art. 12 Abs. 3 DSGVO).'
        });
      } else if (left <= rule.warn_days) {
        findings.push({
          check: rule.id, sev: 'warn', line: lineOf(lines, rx(rule.date_re)),
          msg: 'Frist endet am ' + de(frist) + ' - nur noch ' + left +
               ' Tage (Eingang ' + de(eingang) + ', Art. 12 Abs. 3 DSGVO).'
        });
      }
    }
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings, today: opts.today || null };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };

if (typeof module !== 'undefined') { module.exports = API; }
if (typeof window !== 'undefined') { window.AUSKUNFTENGINE = API; }
