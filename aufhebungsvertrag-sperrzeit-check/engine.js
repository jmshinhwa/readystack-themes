/* Aufhebungsvertrag-Check: Sperrzeit, Ruhen, Kündigungsfrist, Schriftform, Arbeitsuchendmeldung (SGB III / BGB, Stand 2026). */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.AV_RULES;
  var BY = {}; RULES.forEach(function (r) { BY[r.id] = r; });
  var DATE = '(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})';
  var MONEY = '([0-9][0-9.]*(?:,[0-9]{1,2})?)\\s*(?:€|EUR|Euro)';

  function d(y, m, day) { return new Date(Date.UTC(y, m, day)); }
  function parseD(m, i) { return d(+m[i + 2], +m[i + 1] - 1, +m[i]); }
  function lastDay(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }
  function addMonths(t, n) {
    var y = t.getUTCFullYear(), m = t.getUTCMonth() + n;
    var ny = y + Math.floor(m / 12), nm = ((m % 12) + 12) % 12;
    return d(ny, nm, Math.min(t.getUTCDate(), lastDay(ny, nm)));
  }
  function addDays(t, n) { return new Date(t.getTime() + n * 864e5); }
  function endOfMonth(t) { return d(t.getUTCFullYear(), t.getUTCMonth(), lastDay(t.getUTCFullYear(), t.getUTCMonth())); }
  function days(a, b) { return Math.round((b - a) / 864e5); }
  function fullYears(a, b) {
    var y = b.getUTCFullYear() - a.getUTCFullYear();
    if (b.getUTCMonth() < a.getUTCMonth() || (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate())) y--;
    return y;
  }
  function fullMonths(a, b) {
    var n = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
    if (b.getUTCDate() < a.getUTCDate()) n--;
    return n;
  }
  function fd(t) { function p(x) { return (x < 10 ? '0' : '') + x; } return p(t.getUTCDate()) + '.' + p(t.getUTCMonth() + 1) + '.' + t.getUTCFullYear(); }
  function eur(n, dec) {
    var s = (dec ? n.toFixed(2) : String(Math.round(n))).split('.');
    return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (s[1] ? ',' + s[1] : '') + ' €';
  }
  function num(s) { return parseFloat(s.replace(/\./g, '').replace(',', '.')); }

  // § 622 Abs. 2 BGB: Kündigungsfrist des Arbeitgebers nach Bestandsdauer
  function fristMonate(jahre) {
    var t = [[20, 7], [15, 6], [12, 5], [10, 4], [8, 3], [5, 2], [2, 1]];
    for (var i = 0; i < t.length; i++) if (jahre >= t[i][0]) return t[i][1];
    return 0;
  }
  function fristEnde(zugang, jahre) {
    var n = fristMonate(jahre);
    if (n) return endOfMonth(addMonths(zugang, n));
    var t = addDays(zugang, 28);
    return t.getUTCDate() <= 15 ? d(t.getUTCFullYear(), t.getUTCMonth(), 15) : endOfMonth(t);
  }
  // § 147 Abs. 2 SGB III: Anspruchsdauer in Monaten
  function anspruchMonate(versMonate, alter) {
    var t = [[48, 58, 24], [36, 55, 18], [30, 50, 15], [24, 0, 12], [20, 0, 10], [16, 0, 8], [12, 0, 6]];
    for (var i = 0; i < t.length; i++) if (versMonate >= t[i][0] && alter >= t[i][1]) return t[i][2];
    return 0;
  }

  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/), out = [];
    function lineOf(re) { for (var i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1; return 0; }
    function field(re) {
      for (var i = 0; i < lines.length; i++) { var m = lines[i].match(re); if (m) return { m: m, line: i + 1 }; }
      return null;
    }
    function add(id, msg, line) { var r = BY[id]; out.push({ check: id, sev: r.sev, msg: r.title + ' (' + r.law + '): ' + msg + ' → ' + r.fix, line: line || 1 }); }

    var fStart = field(new RegExp('(?:beschäftigt seit|eintrittsdatum|beginn des arbeitsverhältnisses)\\s*:?\\s*' + DATE, 'i'));
    var fBirth = field(new RegExp('(?:geburtsdatum|geboren am)\\s*:?\\s*' + DATE, 'i'));
    var fAgree = field(new RegExp('(?:datum der vereinbarung|vereinbarungsdatum|abgeschlossen am)\\s*:?\\s*' + DATE, 'i'));
    var fEnd = field(new RegExp('(?:beendigung zum|endet mit ablauf des|endet zum|endet am)\\s*:?\\s*' + DATE, 'i'));
    var fPay = field(new RegExp('(?:bruttomonatsgehalt|monatsbrutto|bruttomonatsentgelt)\\s*:?\\s*' + MONEY, 'i'));
    var fAbf = field(new RegExp('abfindung(?:\\s+in\\s+höhe\\s+von|\\s+von)?\\s*:?\\s*(?:brutto\\s*)?' + MONEY, 'i'));
    var start = fStart && parseD(fStart.m, 1), birth = fBirth && parseD(fBirth.m, 1),
        agree = fAgree && parseD(fAgree.m, 1), end = fEnd && parseD(fEnd.m, 1),
        pay = fPay && num(fPay.m[1]), abf = fAbf && num(fAbf.m[1]);
    var ref = (fEnd && fEnd.line) || 1;

    // 1 Schriftform
    lines.forEach(function (l, i) {
      if (/(unterzeichn|unterschrift|unterschreib|signatur|signiert|abschluss)/i.test(l) &&
          /(docusign|adobe sign|elektronisch|e-mail|email|qes\b|digital|eingescannt|per scan)/i.test(l))
        add('AV-FORM-623', 'Zeile ' + (i + 1) + ' sieht eine elektronische oder kopierte Unterschrift vor. Die elektronische Form ist ausgeschlossen – der Vertrag wäre nichtig, das Arbeitsverhältnis bestünde fort.', i + 1);
    });
    // 2 Initiative des Arbeitnehmers
    lines.forEach(function (l, i) {
      if (/(auf (eigenen )?wunsch des arbeitnehmers|auf veranlassung des arbeitnehmers|auf initiative des arbeitnehmers|eigenkündigung)/i.test(l))
        add('AV-INITIATIVE', 'Zeile ' + (i + 1) + ' belegt schriftlich, dass der Arbeitnehmer das Beschäftigungsverhältnis gelöst hat – die Agentur prüft dann eine Sperrzeit von 12 Wochen.', i + 1);
    });
    // 3 Kein Kündigungsanlass → Sperrzeit + Minderung
    var grund = /(betriebsbedingt|personenbedingt|zur vermeidung (einer|der) .*kündigung|arbeitgeberseitige[n]? kündigung)/i.test(text);
    if (!grund) {
      var extra = '';
      if (start && birth && end) {
        var alter = fullYears(birth, end), vm = Math.min(60, fullMonths(start, end)), am = anspruchMonate(vm, alter);
        if (am) {
          var ad = am * 30, minus = Math.max(84, Math.ceil(ad / 4));
          extra = ' Bei durchgehender Versicherungspflicht (' + vm + ' Monate in 5 Jahren, Alter ' + alter + ') beträgt die Anspruchsdauer ' + am + ' Monate = ' + ad + ' Tage; eine Sperrzeit von 12 Wochen kürzt sie um mindestens ein Viertel: minus ' + minus + ' Tage Arbeitslosengeld.';
        }
      }
      add('AV-KEIN-GRUND', 'Der Vertrag nennt keinen Grund, der eine Arbeitgeberkündigung ohnehin ausgelöst hätte. Ohne wichtigen Grund ruht das Arbeitslosengeld 12 Wochen (84 Tage).' + extra, lineOf(/aufhebung|beendigung/i) || 1);
    }
    // 4 Angaben
    var miss = [];
    if (!start) miss.push('Beschäftigt seit'); if (!agree) miss.push('Datum der Vereinbarung'); if (!end) miss.push('Beendigung zum');
    if (abf && !pay) miss.push('Bruttomonatsgehalt'); if (abf && !birth) miss.push('Geburtsdatum');
    if (miss.length) add('AV-ANGABEN', 'Nicht gefunden: ' + miss.join(', ') + ' (Format TT.MM.JJJJ bzw. Betrag mit €).', 1);

    var fe = null, verletzt = false;
    if (start && agree && end) {
      var jz = fullYears(start, agree);
      fe = fristEnde(agree, jz);
      verletzt = end < fe;
      if (verletzt)
        add('AV-FRIST-622', 'Bestand am ' + fd(agree) + ': ' + jz + ' Jahre → ' + (fristMonate(jz) ? fristMonate(jz) + ' Monate zum Monatsende' : '4 Wochen zum 15. oder Monatsende') + '. Frühestes Ende: ' + fd(fe) + ', vereinbart: ' + fd(end) + ' (' + days(end, fe) + ' Tage zu früh; längere Tarif- oder Vertragsfristen gehen vor).', ref);
    }
    // 5 Ruhen § 158
    if (verletzt && abf) {
      if (pay && birth) {
        var jahre = fullYears(start, end), alt = fullYears(birth, end);
        var anteil = Math.max(25, 60 - 5 * Math.floor(jahre / 5) - 5 * Math.floor(Math.max(0, alt - 35) / 5));
        var betrag = abf * anteil / 100, tag = pay * 12 / 365;
        var nb = Math.floor(betrag / tag), nf = days(end, fe), n = Math.min(nb, nf, 365);
        add('AV-RUHEN-158', 'Arbeitslosengeld ruht ' + n + ' Tage (' + fd(addDays(end, 1)) + '–' + fd(addDays(end, n)) + '): ' + anteil + ' % von ' + eur(abf) + ' = ' + eur(betrag) + ' ÷ ' + eur(tag, 1) + ' Tagesentgelt = ' + nb + ' Tage; Fristende ' + fd(fe) + ' = ' + nf + ' Tage; Obergrenze 365 Tage. Anteil: 60 % minus 5 % je 5 Jahre Betriebszugehörigkeit (' + jahre + ') und je 5 Lebensjahre über 35 (Alter ' + alt + '), mindestens 25 %.', fAbf.line);
      } else {
        add('AV-RUHEN-158', 'Das Arbeitslosengeld ruht ab ' + fd(addDays(end, 1)) + ' bis höchstens ' + fd(fe) + '. Für die genaue Zahl fehlen Bruttomonatsgehalt und Geburtsdatum.', fAbf.line);
      }
    }
    // 6 Abfindungsband
    if (abf && pay && start && end) {
      var bj = Math.max(1, fullYears(start, end)), q = abf / (pay * bj);
      if (q > 0.5 || q < 0.25)
        add('AV-ABFINDUNG-BAND', eur(abf) + ' = ' + q.toFixed(2).replace('.', ',') + ' Monatsgehälter je Beschäftigungsjahr (' + bj + ' Jahre × ' + eur(pay) + '). Ohne weitere Prüfung gilt der wichtige Grund nur bei 0,25–0,5, hier ' + eur(pay * bj * 0.25) + ' bis ' + eur(pay * bj * 0.5) + '.', fAbf.line);
    }
    // 7 Arbeitsuchendmeldung
    if (!/arbeitsuchend/i.test(text) && agree && end) {
      var kurz = addMonths(agree, 3) > end;
      var bis = kurz ? addDays(agree, 3) : addMonths(end, -3);
      add('AV-MELDUNG-38', 'Meldung bei der Agentur für Arbeit spätestens am ' + fd(bis) + (kurz ? ' (weniger als 3 Monate bis ' + fd(end) + ' → 3 Tage nach Kenntnis)' : ' (3 Monate vor ' + fd(end) + ')') + '. Verspätet = 1 Woche Sperrzeit.', (fAgree && fAgree.line) || ref);
    }
    // 8 Urlaubsabgeltung
    if (verletzt && /urlaubsabgeltung|urlaub[^.]*abgegolten/i.test(text))
      add('AV-URLAUB-158', 'Der Vertrag gilt Resturlaub in Geld ab, während die Frist unterschritten ist – der Ruhenszeitraum verlängert sich um die abgegoltenen Urlaubstage.', lineOf(/urlaubsabgeltung|abgegolten/i));

    out.sort(function (a, b) { return a.line - b.line; });
    return { findings: out, facts: { fristEnde: fe && fd(fe) } };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.AVENGINE = api;
})();
