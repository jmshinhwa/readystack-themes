/* Formular-Check BEG IV — one engine for the VS Code extension and the web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FORM_RULES;
  var BY = {}; RULES.forEach(function (r) { BY[r.id] = r; });
  var NUM = { ein: 1, eine: 1, einer: 1, einem: 1, zwei: 2, drei: 3, vier: 4, 'fünf': 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, zehn: 10, 'zwölf': 12, zwoelf: 12, vierzehn: 14, 'dreißig': 30, dreissig: 30 };
  var MON = { januar: 1, februar: 2, 'märz': 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };
  var ENT = { '&auml;': 'ä', '&ouml;': 'ö', '&uuml;': 'ü', '&Auml;': 'Ä', '&Ouml;': 'Ö', '&Uuml;': 'Ü', '&szlig;': 'ß', '&sect;': '§', '&nbsp;': ' ', '&amp;': '&', '&euro;': '€' };

  function clean(line) {
    return line.replace(/<[^>]*>/g, ' ').replace(/&[a-zA-Z]+;/g, function (e) { return ENT[e] || e; });
  }
  var NEG = /\b(nicht|keine?|ausgeschlossen|unwirksam|unzulässig|unzulaessig)\b/i;
  var EMAIL = /e-?mail|textform|per mail|elektronisch|whatsapp|\bfax\b|online/i;

  function daysOf(line) {
    var re = /(\d+|[a-zäöüß]+)\s+(wochen?|tagen?|monat(?:e|en)?)\b/gi, m;
    while ((m = re.exec(line))) {
      var n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUM[m[1].toLowerCase()];
      if (!n) continue;
      var u = m[2].toLowerCase();
      return u.indexOf('woche') === 0 ? n * 7 : u.indexOf('monat') === 0 ? n * 30 : n;
    }
    return null;
  }
  function standDate(line) {
    var s = line.match(/\bstand\b\s*[:\-–]?\s*(.+)$/i); if (!s) return null;
    var t = s[1].toLowerCase(), m;
    if ((m = t.match(/(\d{4})-(\d{2})-(\d{2})/))) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if ((m = t.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/))) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
    if ((m = t.match(/(\d{1,2})\s*[\/.]\s*(\d{4})/))) return Date.UTC(+m[2], +m[1] - 1, 1);
    if ((m = t.match(/([a-zä]+)\s+(\d{4})/)) && MON[m[1]]) return Date.UTC(+m[2], MON[m[1]] - 1, 1);
    if ((m = t.match(/\b(19|20)(\d{2})\b/))) return Date.UTC(+(m[1] + m[2]), 11, 31);
    return null;
  }
  function iso(s) { var p = String(s || '').slice(0, 10).split('-'); var d = Date.UTC(+p[0], +p[1] - 1, +p[2]); return isNaN(d) ? null : d; }

  var TEST = {
    'kuendigung-arbeit-textform': function (l) {
      return /kündig|kuendig/i.test(l) && /arbeits(verhältnis|verhaeltnis|vertrag)|arbeitnehmer|beschäftigungsverh/i.test(l) && EMAIL.test(l) && !NEG.test(l);
    },
    'nachwg-textform-ohne-empfang': function (l) {
      return /nachweis|arbeitsbedingungen|nachwg/i.test(l) && /e-?mail|textform|elektronisch|\bpdf\b/i.test(l) && !/empfang/i.test(l) && !NEG.test(l);
    },
    'nachwg-schriftform-veraltet': function (l) {
      return /nachweis|arbeitsbedingungen|nachwg/i.test(l) && /schriftlich|schriftform|eigenhändig|eigenhaendig|unterschrieben|postweg/i.test(l) && !/textform|e-?mail/i.test(l);
    },
    'mahnbescheid-widerspruch-frist': function (l, r) {
      if (!(/widerspruch/i.test(l) && /mahnbescheid/i.test(l))) return false;
      var d = daysOf(l); return d !== null && d !== r.days;
    },
    'beleg-aufbewahrung-10-jahre': function (l) {
      return /beleg|rechnung/i.test(l) && /(\b10|zehn)\s*jahre?n?\b/i.test(l) && !/bücher|buecher|jahresabschl|inventar|lagebericht|bilanz/i.test(l);
    },
    'zeugnis-pdf-email': function (l) {
      return /zeugnis/i.test(l) && /\bpdf\b|e-?mail|textform|scan/i.test(l) && !/qualifiziert|\bqes\b/i.test(l) && !NEG.test(l);
    },
    'stand-vor-beg4': function (l, r, opts) {
      var d = standDate(l); if (d === null) return false;
      if (d < iso(r.cutoff)) return r.msg;
      var today = iso(opts && opts.today);
      if (today !== null && today - d > r.stale_months * 30.44 * 864e5) return r.msg_stale;
      return false;
    },
    'gewerbemiete-schriftform': function (l) {
      return /gewerbe(raum|miet)|gewerberäum/i.test(l) && /schriftform|schriftlich/i.test(l) && !/textform/i.test(l);
    }
  };

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text || '').split(/\r?\n/), findings = [];
    lines.forEach(function (raw, i) {
      var l = clean(raw); if (!l.trim()) return;
      RULES.forEach(function (r) {
        var t = TEST[r.id]; if (!t) return;
        var hit = t(l, r, opts); if (!hit) return;
        findings.push({ check: r.id, sev: r.sev, line: i + 1, title: r.title, law: r.law,
          msg: (typeof hit === 'string' ? hit : r.msg) + ' → ' + r.fix, text: l.trim().slice(0, 160) });
      });
    });
    return { findings: findings };
  }
  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.FORMENGINE = api;
})();
