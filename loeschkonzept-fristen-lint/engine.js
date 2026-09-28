/* Löschkonzept-Prüfer engine: runs in Node (VS Code) and in the browser (index.html). */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.LF_RULES;
  var WORDS = { zwei: 2, drei: 3, vier: 4, 'fünf': 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, 'elf': 11, 'zwölf': 12 };
  var INST = /kreditinstitut|\bKWG\b|versicherungsaufsicht|versicherungsunternehmen|\bVAG\b|wertpapierinstitut|\bWpIG\b/i;
  var CITE = /§|art\.?\s*\d|dsgvo|\bAO\b|\bHGB\b|\bUStG\b|\bEStG\b|\bAGG\b|\bBDSG\b|einwilligung/i;
  function rx(s) { return new RegExp(s, 'i'); }
  function years(line) {
    var m = line.match(/(\d{1,2}|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\s*(jahren?|jahre|jahr|j\.)(?![a-zäöü])/i);
    if (!m) return 0;
    var v = m[1].toLowerCase();
    return /^\d+$/.test(v) ? parseInt(v, 10) : WORDS[v];
  }
  function months(line) {
    var m;
    if ((m = line.match(/(\d{1,3})\s*monat/i))) return parseInt(m[1], 10);
    if ((m = line.match(/(\d{1,3})\s*woche/i))) return parseInt(m[1], 10) / 4.345;
    if ((m = line.match(/(\d{1,3})\s*tag/i))) return parseInt(m[1], 10) / 30.4;
    if (/sofort|unverzüglich|umgehend|direkt nach|mit (der )?absage/i.test(line)) return 0;
    return -1;
  }
  function isRow(l) { return /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|?\s*$/.test(l); }
  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/);
    var all = lines.join('\n');
    var inst = INST.test(all);
    var out = [];
    function hit(r, line, msg) { out.push({ check: r.id, sev: r.sev, msg: msg || r.msg, line: line, ref: r.ref }); }
    var cats = RULES.filter(function (r) { return /^(period|period_any|min_months)$/.test(r.kind); });
    lines.forEach(function (l, i) {
      var r = null;
      for (var k = 0; k < cats.length; k++) if (rx(cats[k].re).test(l)) { r = cats[k]; break; }
      if (!r) return;
      if (r.kind === 'period') {
        var y = years(l); if (!y) return;
        var want = (inst && r.inst_years) ? r.inst_years : r.years;
        if (y > want && r.over) hit(r, i + 1, r.label + ': ' + y + ' Jahre im Konzept, gesetzlich ' + want + ' Jahre (' + r.ref + '). ' + r.over);
        else if (y < want) hit(r, i + 1, r.label + ': ' + y + ' Jahre im Konzept, gesetzlich ' + want + ' Jahre (' + r.ref + '). ' + r.under);
      } else if (r.kind === 'period_any') {
        if (years(l) && !(r.unless && rx(r.unless).test(l))) hit(r, i + 1);
      } else if (r.kind === 'min_months') {
        if (years(l)) return;
        var mo = months(l);
        if (mo >= 0 && mo < r.months) hit(r, i + 1);
      }
    });
    RULES.forEach(function (r) {
      var re = rx(r.re);
      if (r.kind === 'require') {
        if (!re.test(all)) hit(r, 1);
      } else if (r.kind === 'forbid') {
        lines.forEach(function (l, i) { if (re.test(l)) hit(r, i + 1); });
      } else if (r.kind === 'row_ref') {
        lines.forEach(function (l, i) { if (isRow(l) && re.test(l) && !CITE.test(l)) hit(r, i + 1); });
      }
    });
    out.sort(function (a, b) { return a.line - b.line; });
    return { findings: out };
  }
  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.LFENGINE = api;
})();
