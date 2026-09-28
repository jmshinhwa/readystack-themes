/* Declaración de accesibilidad lint — RD 1112/2018 art. 15 + modelo (UE) 2018/1523. Same file runs in Node and the browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.DA_RULES;
  var MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  var PLAZO = /(\d+|un|una|dos|tres|diez|quince|veinte|treinta|cuarenta)\s+(d[ií]as(\s+(h[aá]biles|naturales|laborables))?|mes(es)?|semanas?)/i;

  function rx(s) { return new RegExp(s, 'i'); }
  function lineOf(lines, re) { for (var i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1; return 1; }

  function datesIn(line) {
    var out = [], m, r1 = /(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/gi, r2 = /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/g, r3 = /(\d{4})-(\d{2})-(\d{2})/g;
    while ((m = r1.exec(line))) { var mo = MESES[m[2].toLowerCase()]; if (mo) out.push(new Date(Date.UTC(+m[3], mo - 1, +m[1]))); }
    while ((m = r2.exec(line))) out.push(new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])));
    while ((m = r3.exec(line))) out.push(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today ? new Date(opts.today + 'T00:00:00Z') : new Date();
    var lines = String(text || '').split(/\r?\n/), findings = [];
    function add(r, line, msg) { findings.push({ check: r.id, sev: r.sev, msg: msg + ' (' + r.cite + ')', line: line }); }

    RULES.forEach(function (r) {
      if (r.kind === 'require') {
        if (r.unless && rx(r.unless).test(text)) return;
        if (!rx(r.re).test(text)) add(r, 1, r.msg);
      } else if (r.kind === 'forbid') {
        lines.forEach(function (l, i) { var m = l.match(rx(r.re)); if (m) add(r, i + 1, r.msg.replace('{found}', m[0])); });
      } else if (r.kind === 'near') {
        var re = rx(r.re), bad = rx(r.bad);
        lines.forEach(function (l, i) {
          if (!re.test(l)) return;
          for (var j = Math.max(0, i - r.span); j <= Math.min(lines.length - 1, i + r.span); j++) {
            var m = lines[j].match(bad); if (m) { add(r, j + 1, r.msg.replace('{found}', m[0])); return; }
          }
        });
      } else if (r.kind === 'plazo') {
        var L = rx(r.line), A = rx(r.also), S = rx(r.skip), OK = rx(r.ok);
        lines.forEach(function (l, i) {
          if (!L.test(l) || !A.test(l) || S.test(l)) return;
          var G = new RegExp(PLAZO.source, 'gi'), IG = r.ignore ? rx(r.ignore) : null, m, hits = [];
          while ((m = G.exec(l))) if (!IG || !IG.test(m[0])) hits.push(m[0]);
          if (hits.length && !hits.some(function (h) { return OK.test(h); })) add(r, i + 1, r.msg.replace('{found}', hits[0]));
        });
      } else if (r.kind === 'date_age') {
        var C = rx(r.ctx), best = null, at = 1;
        lines.forEach(function (l, i) { if (!C.test(l)) return; datesIn(l).forEach(function (d) { if (!best || d > best) { best = d; at = i + 1; } }); });
        if (!best) return add(r, 1, r.msg_none);
        var days = Math.floor((today - best) / 86400000);
        if (days > r.max_days) add(r, at, r.msg.replace('{date}', best.toISOString().slice(0, 10)).replace('{days}', days));
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.DAENGINE = api;
})();
