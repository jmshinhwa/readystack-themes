/* CRA Reporting Clock Lint — engine.
   Same brain in Node (extension) and in the browser (free web page). */
(function () {
  var RULES = (typeof module !== 'undefined')
    ? require('./rules.json')
    : window.CRA_RULES;

  var MONTHS = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,
                september:9,october:10,november:11,december:12};

  function lineOf(text, index) {
    return text.slice(0, index).split('\n').length;
  }

  function firstHeadingLine(text) {
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (/^#/.test(lines[i])) return i + 1;
    }
    return 1;
  }

  function stripCode(text) {
    return text.replace(/```[\s\S]*?```/g, function (b) {
      return b.replace(/[^\n]/g, ' ');
    });
  }

  /* Markdown wraps sentences across lines; match on a whitespace-flattened copy
     but keep a map back to the original offsets so line numbers stay true. */
  function flatten(text) {
    var out = '', map = [], prev = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text.charAt(i);
      if (/\s/.test(c)) {
        if (prev) continue;
        out += ' '; map.push(i); prev = true;
      } else {
        out += c; map.push(i); prev = false;
      }
    }
    return { s: out, map: map };
  }

  function toDays(n, unit) {
    if (/month/i.test(unit)) return n * 30.4375;
    if (/week/i.test(unit)) return n * 7;
    return n * 365.25;
  }

  /* "supported for 2 years", "24 months of support", "support period: 3 years" */
  function supportLength(text) {
    var out = [];
    var pats = [
      /support(?:ed|s)?[^.\n]{0,60}?(\d{1,3})\s*(years?|months?|weeks?)/gi,
      /(\d{1,3})\s*(years?|months?|weeks?)[^.\n]{0,40}?\bsupport\b/gi
    ];
    for (var p = 0; p < pats.length; p++) {
      var re = pats[p], m;
      while ((m = re.exec(text)) !== null) {
        out.push({ years: toDays(parseInt(m[1], 10), m[2]) / 365.25, at: m.index, raw: m[0].trim() });
      }
    }
    return out;
  }

  /* an explicit end-of-support date, ISO or "31 December 2027" or "December 2027" */
  function supportEndDates(text) {
    var out = [];
    var win = /(support (?:period )?(?:ends?|until|through)|end[- ]of[- ]support|end of the support period|supported until)([^\n]{0,48})/gi;
    var m;
    while ((m = win.exec(text)) !== null) {
      var tail = m[2], d = null;
      var iso = /(\d{4})-(\d{2})-(\d{2})/.exec(tail);
      var dmy = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(tail);
      var my = /([A-Za-z]+)\s+(\d{4})/.exec(tail);
      if (iso) d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
      else if (dmy && MONTHS[dmy[2].toLowerCase()]) d = new Date(Date.UTC(+dmy[3], MONTHS[dmy[2].toLowerCase()] - 1, +dmy[1]));
      else if (my && MONTHS[my[1].toLowerCase()]) d = new Date(Date.UTC(+my[2], MONTHS[my[1].toLowerCase()] - 1, 28));
      if (d && !isNaN(d.getTime())) out.push({ date: d, at: m.index, raw: m[0].replace(/\s*#+.*$/, '').trim() });
    }
    return out;
  }

  function check(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var today = new Date((opts.today || '2026-09-11') + 'T00:00:00Z');
    if (isNaN(today.getTime())) today = new Date(Date.UTC(2026, 8, 11));
    var flat = flatten(stripCode(text));
    var body = flat.s;
    function origLine(at) { return lineOf(text, flat.map[at] == null ? 0 : flat.map[at]); }
    var head = firstHeadingLine(text);
    var findings = [];

    function add(rule, line, extra) {
      findings.push({
        check: rule.id,
        sev: rule.sev,
        msg: extra ? rule.msg + ' ' + extra : rule.msg,
        line: line
      });
    }

    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i], j, hit;

      if (r.when && !new RegExp(r.when, 'i').test(body)) continue;

      if (r.kind === 'require') {
        if (r.all) {
          var missAll = false;
          for (j = 0; j < r.all.length; j++) {
            if (!new RegExp(r.all[j], 'i').test(body)) { missAll = true; break; }
          }
          if (missAll) add(r, head);
        } else if (r.any) {
          hit = false;
          for (j = 0; j < r.any.length; j++) {
            if (new RegExp(r.any[j], 'i').test(body)) { hit = true; break; }
          }
          if (!hit) add(r, head);
        }
      } else if (r.kind === 'forbid') {
        var re = new RegExp(r.bad, 'gi'), m;
        while ((m = re.exec(body)) !== null) {
          add(r, origLine(m.index), 'Found: "' + m[0].trim() + '".');
          if (m.index === re.lastIndex) re.lastIndex++;
        }
      } else if (r.kind === 'support_length') {
        var lens = supportLength(body);
        for (j = 0; j < lens.length; j++) {
          if (lens[j].years < 5) {
            add(r, origLine(lens[j].at),
              'Found: "' + lens[j].raw + '" = ' + (Math.round(lens[j].years * 10) / 10) + ' years.');
          }
        }
      } else if (r.kind === 'support_end_date') {
        var ends = supportEndDates(body);
        for (j = 0; j < ends.length; j++) {
          if (ends[j].date.getTime() < today.getTime()) {
            add(r, origLine(ends[j].at),
              'Found: "' + ends[j].raw + '" — already past on ' + (opts.today || '2026-09-11') + '.');
          }
        }
      }
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var OUT = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') { module.exports = OUT; }
  if (typeof window !== 'undefined') { window.CRAENGINE = OUT; }
})();
