'use strict';
/* Reisekostenabrechnung Prüfer 2026 (DE) — Prüf-Engine.
   Liest eine exportierte Reisekostenabrechnung (CSV mit Semikolon, Tab oder Komma)
   und meldet jede Abweichung vom deutschen Reisekostenrecht mit Zeilennummer. */
(function () {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : ((typeof window !== 'undefined' && window.RK_RULES) ? window.RK_RULES : []);

  function R(id) {
    for (var i = 0; i < RULES.length; i++) { if (RULES[i].id === id) { return RULES[i]; } }
    return {};
  }

  function norm(s) {
    return String(s === undefined || s === null ? '' : s)
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '');
  }

  function num(s) {
    if (s === undefined || s === null) { return NaN; }
    var t = String(s).replace(/[^0-9,.\-]/g, '').trim();
    if (!t) { return NaN; }
    if (t.indexOf(',') > -1) { t = t.replace(/\./g, '').replace(',', '.'); }
    return parseFloat(t);
  }

  function ja(s) {
    var t = String(s === undefined || s === null ? '' : s).trim().toLowerCase();
    return t === 'ja' || t === 'j' || t === 'yes' || t === 'x' || t === '1' || t === 'true';
  }

  function eur(n) {
    var v = (Math.round(n * 100) / 100).toFixed(2);
    return v.replace('.', ',') + ' Euro';
  }

  var COLS = {
    datum: ['datum', 'reisedatum', 'date', 'tag'],
    ziel: ['ziel', 'reiseziel', 'zielort', 'ort'],
    land: ['land', 'laendercode', 'country'],
    anlass: ['anlass', 'reiseanlass', 'zweck', 'grund'],
    std: ['abwesenheitstd', 'abwesenheit', 'abwesenheitstunden', 'stunden', 'dauer', 'dauerstd'],
    vp: ['verpflegungeur', 'verpflegungspauschale', 'verpflegung', 'vpeur', 'pauschale'],
    fr: ['fruehstueck', 'fruehstueckgestellt'],
    mi: ['mittag', 'mittagessen', 'mittaggestellt'],
    ab: ['abend', 'abendessen', 'abendgestellt'],
    kz: ['kuerzungeur', 'kuerzung', 'mahlzeitenkuerzung'],
    km: ['km', 'kilometer', 'fahrtkm'],
    kms: ['kmsatzeur', 'kmsatz', 'kilometersatz'],
    ue: ['uebernachtungeur', 'uebernachtung', 'hotel'],
    beleg: ['beleg', 'belegvorhanden', 'rechnung'],
    tage: ['tageamort', 'tage', 'einsatztage'],
    mkz: ['mkennzeichen', 'kennzeichenm', 'grossbuchstabem'],
    mw: ['mahlzeitwerteur', 'mahlzeitwert', 'mahlzeitenwert']
  };

  function jahrVon(s) {
    var t = String(s === undefined || s === null ? '' : s);
    var m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) { return parseInt(m[1], 10); }
    m = t.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) { return parseInt(m[3], 10); }
    return 0;
  }

  function heute(opts) {
    var t = (opts && opts.today) ? String(opts.today).slice(0, 10) : '';
    var m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) { return null; }
    var d = new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)));
    if (isNaN(d.getTime())) { return null; }
    return d;
  }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    var lines = String(text === undefined || text === null ? '' : text).split(/\r?\n/);
    var headerIdx = -1, delim = ';', idx = {}, i, c, key, n;

    for (i = 0; i < lines.length; i++) {
      if (!lines[i] || !lines[i].trim()) { continue; }
      if (norm(lines[i]).indexOf('datum') > -1) {
        delim = (lines[i].indexOf(';') > -1) ? ';' : (lines[i].indexOf('\t') > -1 ? '\t' : ',');
        var hs = lines[i].split(delim);
        for (c = 0; c < hs.length; c++) {
          n = norm(hs[c]);
          for (key in COLS) {
            if (!Object.prototype.hasOwnProperty.call(COLS, key)) { continue; }
            if (COLS[key].indexOf(n) > -1 && idx[key] === undefined) { idx[key] = c; }
          }
        }
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) { return { findings: findings }; }

    function push(id, msg, line) {
      var r = R(id);
      findings.push({ check: id, sev: r.sev || 'error', msg: msg + ' (' + (r.law || '') + ')', line: line });
    }

    var jahre = [];
    var ersteZeile = 0;

    for (var row = headerIdx + 1; row < lines.length; row++) {
      var raw = lines[row];
      if (!raw || !raw.trim()) { continue; }
      if (raw.replace(new RegExp('\\' + delim, 'g'), '').trim() === '') { continue; }
      var f = raw.split(delim);
      var ln = row + 1;
      var vorher = findings.length;

      var get = function (k) {
        var j = idx[k];
        return (j === undefined || f[j] === undefined) ? '' : String(f[j]).trim();
      };

      var land = (get('land') || 'DE').toUpperCase();
      var inland = (land === 'DE' || land === 'D' || land === 'DEU' || land === 'DEUTSCHLAND');
      var std = num(get('std'));
      var vp = num(get('vp'));
      var r1 = R('vp_24h_satz'), r2 = R('vp_teiltag_satz'), r3 = R('vp_unter_8h');
      var tageOrt = num(get('tage'));
      var fristWeg = (!isNaN(tageOrt) && tageOrt > R('dreimonatsfrist').grenze_tage);

      if (!fristWeg && inland && !isNaN(std) && !isNaN(vp) && std >= 24 && Math.abs(vp - r1.betrag) > 0.005) {
        push('vp_24h_satz', 'Ganzer Kalendertag: gebucht ' + eur(vp) + ', richtig ' + eur(r1.betrag), ln);
      }
      if (!fristWeg && inland && !isNaN(std) && !isNaN(vp) && std > 8 && std < 24 && Math.abs(vp - r2.betrag) > 0.005) {
        push('vp_teiltag_satz', std + ' Stunden Abwesenheit: gebucht ' + eur(vp) + ', richtig ' + eur(r2.betrag)
          + '; ' + eur(r1.betrag) + ' erst ab 24 Stunden', ln);
      }
      if (!isNaN(std) && !isNaN(vp) && std <= r3.grenze_std && vp > 0) {
        push('vp_unter_8h', 'Nur ' + std + ' Stunden abwesend: ' + eur(vp) + ' Pauschale sind steuerpflichtiger Arbeitslohn', ln);
      }

      var fr = ja(get('fr')), mi = ja(get('mi')), ab = ja(get('ab'));
      var r4 = R('kuerzung_fruehstueck'), r5 = R('kuerzung_mittag'), r6 = R('kuerzung_abend');
      var soll = (fr ? r4.betrag : 0) + (mi ? r5.betrag : 0) + (ab ? r6.betrag : 0);
      var ist = num(get('kz'));
      if (isNaN(ist)) { ist = 0; }
      if (inland && soll > 0 && !isNaN(vp) && vp > 0 && ist + 0.005 < soll) {
        if (fr) {
          push('kuerzung_fruehstueck', 'Frühstück gestellt, gekürzt ' + eur(ist) + ': Kürzung ' + eur(r4.betrag)
            + ' (' + r4.prozent + ' Prozent von ' + eur(r1.betrag) + ')', ln);
        }
        if (mi) {
          push('kuerzung_mittag', 'Mittagessen gestellt, gekürzt ' + eur(ist) + ': Kürzung ' + eur(r5.betrag)
            + ' (' + r5.prozent + ' Prozent von ' + eur(r1.betrag) + ')', ln);
        }
        if (ab) {
          push('kuerzung_abend', 'Abendessen gestellt, gekürzt ' + eur(ist) + ': Kürzung ' + eur(r6.betrag)
            + ' (' + r6.prozent + ' Prozent von ' + eur(r1.betrag) + ')', ln);
        }
      }

      var r7 = R('dreimonatsfrist');
      var tage = tageOrt;
      if (!isNaN(tage) && tage > r7.grenze_tage && !isNaN(vp) && vp > 0) {
        push('dreimonatsfrist', 'Tag ' + tage + ' am selben Einsatzort: die Pauschale endet nach ' + r7.monate
          + ' Monaten, ' + eur(vp) + ' sind steuerpflichtig', ln);
      }

      var r8 = R('km_satz');
      var kmv = num(get('km')), kms = num(get('kms'));
      if (!isNaN(kmv) && kmv > 0 && !isNaN(kms) && Math.abs(kms - r8.betrag) > 0.005) {
        push('km_satz', 'Kilometersatz ' + eur(kms) + ' je Kilometer: steuerfrei sind ' + eur(r8.betrag)
          + '; ' + eur((kms - r8.betrag) * kmv) + ' zu viel erstattet', ln);
      }

      if (!inland && !isNaN(vp) && (Math.abs(vp - r1.betrag) < 0.005 || Math.abs(vp - r2.betrag) < 0.005)) {
        push('ausland_inlandssatz', (get('ziel') || land) + ': ' + eur(vp)
          + ' ist der Inlandssatz, für Auslandstage gilt die Länderpauschale', ln);
      }

      if (idx.anlass !== undefined && !get('anlass')) {
        push('anlass_fehlt', 'Reiseanlass leer: ohne Anlass ist die berufliche Veranlassung nicht nachgewiesen', ln);
      }
      if (idx.ziel !== undefined && !get('ziel')) {
        push('ziel_fehlt', 'Reiseziel leer: die auswärtige Tätigkeitsstätte ist nicht benannt', ln);
      }

      var r12 = R('uebernachtung_ohne_beleg');
      var ue = num(get('ue'));
      if (!isNaN(ue) && ue > r12.betrag && idx.beleg !== undefined && !ja(get('beleg'))) {
        push('uebernachtung_ohne_beleg', 'Übernachtung ' + eur(ue) + ' ohne Beleg: pauschal steuerfrei sind '
          + eur(r12.betrag), ln);
      }

      if ((fr || mi || ab) && idx.mkz !== undefined && !ja(get('mkz'))) {
        push('m_kennzeichen', 'Mahlzeit vom Arbeitgeber gestellt, Großbuchstabe M nicht gesetzt', ln);
      }

      var r14 = R('belohnungsessen');
      var mw = num(get('mw'));
      if (!isNaN(mw) && mw > r14.grenze) {
        push('belohnungsessen', 'Mahlzeit ' + eur(mw) + ' über ' + eur(r14.grenze)
          + ': keine Kürzung, sondern voller Arbeitslohn', ln);
      }

      if (findings.length > vorher) {
        var jj = jahrVon(get('datum'));
        if (jj) { jahre.push(jj); }
        if (!ersteZeile) { ersteZeile = ln; }
      }
    }

    if (findings.length && jahre.length) {
      var r15 = R('korrekturfenster');
      var jahr = jahre[0];
      for (i = 1; i < jahre.length; i++) { if (jahre[i] < jahr) { jahr = jahre[i]; } }
      var h = heute(opts);
      var frist = new Date(Date.UTC(jahr + 1, 1, 28));
      if (h && h.getTime() > frist.getTime()) {
        findings.push({
          check: 'korrekturfenster',
          sev: r15.sev || 'error',
          msg: 'Lohnsteuerabzug ' + jahr + ' konnte nur bis zum ' + r15.stichtag + (jahr + 1)
            + ' geändert werden; heute ist ' + String(opts.today).slice(0, 10)
            + ', der Fehler ist dem Betriebsstättenfinanzamt anzuzeigen (' + (r15.law || '') + ')',
          line: ersteZeile || 1
        });
      }
    }

    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof window !== 'undefined') { window.RKENGINE = API; }
})();
