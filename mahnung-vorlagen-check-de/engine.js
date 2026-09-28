// Mahnung Vorlagen Check – same engine in VS Code (node) and in the free web page (browser).
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.MAHN_RULES;
  var DAY = 86400000;
  var WORDS = { ein: 1, eine: 1, einer: 1, eines: 1, einem: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, zehn: 10, zwölf: 12, vierzehn: 14 };
  var UNIT = { tag: 1, woche: 7, monat: 30 };
  var PERIOD = /(?:binnen|innerhalb(?:\s+von)?)\s+(\d+|ein(?:e[rsm]?)?|zwei|drei|vier|fünf|sechs|sieben|acht|zehn|zwölf|vierzehn)\s+(Tag|Woche|Monat)\w*/gi;

  function isoDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '').trim());
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(t) ? null : t;
  }
  function de(t) { var d = new Date(t); return ('0' + d.getUTCDate()).slice(-2) + '.' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '.' + d.getUTCFullYear(); }

  // Collapse all whitespace (hard-wrapped lines) and remember the source line of every kept char.
  function flatten(text) {
    var flat = '', lineOf = [], line = 1, inSpace = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (/\s/.test(c)) {
        if (!inSpace && flat.length) { flat += ' '; lineOf.push(line); }
        inSpace = true;
        if (c === '\n') line++;
      } else { flat += c; lineOf.push(line); inSpace = false; }
    }
    return { flat: flat, lineOf: lineOf };
  }

  // Sentence around idx: a sentence ends at . ! ? followed by an upper-case word (so "Abs. 1" and "14.03.2023" stay inside).
  function sentenceAt(flat, idx) {
    var s = 0, e = flat.length, re = /[.!?](?=\s+[A-ZÄÖÜ„"]|\s*$)/g, m;
    while ((m = re.exec(flat))) {
      if (m.index < idx) s = m.index + 1;
      else { e = m.index + 1; break; }
    }
    return [s, e];
  }

  function party(flat) {
    var m = /kundentyp\s*:\s*(\S+)/i.exec(flat);
    if (!m) return null;
    var v = m[1].toLowerCase();
    if (/^(verbraucher|privat|b2c)/.test(v)) return 'verbraucher';
    if (/^(unternehm|gewerb|firma|b2b)/.test(v)) return 'unternehmer';
    return null;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = isoDay(opts.today) || isoDay(new Date().toISOString());
    var f = flatten(String(text || '')), flat = f.flat, lineOf = f.lineOf;
    var who = party(flat);
    var findings = [], seen = {};
    function add(rule, idx, extra) {
      var line = idx >= 0 && idx < lineOf.length ? lineOf[idx] : 1;
      var key = rule.id + ':' + line;
      if (seen[key]) return;
      seen[key] = 1;
      findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg + (extra || ''), line: line });
    }
    RULES.forEach(function (rule) {
      var re, m;
      if (rule.kind === 'match' || (rule.kind === 'party' && who === rule.party)) {
        re = new RegExp(rule.re, 'gi');
        while ((m = re.exec(flat))) { add(rule, m.index); if (!m[0].length) re.lastIndex++; }
      } else if (rule.kind === 'party-missing') {
        if (who === rule.party && !new RegExp(rule.re, 'i').test(flat)) add(rule, 0);
      } else if (rule.kind === 'missing') {
        if (!new RegExp(rule.re, 'i').test(flat)) add(rule, 0);
      } else if (rule.kind === 'needs') {
        m = new RegExp(rule.re, 'i').exec(flat);
        if (m && !new RegExp(rule.basis, 'i').test(flat)) add(rule, m.index);
      } else if (rule.kind === 'cooccur') {
        m = new RegExp(rule.re2, 'i').exec(flat);
        if (m && new RegExp(rule.re, 'i').test(flat)) add(rule, m.index);
      } else if (rule.kind === 'frist') {
        if (!new RegExp(rule.ctx, 'i').test(flat)) return;
        re = new RegExp(rule.key, 'g');
        while ((m = re.exec(flat))) {
          var b = sentenceAt(flat, m.index), sent = flat.slice(b[0], b[1]), p;
          PERIOD.lastIndex = 0;
          while ((p = PERIOD.exec(sent))) {
            var n = /^\d+$/.test(p[1]) ? +p[1] : WORDS[p[1].toLowerCase()];
            var days = n * UNIT[p[2].toLowerCase()];
            if (days !== rule.days) add(rule, b[0] + p.index, ' Genannt: „' + p[0] + '“.');
          }
        }
      } else if (rule.kind === 'verjaehrung') {
        re = new RegExp(rule.re, 'gi');
        while ((m = re.exec(flat))) {
          var y = +(m[3] || m[6]);
          var end = Date.UTC(y + 3, 11, 31), left = Math.round((end - today) / DAY);
          if (today === null || left > rule.window) continue;
          add(rule, m.index, left < 0
            ? ' Forderung aus ' + y + ' ist seit ' + de(end) + ' verjährt (' + (-left) + ' Tage).'
            : ' Forderung aus ' + y + ' verjährt am ' + de(end) + ' – noch ' + left + ' Tage.');
        }
      } else if (rule.kind === 'basiszins') {
        re = new RegExp(rule.re, 'gi');
        while ((m = re.exec(flat))) {
          var d = new Date(today), nxt = d.getUTCMonth() < 6 ? Date.UTC(d.getUTCFullYear(), 6, 1) : Date.UTC(d.getUTCFullYear() + 1, 0, 1);
          add(rule, m.index, ' Genannt: ' + m[1] + ' %; nächste Änderung am ' + de(nxt) + '.');
        }
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.MAHNENGINE = api;
})();
