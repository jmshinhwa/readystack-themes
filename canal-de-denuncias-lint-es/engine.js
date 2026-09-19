/* Canal de Denuncias Lint — motor
   Un solo archivo, dos casas: node (require) y el navegador (window). */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.CDD_RULES;

  var MESES = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
    agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
  };

  function firstLine(lines, pattern) {
    if (!pattern) return 0;
    var re = new RegExp(pattern, 'i');
    for (var i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    return 0;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* "Última revisión: 2024-03-11" o "revisada el 11 de marzo de 2024" */
  function revision(lines) {
    var head = /([úu]ltima revisi[óo]n|fecha de revisi[óo]n|revisad[oa] el|revisi[óo]n)\D{0,24}/i;
    for (var i = 0; i < lines.length; i++) {
      var m = head.exec(lines[i]);
      if (!m) continue;
      var rest = lines[i].slice(m.index + m[0].length);
      var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(rest);
      if (iso) return { iso: iso[1] + '-' + iso[2] + '-' + iso[3], line: i + 1 };
      var es = /^(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i.exec(rest);
      if (es && MESES[es[2].toLowerCase()]) {
        return { iso: es[3] + '-' + pad(MESES[es[2].toLowerCase()]) + '-' + pad(parseInt(es[1], 10)), line: i + 1 };
      }
    }
    return null;
  }

  function yearsBetween(fromISO, toISO) {
    var a = Date.parse(fromISO + 'T00:00:00Z'), b = Date.parse(toISO + 'T00:00:00Z');
    if (isNaN(a) || isNaN(b)) return null;
    return (b - a) / (1000 * 60 * 60 * 24 * 365.2425);
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || '2026-09-18';
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];

    function hit(rule, line, msg) {
      findings.push({
        check: rule.id,
        sev: rule.sev,
        line: line || 1,
        msg: rule.article + ' — ' + (msg || rule.msg)
      });
    }

    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];

      if (r.id === 'revision_3_anos') {
        var rev = revision(lines);
        if (!rev) { hit(r, firstLine(lines, r.topic), null); continue; }
        var age = yearsBetween(rev.iso, today);
        if (age === null) { hit(r, rev.line, null); continue; }
        if (age > 3) hit(r, rev.line, r.msg_bad + ' Última revisión: ' + rev.iso + '.');
        continue;
      }

      var badLine = r.bad ? firstLine(lines, r.bad) : 0;
      var okLine = r.ok ? firstLine(lines, r.ok) : 0;
      if (okLine && !badLine) continue;
      hit(r, badLine || firstLine(lines, r.topic), null);
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.CDDENGINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
