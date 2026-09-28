// Barrierefreiheitserklärung Check – engine (Node + browser)
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.BF_RULES;
  var MONTHS = { januar: 1, februar: 2, 'märz': 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };
  var DATE_KW = /erstellt|aktualisiert|überprüft|geprüft|Stand\b/i;
  var DATE_RE = /(\d{1,2})\.\s?(\d{1,2}|Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\.?\s?(\d{4})|(\d{4})-(\d{2})-(\d{2})/gi;

  // dates on lines that say erstellt / aktualisiert / überprüft / Stand
  function dates(text) {
    var out = [], lines = text.split('\n'), pos = 0;
    lines.forEach(function (ln) {
      if (DATE_KW.test(ln)) {
        var m; DATE_RE.lastIndex = 0;
        while ((m = DATE_RE.exec(ln))) {
          var y, mo, d;
          if (m[3]) { y = +m[3]; d = +m[1]; mo = /^\d+$/.test(m[2]) ? +m[2] : MONTHS[m[2].toLowerCase()]; }
          else { y = +m[4]; mo = +m[5]; d = +m[6]; }
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) out.push({ t: Date.UTC(y, mo - 1, d), iso: y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2), idx: pos + m.index });
        }
      }
      pos += ln.length + 1;
    });
    return out;
  }
  function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }
  function has(text, pats) {
    for (var i = 0; i < pats.length; i++) {
      if (pats[i] === 'DATE') { if (dates(text).length) return true; continue; }
      if (new RegExp(pats[i], 'i').test(text)) return true;
    }
    return false;
  }
  function regimeOf(text) {
    var bitv = (text.match(/öffentliche[nr]? Stelle|§\s*12b|Behindertengleichstellungsgesetz|\bBGG\b|BITV 2\.0\s*§\s*7|Schlichtungs/gi) || []).length;
    var bfsg = (text.match(/\bBFSG\b|Barrierefreiheitsstärkungsgesetz|Dienstleistung|Marktüberwachung|Verbraucher|\bShop\b|Onlineshop|\bAGB\b/gi) || []).length;
    return bitv > bfsg ? 'bitv' : 'bfsg';
  }
  function check(text, opts) {
    opts = opts || {};
    text = String(text || '');
    var regime = opts.regime || regimeOf(text);
    var today = opts.today ? Date.parse(opts.today + 'T00:00:00Z') : Date.now();
    var findings = [];
    RULES.forEach(function (r) {
      if (r.regime !== 'both' && r.regime !== regime) return;
      var base = { check: r.id, sev: r.sev, law: r.law, fix: r.fix };
      function push(msg, line) { findings.push(Object.assign({}, base, { msg: msg + ' (' + r.law + '). Korrektur: ' + r.fix, line: line })); }
      if (r.type === 'require') {
        if (r.when && !new RegExp(r.when, 'i').test(text)) return;
        if (r.unless && new RegExp(r.unless, 'i').test(text)) return;
        if (!has(text, r.any) || (r.and && !has(text, r.and))) push(r.msg, 1);
      } else if (r.type === 'forbid') {
        var re = new RegExp(r.pattern, 'gi'), m;
        while ((m = re.exec(text))) { push(r.msg + ': „' + m[0] + '“', lineOf(text, m.index)); if (!m[0].length) re.lastIndex++; }
      } else if (r.type === 'stale') {
        var ds = dates(text);
        if (!ds.length) return;
        var last = ds.reduce(function (a, b) { return b.t > a.t ? b : a; });
        var days = Math.floor((today - last.t) / 86400000);
        if (days > r.max_days) push(r.msg + ': Stand ' + last.iso + ', ' + days + ' Tage alt', lineOf(text, last.idx));
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { regime: regime, findings: findings };
  }
  var api = { engine: { check: check, regimeOf: regimeOf }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.BFENGINE = api;
})();
