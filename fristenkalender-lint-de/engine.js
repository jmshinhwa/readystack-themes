// Fristenkalender Lint — Fristberechnung nach §§ 187–193 BGB / § 222 ZPO.
// Liest eine CSV (akte;ereignis;zugang;frist;fristende;land) und rechnet jedes Fristende nach.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FRIST_RULES;
  var BY_CHECK = {};
  RULES.forEach(function (r) { BY_CHECK[r.check] = r; });

  var LAENDER = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'];
  var WOCHENTAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var DAY = 86400000;

  function utc(y, m, d) { return Date.UTC(y, m, d); }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function daysIn(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }

  function parseDate(s) {
    s = String(s || '').replace(/\s+/g, '');
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s), y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s))) { y = +m[3]; mo = +m[2]; d = +m[1]; }
    else return null;
    if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo - 1)) return null;
    return utc(y, mo - 1, d);
  }

  function parseFrist(s) {
    var m = /^(\d{1,3})\s*(tage?|t|d|wochen?|w|monate?|m|jahre?|j)$/i.exec(String(s || '').replace(/\s+/g, ' ').trim());
    if (!m) return null;
    var u = m[2].toLowerCase().charAt(0);
    return { n: +m[1], unit: u === 't' || u === 'd' ? 'd' : u };
  }

  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, mm = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * mm + 114) / 31), day = ((h + l - 7 * mm + 114) % 31) + 1;
    return utc(y, month - 1, day);
  }

  var CACHE = {};
  // Gesetzliche Feiertage je Land (ohne kommunale Sonderfälle wie Mariä Himmelfahrt in Teilen Bayerns).
  function holidays(y, land) {
    var key = y + land;
    if (CACHE[key]) return CACHE[key];
    var h = {}, e = easter(y);
    function add(t, name, only) { if (!only || only.indexOf(land) >= 0) h[iso(t)] = name; }
    add(utc(y, 0, 1), 'Neujahr');
    add(utc(y, 0, 6), 'Heilige Drei Könige', ['BW', 'BY', 'ST']);
    add(utc(y, 2, 8), 'Internationaler Frauentag', ['BE', 'MV']);
    add(e - 2 * DAY, 'Karfreitag');
    add(e + DAY, 'Ostermontag');
    add(utc(y, 4, 1), 'Tag der Arbeit');
    add(e + 39 * DAY, 'Christi Himmelfahrt');
    add(e + 50 * DAY, 'Pfingstmontag');
    add(e + 60 * DAY, 'Fronleichnam', ['BW', 'BY', 'HE', 'NW', 'RP', 'SL']);
    add(utc(y, 7, 15), 'Mariä Himmelfahrt', ['SL']);
    add(utc(y, 8, 20), 'Weltkindertag', ['TH']);
    add(utc(y, 9, 3), 'Tag der Deutschen Einheit');
    add(utc(y, 9, 31), 'Reformationstag', ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH']);
    add(utc(y, 10, 1), 'Allerheiligen', ['BW', 'BY', 'NW', 'RP', 'SL']);
    var nov23 = utc(y, 10, 23), back = (new Date(nov23).getUTCDay() + 4) % 7 || 7;
    add(nov23 - back * DAY, 'Buß- und Bettag', ['SN']);
    add(utc(y, 11, 25), '1. Weihnachtstag');
    add(utc(y, 11, 26), '2. Weihnachtstag');
    CACHE[key] = h;
    return h;
  }

  function restName(t, land, extra) {
    var wd = new Date(t).getUTCDay();
    var hol = holidays(new Date(t).getUTCFullYear(), land)[iso(t)];
    if (hol) return hol;
    if (extra && extra[iso(t).slice(5)]) return extra[iso(t).slice(5)];
    if (wd === 0 || wd === 6) return WOCHENTAG[wd];
    return null;
  }

  // § 193 BGB / § 222 Abs. 2 ZPO: an die Stelle des Ruhetags tritt der nächste Werktag.
  function shift(t, land, extra) { while (restName(t, land, extra)) t += DAY; return t; }

  // § 187 Abs. 1 (Ereignistag zählt nicht) und § 188 Abs. 2, 3 BGB.
  function rawEnd(start, f, minusOne) {
    var d = new Date(start), y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
    if (f.unit === 'd') return { t: start + f.n * DAY, clamped: false };
    if (f.unit === 'w') return { t: start + 7 * f.n * DAY, clamped: false };
    var months = f.unit === 'j' ? 12 * f.n : f.n, ty = y + Math.floor((m + months) / 12), tm = (m + months) % 12;
    var last = daysIn(ty, tm);
    return { t: utc(ty, tm, Math.min(day, last)), clamped: day > last, overflow: utc(ty, tm, day) };
  }

  function msg(rule, text) { return rule.law + ': ' + text; }

  function check(text, opts) {
    opts = opts || {};
    var today = parseDate(opts.today);
    var findings = [];
    var lines = String(text || '').split(/\r?\n/);
    function push(check, line, text) {
      var r = BY_CHECK[check];
      findings.push({ check: check, sev: r.sev, msg: msg(r, text), line: line });
    }
    function left(t) {
      if (today == null) return '';
      var n = Math.round((t - today) / DAY);
      return n >= 0 ? ' (ab heute noch ' + n + ' Tage)' : ' (seit ' + (-n) + ' Tagen abgelaufen)';
    }
    lines.forEach(function (raw, idx) {
      var line = idx + 1, s = raw.replace(/\s+/g, ' ').trim();
      if (!s || s.charAt(0) === '#') return;
      var sep = s.indexOf(';') >= 0 ? ';' : (s.indexOf('\t') >= 0 ? '\t' : ',');
      var f = s.split(sep).map(function (x) { return x.replace(/^"|"$/g, '').trim(); });
      if (/^akte$/i.test(f[0]) || /fristende/i.test(s) && !parseDate(f[4])) return;
      if (f.length < 5) { push('spalten_fehlen', line, 'nur ' + f.length + ' Spalten, erwartet akte;ereignis;zugang;frist;fristende;land'); return; }
      var akte = f[0] || ('Zeile ' + line);
      var start = parseDate(f[2]);
      if (start == null) { push('datum_ungueltig', line, akte + ': Zugang "' + f[2] + '" ist kein gültiges Datum'); return; }
      var fr = parseFrist(f[3]);
      if (!fr) { push('frist_unlesbar', line, akte + ': Frist "' + f[3] + '" nicht lesbar — schreibe z. B. "1 Monat" oder "2 Wochen"'); return; }
      if (!f[4]) { push('fristende_fehlt', line, akte + ': kein Fristende eingetragen'); return; }
      var rec = parseDate(f[4]);
      if (rec == null) { push('datum_ungueltig', line, akte + ': Fristende "' + f[4] + '" ist kein gültiges Datum'); return; }
      var land = String(f[5] || '').toUpperCase();
      if (LAENDER.indexOf(land) < 0) { push('land_unbekannt', line, akte + ': Land "' + (f[5] || '') + '" fehlt — ohne Bundesland keine Feiertagsprüfung'); return; }

      var raw0 = rawEnd(start, fr), end = shift(raw0.t, land);
      if (rec === end) return;
      var ok = ' — richtig: ' + iso(end) + ' (' + WOCHENTAG[new Date(end).getUTCDay()] + ')' + left(end);
      var rest = restName(rec, land);
      if (rest) { push('ende_auf_ruhetag', line, akte + ': ' + iso(rec) + ' ist ' + rest + ' in ' + land + ok); return; }
      if (raw0.clamped && rec > end) { push('monatsende_ueberlaufen', line, akte + ': ' + f[3] + ' ab ' + iso(start) + ' endet am Monatsletzten, nicht ' + iso(rec) + ok); return; }
      if (rec === shift(raw0.t - DAY, land)) { push('ereignistag_mitgezaehlt', line, akte + ': Zustelltag ' + iso(start) + ' mitgezählt, notiert ' + iso(rec) + ok); return; }
      for (var i = 0; i < LAENDER.length; i++) {
        var other = LAENDER[i];
        if (other !== land && shift(raw0.t, other) === rec) {
          var hol = restName(raw0.t, other);
          push('feiertag_anderes_land', line, akte + ': ' + hol + ' (' + iso(raw0.t) + ') ist in ' + land + ' kein Feiertag, notiert ' + iso(rec) + ok);
          return;
        }
      }
      if (rec === shift(raw0.t, land, { '12-24': 'Heiligabend', '12-31': 'Silvester' })) {
        push('heiligabend_silvester', line, akte + ': ' + iso(raw0.t) + ' ist ein Werktag, notiert ' + iso(rec) + ok); return;
      }
      var diff = Math.round((rec - end) / DAY);
      if (diff > 0) push('zu_spaet', line, akte + ': notiert ' + iso(rec) + ', ' + diff + ' Tag(e) zu spät' + ok);
      else push('zu_frueh', line, akte + ': notiert ' + iso(rec) + ', ' + (-diff) + ' Tag(e) zu früh' + ok);
    });
    return { findings: findings };
  }

  var api = { engine: { check: check, holidays: holidays }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.FRISTENGINE = api;
})();
