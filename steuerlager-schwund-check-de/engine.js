/* Steuerlager-Schwund & Frist-Check — ein Gehirn fuer VS Code und die Webseite.
   Liest eine Lagerakte (Markdown) und prueft sie gegen AlkStG und AlkStV. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined')
    ? require('./rules.json')
    : root.SL_RULES;

  function rule(id) {
    for (var i = 0; i < RULES.length; i++) { if (RULES[i].id === id) return RULES[i]; }
    return { id: id, sev: 'warn', law: '', title: id };
  }

  function norm(s) {
    return String(s).toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
  }

  function zahl(v) {
    var s = String(v).replace(/[^0-9.,-]/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function tag(v) {
    var s = String(v).trim();
    var m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
    if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
    return null;
  }

  function monat(v) {
    var s = String(v).trim();
    var m = s.match(/(\d{4})-(\d{2})(?!-)/);
    if (m) return { j: +m[1], m: +m[2] };
    m = s.match(/(\d{1,2})[\/.](\d{4})/);
    if (m) return { j: +m[2], m: +m[1] };
    m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return { j: +m[1], m: +m[2] };
    return null;
  }

  /* § 108 Abs. 3 AO: faellt das Fristende auf Samstag oder Sonntag, endet die Frist
     am naechsten Werktag. Gesetzliche Feiertage der Laender sind hier nicht hinterlegt. */
  function werktag(ms) {
    var d = new Date(ms), w = d.getUTCDay();
    if (w === 6) return ms + 2 * 86400000;
    if (w === 0) return ms + 86400000;
    return ms;
  }

  function datum(ms) {
    var d = new Date(ms);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getUTCDate()) + '.' + p(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear();
  }

  function tage(a, b) { return Math.round((a - b) / 86400000); }

  function eur(n) {
    return n.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+,)/g, '$1.');
  }

  function menge(n) { return n.toFixed(2).replace('.', ','); }

  function bereich(k) {
    if (/holzfass|holzfaess/.test(k) && !/abfuellung/.test(k)) return 'lagerung_holz';
    if (k.indexOf('verarbeitung') >= 0 || k.indexOf('herstellung') >= 0) {
      if (/kalt/.test(k)) return 'verarbeitung_kalt';
      if (/warm|abtrieb|auszug|destill/.test(k)) return 'verarbeitung_warm';
      return 'verarbeitung_kalt';
    }
    if (k.indexOf('abfuellung') >= 0 || k.indexOf('abfuellen') >= 0) {
      if (/andere|ueber 5|gross|fass/.test(k)) return 'abfuellung_gross';
      return 'abfuellung_klein';
    }
    if (k.indexOf('lagerung') >= 0 || k.indexOf('lagerbestand') >= 0) {
      if (/holz/.test(k)) return 'lagerung_holz';
      return 'lagerung_sonst';
    }
    return null;
  }

  function check(text, opts) {
    opts = opts || {};
    var heute = tag(opts.today || '') || Date.UTC(2026, 8, 22);
    var zeilen = String(text == null ? '' : text).split(/\r?\n/);
    var f = [];
    var mengen = {}, mengenZeile = {}, ohneEinheit = [];
    var satzZeilen = [];
    var d = {}, dz = {};
    var steuersatz = null, steuersatzZeile = 0, nachweis = false, treffer = 0;

    for (var i = 0; i < zeilen.length; i++) {
      var z = zeilen[i], nr = i + 1;
      var m = z.match(/^\s*[-*>#\s]*([A-Za-zÀ-ſ][^:]{2,60}):\s*(.+?)\s*$/);
      if (/unabhaengig|unabhängig|bescheinigung|kleinbrennerei/i.test(z)) nachweis = true;
      if (!m) continue;
      var k = norm(m[1]).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      var v = m[2];

      if (k.indexOf('verlustsatz') >= 0) {
        var b0 = bereich(k.replace('verlustsatz', '')) || bereich(k);
        var p = zahl(v);
        if (b0 && p !== null) { satzZeilen.push({ b: b0, p: p, nr: nr, txt: m[1].trim() }); treffer++; }
        continue;
      }
      if (k.indexOf('steuersatz') >= 0) { steuersatz = zahl(v); steuersatzZeile = nr; treffer++; continue; }
      if (k.indexOf('steuerentstehung') >= 0 || k.indexOf('anmeldungszeitraum') >= 0 || k.indexOf('steuermonat') >= 0) {
        d.monat = monat(v); dz.monat = nr; treffer++; continue;
      }
      if (k.indexOf('steueranmeldung') >= 0 || k.indexOf('anmeldung abgegeben') >= 0) {
        d.anmeldung = tag(v); dz.anmeldung = nr; treffer++; continue;
      }
      if (k.indexOf('faelligkeit') >= 0 || k.indexOf('zahlung faellig') >= 0) { d.faellig = tag(v); dz.faellig = nr; treffer++; continue; }
      if (k.indexOf('anzeige') >= 0) { d.anzeige = tag(v); dz.anzeige = nr; treffer++; continue; }
      if (k.indexOf('bestandsanmeldung') >= 0) { d.bestandsanmeldung = tag(v); dz.bestandsanmeldung = nr; treffer++; continue; }
      if (k.indexOf('bestandsaufnahme') >= 0) { d.bestandsaufnahme = tag(v); dz.bestandsaufnahme = nr; treffer++; continue; }
      if (k.indexOf('fehlmenge') >= 0 || k.indexOf('schwund') >= 0) {
        var fm = zahl(v);
        if (fm !== null) { mengen.fehlmenge = fm; mengenZeile.fehlmenge = nr; treffer++; }
        if (!/hl\s*a/i.test(v)) ohneEinheit.push({ nr: nr, txt: m[1].trim() });
        continue;
      }
      var b = bereich(k);
      if (b) {
        var q = zahl(v);
        if (q === null) continue;
        mengen[b] = (mengen[b] || 0) + q;
        if (!mengenZeile[b]) mengenZeile[b] = nr;
        if (!/hl\s*a/i.test(v)) ohneEinheit.push({ nr: nr, txt: m[1].trim() });
        treffer++;
      }
    }

    if (treffer === 0) return { findings: [], summary: null };

    function add(id, msg, line, extra) {
      var r = rule(id);
      var o = { check: r.id, sev: r.sev, msg: msg + ' [' + r.law + ']', line: line || 1 };
      if (extra) { for (var kk in extra) { if (Object.prototype.hasOwnProperty.call(extra, kk)) o[kk] = extra[kk]; } }
      f.push(o);
    }

    /* 1) Steuersatz */
    var r3 = rule('steuersatz_falsch');
    var satz = r3.regelsatz;
    if (steuersatz !== null) {
      if (r3.erlaubt.indexOf(steuersatz) < 0) {
        add('steuersatz_falsch', 'Steuersatz ' + menge(steuersatz) + ' Euro je hl A ist kein gesetzlicher Satz (1303, 1022 oder 730 Euro je hl A); gerechnet wird mit dem Regelsatz 1303 Euro je hl A.', steuersatzZeile);
      } else {
        satz = steuersatz;
        if (steuersatz !== r3.regelsatz && !nachweis) {
          add('ermaessigt_ohne_nachweis', 'Ermäßigter Satz ' + menge(steuersatz) + ' Euro je hl A angesetzt, aber keine Zeile zu Unabhängigkeit oder amtlicher Bescheinigung in der Akte.', steuersatzZeile);
        }
      }
    }

    /* 2) Verlustsaetze und Fehlmenge */
    var tabelle = rule('ueberfehlmenge').saetze, gesamt = 0, teile = [];
    for (var s = 0; s < tabelle.length; s++) {
      var t = tabelle[s], q2 = mengen[t.key];
      if (!q2) continue;
      gesamt += q2 * t.satz / 100;
      teile.push(t.label + ' ' + menge(q2) + ' hl A x ' + String(t.satz).replace('.', ',') + ' %');
    }
    for (var s2 = 0; s2 < satzZeilen.length; s2++) {
      var sz = satzZeilen[s2], soll = null, lbl = '';
      for (var s3 = 0; s3 < tabelle.length; s3++) {
        if (tabelle[s3].key === sz.b) { soll = tabelle[s3].satz; lbl = tabelle[s3].label; }
      }
      if (soll !== null && Math.abs(soll - sz.p) > 0.001) {
        add('verlustsatz_falsch', sz.txt + ': ' + String(sz.p).replace('.', ',') + ' % angesetzt, anerkannt sind ' + String(soll).replace('.', ',') + ' % (' + lbl + ').', sz.nr);
      }
    }
    var summary = null;
    if (mengen.fehlmenge != null) {
      var ueber = mengen.fehlmenge - gesamt;
      var steuer = ueber > 0 ? Math.round(ueber * satz * 100) / 100 : 0;
      summary = {
        fehlmenge: mengen.fehlmenge, gesamtverlust: Math.round(gesamt * 10000) / 10000,
        ueberfehlmenge: ueber > 0 ? Math.round(ueber * 10000) / 10000 : 0,
        satz: satz, steuer: steuer, teile: teile
      };
      if (ueber > 0.0001) {
        add('ueberfehlmenge', 'Fehlmenge ' + menge(mengen.fehlmenge) + ' hl A übersteigt den anerkannten Gesamtverlust ' + menge(gesamt)
          + ' hl A um ' + menge(ueber) + ' hl A: ' + eur(steuer) + ' Euro Alkoholsteuer bei ' + menge(satz) + ' Euro je hl A.',
          mengenZeile.fehlmenge, { steuer_eur: steuer });
      }
    }

    /* 3) Fristen der Steueranmeldung */
    if (d.monat) {
      var frist = werktag(Date.UTC(d.monat.j, d.monat.m, 10));
      var faellig = werktag(Date.UTC(d.monat.j, d.monat.m + 1, 5));
      if (d.anmeldung == null) {
        add('anmeldung_fehlt', 'Keine Zeile Steueranmeldung in der Lagerakte; für den Steuermonat wäre sie bis zum ' + datum(frist) + ' abzugeben.', dz.monat);
      } else if (d.anmeldung > frist) {
        add('anmeldung_verspaetet', 'Steueranmeldung am ' + datum(d.anmeldung) + ' abgegeben, Frist war der ' + datum(frist) + ' (' + tage(d.anmeldung, frist) + ' Tage zu spät).', dz.anmeldung);
      }
      if (d.faellig != null && d.faellig > faellig) {
        add('faelligkeit_falsch', 'Fälligkeit ' + datum(d.faellig) + ' eingetragen, fällig ist die Steuer am ' + datum(faellig) + '.', dz.faellig);
      }
    }

    /* 4) Bestandsaufnahme */
    if (d.bestandsaufnahme != null) {
      var ba = new Date(d.bestandsaufnahme);
      var monatsfrist = werktag(Date.UTC(ba.getUTCFullYear(), ba.getUTCMonth() + 1, ba.getUTCDate()));
      if (d.bestandsanmeldung != null && d.bestandsanmeldung > monatsfrist) {
        add('bestandsanmeldung_verspaetet', 'Bestandsanmeldung am ' + datum(d.bestandsanmeldung) + ', spätestens einen Monat nach Abschluss der Bestandsaufnahme: ' + datum(monatsfrist) + '.', dz.bestandsanmeldung);
      }
      if (d.anzeige != null) {
        var vor = tage(d.bestandsaufnahme, d.anzeige);
        if (vor < 21) {
          add('anzeige_zu_spaet', 'Beginn der Bestandsaufnahme ' + vor + ' Tage vorher angezeigt, das Hauptzollamt verlangt drei Wochen (spätestens ' + datum(d.bestandsaufnahme - 21 * 86400000) + ').', dz.anzeige);
        }
      }
    }

    /* 5) Einheit */
    for (var e = 0; e < ohneEinheit.length; e++) {
      add('menge_ohne_einheit', ohneEinheit[e].txt + ': Menge ohne Einheit hl A angegeben; die Steuer bemisst sich nach Hektolitern reinen Alkohols bei 20 Grad Celsius.', ohneEinheit[e].nr);
    }

    f.sort(function (a, b) { return a.line - b.line; });
    return { findings: f, summary: summary, heute: datum(heute) };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  root.SLENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
