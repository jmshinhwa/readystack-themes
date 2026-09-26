/* Streitbeilegung-Hinweis Lint — same brain for VS Code and the web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SB_RULES;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });
  var EMPLOYEE_LIMIT = 10; // § 36 Abs. 3 VSBG

  var ENT = { auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', sect: '§', amp: '&', nbsp: ' ', quot: '"' };
  function plain(line) {
    // decode entities and drop tags inside one line — never merges lines
    return line.replace(/&(\w+);/g, function (m, n) { return ENT[n] || m; }).replace(/<[^>]*>/g, ' ');
  }
  function iso(v) {
    var s = String(v || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) ? s : new Date().toISOString().slice(0, 10);
  }

  var RX = {
    link: /(?:webgate\.)?ec\.europa\.eu\/consumers\/odr/i,
    os: /Online-Streitbeilegung|OS-Plattform|Plattform zur Online-Streit/i,
    odr: /Art\.?\s*14\s*(?:Abs\.?\s*1\s*)?(?:der\s+)?ODR|ODR-VO|ODR-Verordnung|524\/2013/i,
    mail: /E-Mail-Adresse finden Sie (?:oben )?im Impressum/i,
    page: /Impressum|AGB|Allgemeine Geschäftsbedingungen/i,
    vsbg: /Verbraucherschlichtungsstelle|Streitbeilegungsverfahren|Schlichtungsstelle|Universalschlichtungsstelle/i,
    oldname: /Allgemeinen?\s+Verbraucherschlichtungsstelle/i,
    willing: /(?:sind|ist)\s+(?:wir\s+)?(?:grundsätzlich\s+)?bereit|nehmen\s+(?:wir\s+)?(?:an|teil)|teilnahmebereit/i,
    notwilling: /nicht\s+bereit|keine?\s+Bereitschaft/i,
    address: /\b\d{5}\b/,
    url: /https?:\/\/|www\./i
  };

  function check(text, opts) {
    opts = opts || {};
    var today = iso(opts.today);
    var employees = (opts.employees === undefined || opts.employees === '' || isNaN(Number(opts.employees))) ? null : Number(opts.employees);
    var raw = String(text || '').split(/\r?\n/);
    var lines = raw.map(plain);
    var findings = [];
    function live(id) { return today >= BY_ID[id].since; }
    function hit(id, i) {
      var r = BY_ID[id];
      findings.push({ check: r.check, id: r.id, sev: r.sev, msg: r.msg + ' (' + r.law + ')', fix: r.fix, line: i + 1 });
    }

    lines.forEach(function (l, i) {
      if (live('SB01') && RX.link.test(raw[i])) hit('SB01', i);
      if (live('SB02') && RX.os.test(l)) hit('SB02', i);
      if (live('SB03') && RX.odr.test(l)) hit('SB03', i);
      if (live('SB04') && RX.mail.test(l)) hit('SB04', i);
      if (live('SB08') && RX.oldname.test(l)) hit('SB08', i);
    });

    // § 36 statement = lines about Schlichtung that are not the old OS paragraph
    var stmt = [];
    lines.forEach(function (l, i) { if (RX.vsbg.test(l) && !RX.os.test(l)) stmt.push(i); });
    var all = lines.join('\n');
    var mustInform = employees === null || employees > EMPLOYEE_LIMIT;

    if (!stmt.length) {
      if (mustInform && RX.page.test(all)) {
        var at = 0;
        lines.some(function (l, i) { if (RX.page.test(l)) { at = i; return true; } return false; });
        hit('SB05', at);
      }
    } else {
      var s = stmt.map(function (i) { return lines[i]; }).join(' ');
      var saysDuty = /verpflichtet/i.test(s), saysWill = /bereit/i.test(s);
      if (saysDuty && !saysWill) hit('SB06', stmt[0]);
      if (RX.willing.test(s) && !RX.notwilling.test(s)) {
        var tail = lines.slice(stmt[0], stmt[0] + 8).join(' ');
        if (!(RX.address.test(tail) && RX.url.test(tail))) hit('SB07', stmt[0]);
      }
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, today: today };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.SBENGINE = api;
})();
