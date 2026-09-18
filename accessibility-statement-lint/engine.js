// Accessibility Statement Lint — one brain, used by the extension and by the one-page web tool.
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : (typeof window !== 'undefined' ? window.ASTMT_RULES : []);

var MONTHS = ['january','february','march','april','may','june','july','august','september',
              'october','november','december'];

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

// "2026-09-16" | "16 September 2026" | "September 16, 2026" | "16/09/2026" | "16.09.2026"
function findDate(line) {
  var m = line.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  m = line.match(/(\d{1,2})[ .]+([A-Za-z]{3,9})[ ,.]+(\d{4})/);
  if (m) {
    var i = MONTHS.indexOf(m[2].toLowerCase());
    if (i < 0) i = MONTHS.map(function (x) { return x.slice(0, 3); }).indexOf(m[2].toLowerCase().slice(0, 3));
    if (i >= 0) return { y: +m[3], m: i + 1, d: +m[1] };
  }
  m = line.match(/([A-Za-z]{3,9})[ ]+(\d{1,2})[ ,]+(\d{4})/);
  if (m) {
    var j = MONTHS.map(function (x) { return x.slice(0, 3); }).indexOf(m[1].toLowerCase().slice(0, 3));
    if (j >= 0) return { y: +m[3], m: j + 1, d: +m[2] };
  }
  m = line.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
  if (m) return { y: +m[3], m: +m[2], d: +m[1] };
  return null;
}

function toNum(d) { return d.y * 10000 + d.m * 100 + d.d; }
function monthsBetween(a, b) { return (b.y - a.y) * 12 + (b.m - a.m) - (b.d < a.d ? 1 : 0); }

// A labelled date lives on the label line or within the three lines that follow it.
function labelledDate(text, labelRe) {
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    if (!labelRe.test(lines[i])) continue;
    for (var k = i; k <= i + 3 && k < lines.length; k++) {
      var d = findDate(lines[k]);
      if (d) return { date: d, line: k + 1 };
    }
    return { date: null, line: i + 1 };
  }
  return null;
}

function parseToday(opts) {
  var s = (opts && opts.today) || '';
  var d = findDate(String(s));
  if (d) return d;
  var n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
}

function check(text, opts) {
  text = String(text == null ? '' : text);
  var today = parseToday(opts);
  var findings = [];
  var add = function (r, line, extra) {
    findings.push({ check: r.id, sev: r.sev, msg: extra ? r.msg + ' ' + extra : r.msg, line: line || 1 });
  };

  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i];
    var flags = r.flags || 'i';
    if (r.when && !new RegExp(r.when, flags).test(text)) continue;

    if (r.kind === 'require') {
      var re = new RegExp(r.pat, flags);
      if (!re.test(text)) {
        var anchor = r.when ? text.search(new RegExp(r.when, flags)) : -1;
        add(r, anchor >= 0 ? lineOf(text, anchor) : 1);
      }

    } else if (r.kind === 'forbid') {
      var fre = new RegExp(r.pat, flags.indexOf('g') < 0 ? flags + 'g' : flags);
      var hit;
      while ((hit = fre.exec(text)) !== null) {
        add(r, lineOf(text, hit.index), '(found: "' + hit[0].slice(0, 40) + '")');
        if (hit.index === fre.lastIndex) fre.lastIndex++;
        break;
      }

    } else if (r.kind === 'exclusive') {
      var seen = [], first = -1;
      for (var a = 0; a < r.alts.length; a++) {
        var pos = text.search(new RegExp(r.alts[a], flags));
        if (pos >= 0) { seen.push(r.alts[a]); if (first < 0 || pos < first) first = pos; }
      }
      if (seen.length > 1) add(r, lineOf(text, first), '(found: ' + seen.join(' + ') + ')');

    } else if (r.kind === 'date_present') {
      var got = labelledDate(text, new RegExp(r.label, flags));
      if (!got || !got.date) add(r, got ? got.line : 1);

    } else if (r.kind === 'date_future') {
      var gf = labelledDate(text, new RegExp(r.label, flags));
      if (gf && gf.date && toNum(gf.date) > toNum(today)) add(r, gf.line);

    } else if (r.kind === 'date_max_age') {
      var ga = labelledDate(text, new RegExp(r.label, flags));
      if (ga && ga.date) {
        var age = monthsBetween(ga.date, today);
        if (age > (r.months || 12)) add(r, ga.line, '(last review is ' + age + ' months old)');
      }
    }
  }

  findings.sort(function (x, y) { return x.line - y.line; });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.ASTMTENGINE = API;
