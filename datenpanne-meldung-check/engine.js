// Datenpanne Meldung Check – engine. Same file runs in node (extension, tests) and in the browser (index.html).
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.DP_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.check] = r; });

  var EMPTY = /^(|-|–|—|\?+|tbd|todo|offen|unbekannt|n\/a|x+|\.\.\.|…)$/i;
  var FIELDS = {
    kenntnis: /kenntnis/,
    meldung: /^meldung/,
    delay: /verz(ö|oe)gerung/,
    riskReason: /begr(ü|ue)ndung.*risiko|risiko.*begr(ü|ue)ndung/,
    risk: /^risiko(bewertung|einsch(ä|ae)tzung)?$/,
    nature: /^art der verletzung/,
    persons: /anzahl.*(betroffen|personen)/,
    records: /datens(ä|ae)tze/,
    catPersons: /kategorie.*person|personenkategorie/,
    catData: /kategorie.*daten|datenkategorie/,
    dpo: /datenschutzbeauftragte/,
    consequences: /folgen/,
    measures: /ma(ß|ss)nahmen/,
    art34: /benachrichtigung/,
    authority: /^(zust(ä|ae)ndige )?aufsichtsbeh(ö|oe)rde$/
  };
  var ORDER = ['riskReason', 'kenntnis', 'meldung', 'delay', 'nature', 'persons', 'records', 'catPersons', 'catData', 'dpo', 'consequences', 'measures', 'art34', 'authority', 'risk'];

  // "Key: value", "- **Key:** value" or "| Key | value |" -> fields[name] = {value, line}
  function parse(text) {
    var out = {};
    String(text || '').split(/\r?\n/).forEach(function (raw, i) {
      var m = raw.match(/^\s*(?:[-*]\s+)?\|?\s*\**\s*([^:|*]{2,60}?)\s*\**\s*(?::|\|)\s*\**\s*(.*?)\s*\|?\s*$/);
      if (!m) return;
      var key = m[1].toLowerCase().replace(/\s+/g, ' ').trim();
      var val = m[2].replace(/\s+/g, ' ').trim();
      for (var k = 0; k < ORDER.length; k++) {
        var name = ORDER[k];
        if (FIELDS[name].test(key)) { if (!out[name]) out[name] = { value: val, line: i + 1 }; return; }
      }
    });
    return out;
  }
  function filled(f) { return !!(f && !EMPTY.test(f.value.replace(/[.\s]+$/, ''))); }

  // "2026-09-21 09:30" or "21.09.2026, 09:30" -> ms (UTC arithmetic, no time zone drift)
  function when(s) {
    s = String(s || '');
    var m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T,]+(\d{1,2}):(\d{2}))?/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,]+(\d{1,2}):(\d{2}))?/);
    if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
    return null;
  }
  function stamp(ms) {
    var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
  }
  function hours(ms) { return Math.round(ms / 36e5 * 10) / 10; }

  function check(text, opts) {
    opts = opts || {};
    var f = parse(text), findings = [];
    function hit(checkName, line, extra) {
      var r = BY[checkName];
      findings.push({ check: r.id, sev: r.sev, line: line || 1, msg: r.title + (extra ? ' – ' + extra : '') + '. ' + r.fix + ' (' + r.art + ')' });
    }
    var todayMs = when(opts.today);
    var riskVal = f.risk ? f.risk.value.toLowerCase() : '';
    var noRisk = /kein(e)? risiko|voraussichtlich nicht|nicht meldepflichtig/.test(riskVal);
    var highRisk = !noRisk && /hoch/.test(riskVal);
    var known = f.kenntnis ? when(f.kenntnis.value) : null;
    var reported = f.meldung ? when(f.meldung.value) : null;

    if (known === null) hit('kenntnis', f.kenntnis ? f.kenntnis.line : 1, todayMs !== null ? 'ohne diesen Zeitpunkt lässt sich die Frist am ' + stamp(todayMs).slice(0, 10) + ' nicht prüfen' : '');
    if (known !== null && reported !== null) {
      var h = hours(reported - known);
      if (h > 72 && !filled(f.delay)) hit('late_no_reason', f.meldung.line, 'gemeldet ' + h + ' h nach Kenntnis (Frist endete ' + stamp(known + 72 * 36e5) + ')');
    }
    if (!noRisk && reported === null) {
      var extra = '';
      if (known !== null) {
        var end = known + 72 * 36e5;
        extra = '72-h-Frist ab Kenntnis ' + stamp(known) + ' endet ' + stamp(end);
        if (todayMs !== null) {
          var days = Math.floor((todayMs - Date.UTC(new Date(end).getUTCFullYear(), new Date(end).getUTCMonth(), new Date(end).getUTCDate())) / 864e5);
          extra += days > 0 ? ', am ' + stamp(todayMs).slice(0, 10) + ' seit ' + days + ' Tag(en) überfällig' : (days === 0 ? ', läuft heute ab' : ', noch ' + (-days) + ' Tag(e)');
        }
      }
      hit('open_notification', f.meldung ? f.meldung.line : (f.kenntnis ? f.kenntnis.line : 1), extra);
    }
    if (noRisk && !(filled(f.riskReason) && f.riskReason.value.length >= 20)) hit('no_risk_reason', f.risk.line);
    if (!noRisk) {
      if (!filled(f.nature)) hit('nature', f.nature ? f.nature.line : 1);
      if (!(filled(f.persons) && /\d/.test(f.persons.value))) hit('persons_count', f.persons ? f.persons.line : 1);
      if (!(filled(f.records) && /\d/.test(f.records.value))) hit('records_count', f.records ? f.records.line : 1);
      if (!filled(f.catPersons) || !filled(f.catData)) hit('categories', (f.catPersons || f.catData || { line: 1 }).line);
      if (!(filled(f.dpo) && /@|\+?\d[\d \/()-]{6,}/.test(f.dpo.value))) hit('dpo_contact', f.dpo ? f.dpo.line : 1);
      if (!filled(f.consequences)) hit('consequences', f.consequences ? f.consequences.line : 1);
      if (!filled(f.measures)) hit('measures', f.measures ? f.measures.line : 1);
      if (!filled(f.authority)) hit('authority', f.authority ? f.authority.line : 1);
    }
    if (highRisk) {
      var a = f.art34 ? f.art34.value : '';
      if (when(a) === null && !/34 abs\.? ?3/i.test(a)) hit('art34', f.art34 ? f.art34.line : f.risk.line);
    }
    findings.sort(function (x, y) { return x.line - y.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.DPENGINE = API;
})();
