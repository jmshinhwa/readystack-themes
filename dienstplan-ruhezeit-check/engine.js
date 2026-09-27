/* Dienstplan-Check engine: ArbZG + JArbSchG rules on a roster CSV. Runs in node and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.DP_RULES;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });
  var DAY = 1440;

  function cols(line, sep) { return line.split(sep).map(function (c) { return c.replace(/\s+/g, ' ').trim().replace(/^"|"$/g, ''); }); }
  function pickSep(h) { return h.indexOf(';') >= 0 ? ';' : (h.indexOf('\t') >= 0 ? '\t' : ','); }
  function findCol(head, names) {
    for (var i = 0; i < head.length; i++) {
      var h = head[i].toLowerCase();
      for (var j = 0; j < names.length; j++) if (h.indexOf(names[j]) === 0) return i;
    }
    return -1;
  }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) || null, y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else { m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s); if (!m) return null; y = +m[3]; mo = +m[2]; d = +m[1]; }
    var t = Date.UTC(y, mo - 1, d);
    if (isNaN(t) || new Date(t).getUTCDate() !== d) return null;
    return Math.round(t / 86400000);
  }
  function parseTime(s) {
    var m = /^(\d{1,2})[:.](\d{2})$/.exec(s);
    if (!m || +m[1] > 24 || +m[2] > 59) return null;
    return +m[1] * 60 + +m[2];
  }
  function parsePause(s) {
    if (s === '' || s == null) return 0;
    var t = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (t) return +t[1] * 60 + +t[2];
    return /^\d+$/.test(s) ? +s : null;
  }
  function iso(day) { return new Date(day * 86400000).toISOString().slice(0, 10); }
  function h(min) { return (Math.round(min / 60 * 100) / 100).toString().replace('.', ',') + ' h'; }
  function weekday(day) { return (new Date(day * 86400000).getUTCDay() + 6) % 7; } // 0 = Mo, 6 = So
  function overlap(a0, a1, b0, b1) { return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); }
  function windowMin(s, e, from, to) { // minutes of [s,e) inside a daily window from..to (to may be next day)
    var sum = 0, d0 = Math.floor(s / DAY) - 1, d1 = Math.floor(e / DAY);
    for (var d = d0; d <= d1; d++) {
      var w0 = d * DAY + from, w1 = d * DAY + (to > from ? to : to + DAY);
      sum += overlap(s, e, w0, w1);
    }
    return sum;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = parseDate(String(opts.today || '').trim());
    var findings = [];
    function when(day) {
      if (today == null) return '';
      var n = day - today;
      return n >= 0 ? ' (Schicht in ' + n + ' Tagen)' : ' (Schicht vor ' + (-n) + ' Tagen)';
    }
    function add(id, line, detail, day) {
      var r = BY_ID[id];
      findings.push({ check: id, sev: r.sev, line: line, msg: r.law + ': ' + detail + ' - ' + r.fix + '.' + when(day) });
    }
    var lines = String(text || '').split(/\r?\n/);
    var hi = 0;
    while (hi < lines.length && !lines[hi].trim()) hi++;
    if (hi >= lines.length) return { findings: [] };
    var sep = pickSep(lines[hi]);
    var head = cols(lines[hi], sep);
    var c = {
      name: findCol(head, ['mitarbeit', 'name', 'ma', 'person', 'employee']),
      date: findCol(head, ['datum', 'date', 'tag']),
      start: findCol(head, ['beginn', 'start', 'von', 'kommt']),
      end: findCol(head, ['ende', 'end', 'bis', 'geht']),
      pause: findCol(head, ['pause', 'break']),
      age: findCol(head, ['alter', 'age'])
    };
    if (c.name < 0 || c.date < 0 || c.start < 0 || c.end < 0) {
      add('CSV-ZEILE', hi + 1, 'Kopfzeile ohne Spalten Mitarbeiter, Datum, Beginn, Ende', null);
      return { findings: findings };
    }
    var people = {}, order = [];
    for (var i = hi + 1; i < lines.length; i++) {
      if (!lines[i].trim() || /^#/.test(lines[i].trim())) continue;
      var v = cols(lines[i], sep);
      var day = parseDate(v[c.date] || ''), s = parseTime(v[c.start] || ''), e = parseTime(v[c.end] || '');
      var p = c.pause >= 0 ? parsePause(v[c.pause] || '') : 0;
      var name = v[c.name] || '';
      if (!name || day == null || s == null || e == null || p == null) {
        add('CSV-ZEILE', i + 1, 'Zeile ' + (i + 1) + ' hat kein lesbares Datum, keine Uhrzeit oder keinen Namen', null);
        continue;
      }
      var st = day * DAY + s, en = day * DAY + e;
      if (en <= st) en += DAY; // shift runs past midnight
      var age = c.age >= 0 ? parseInt(v[c.age], 10) : NaN;
      if (!people[name]) { people[name] = []; order.push(name); }
      people[name].push({ line: i + 1, day: day, st: st, en: en, pause: p, net: en - st - p, minor: !isNaN(age) && age < 18 });
    }

    order.forEach(function (name) {
      var sh = people[name].sort(function (a, b) { return a.st - b.st; });
      var minor = sh.some(function (x) { return x.minor; });
      var weeks = {};
      sh.forEach(function (x, k) {
        var d = iso(x.day);
        if (minor) {
          if (x.net > 480) add('JARBSCHG-8-TAG', x.line, name + ' (unter 18) am ' + d + ': ' + h(x.net) + ' statt max. 8 h', x.day);
          var need = x.net > 360 ? 60 : (x.net > 270 ? 30 : 0);
          if (x.pause < need) add('JARBSCHG-11-PAUSE', x.line, name + ' (unter 18) am ' + d + ': ' + x.pause + ' Min Pause statt ' + need + ' Min', x.day);
          if (windowMin(x.st, x.en, 1200, 360) > 0) add('JARBSCHG-14-NACHT', x.line, name + ' (unter 18) am ' + d + ': Arbeit zwischen 20 und 6 Uhr', x.day);
        } else {
          if (x.net > 600) add('ARBZG-3-TAG', x.line, name + ' am ' + d + ': ' + h(x.net) + ' statt max. 10 h', x.day);
          var need2 = x.net > 540 ? 45 : (x.net > 360 ? 30 : 0);
          if (x.pause < need2) add('ARBZG-4-PAUSE', x.line, name + ' am ' + d + ': ' + x.pause + ' Min Pause statt ' + need2 + ' Min', x.day);
          if (x.net > 480 && windowMin(x.st, x.en, 1380, 360) > 120) add('ARBZG-6-NACHT', x.line, name + ' am ' + d + ': Nachtschicht mit ' + h(x.net), x.day);
        }
        if (k > 0) {
          var gap = x.st - sh[k - 1].en, min = minor ? 720 : 660;
          if (gap < min) {
            if (minor) add('JARBSCHG-13-FREIZEIT', x.line, name + ' (unter 18) am ' + d + ': ' + h(gap) + ' Freizeit statt 12 h', x.day);
            else add('ARBZG-5-RUHEZEIT', x.line, name + ' am ' + d + ': ' + h(gap) + ' Ruhezeit statt 11 h' + (gap >= 600 ? ' (10 h nur in Branchen nach § 5 Abs. 2 mit Ausgleich)' : ''), x.day);
          }
        }
        var wk = x.day - weekday(x.day);
        if (!weeks[wk]) weeks[wk] = { net: 0, last: x };
        weeks[wk].net += x.net; weeks[wk].last = x;
      });
      Object.keys(weeks).forEach(function (wk) {
        var w = weeks[wk], lim = minor ? 2400 : 3600;
        if (w.net > lim) add(minor ? 'JARBSCHG-8-WOCHE' : 'ARBZG-3-WOCHE', w.last.line, name + ' in der Woche ab ' + iso(+wk) + ': ' + h(w.net) + ' statt max. ' + (minor ? '40' : '60') + ' h', w.last.day);
      });
      if (!minor) {
        var busy = {}, first = sh[0].day, last = sh[sh.length - 1].day;
        sh.forEach(function (x) { busy[x.day] = 1; busy[Math.floor((x.en - 1) / DAY)] = 1; });
        sh.forEach(function (x) {
          if (weekday(x.day) !== 6) return;
          var a = Math.max(x.day - 13, first), b = Math.min(x.day + 13, last), free = false;
          if (b - a + 1 < 14) return;
          for (var d2 = a; d2 <= b; d2++) if (weekday(d2) !== 6 && !busy[d2]) { free = true; break; }
          if (!free) add('ARBZG-11-ERSATZRUHETAG', x.line, name + ' am Sonntag ' + iso(x.day) + ': kein freier Werktag von ' + iso(a) + ' bis ' + iso(b), x.day);
        });
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.DPENGINE = api;
})();
