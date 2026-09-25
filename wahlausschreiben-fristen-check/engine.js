/* Wahlausschreiben Fristen-Check — Betriebsratswahl nach BetrVG und Wahlordnung (WO). Läuft in Node und im Browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.WA_RULES;
  const R = {}; RULES.forEach(r => { R[r.check] = r; });
  const DAY = 86400000;

  function ymd(y, m, d) { return Date.UTC(y, m - 1, d); }
  function fmt(t) { const d = new Date(t); return String(d.getUTCDate()).padStart(2, '0') + '.' + String(d.getUTCMonth() + 1).padStart(2, '0') + '.' + d.getUTCFullYear(); }
  function easter(y) { // Gauß/Anonymous Gregorian
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31);
    return ymd(y, mo, ((h + l - 7 * m + 114) % 31) + 1);
  }
  function holidayName(t, extra) {
    const d = new Date(t), y = d.getUTCFullYear(), md = String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    const names = { '01-01': 'Neujahr', '05-01': 'Tag der Arbeit', '10-03': 'Tag der Deutschen Einheit', '12-25': '1. Weihnachtstag', '12-26': '2. Weihnachtstag' };
    const eo = { 'easter-2': 'Karfreitag', 'easter+1': 'Ostermontag', 'easter+39': 'Christi Himmelfahrt', 'easter+50': 'Pfingstmontag' };
    for (const h of R.erlass_datum.holidays_bund) {
      if (h.startsWith('easter')) { if (easter(y) + Number(h.slice(6)) * DAY === t) return eo[h]; }
      else if (h === md) return names[h];
    }
    if ((extra || []).indexOf(fmt(t)) >= 0 || (extra || []).indexOf(new Date(t).toISOString().slice(0, 10)) >= 0) return 'Feiertag';
    return '';
  }
  // Fristende nach §§ 187 Abs. 1, 188 Abs. 2, 193 BGB (über § 41 WO)
  function fristEnde(start, days, extra) {
    const raw = start + days * DAY; let t = raw; const why = [];
    for (;;) {
      const wd = new Date(t).getUTCDay(), hn = holidayName(t, extra);
      if (wd === 6) why.push(fmt(t) + ' Samstag'); else if (wd === 0) why.push(fmt(t) + ' Sonntag'); else if (hn) why.push(fmt(t) + ' ' + hn); else break;
      t += DAY;
    }
    return { raw, end: t, why };
  }
  function dates(line) {
    const out = []; let m; const re = /(\d{1,2})\.(\d{1,2})\.(\d{4})|(\d{4})-(\d{2})-(\d{2})/g;
    while ((m = re.exec(line))) out.push(m[1] ? ymd(+m[3], +m[2], +m[1]) : ymd(+m[4], +m[5], +m[6]));
    return out;
  }
  function num(line) {
    let m = line.match(/mindestens\s+(\d[\d.]*)/i) || line.match(/[:=]\s*(\d[\d.]*)/);
    return m ? Number(m[1].replace(/\./g, '')) : null;
  }
  function sitze(an, wb) {
    const w = wb == null ? an : wb;
    if (w < 5) return 0; if (w <= 20) return 1; if (w <= 50) return 3;
    const st = [[100, 5], [200, 7], [400, 9], [700, 11], [1000, 13], [1500, 15], [2000, 17], [2500, 19], [3000, 21], [3500, 23], [4000, 25], [4500, 27], [5000, 29], [6000, 31], [7000, 33], [9000, 35]];
    for (const [max, s] of st) if (an <= max) return s;
    return 35 + 2 * Math.ceil((an - 9000) / 3000);
  }
  function dhondt(minor, major, seats) {
    const q = [];
    for (let i = 1; i <= seats; i++) { q.push([minor / i, 1]); q.push([major / i, 0]); }
    q.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    return q.slice(0, seats).reduce((s, x) => s + x[1], 0);
  }
  function stuetz(wb) { if (wb <= 20) return 0; if (wb <= 100) return 2; return Math.min(50, Math.max(3, Math.ceil(wb / 20))); }

  function check(text, opts) {
    opts = opts || {};
    const extra = opts.holidays || [];
    const lines = String(text || '').split(/\r?\n/);
    const f = [];
    const add = (rule, line, msg) => f.push({ check: rule.check, id: rule.id, sev: rule.sev, msg: msg + ' (' + rule.ref + ')', line });
    const s = {};
    lines.forEach((ln, i) => {
      const n = i + 1, ds = dates(ln);
      if (/einspr[üu]/i.test(ln)) { if (ds.length && !s.ein) s.ein = { t: ds[ds.length - 1], n }; }
      else if (/wahlvorschl[äa]g|vorschlagsliste/i.test(ln)) {
        if (ds.length && !s.vor && !/aush[äa]ng|bekanntgemacht/i.test(ln)) s.vor = { t: ds[ds.length - 1], n };
      }
      else if (/stimmabgabe|wahltag/i.test(ln)) { if (ds.length) { const t = Math.min.apply(null, ds); if (!s.vote || t < s.vote.t) s.vote = { t, n }; } }
      else if (/erlass|erlassen/i.test(ln)) { if (ds.length && !s.erl) s.erl = { t: ds[0], n }; }
      const v = num(ln);
      if (/stimmausz[äa]hlung/i.test(ln)) s.ausz = n;
      if (/w[äa]hlerliste/i.test(ln) && /liegt|liegen|ausliegen|einsehbar|einsehen|eingesehen/i.test(ln)) s.wlOrt = n;
      if (/wahlvorstand/i.test(ln) && /betriebsadresse|anschrift|postanschrift/i.test(ln)) s.adr = n;
      if (/vereinfacht/i.test(ln)) s.vereinf = n;
      if (v == null) return;
      if (/mindestsitz/i.test(ln)) { if (s.minSitz == null) s.minSitz = { v, n }; }
      else if (/betriebsratsmitglieder|zu w[äa]hlende/i.test(ln)) { if (s.sitz == null) s.sitz = { v, n }; }
      else if (/unterzeichn|st[üu]tzunterschrift/i.test(ln)) { if (s.stz == null) s.stz = { v, n }; }
      else if (/wahlberechtigt/i.test(ln)) { if (s.wb == null) s.wb = v; }
      else if (/frauen/i.test(ln)) { if (s.fr == null) s.fr = v; }
      else if (/m[äa]nner/i.test(ln)) { if (s.ma == null) s.ma = v; }
      else if (/arbeitnehmer|besch[äa]ftigte/i.test(ln)) { if (s.an == null) s.an = v; }
    });

    if (!s.erl) add(R.erlass_datum, 1, 'Kein Erlassdatum gefunden – ohne dieses Datum lässt sich keine Frist berechnen. Schreiben Sie „Erlassen am: TT.MM.JJJJ“');
    if (!s.vote) add(R.stimmabgabe_datum, 1, 'Kein Tag der Stimmabgabe gefunden. Schreiben Sie „Stimmabgabe: TT.MM.JJJJ, Uhrzeit, Ort“');
    if (s.erl && s.vote) {
      const latest = s.vote.t - R.sechs_wochen.weeks * 7 * DAY;
      if (s.erl.t > latest) add(R.sechs_wochen, s.erl.n, 'Erlass am ' + fmt(s.erl.t) + ', erste Stimmabgabe am ' + fmt(s.vote.t) + ' – das Wahlausschreiben musste spätestens am ' + fmt(latest) + ' erlassen werden. Wahltag auf frühestens ' + fmt(s.erl.t + R.sechs_wochen.weeks * 7 * DAY) + ' legen');
    }
    [['ein', 'einspruch_frist', 'einspruch_frist_fehlt', 'Einspruchsfrist gegen die Wählerliste'], ['vor', 'vorschlag_frist', 'vorschlag_frist_fehlt', 'Frist für Wahlvorschläge']].forEach(([k, rk, rmiss, label]) => {
      if (!s.erl) return;
      const fe = fristEnde(s.erl.t, R[rk].days, extra);
      if (!s[k]) { add(R[rmiss], s.erl.n, label + ': kein letzter Tag angegeben. Richtig: ' + fmt(fe.end)); return; }
      if (s[k].t !== fe.end) {
        const how = s[k].t < fe.end ? 'zu kurz' : 'zu lang';
        add(R[rk], s[k].n, label + ' endet laut Text am ' + fmt(s[k].t) + ' (' + how + ') – richtig: ' + fmt(fe.end) + '. Erlass ' + fmt(s.erl.t) + ' + zwei Wochen = ' + fmt(fe.raw) + (fe.why.length ? '; ' + fe.why.join(', ') + ' → nächster Werktag' : ''));
      }
    });
    const an = s.an != null ? s.an : s.wb;
    let soll = null;
    if (an != null) {
      soll = sitze(an, s.wb);
      if (s.sitz && s.sitz.v !== soll) add(R.sitzzahl, s.sitz.n, 'Im Text ' + s.sitz.v + ' Betriebsratsmitglieder – bei ' + an + ' Arbeitnehmern' + (s.wb != null ? ' (' + s.wb + ' wahlberechtigt)' : '') + ' sind es ' + soll);
    }
    const seats = soll != null ? soll : (s.sitz ? s.sitz.v : null);
    if (seats != null && seats >= 3 && s.fr != null && s.ma != null && s.minSitz) {
      const minor = Math.min(s.fr, s.ma), major = Math.max(s.fr, s.ma), g = s.fr <= s.ma ? 'Frauen' : 'Männer';
      const ms = dhondt(minor, major, seats);
      if (s.minSitz.v !== ms) add(R.mindestsitze, s.minSitz.n, 'Im Text ' + s.minSitz.v + ' Mindestsitz(e) – bei ' + s.fr + ' Frauen und ' + s.ma + ' Männern und ' + seats + ' Sitzen erhält das Geschlecht in der Minderheit (' + g + ') nach d’Hondt ' + ms);
    }
    if (s.wb != null && s.stz) {
      const need = stuetz(s.wb);
      if (s.stz.v !== need) add(R.stuetzunterschriften, s.stz.n, 'Im Text ' + s.stz.v + ' Stützunterschriften – bei ' + s.wb + ' Wahlberechtigten sind es ' + need + (s.wb > 100 ? ' (ein Zwanzigstel, aufgerundet; mindestens 3, höchstens 50)' : ''));
    }
    if (!s.ausz) add(R.auszaehlung, 1, 'Keine Angabe zur öffentlichen Stimmauszählung. Ergänzen: „Öffentliche Stimmauszählung: TT.MM.JJJJ, Uhrzeit, Raum“');
    if (!s.wlOrt) add(R.waehlerliste_ort, 1, 'Nicht angegeben, wo Wählerliste und Wahlordnung ausliegen oder elektronisch einsehbar sind');
    if (!s.adr) add(R.wahlvorstand_adresse, 1, 'Keine Betriebsadresse des Wahlvorstands für Einsprüche und Wahlvorschläge');
    if (s.wb != null && s.wb >= 5 && s.wb <= 100 && !s.vereinf) add(R.vereinfacht_pflicht, 1, s.wb + ' Wahlberechtigte: Das vereinfachte Wahlverfahren ist Pflicht – ein Wahlausschreiben für das normale Verfahren macht die Wahl anfechtbar');
    f.sort((a, b) => a.line - b.line);
    return { findings: f, facts: s };
  }

  const API = { engine: { check, fristEnde, sitze, dhondt, stuetz, fmt }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = API;
  if (typeof window !== 'undefined') window.WAENGINE = API;
})();
