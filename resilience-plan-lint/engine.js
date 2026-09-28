/* Resilience Plan Lint engine — EU CER Directive 2022/2557 Art. 12-15. Runs in Node and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.RPL_RULES;
  var BY = {}; RULES.forEach(function (r) { BY[r.id] = r; });
  var WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
  function num(s) { s = String(s).toLowerCase(); return WORDS[s] !== undefined ? WORDS[s] : parseFloat(s); }
  var DATE = /(\d{4})-(\d{2})-(\d{2})/;
  function parseDate(s) { var m = DATE.exec(s || ''); if (!m) return null; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return isNaN(d) ? null : d; }
  function addMonths(d, n) {
    var y = d.getUTCFullYear(), mo = d.getUTCMonth() + n, day = d.getUTCDate();
    var last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, mo, Math.min(day, last)));
  }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function find(r, extra, line) { return { check: r.id, sev: r.sev, msg: r.art + ' — ' + r.title + (extra ? ': ' + extra : '') + '. Fix: ' + r.fix + '.', line: line }; }
  var N = '(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|twelve)';

  function check(text, opts) {
    opts = opts || {};
    var today = parseDate(String(opts.today || '').slice(0, 10)) || new Date();
    var lines = String(text || '').split(/\r?\n/);
    var all = lines.join('\n');
    var out = [];
    var hazardLine = 1, notified = null, assessed = null, assessedLine = 1, cycleSeen = false;

    lines.forEach(function (raw, i) {
      var ln = i + 1, l = raw;
      if (/^#+ .*(hazard|risk)/i.test(l) && hazardLine === 1) hazardLine = ln;
      // Art. 15 — initial notice
      if (/\b(initial|first|early)\s+(notification|notice|warning)\b|notify the (competent )?authority/i.test(l) && !/detailed|final|full report/i.test(l)) {
        var m = new RegExp(N + '\\s*(hours?|hrs?|h|days?)\\b', 'i').exec(l);
        if (m) {
          var h = num(m[1]) * (/^d/i.test(m[2]) ? 24 : 1);
          if (h > BY['CER-15-INITIAL'].max_hours) out.push(find(BY['CER-15-INITIAL'], 'plan says ' + m[0], ln));
        }
      }
      // Art. 15 — detailed report
      if (/(detailed|final|full)\s+(incident\s+)?report/i.test(l)) {
        var d = new RegExp(N + '\\s*(days?|weeks?|months?)\\b', 'i').exec(l);
        if (d) {
          var u = d[2].toLowerCase(), days = num(d[1]) * (u[0] === 'w' ? 7 : u[0] === 'm' ? 31 : 1);
          if (days > BY['CER-15-REPORT'].max_days) out.push(find(BY['CER-15-REPORT'], 'plan says ' + d[0], ln));
        }
      }
      // Art. 12 — review cycle
      var c = new RegExp('every\\s+' + N + '\\s*years?', 'i').exec(l);
      if (c) {
        cycleSeen = true;
        if (num(c[1]) > BY['CER-12-CYCLE'].max_years) out.push(find(BY['CER-12-CYCLE'], 'plan says ' + c[0], ln));
      } else if (/\b(annual(ly)?|every year|yearly)\b/i.test(l) && /review|re-?assess|update/i.test(l)) cycleSeen = true;
      // Art. 12 — dates
      if (/notified|notification received|designated/i.test(l) && parseDate(l) && !notified) notified = parseDate(l);
      else if (/risk assessment/i.test(l) && /complet|due|target|approv|finish/i.test(l) && parseDate(l) && !assessed) { assessed = parseDate(l); assessedLine = ln; }
    });

    if (!/notif/i.test(all)) out.push(find(BY['CER-15-MISSING'], '', 1));
    if (!cycleSeen) out.push(find(BY['CER-12-CYCLE'], 'no review interval found', 1));

    if (notified) {
      var r = BY['CER-12-FIRST'], due = addMonths(notified, r.months);
      if (assessed && assessed > due) out.push(find(r, 'planned ' + iso(assessed) + ', due ' + iso(due), assessedLine));
      else if (!assessed && today > due) out.push(find(r, 'no completion date and due ' + iso(due) + ' has passed', 1));
    }

    ['CER-12-HAZARDS', 'CER-13-MEASURES'].forEach(function (id) {
      var r = BY[id];
      r.categories.forEach(function (cat) {
        if (!new RegExp(cat[1], 'i').test(all)) out.push(find(r, 'no ' + cat[0], id === 'CER-12-HAZARDS' ? hazardLine : 1));
      });
    });
    ['CER-12-DEPEND', 'CER-13-LIAISON'].forEach(function (id) {
      var r = BY[id];
      if (!new RegExp(r.pattern, 'i').test(all)) out.push(find(r, '', 1));
    });

    out.sort(function (a, b) { return a.line - b.line; });
    return { findings: out };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, addMonths: addMonths };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.RPLENGINE = api;
})();
