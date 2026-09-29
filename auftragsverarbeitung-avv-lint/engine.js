// AVV-Prüfer: Art. 28 Abs. 3 DSGVO Pflichtpunkte + veraltete Transfer-Grundlagen.
// Läuft in node (VS Code) und im Browser (Web-Version) mit denselben Regeln.
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.AVV_RULES;
  var DSGVO_START = '2018-05-25';

  function parseDay(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  }
  function daysBetween(from, to) {
    var a = parseDay(from), b = parseDay(to);
    if (a === null || b === null) return null;
    return Math.round((b - a) / 86400000);
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function firstLine(lines, re) {
    for (var i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    // Treffer über einen Zeilenumbruch hinweg (umbrochener Vertragstext)
    for (var j = 0; j < lines.length - 1; j++) if (re.test(lines[j] + ' ' + lines[j + 1])) return j + 1;
    return 1;
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text || '');
    var flat = src.replace(/\s+/g, ' ');
    var lines = src.split(/\r?\n/);
    var today = String(opts.today || '').match(/\d{4}-\d{2}-\d{2}/);
    today = today ? today[0] : '';
    var findings = [];

    RULES.forEach(function (r) {
      if (r.kind === 'need') {
        var res = r.all.map(function (p) { return new RegExp(p, 'i'); });
        var missing = res.some(function (re) { return !re.test(flat); });
        if (!missing) return;
        var tail = '';
        var d = daysBetween(DSGVO_START, today);
        if (d !== null && d >= 0) tail = ' Stand ' + today + ': Art. 28 DSGVO gilt seit ' + DSGVO_START + ' (' + fmt(d) + ' Tage).';
        findings.push({ check: r.id, sev: r.sev, line: firstLine(lines, res[0]),
          msg: r.msg + ' ' + r.ref + '. Korrektur: ' + r.fix + tail });
      } else if (r.kind === 'forbid') {
        var re = new RegExp(r.pat, 'i');
        if (!re.test(flat)) return;
        var tail2 = '';
        var d2 = daysBetween(r.since, today);
        if (d2 !== null && d2 >= 0) tail2 = ' Stand ' + today + ': seit ' + fmt(d2) + ' Tagen überholt.';
        findings.push({ check: r.id, sev: r.sev, line: firstLine(lines, re),
          msg: r.msg + ' ' + r.ref + '. Korrektur: ' + r.fix + tail2 });
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AVVENGINE = API;
})();
