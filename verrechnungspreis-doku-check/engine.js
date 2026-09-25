// Verrechnungspreis Doku Check: prüft eine Local File (Markdown) gegen §90 Abs. 3/4 AO und §4 GAufzV.
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.VP_RULES;
  var DAY = 864e5;

  function isoDay(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  }
  function euro(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €'; }
  function lineOf(text, re) {
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    return 1;
  }

  // 30-Tage-Uhr ab Bekanntgabe der Prüfungsanordnung (§90 Abs. 4 AO), Zuschlag §162 Abs. 4 AO.
  function clock(flat, today) {
    var m = flat.match(/Pr(?:ü|ue)fungsanordnung[^.]{0,60}?(\d{4}-\d{2}-\d{2})/i);
    var t = isoDay(today);
    if (!m || t === null) return null;
    var due = isoDay(m[1]) + 30 * DAY;
    var over = Math.floor((t - due) / DAY);
    var dueStr = new Date(due).toISOString().slice(0, 10);
    var text = over > 0
      ? ' Vorlagefrist endete am ' + dueStr + ', seit ' + over + ' Tagen überschritten: bei Vorlage heute Zuschlag mindestens ' + euro(Math.min(over * 100, 1000000)) + ' (100 € je vollem Tag, bis 1.000.000 €, §162 Abs. 4 AO).'
      : ' Vorlagefrist endet am ' + dueStr + ', noch ' + (-over) + ' Tage.';
    return { due: dueStr, over: over, text: text };
  }

  function check(text, opts) {
    opts = opts || {};
    text = String(text || '');
    var flat = text.replace(/\s+/g, ' ');
    var c = clock(flat, opts.today);
    var tail = c ? c.text : '';
    var findings = [];
    RULES.forEach(function (r) {
      var re = new RegExp(r.pattern, 'i');
      var hit = re.test(flat);
      if (r.kind === 'need' && !hit) {
        findings.push({ check: r.id, sev: r.sev, msg: r.msg + tail, line: 1 });
      } else if (r.kind === 'masterfile' && !hit) {
        var u = flat.match(/Umsatz[^.]{0,80}?(\d{1,4}(?:,\d+)?)\s*(?:Mio|Millionen)/i);
        if (u && parseFloat(u[1].replace(',', '.')) >= 100) {
          findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' Genannter Umsatz: ' + u[1] + ' Mio. Euro.' + tail, line: lineOf(text, /Umsatz/i) });
        }
      } else if (r.kind === 'stale60' && /(vorzulegen|Vorlage|Anforderung)[^.]{0,80}60 Tage|60 Tage[^.]{0,80}(vorzulegen|Vorlage|Anforderung)/i.test(flat)) {
        findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: lineOf(text, /60 Tage/i) });
      } else if (r.kind === 'deadline' && !hit && c && c.over > 0) {
        findings.push({ check: r.id, sev: r.sev, msg: r.msg + c.text, line: lineOf(text, /Pr(ü|ue)fungsanordnung/i) });
      }
    });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.VPENGINE = API;
})();
