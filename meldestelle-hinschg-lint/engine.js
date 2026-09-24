/* Meldestelle-Prüfer (HinSchG) — same file runs in VS Code (node) and in the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.MS_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.id] = r; });
  var WORDS = { eins: 1, ein: 1, einem: 1, zwei: 2, drei: 3, vier: 4, 'fünf': 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, 'vierzehn': 14, 'zwölf': 12, 'dreißig': 30 };

  function num(s) { s = String(s).toLowerCase(); return /^\d+$/.test(s) ? parseInt(s, 10) : (WORDS[s] || NaN); }
  var N = '(\\d+|eins|ein|einem|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|zwölf|vierzehn|dreißig)';

  // HTML → text, keep link targets; then split into units (paragraphs, list items, table rows) with flattened whitespace.
  function units(text) {
    var t = String(text).replace(/\r/g, '');
    t = t.replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, function (m, h, x) { return x + ' ' + h; });
    t = t.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, function (m) { return m.replace(/[^\n]/g, ''); });
    t = t.replace(/<(?:\/?(?:p|div|li|tr|h\d|br|section|ul|ol|table))\b[^>]*>/gi, '\n\n').replace(/<[^>]+>/g, ' ');
    var lines = t.split('\n'), out = [], cur = null;
    function flush() { if (cur) { cur.text = cur.text.replace(/\s+/g, ' ').trim(); if (cur.text) out.push(cur); cur = null; } }
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (/^\s*$/.test(l)) { flush(); continue; }
      if (/^\s*(\||[-*+]\s|\d+\.\s|#)/.test(l)) { flush(); out.push({ line: i + 1, text: l.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim() }); continue; }
      if (!cur) cur = { line: i + 1, text: '' };
      cur.text += ' ' + l;
    }
    flush();
    return out;
  }

  function parseDate(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/) || null, d;
    if (m) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    else if ((m = String(s || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/))) d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    return d && !isNaN(d.getTime()) ? d : null;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = parseDate(opts.today) || new Date();
    var U = units(text), all = U.map(function (u) { return u.text; }).join(' \n ');
    var findings = [];
    function add(id, line, extra) {
      var r = BY[id];
      findings.push({ check: id, sev: r.sev, msg: r.title + (extra ? ' (' + extra + ')' : '') + ' — ' + r.law + ' → ' + r.fix, line: line || 1 });
    }
    function firstLine(re) { for (var i = 0; i < U.length; i++) if (re.test(U[i].text)) return U[i].line; return 1; }

    // MS01 external reporting office
    if (!/Bundesamt\s+für\s+Justiz|\bBfJ\b/i.test(all)) add('MS01-bfj-fehlt', firstLine(/extern/i));

    // MS02 / MS03 / MS06 — number-bearing duties, checked unit by unit
    var seen2 = false, seen3 = false, seen6 = false;
    U.forEach(function (u) {
      var s = u.text, m;
      if (/Eingangsbestätigung|Eingang\w*\s+(?:\w+\s+){0,4}bestätig|bestätig\w*\s+(?:\w+\s+){0,3}Eingang/i.test(s)) {
        m = s.match(new RegExp(N + '\\s*(Kalender|Werk|Arbeits)?tage?n?\\b', 'i'));
        if (m) { seen2 = true; if (num(m[1]) !== 7 || /werk|arbeits/i.test(m[2] || '')) add('MS02-eingang-7-tage', u.line, 'Text nennt: ' + m[0]); }
        else if (/unverzüglich|sofort/i.test(s)) seen2 = true;
      }
      if (/Rückmeldung/i.test(s)) {
        m = s.match(new RegExp(N + '\\s*(Monat\\w*|Woche\\w*|Tage?n?)\\b', 'i'));
        if (m) { seen3 = true; if (num(m[1]) !== 3 || !/^Monat/i.test(m[2])) add('MS03-rueckmeldung-3-monate', u.line, 'Text nennt: ' + m[0]); }
      }
      if (/gelöscht|Löschung|Löschfrist|aufbewahrt|Aufbewahrung/i.test(s) && /Dokumentation|Meldung|Unterlagen|Verfahren/i.test(s)) {
        m = s.match(new RegExp(N + '\\s*(Jahr\\w*|Monat\\w*)', 'i'));
        if (m) { seen6 = true; if (num(m[1]) !== 3 || !/^Jahr/i.test(m[2])) add('MS06-loeschfrist-3-jahre', u.line, 'Text nennt: ' + m[0]); }
      }
      // MS07 outdated threshold
      if (/\b250\s*(Beschäftigte|Mitarbeite|Arbeitnehme)/i.test(s)) add('MS07-schwelle-250', u.line, 'Text nennt 250');
      // MS10 anonymous reports excluded
      if (/anonym\w*(?:(?![.!?]\s)[\s\S]){0,80}?(nicht\s+(?:bearbeitet|möglich|angenommen|zulässig|verfolgt)|unzulässig|ausgeschlossen|abgelehnt)/i.test(s)) add('MS10-anonym-abgelehnt', u.line);
    });
    var lastLine = U.length ? U[U.length - 1].line : 1;
    if (!seen2) add('MS02-eingang-7-tage', lastLine, 'keine Frist genannt');
    if (!seen3) add('MS03-rueckmeldung-3-monate', lastLine, 'keine Frist genannt');
    if (!seen6) add('MS06-loeschfrist-3-jahre', lastLine, 'keine Frist genannt');

    // MS04 both oral and text channels
    var oral = /mündlich|telefonisch|Telefon|Anrufbeantworter|Sprachnachricht/i.test(all);
    var written = /Textform|schriftlich|E-Mail|Portal|Brief|Online-Formular|Webformular/i.test(all);
    if (!oral || !written) add('MS04-meldewege', firstLine(/Meld/i), !oral ? 'mündlicher Weg fehlt' : 'Textform fehlt');
    if (!/persönlich\w*\s+(Zusammenkunft|Treffen|Gespräch)/i.test(all)) add('MS05-persoenliches-treffen', firstLine(/Meld/i));
    if (!/vertraulich/i.test(all)) add('MS08-vertraulichkeit', 1);
    if (!/Repressali|Benachteiligung/i.test(all)) add('MS09-repressalien', 1);
    if (!/[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/\S+|\+\s?\d[\d\s/()-]{6,}|\b0\d{2,5}[\s/-]?\d{3,}/.test(all)) add('MS11-kontakt-fehlt', 1);

    // MS12 Stand date — the only rule that reads opts.today
    var sm = null, sl = 1;
    for (var i = 0; i < U.length && !sm; i++) {
      var mm = U[i].text.match(/Stand\s*:?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})/i);
      if (mm) { sm = mm[1]; sl = U[i].line; }
    }
    var sd = parseDate(sm);
    if (!sd) add('MS12-stand-veraltet', 1, 'kein Stand-Datum');
    else {
      var days = Math.round((today - sd) / 86400000);
      if (days > 365) add('MS12-stand-veraltet', sl, 'Stand ' + sm + ' ist ' + days + ' Tage alt');
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.MSENGINE = API;
})();
