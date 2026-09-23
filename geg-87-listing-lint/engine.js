// geg-87-listing-lint — one brain, runs in Node (extension) and in the browser (free web page).
(function () {
  'use strict';
  var RULES = (typeof module !== 'undefined' && typeof require === 'function')
    ? require('./rules.json')
    : (typeof window !== 'undefined' ? window.X_RULES : []);
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  var ENT = {auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö',
             Uuml: 'Ü', szlig: 'ß', sup2: '²', middot: '·', nbsp: ' ',
             amp: '&', euro: '€'};

  // Strip tags and decode a few entities without adding or removing a newline,
  // so every finding still points at the real line of the template.
  function flatten(html) {
    var t = String(html == null ? '' : html);
    t = t.replace(/<!--[\s\S]*?-->|<[^>]*>/g, function (m) { return m.replace(/[^\n]/g, ' '); });
    // entities never contain a newline, so decoding them keeps every line number intact
    t = t.replace(/&(auml|ouml|uuml|Auml|Ouml|Uuml|szlig|sup2|middot|nbsp|amp|euro);/g, function (m, n) {
      return ENT[n] || ' ';
    });
    return t;
  }

  function lineIndex(text) {
    var starts = [0], i = text.indexOf('\n');
    while (i >= 0) { starts.push(i + 1); i = text.indexOf('\n', i + 1); }
    return starts;
  }
  function lineAt(starts, idx) {
    if (!(idx >= 0)) return 1;
    var lo = 0, hi = starts.length - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo + 1;
  }

  function num(s) { return parseFloat(String(s).replace(',', '.')); }
  function at(re, t) { var m = re.exec(t); return m ? m : null; }

  var RE = {
    bedarfsausweis: /Energiebedarfsausweis|Bedarfsausweis/i,
    verbrauchsausweis: /Energieverbrauchsausweis|Verbrauchsausweis/i,
    ausweis: /Energieausweis/i,
    labelBedarf: /Endenergiebedarf/i,
    labelVerbrauch: /Endenergieverbrauch/i,
    value: /(\d{1,5}(?:[.,]\d{1,2})?)\s*kWh/i,
    unit: /kWh\s*\/?\s*\(?\s*(?:m²|m2|qm)\s*(?:[*·x×•\/]|\s)?\s*a\s*\)?/i,
    // real accents and the ae/oe/ue spelling a German CMS often ships
    carrier: /\b(Erdgas|Flüssiggas|Fluessiggas|Gas|Heizöl|Heizoel|Öl|Oel|Fernwärme|Fernwaerme|Nahwärme|Nahwaerme|Wärmepumpe|Waermepumpe|Strom|Holz|Pellets|Holzpellets|Kohle|Solarthermie)\b/i,
    carrierLabel: /Energieträger|Energietraeger/i,
    baujahr: /Baujahr\D{0,40}(1[6-9]\d{2}|20\d{2})/i,
    klasse: /Energieeffizienzklasse\s*:?\s*([A-Za-z]\s*\+?)/,
    nwg: /Nichtwohngebäude|Nichtwohngebaeude|Gewerbe|Bürofläche|Buerroflaeche|Buerofläche|Bueroflaeche|Büroetage|Ladenlokal|Ladenfläche|Ladenflaeche|Lagerhalle|Praxisfläche|Praxisflaeche|Produktionshalle/i,
    waermeVal: /(?:Wärme|Waerme|Heizwärme|Heizwaerme)\D{0,20}\d{1,5}(?:[.,]\d{1,2})?\s*kWh/i,
    stromVal: /Strom\D{0,20}\d{1,5}(?:[.,]\d{1,2})?\s*kWh/i,
    issued: /Energieausweis[^\n]{0,60}?(?:vom|ausgestellt am|Ausstellungsdatum\s*:?)\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/i,
    issuedIso: /(?:Ausstellungsdatum|ausgestellt am|Energieausweis vom)\s*:?\s*(\d{4})-(\d{2})-(\d{2})/i,
    placeholder: /\{\{[^}\n]{0,60}\}\}|\{%[^%\n]{0,60}%\}|%%[A-Z_]{2,30}%%|\$\{[^}\n]{0,60}\}|\bTBD\b|\bXXX+\b|\bk\.\s?A\.|auf Anfrage/i
  };

  function bandOf(v, bands) {
    for (var i = 0; i < bands.length; i++) { if (v < bands[i][1]) return bands[i][0]; }
    return bands[bands.length - 1][0];
  }
  function neighbours(v, bands) {
    // a value sitting exactly on a band edge may legitimately be printed as either class
    var ok = [bandOf(v, bands)];
    for (var i = 0; i < bands.length; i++) { if (v === bands[i][1]) ok.push(bands[i][0]); }
    return ok;
  }

  function check(text, opts) {
    opts = opts || {};
    var raw = String(text == null ? '' : text);
    var t = flatten(raw);
    var starts = lineIndex(t);
    var out = [];
    function push(id, idx, extra) {
      var r = BY_ID[id] || {};
      out.push({check: id, sev: r.sev || 'error', line: lineAt(starts, idx),
                msg: (extra ? extra + ' ' : '') + (r.msg || id)});
    }

    var hasBedarf = RE.bedarfsausweis.test(t);
    var hasVerbrauch = RE.verbrauchsausweis.test(t);
    var mAusweis = at(RE.ausweis, t);
    var anchor = mAusweis ? mAusweis.index : 0;

    // 1 + 2 — which certificate is this?
    if (!hasBedarf && !hasVerbrauch) push('geg87-ausweis-typ-fehlt', anchor);
    else if (hasBedarf && hasVerbrauch) {
      push('geg87-ausweis-typ-widerspruch', anchor, 'Both Energiebedarfsausweis and Energieverbrauchsausweis appear.');
    } else if (hasBedarf && RE.labelVerbrauch.test(t) && !RE.labelBedarf.test(t)) {
      push('geg87-ausweis-typ-widerspruch', at(RE.labelVerbrauch, t).index, 'Type is Bedarfsausweis but the figure is labelled Endenergieverbrauch.');
    } else if (hasVerbrauch && RE.labelBedarf.test(t) && !RE.labelVerbrauch.test(t)) {
      push('geg87-ausweis-typ-widerspruch', at(RE.labelBedarf, t).index, 'Type is Verbrauchsausweis but the figure is labelled Endenergiebedarf.');
    }

    // 3-5 — the Endenergie figure
    var mVal = at(RE.value, t);
    var value = mVal ? num(mVal[1]) : null;
    if (!mVal) push('geg87-kennwert-fehlt', anchor);
    else {
      if (!RE.unit.test(t)) push('geg87-einheit-falsch', mVal.index, '"' + mVal[0].trim() + '" has no per-area-per-year unit.');
      var lim = BY_ID['geg87-kennwert-unplausibel'] || {};
      if (value < (lim.min || 10) || value > (lim.max || 1000)) {
        push('geg87-kennwert-unplausibel', mVal.index, String(mVal[1]) + ' kWh is outside 10-1000.');
      }
    }

    // 6 — heating energy source
    if (!RE.carrier.test(t)) {
      push('geg87-energietraeger-fehlt', RE.carrierLabel.test(t) ? at(RE.carrierLabel, t).index : anchor);
    }

    var isNwg = RE.nwg.test(t);

    // 7-10 — residential-only duties
    if (!isNwg) {
      if (!RE.baujahr.test(t)) push('geg87-baujahr-fehlt', anchor);
      var mK = at(RE.klasse, t);
      if (!mK) push('geg87-effizienzklasse-fehlt', anchor);
      else {
        var letter = mK[1].replace(/\s+/g, '').toUpperCase();
        var klRule = BY_ID['geg87-effizienzklasse-ungueltig'] || {};
        var valid = (klRule.classes || []).indexOf(letter) >= 0;
        if (!valid) push('geg87-effizienzklasse-ungueltig', mK.index, 'Class "' + letter + '" is not a class.');
        else if (value !== null && !isNaN(value)) {
          var bands = (BY_ID['geg87-klasse-passt-nicht'] || {}).bands || [];
          var ok = neighbours(value, bands);
          if (ok.indexOf(letter) < 0) {
            push('geg87-klasse-passt-nicht', mK.index,
                 mVal[1] + ' kWh/(m2*a) is class ' + bandOf(value, bands) + ', the ad prints ' + letter + '.');
          }
        }
      }
    } else if (!(RE.waermeVal.test(t) && RE.stromVal.test(t))) {
      // 11 — non-residential must split the figure
      push('geg87-nwg-getrennte-werte', mVal ? mVal.index : anchor);
    }

    // 12 — is the certificate still alive?
    var mI = at(RE.issued, t), y, mo, d, idx;
    if (mI) { d = +mI[1]; mo = +mI[2]; y = +mI[3]; idx = mI.index; }
    else { var mJ = at(RE.issuedIso, t); if (mJ) { y = +mJ[1]; mo = +mJ[2]; d = +mJ[3]; idx = mJ.index; } }
    if (y) {
      var today = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today || '')) ? new Date(opts.today + 'T00:00:00Z') : new Date();
      var years = (BY_ID['geg87-ausweis-abgelaufen'] || {}).valid_years || 10;
      var expiry = Date.UTC(y + years, mo - 1, d);
      if (expiry < today.getTime()) {
        var pad = function (n) { return (n < 10 ? '0' : '') + n; };
        push('geg87-ausweis-abgelaufen', idx,
             'Issued ' + pad(d) + '.' + pad(mo) + '.' + y + ', expired ' + pad(d) + '.' + pad(mo) + '.' + (y + years) + '.');
      }
    }

    // 13 — unrendered template token
    var mP = at(RE.placeholder, t);
    if (mP) push('geg87-platzhalter', mP.index, '"' + mP[0].trim() + '" is still in the ad.');

    out.sort(function (a, b) { return a.line - b.line; });
    return {findings: out};
  }

  var api = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.XENGINE = api;
})();
