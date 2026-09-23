/* Antragsfrist-Lint — § 31 Abs. 3 VwVfG für Förderprogramm-Seiten.
   Dieselbe Datei läuft in VS Code (require) und im Browser (window). */
(function (root, factory) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.AFL_RULES;
  var api = factory(RULES);
  root.AFLENGINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (RULES) {
  'use strict';

  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  var FEIERTAGE = BY_ID.fristende_feiertag.feiertage;
  var DEFAULT_TODAY = BY_ID.fristende_feiertag.default_today;

  // Eine Zeile ist eine "Fristzeile", wenn sie einen Fristbegriff trägt.
  var FRIST_WORT = /(antragsfrist|einreichungsfrist|ausschlussfrist|abgabefrist|bewerbungsfrist|bewilligungsfrist|einreichungstag|fristende|frist|stichtag)/i;
  var DATUM_DE = /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g;
  var DATUM_OHNE_JAHR = /\b(\d{1,2})\.(\d{1,2})\.(?!\s*\d{4})/g;
  var DATUM_ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  var POSTSTEMPEL = /poststempel/i;
  var RUECKWIRKEND = /(r(ü|ue)ckwirkend|nachtr(ä|ae)glich(er|e)? antrag|auch nach ma(ß|ss)nahmenbeginn)/i;
  var RICHTLINIE = /(f(ö|oe)rderrichtlinie|richtlinie des|verwaltungsvorschrift)/i;
  var STAND = /(vom\s+\d{1,2}\.\d{1,2}\.\d{4}|stand:?\s*\d{1,2}\.\d{1,2}\.\d{4}|i\.\s?d\.\s?F\.)/i;

  function iso(y, m, d) {
    return String(y) + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2);
  }
  // Wochentag ohne Zeitzone: 0 = Sonntag … 6 = Samstag
  function wochentag(isoDate) {
    var p = isoDate.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
  }
  function istFeiertag(isoDate) {
    var jahr = isoDate.slice(0, 4);
    var liste = FEIERTAGE[jahr];
    return !!liste && liste.indexOf(isoDate) !== -1;
  }
  function naechsterWerktag(isoDate) {
    var p = isoDate.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    for (var n = 0; n < 10; n++) {
      d.setUTCDate(d.getUTCDate() + 1);
      var s = iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      if (wochentag(s) !== 0 && wochentag(s) !== 6 && !istFeiertag(s)) return s;
    }
    return isoDate;
  }
  function deutsch(isoDate) {
    var p = isoDate.split('-');
    return p[2] + '.' + p[1] + '.' + p[0];
  }

  function check(text, opts) {
    opts = opts || {};
    var heute = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today || '').slice(0, 10))
      ? String(opts.today).slice(0, 10)
      : DEFAULT_TODAY;
    var findings = [];
    var lines = String(text == null ? '' : text).split(/\r?\n/);

    function add(id, line, msg) {
      var r = BY_ID[id];
      findings.push({ check: id, sev: r.sev, msg: msg || r.msg, line: line });
    }

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var nr = i + 1;
      var istFrist = FRIST_WORT.test(raw);

      if (RUECKWIRKEND.test(raw)) add('rueckwirkend_zugesagt', nr);

      if (RICHTLINIE.test(raw) && !STAND.test(raw)) add('richtlinie_ohne_stand', nr);

      if (!istFrist) continue;

      // Volle deutsche Daten auf der Fristzeile
      var treffer = [];
      var m;
      DATUM_DE.lastIndex = 0;
      while ((m = DATUM_DE.exec(raw)) !== null) treffer.push(iso(+m[3], +m[2], +m[1]));

      if (treffer.length > 1) {
        var verschieden = treffer.filter(function (v, k) { return treffer.indexOf(v) === k; });
        if (verschieden.length > 1) add('frist_widerspruch', nr,
          BY_ID.frist_widerspruch.msg + ' (' + verschieden.map(deutsch).join(' / ') + ')');
      }

      for (var t = 0; t < treffer.length; t++) {
        var d = treffer[t];
        if (d < heute) {
          add('frist_abgelaufen', nr, 'Antragsfrist ' + deutsch(d) + ' liegt vor dem Prüfdatum ' +
            deutsch(heute) + ' — die Seite lädt weiter zum Antrag ein.');
          continue; // abgelaufen schlägt Werktags-Regeln
        }
        var wt = wochentag(d);
        if (istFeiertag(d)) {
          add('fristende_feiertag', nr, 'Fristende ' + deutsch(d) +
            ' ist ein bundesweiter Feiertag — § 31 Abs. 3 S. 1 VwVfG verschiebt das Ende auf ' +
            deutsch(naechsterWerktag(d)) + '.');
        } else if (wt === 0 || wt === 6) {
          add('fristende_wochenende', nr, 'Fristende ' + deutsch(d) + ' ist ein ' +
            (wt === 6 ? 'Samstag' : 'Sonntag') + ' — § 31 Abs. 3 S. 1 VwVfG verschiebt das Ende auf ' +
            deutsch(naechsterWerktag(d)) + '.');
        }
      }

      DATUM_OHNE_JAHR.lastIndex = 0;
      var ohne = [];
      while ((m = DATUM_OHNE_JAHR.exec(raw)) !== null) ohne.push(m[1] + '.' + m[2] + '.');
      if (ohne.length) add('frist_ohne_jahr', nr,
        'Fristdatum "' + ohne[0] + '" ohne Jahreszahl — bei einem jährlichen Aufruf ist nicht erkennbar, welcher Termin gilt.');

      if (POSTSTEMPEL.test(raw)) add('zugang_poststempel', nr);

      DATUM_ISO.lastIndex = 0;
      if (DATUM_ISO.test(raw)) add('datumsformat_iso', nr);
    }

    return { findings: findings };
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
});
