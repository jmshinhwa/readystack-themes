/* Aufbewahrungsfristen-Lint: prüft Löschkonzept-Tabellen (Markdown) gegen AO/HGB (BEG IV) und DSGVO. */
(function () {
  var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.LK_RULES;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim();
  }
  function cells(line) {
    var t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    return t.split('|').map(function (c) { return c.replace(/\s+/g, ' ').trim(); });
  }
  function isSep(line) { return /^\s*\|?[\s|:\-]+\|?\s*$/.test(line) && line.indexOf('-') >= 0; }

  var CATS = [
    ['lohn', /lohnkont|lohnunterlag|lohnabrechn|gehaltsabrechn|lohnjournal|entgeltabrechn/],
    ['abschluss', /jahresabschluss|bilanz|inventar|lagebericht|handelsbuch|handelsbuech|hauptbuch|journal/],
    ['bewerb', /bewerb/],
    ['brief', /handelsbrief|geschaeftsbrief|korrespondenz|angebot|auftragsbestaetigung/],
    ['beleg', /buchungsbeleg|rechnung|kontoauszu|quittung|kassenbon|kassenbeleg|gutschrift|beleg/]
  ];
  function category(c) {
    var n = norm(c);
    for (var i = 0; i < CATS.length; i++) if (CATS[i][1].test(n)) return CATS[i][0];
    return null;
  }
  function period(c) {
    var n = norm(c);
    if (/unbegrenzt|unbefristet|dauerhaft|fuer immer|zeitlich unbeschraenkt|ohne frist/.test(n)) return { unbounded: true };
    var m = n.match(/(\d+(?:[.,]\d+)?)\s*(jahr|monat|woche|tag)/);
    if (!m) return null;
    var v = parseFloat(m[1].replace(',', '.'));
    var months = m[2] === 'jahr' ? v * 12 : m[2] === 'monat' ? v : m[2] === 'woche' ? v / 4.345 : v / 30.44;
    return { months: months, text: String(c).replace(/\s+/g, ' ').trim() };
  }
  function todayYear(opts) {
    var m = String((opts && opts.today) || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? parseInt(m[1], 10) : new Date().getFullYear();
  }
  var BAD_START = /\bab (dem )?(rechnungs|beleg|buchungs|ausstellungs|erstellungs)?datum|\bab (erstellung|eingang|zugang|ausstellung|buchung|belegdatum)/;

  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    var T = todayYear(opts);
    var pCol = -1, sCol = -1, header = null;
    function add(id, line, msg) {
      var r = BY_ID[id];
      findings.push({ check: id, sev: r.sev, msg: msg + ' — ' + r.basis, line: line });
    }
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (!/^\s*\|/.test(ln)) { header = null; pCol = sCol = -1; continue; }
      if (isSep(ln)) {
        if (header) {
          pCol = sCol = -1;
          header.forEach(function (h, k) {
            var n = norm(h);
            if (/beginn|start/.test(n)) { if (sCol < 0) sCol = k; }
            else if (/frist|aufbewahr|dauer|speicher/.test(n) && pCol < 0) pCol = k;
          });
          header = 'done';
        }
        continue;
      }
      if (header === null) { header = cells(ln); continue; }
      if (header !== 'done') continue;
      var c = cells(ln);
      var name = c[0] || '';
      if (!name) continue;
      var cat = category(name);
      var pText = pCol >= 0 ? (c[pCol] || '') : c.slice(1).join(' ');
      var sText = sCol >= 0 ? (c[sCol] || '') : c.slice(1).join(' ');
      var p = period(pText);
      var L = i + 1;
      if (p && p.unbounded) { add('unbegrenzt', L, name + ': „' + pText + '“ — jede Datenkategorie braucht eine Löschfrist'); continue; }
      if (!p) { add('frist_fehlt', L, name + ': keine Frist in Jahren/Monaten angegeben'); continue; }
      var y = p.months / 12;
      if (cat === 'beleg') {
        if (y > 8) {
          var extra = Math.round(y - 8);
          var from = T - 1 - Math.round(y) + 1, to = T - 9;
          add('beleg_zu_lang', L, name + ': ' + p.text + ' → seit 2025-01-01 gilt 8 Jahre. Stand ' + T + ': Jahrgänge bis ' + (T - 9) + ' sind löschreif; mit ' + p.text + ' behalten Sie ' + (extra === 1 ? to : from + '–' + to) + ' (' + extra + ' Jahrgänge) zu lange');
        } else if (y < 8) add('beleg_zu_kurz', L, name + ': ' + p.text + ' → mindestens 8 Jahre');
      } else if (cat === 'abschluss') {
        if (y < 10) add('abschluss_zu_kurz', L, name + ': ' + p.text + ' → 10 Jahre (BEG IV hat nur Buchungsbelege verkürzt)');
      } else if (cat === 'brief') {
        if (y > 6) add('brief_zu_lang', L, name + ': ' + p.text + ' → 6 Jahre');
        else if (y < 6) add('brief_zu_kurz', L, name + ': ' + p.text + ' → mindestens 6 Jahre');
      } else if (cat === 'lohn') {
        if (y < 6) add('lohnkonto_zu_kurz', L, name + ': ' + p.text + ' → bis Ende des 6. Kalenderjahres nach der letzten Lohnzahlung');
      } else if (cat === 'bewerb') {
        if (p.months > 6.01) add('bewerber_zu_lang', L, name + ': ' + p.text + ' → üblich 6 Monate nach Absage');
      }
      if (cat && cat !== 'bewerb' && BAD_START.test(norm(sText)))
        add('fristbeginn_falsch', L, name + ': Fristbeginn „' + sText + '“ → die Frist beginnt mit Ablauf des Kalenderjahres, in dem der Beleg entstand');
    }
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.LKENGINE = api;
})();
