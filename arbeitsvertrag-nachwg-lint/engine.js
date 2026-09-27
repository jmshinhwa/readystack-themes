/* Arbeitsvertrag Lint (NachwG) — ein Gehirn für VS Code und Browser */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.NWG_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });

  const EU = 'Belgien|Bulgarien|Dänemark|Daenemark|Estland|Finnland|Frankreich|Griechenland|Irland|Italien|Kroatien|Lettland|Litauen|Luxemburg|Malta|Niederlande|Österreich|Oesterreich|Polen|Portugal|Rumänien|Rumaenien|Schweden|Slowakei|Slowenien|Spanien|Tschechien|Ungarn|Zypern|Island|Liechtenstein|Norwegen|EU-Mitgliedstaat|EU-Ausland|Mitgliedstaat der EU';
  const RE = {
    kuendig: /K(ü|ue)ndig/i,
    elektronisch: /per\s+E-?Mail|Textform|elektronisch|per\s+Fax|WhatsApp|SMS/i,
    klage: /Klage/i,
    dreiWochen: /(drei|3)\s*Wochen/i,
    otherSpan: /\b(zwei|vier|sechs|acht|\d+)\s*(Wochen|Tagen|Tage|Monat(en)?)\b|\beine[ns]?\s+Monats?\b/i,
    urlaub: /Urlaub/i,
    arbeitstage: /(\d{1,2})\s*(Arbeitstage|Urlaubstage|Tage)/i,
    werktage: /(\d{1,2})\s*Werktage/i,
    wochentage: /(\d)[\s-]*Tage[\s-]*Woche|an\s+(\d)\s+Tagen\s+(pro|je|in\s+der)\s+Woche/i,
    stunde: /Stundenlohn|(pro|je|\/)\s*(Zeit)?(Stunde|Std\.?)\b/i,
    euro: /(\d{1,3}(?:[.,]\d{2})?)\s*(€|EUR|Euro)|(€|EUR)\s*(\d{1,3}(?:[.,]\d{2})?)/g,
    entgelt: /Vergütung|Verguetung|Gehalt|Arbeitsentgelt|Stundenlohn|Lohn\b/i,
    faellig: /fällig|faellig|Auszahlung|ausgezahlt|überwiesen|ueberwiesen|Überweisung|zahlbar/i,
    ueberstunden: /Überstunden|Ueberstunden|Mehrarbeit/i,
    abgegolten: /abgegolten|inbegriffen|enthalten/i,
    stundenZahl: /\d+\s*(Überstunden|Ueberstunden|Stunden)/i,
    arbeitszeit: /Arbeitszeit|Wochenstunden|Stunden\s+(pro|je|in\s+der)\s+Woche/i,
    pause: /Pause|Ruhezeit/i,
    tarif: /Tarifvertr|Betriebsvereinbarung|Dienstvereinbarung/i,
    bav: /betriebliche\s+Altersversorgung|Direktversicherung|Pensionskasse|Pensionsfonds|Unterstützungskasse/i,
    bavTraeger: /Versorgungsträger|\b\d{5}\b/i,
    ausland: /Ausland|Entsendung|entsandt|Einsatzland/i,
    dauer: /(\d+)\s*(Wochen|Monate|Monaten)/i,
    waehrung: /Währung|Waehrung/i,
    rueckkehr: /Rückkehr|Rueckkehr/i,
    entsend: /Entsendung|entsandt|entsendet/i,
    eu: new RegExp(EU, 'i'),
    url: /https?:\/\/\S+/i,
    textform: /Textform|per\s+E-?Mail|elektronisch/i,
    nachweis: /Nachweis|Niederschrift|Arbeitsbedingungen|Vertrag/i,
    empfang: /Empfang/i
  };

  function find(check, line, extra) {
    const r = R[check];
    return { check, sev: r.sev, msg: r.msg + (extra ? ' ' + extra : '') + ' (' + r.law + ') Korrektur: ' + r.fix, line };
  }

  function minWage(today) {
    let rate = 0;
    R.mindestlohn.rates.forEach(([from, v]) => { if (today >= from) rate = v; });
    return rate;
  }

  function check(text, opts) {
    opts = opts || {};
    let today = String(opts.today || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || isNaN(Date.parse(today))) today = new Date().toISOString().slice(0, 10);
    const lines = String(text || '').split(/\r?\n/);
    const out = [];
    const firstLine = re => lines.findIndex(l => re.test(l)) + 1;
    const docHas = re => lines.some(l => re.test(l));

    const wd = lines.map(l => l.match(RE.wochentage)).find(Boolean);
    const days = wd ? parseInt(wd[1] || wd[2], 10) : 5;
    const wage = minWage(today);
    let klageFalsch = false;

    lines.forEach((l, i) => {
      const n = i + 1;
      if (RE.kuendig.test(l) && RE.elektronisch.test(l) && !/ausgeschlossen|nicht\s+(per|in|zulässig)/i.test(l)) out.push(find('kuendigung_textform', n));
      if (RE.klage.test(l) && RE.kuendig.test(l) && !RE.dreiWochen.test(l) && RE.otherSpan.test(l)) { out.push(find('klagefrist_falsch', n)); klageFalsch = true; }
      if (RE.urlaub.test(l)) {
        const w = l.match(RE.werktage), a = !w && l.match(RE.arbeitstage);
        if (w && parseInt(w[1], 10) < Math.round(24 * days / 6)) out.push(find('urlaub_unter_minimum', n));
        else if (a && parseInt(a[1], 10) < 4 * days) out.push(find('urlaub_unter_minimum', n));
      }
      if (wage && RE.stunde.test(l)) {
        let m; RE.euro.lastIndex = 0;
        while ((m = RE.euro.exec(l))) {
          const v = parseFloat((m[1] || m[4]).replace('.', ',').replace(',', '.'));
          if (v > 0 && v < wage) { out.push(find('mindestlohn', n, 'Stichtag ' + today + ': ' + wage.toFixed(2).replace('.', ',') + ' €.')); break; }
        }
      }
      if (RE.ueberstunden.test(l) && RE.abgegolten.test(l) && !RE.stundenZahl.test(l)) out.push(find('ueberstunden_pauschal', n));
      if (RE.textform.test(l) && RE.nachweis.test(l) && !RE.kuendig.test(l) && !docHas(RE.empfang) && today >= R.textform_ohne_empfangsnachweis.since) out.push(find('textform_ohne_empfangsnachweis', n));
    });

    const kLine = firstLine(RE.kuendig);
    if (kLine && !klageFalsch && !lines.some(l => RE.klage.test(l) && RE.dreiWochen.test(l))) out.push(find('klagefrist_fehlt', kLine));
    if (!docHas(RE.urlaub)) out.push(find('urlaub_fehlt', 1));
    const eLine = firstLine(RE.entgelt);
    if (eLine && !docHas(RE.faellig)) out.push(find('entgelt_faelligkeit_fehlt', eLine));
    const azLine = firstLine(RE.arbeitszeit);
    if (azLine && !docHas(RE.pause)) out.push(find('ruhepausen_fehlt', azLine));
    if (!docHas(RE.tarif)) out.push(find('tarifhinweis_fehlt', 1));
    const bavLine = firstLine(RE.bav);
    if (bavLine && !lines.some(l => RE.bav.test(l) && RE.bavTraeger.test(l)) && !docHas(/Versorgungsträger/i)) out.push(find('bav_traeger_fehlt', bavLine));

    const aLine = firstLine(RE.ausland);
    if (aLine) {
      const d = lines[aLine - 1].match(RE.dauer);
      const shortTrip = d && /Wochen/i.test(d[2]) && parseInt(d[1], 10) <= 4;
      if (!shortTrip) {
        const miss = [];
        if (!docHas(RE.dauer)) miss.push('geplante Dauer');
        if (!docHas(RE.waehrung)) miss.push('Währung');
        if (!docHas(RE.rueckkehr)) miss.push('Rückkehrbedingungen');
        if (miss.length) out.push(find('ausland_angaben_fehlen', aLine, 'Fehlt: ' + miss.join(', ') + '.'));
      }
      const euLine = lines.findIndex(l => RE.eu.test(l) && (RE.entsend.test(l) || RE.ausland.test(l))) + 1;
      if (euLine && docHas(RE.entsend) && !docHas(RE.url)) out.push(find('eu_entsendung_website', euLine));
    }

    out.sort((a, b) => a.line - b.line);
    return { findings: out };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.NWGENGINE = api;
})();
