/* Förderquoten-Lint: § 82 SGB III (Fassung ab 2024-04-01). Same file runs in VS Code and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.FQ_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.id] = r; });
  var REFORM = Date.UTC(2024, 3, 1);
  var DAY = 86400000;

  function parseDate(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    m = String(s || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
    return null;
  }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function euro(n) {
    var s = String(Math.round(n)), out = '';
    while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out + ' €';
  }

  // Units: a paragraph, a list item, a table row or a heading. Hard-wrapped lines are joined.
  function units(text) {
    var lines = String(text || '').split(/\r?\n/), out = [], cur = null;
    lines.forEach(function (ln, i) {
      if (/^\s*$/.test(ln)) { cur = null; return; }
      if (!cur || /^\s*([-*+]\s|\d+\.\s|\||#)/.test(ln)) { cur = { line: i + 1, t: '' }; out.push(cur); }
      cur.t += ' ' + ln;
    });
    out.forEach(function (u) { u.t = u.t.replace(/\s+/g, ' ').trim(); });
    return out;
  }

  var EMP = '(?:Beschäftigt|Mitarbeit|Arbeitnehm)';
  var DATE = '(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\.\\d{1,2}\\.\\d{4})';
  var RX = {
    qg: /Qualifizierungsgeld|Belegschaft|Strukturwandel|Arbeitsplätze/i,
    tier10: new RegExp('(?:weniger als|unter|bis zu|bis|max\\.?|<)\\s*10(?![\\d.,])\\s*' + EMP, 'i'),
    tier250: new RegExp('(?<![\\d.,])10\\s*(?:bis|–|-)\\s*249|(?:weniger als|unter|<)\\s*250(?![\\d.,])\\s*' + EMP + '|(?<![\\d.,])250\\s*(?:bis|–|-)\\s*(?:unter\\s*)?2\\.?[45]\\d\\d', 'i'),
    tier2500: new RegExp('(?<![\\d.,])2\\.?500\\s*(?:' + EMP + '|oder mehr|und mehr)', 'i'),
    rate15: /(?<![\d.,])15\s*(?:%|Prozent(?!\s*-?punkt))/i,
    costCtx: /Lehrgang|Weiterbildungskosten|Förder|Zuschuss|Kosten/i,
    h160: /(?<![\d.,])160\s*(?:Stunden|Std\b|Std\.|Unterrichtsstunden|UE\b|Zeitstunden)/i,
    h120: /(?:\bab|mindestens|min\.|\bvon|≥)\s*120\s*(?:Stunden|Std|Unterrichtsstunden|UE|Zeitstunden)|(?<![\d.,])120\s*(?:Stunden|Std\.?|Unterrichtsstunden|UE|Zeitstunden)\s*(?:oder|und)\s*mehr/i,
    umfang: /(?:Umfang|Dauer|Kursdauer)\s*:?\s*(\d{1,4})\s*(?:Stunden|Std|Unterrichtsstunden|UE|Zeitstunden)/i,
    foerder: /§\s*82|Qualifizierungschancengesetz|förderfähig|Förderung|gefördert/i,
    age45: /45\.?\s*Lebensjahr|\bab\s*45\b|über\s*45\b|45\s*Jahre/i,
    lt250: /(?:weniger als|unter|<)\s*250(?![\d.,])/i,
    band: new RegExp([
      '(50\\s*(?:bis|–|-)\\s*(?:unter\\s*)?(?:499|500)(?!\\d)|mindestens\\s*50\\s*und\\s*weniger\\s*als\\s*500(?!\\d))',
      '((?:weniger als|unter)\\s*500(?![\\d.,]))',
      '((?:weniger als|unter|bis zu|bis|<)\\s*(?:49|50)(?![\\d.,])\\s*' + EMP + ')',
      '((?:\\bab|mindestens|über|mehr als|≥)\\s*500(?![\\d.,])|(?<![\\d.,])500\\s*' + EMP + '\\w*\\s*(?:oder|und)\\s*mehr|(?<![\\d.,])500\\+)',
      '((?<![\\d.,])10\\s*(?:bis|–|-)\\s*249|250\\s*(?:bis|–|-)\\s*(?:unter\\s*)?2\\.?[45]\\d\\d|(?:weniger als|unter|bis zu|<)\\s*(?:10|250)(?![\\d.,])|(?:\\bab|über|mehr als)\\s*2\\.?500)',
      '(Qualifizierungsgeld)',
      '(?<![\\d.,])(\\d{1,3})\\s*(?:%|Prozent(?!\\s*-?punkt))'
    ].join('|'), 'gi'),
    fee: /(?:Kursgebühr|Lehrgangskosten|Kursgebühren|Kurskosten|Preis)\s*:?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{2})?\s*(?:€|Euro|EUR)/i,
    stand: new RegExp('Stand\\s*:?\\s*(?:vom\\s*)?' + DATE, 'i'),
    start: new RegExp('(?:Kursbeginn|Maßnahmebeginn|Starttermin|Kursstart|Beginn)\\s*:?\\s*(?:am\\s*)?' + DATE, 'i'),
    azav: /AZAV|zugelassen|Zulassung|zertifiziert/i,
    antrag: /Antrag\w*[^.]{0,80}?vor\s+(?:dem\s+|der\s+)?(?:Beginn|Maßnahme|Kurs|Start)|vor\s+(?:dem\s+)?(?:Beginn|Kursbeginn|Maßnahmebeginn)[^.]{0,80}?Antrag/i
  };
  var ALLOWED = { mid: [50, 55, 45], lt500: [], lt50: [100, 75, 80], ge500: [25, 30, 75, 70] };
  var RATE_RULE = { mid: 'rate_mid', lt50: 'rate_lt50', ge500: 'rate_ge500' };
  var SHARE = { mid: 0.5, ge500: 0.75 };

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    var todayT = parseDate(opts.today);
    var all = String(text || '').replace(/\s+/g, ' ');
    var feeM = all.match(RX.fee);
    var fee = feeM ? +feeM[1].replace(/\./g, '') : 0;
    var foerder = RX.foerder.test(all);
    var startT = null;

    function add(id, line, extra) {
      var r = BY[id];
      findings.push({ check: id, sev: r.sev, msg: r.msg + (extra ? ' ' + extra : ''), line: line });
    }

    units(text).forEach(function (u) {
      var t = u.t, qg = RX.qg.test(t), a45 = RX.age45.test(t) && RX.lt250.test(t);
      if (!qg && RX.tier10.test(t)) add('stale_tier_10', u.line);
      if (!qg && !a45 && RX.tier250.test(t)) add('stale_tier_250', u.line);
      if (RX.tier2500.test(t)) add('stale_tier_2500', u.line);
      if (!qg && RX.rate15.test(t) && (foerder || RX.costCtx.test(t))) add('stale_rate_15', u.line);
      if (RX.h160.test(t)) add('hours_160', u.line);
      if (RX.h120.test(t)) add('hours_120_inclusive', u.line);
      var um = t.match(RX.umfang);
      if (um && +um[1] <= 120 && foerder) add('course_too_short', u.line, 'Angegeben: ' + um[1] + ' Stunden.');
      if (a45) add('age45_250', u.line);

      // Walk size bands and percentages in reading order; each % belongs to the last band named.
      var band = null, done = {}, m, ctx45 = /45|schwerbehindert/i.test(t);
      RX.band.lastIndex = 0;
      while ((m = RX.band.exec(t))) {
        if (m[1]) band = 'mid'; else if (m[2]) band = 'lt500'; else if (m[3]) band = 'lt50';
        else if (m[4]) band = 'ge500'; else if (m[5] || m[6]) band = null;
        else if (m[7] && band && !done[band]) {
          var v = +m[7], ok = ALLOWED[band].indexOf(v) >= 0 || (v === 100 && ctx45 && (band === 'mid' || band === 'lt500'));
          if (band === 'lt500') continue;
          if (!ok) {
            done[band] = true;
            var extra = 'Angegeben: ' + v + ' %.';
            if (fee && SHARE[band] && v > (band === 'mid' ? 55 : 30) && v <= 100)
              extra += ' Bei ' + euro(fee) + ' Lehrgangskosten trägt der Betrieb ' + euro(fee * SHARE[band]) + ' selbst, die Seite verspricht ' + euro(fee * v / 100) + ' Förderung.';
            add(RATE_RULE[band], u.line, extra);
          }
        }
      }

      var sm = t.match(RX.stand);
      if (sm) {
        var st = parseDate(sm[1]);
        if (st !== null && st < REFORM) add('stand_before_reform', u.line, 'Angegeben: ' + sm[1] + '.');
        else if (st !== null && todayT !== null && todayT - st > 365 * DAY)
          add('stand_stale', u.line, 'Stand ' + sm[1] + ' ist am ' + iso(todayT) + ' ' + Math.round((todayT - st) / DAY) + ' Tage alt.');
      }
      var bm = t.match(RX.start);
      if (bm) {
        var bt = parseDate(bm[1]);
        if (bt !== null && startT === null) startT = bt;
        if (bt !== null && todayT !== null && bt < todayT)
          add('start_passed', u.line, 'Kursbeginn ' + bm[1] + ' liegt am ' + iso(todayT) + ' ' + Math.round((todayT - bt) / DAY) + ' Tage zurück.');
      }
    });

    var tail = '';
    if (startT !== null && todayT !== null && startT >= todayT)
      tail = 'Kursbeginn ' + iso(startT) + ': noch ' + Math.round((startT - todayT) / DAY) + ' Tage für den Antrag.';
    if (!RX.azav.test(all)) add('azav_missing', 1, tail);
    if (!RX.antrag.test(all)) add('antrag_missing', 1, tail);

    findings.sort(function (x, y) { return x.line - y.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FQENGINE = API;
})();
