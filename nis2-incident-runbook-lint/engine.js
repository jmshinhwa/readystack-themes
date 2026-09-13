// NIS2 Incident Runbook Lint - the whole brain. Same file runs in Node (extension) and in the browser (free web page).
'use strict';

var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.NIS2_RULES;

var WORDS = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
var UNIT_HOURS = {hour:1, hours:1, hr:1, hrs:1, h:1, day:24, days:24, week:168, weeks:168, month:720, months:720};
var QTY = /\b(\d{1,4}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[\s-]*(hours?|hrs?|h|days?|weeks?|months?)\b/gi;

function rx(p) { return new RegExp(p, 'i'); }
function splitLines(text) { return String(text == null ? '' : text).split(/\r?\n/); }

// every quantity on a line, normalised to hours
function quantities(line) {
  var out = [], m;
  QTY.lastIndex = 0;
  while ((m = QTY.exec(line)) !== null) {
    var n = WORDS[m[1].toLowerCase()] || parseInt(m[1], 10);
    var u = UNIT_HOURS[m[2].toLowerCase()];
    if (n && u) out.push(n * u);
  }
  return out;
}

function firstLine(lines, pattern) {
  var re = rx(pattern);
  for (var i = 0; i < lines.length; i++) { if (re.test(lines[i])) return i + 1; }
  return 0;
}

function monthsBetween(fromIso, toIso) {
  var a = new Date(fromIso + 'T00:00:00Z'), b = new Date(toIso + 'T00:00:00Z');
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}

function check(text, opts) {
  opts = opts || {};
  var today = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today || '')) ? opts.today : new Date().toISOString().slice(0, 10);
  var lines = splitLines(text);
  var findings = [];
  function add(rule, msg, line) { findings.push({check: rule.id, sev: rule.sev || 'error', msg: msg, line: line || 1}); }

  RULES.forEach(function (rule) {
    if (rule.kind === 'deadline') {
      var ln = firstLine(lines, rule.near);
      if (!ln) { add(rule, rule.msg, 1); return; }
      var want = rule.expect * (rule.unit === 'months' ? 720 : rule.unit === 'days' ? 24 : 1);
      var qs = quantities(lines[ln - 1]);
      if (!qs.length || qs.indexOf(want) < 0) add(rule, rule.msg_wrong || rule.msg, ln);

    } else if (rule.kind === 'require_on_line') {
      var at = firstLine(lines, rule.near);
      if (at && !rx(rule.also).test(lines[at - 1])) add(rule, rule.msg_wrong || rule.msg, at);

    } else if (rule.kind === 'require_all') {
      var missing = rule.all.filter(function (p) { return !firstLine(lines, p); });
      if (missing.length) add(rule, rule.msg, 1);

    } else if (rule.kind === 'require_any') {
      var hit = rule.any.some(function (p) { return !!firstLine(lines, p); });
      if (!hit) add(rule, rule.msg, 1);

    } else if (rule.kind === 'forbid') {
      var re = rx(rule.pattern), shown = 0;
      for (var i = 0; i < lines.length && shown < 5; i++) {
        if (re.test(lines[i])) { add(rule, rule.msg, i + 1); shown++; }
      }

    } else if (rule.kind === 'fresh_date') {
      var dl = firstLine(lines, rule.label);
      var iso = dl ? (lines[dl - 1].match(/\b(\d{4}-\d{2}-\d{2})\b/) || [])[1] : null;
      if (!dl || !iso) { add(rule, rule.msg, dl || 1); return; }
      var age = monthsBetween(iso, today);
      if (age === null) { add(rule, rule.msg, dl); return; }
      if (age > rule.max_months) {
        add(rule, rule.msg_wrong + ' Last reviewed ' + iso + ', ' + age.toFixed(1) + ' months before ' + today + '.', dl);
      }
    }
  });

  findings.sort(function (a, b) { return (a.line - b.line) || String(a.check).localeCompare(String(b.check)); });
  var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
  return {
    findings: findings,
    ok: findings.length === 0,
    rule_count: RULES.length,
    errors: errors,
    warnings: findings.length - errors,
    today: today
  };
}

var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.NIS2ENGINE = API;
