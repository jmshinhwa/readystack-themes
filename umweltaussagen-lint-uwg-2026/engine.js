/* Green-Claims-Lint – Umweltaussagen nach UWG-Anhang (BGBl. 2026 I Nr. 43, gilt ab 27.09.2026) */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.UWG_RULES;
  // Spezifizierung im selben Satz/Zeile: Zahl mit %, Begründung oder anerkannte Umweltleistung
  var SPEC = /\d+(?:[.,]\d+)?\s?%|\bweil\b|\bdank\b|Blaue[rn] Engel|EU[- ]Ecolabel|EU-Umweltzeichen|ISO 14024|Energieeffizienzklasse|\bEN \d{4,5}\b/i;
  var COMPILED = RULES.map(function (r) { return { r: r, re: new RegExp(r.re, 'giu') }; });

  function stripTags(line) { return line.replace(/<[^>]*>/g, ' '); }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    var lines = String(text || '').split(/\r?\n/);
    lines.forEach(function (raw, i) {
      var line = stripTags(raw);
      var specified = SPEC.test(line);
      COMPILED.forEach(function (c) {
        c.re.lastIndex = 0;
        var m;
        while ((m = c.re.exec(line)) !== null) {
          var skip = c.r.skip_if && new RegExp(c.r.skip_if, 'iu').test(line);
          if (!(c.r.spec_ok && specified) && !skip) {
            findings.push({ check: c.r.id, sev: c.r.sev, line: i + 1, match: m[0], anhang: c.r.anhang,
              msg: '„' + m[0] + '“: ' + c.r.msg + ' Fix: ' + c.r.fix });
          }
          if (m[0].length === 0) c.re.lastIndex++;
        }
      });
    });
    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return { findings: findings, summary: { errors: errors, warnings: findings.length - errors, lines: lines.length } };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.UWGENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
