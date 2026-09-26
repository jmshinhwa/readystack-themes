/* ImmoWertV / BewG Gutachten-Lint — gleiche Datei für VS Code (node) und Browser */
(function () {
  var isNode = (typeof module !== 'undefined' && module.exports);
  var RULES = isNode ? require('./rules.json') : window.IWV_RULES;
  var IWV_START = Date.UTC(2022, 0, 1);

  // Absätze bilden und Zeilenumbrüche flachklopfen (hart umbrochene Entwürfe)
  function paragraphs(text) {
    var lines = String(text || '').split(/\r?\n/), out = [], cur = null;
    for (var i = 0; i < lines.length; i++) {
      if (/^\s*$/.test(lines[i])) { cur = null; continue; }
      if (!cur) { cur = { line: i + 1, raw: [], text: '' }; out.push(cur); }
      cur.raw.push({ n: i + 1, s: lines[i] });
      cur.text = (cur.text + ' ' + lines[i]).replace(/\s+/g, ' ').trim();
    }
    return out;
  }
  function lineOf(p, re) {
    for (var i = 0; i < p.raw.length; i++) { re.lastIndex = 0; if (re.test(p.raw[i].s)) return p.raw[i].n; }
    return p.line;
  }
  function parseDate(s) {
    var m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
    if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
    m = /(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return null;
  }
  function days(a, b) { return Math.round((b - a) / 864e5); }
  function msg(r, extra) { return r.title + (extra ? ' (' + extra + ')' : '') + ' → ' + r.fix + ' [' + r.ref + ']'; }

  function check(text, opts) {
    opts = opts || {};
    var today = parseDate(String(opts.today || ''));
    if (today === null) { var d = new Date(); today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }
    var ps = paragraphs(text), all = ps.map(function (p) { return p.text; }).join(' '), findings = [];
    RULES.forEach(function (r) {
      if (r.kind === 'pattern') {
        var re = new RegExp(r.pattern, r.flags || '');
        ps.forEach(function (p) {
          if (!re.test(p.text)) return;
          if (r.require && !new RegExp(r.require, 'i').test(p.text)) return;
          if (r.exclude && new RegExp(r.exclude, 'i').test(p.text)) return;
          findings.push({ check: r.id, sev: r.sev, msg: msg(r), line: lineOf(p, new RegExp(r.pattern, r.flags || '')) });
        });
      } else if (r.kind === 'gnd_rnd') {
        if (!/BewG|Bewertungsgesetz/.test(all)) return;
        var g = /(?:Gesamtnutzungsdauer|\bGND\b)\D{0,40}?(\d{2,3})\s*Jahre/i.exec(all);
        if (!g) return;
        var gnd = +g[1], min = Math.ceil(gnd * 0.3);
        ps.forEach(function (p) {
          var m = /(?:Restnutzungsdauer|\bRND\b)\D{0,40}?(\d{1,3})\s*Jahre/i.exec(p.text);
          if (m && +m[1] < min) findings.push({ check: r.id, sev: r.sev, msg: msg(r, 'RND ' + m[1] + ' Jahre, Minimum bei GND ' + gnd + ' = ' + min + ' Jahre'), line: lineOf(p, /Restnutzungsdauer|\bRND\b/i) });
        });
      } else if (r.kind === 'brw_age') {
        var ref = null, refLabel = 'heute';
        ps.some(function (p) {
          if (/Wertermittlungsstichtag|Bewertungsstichtag/i.test(p.text)) { ref = parseDate(p.text); return ref !== null; }
          return false;
        });
        if (ref === null) ref = today; else refLabel = 'Wertermittlungsstichtag';
        ps.forEach(function (p) {
          if (!/Bodenrichtwert/i.test(p.text)) return;
          var b = parseDate(p.text);
          if (b === null) return;
          var age = days(b, ref);
          if (age > r.maxDays) findings.push({ check: r.id, sev: r.sev, msg: msg(r, age + ' Tage vor ' + refLabel), line: lineOf(p, /Bodenrichtwert/i) });
        });
      } else if (r.kind === 'absent') {
        if (!new RegExp(r.trigger, 'i').test(all) || new RegExp(r.need, 'i').test(all)) return;
        var tp = null;
        ps.some(function (p) { if (new RegExp(r.trigger, 'i').test(p.text)) { tp = p; return true; } return false; });
        findings.push({ check: r.id, sev: r.sev, msg: msg(r, 'ImmoWertV 2021 gilt seit ' + days(IWV_START, today) + ' Tagen'), line: tp ? lineOf(tp, new RegExp(r.trigger, 'i')) : 1 });
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (isNode) module.exports = api;
  if (typeof window !== 'undefined') window.IWVENGINE = api;
})();
