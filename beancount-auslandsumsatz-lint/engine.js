/* Beancount/hledger Auslandsumsatz-Check — prüft Journale auf Euro-Umrechnung, USt-IdNr., Reverse Charge und ZM-Frist (UStG) */
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.AUSL_RULES;
  var R = {};
  RULES.forEach(function (r) { R[r.id] = r; });

  var FMT = {
    AT: /^ATU\d{8}$/, BE: /^BE[01]\d{9}$/, BG: /^BG\d{9,10}$/, CY: /^CY\d{8}[A-Z]$/, CZ: /^CZ\d{8,10}$/,
    DE: /^DE\d{9}$/, DK: /^DK\d{8}$/, EE: /^EE\d{9}$/, EL: /^EL\d{9}$/, ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
    FI: /^FI\d{8}$/, FR: /^FR[A-HJ-NP-Z0-9]{2}\d{9}$/, HR: /^HR\d{11}$/, HU: /^HU\d{8}$/,
    IE: /^IE(\d{7}[A-W][A-I]?|\d[A-Z+*]\d{5}[A-W])$/, IT: /^IT\d{11}$/, LT: /^LT(\d{9}|\d{12})$/,
    LU: /^LU\d{8}$/, LV: /^LV\d{11}$/, MT: /^MT\d{8}$/, NL: /^NL\d{9}B\d{2}$/, PL: /^PL\d{10}$/,
    PT: /^PT\d{9}$/, RO: /^RO\d{2,10}$/, SE: /^SE\d{10}01$/, SI: /^SI\d{8}$/, SK: /^SK\d{10}$/
  };
  var DIRECTIVES = /^(open|close|price|balance|commodity|pad|note|document|event|custom|query|option|plugin|include)\b/;
  var INCOME = /(^|:)(income|einnahmen|ertr(ä|ae)ge|erl(ö|oe)se|revenue|umsatzerl(ö|oe)se)(:|$)/i;
  var RC = /reverse.?charge|(^|[:_-])13b|eu-?leistung/i;
  var VAT = /(umsatzsteuer|mehrwertsteuer|(^|:)ust|(^|:)vat)/i;
  var TRUE = /^(true|ja|yes|1|x)$/i;

  function num(s) {
    s = String(s).replace(/\s/g, '');
    var c = s.lastIndexOf(','), d = s.lastIndexOf('.');
    if (c >= 0 && d >= 0) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (c >= 0) s = /,\d{3}$/.test(s) && s.split(',').length > 1 && !/,\d{1,2}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    var v = parseFloat(s);
    return isNaN(v) ? null : v;
  }
  function cur(c) { return c === '€' ? 'EUR' : c === '$' ? 'USD' : c === '£' ? 'GBP' : String(c || '').toUpperCase(); }
  function amount(str) {
    var s = String(str || '').trim(), m;
    if ((m = s.match(/^(-?)\s*([€$£])\s*(-?)([\d.,]+)/))) return { n: num(m[4]) * ((m[1] || m[3]) ? -1 : 1), c: cur(m[2]) };
    if ((m = s.match(/^(-?[\d.,]+)\s*([€$£]|[A-Za-z][A-Za-z0-9'._-]*)/))) return { n: num(m[1]), c: cur(m[2]) };
    if ((m = s.match(/^([A-Za-z]{3})\s*(-?[\d.,]+)/))) return { n: num(m[2]), c: cur(m[1]) };
    return null;
  }
  function eur(n) {
    var a = Math.abs(n).toFixed(2).split('.');
    return a[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + a[1] + ' EUR';
  }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function unq(v) { return String(v || '').trim().replace(/^"(.*)"$/, '$1').trim(); }
  function tags(comment, meta) {
    var re = /([A-Za-z][\w-]*):\s*([^,;]*)/g, m;
    while ((m = re.exec(comment))) meta[m[1].toLowerCase()] = unq(m[2]);
  }
  function pick(meta, keys) { for (var i = 0; i < keys.length; i++) if (meta[keys[i]] != null && meta[keys[i]] !== '') return meta[keys[i]]; return null; }
  function deadline(y, q) {
    var t = Date.UTC(y, q * 3, 25), wd = new Date(t).getUTCDay();
    if (wd === 6) t += 2 * 86400000; else if (wd === 0) t += 86400000;
    return t;
  }

  function parse(src) {
    var lines = src.split(/\r?\n/), txs = [], tx = null;
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i], m;
      if ((m = raw.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:=\S+)?\s*(.*)$/))) {
        tx = null;
        var rest = m[4];
        if (DIRECTIVES.test(rest)) continue;
        tx = { line: i + 1, y: +m[1], mo: +m[2], meta: {}, posts: [] };
        var sc = rest.indexOf(';');
        if (sc >= 0) tags(rest.slice(sc + 1), tx.meta);
        txs.push(tx);
        continue;
      }
      if (!tx) continue;
      if (!/^\s/.test(raw) || !raw.trim()) { if (!raw.trim()) tx = null; continue; }
      if ((m = raw.match(/^\s*;(.*)$/))) { tags(m[1], tx.meta); continue; }
      if ((m = raw.match(/^\s+([a-z][A-Za-z0-9_-]*):\s+(.*)$/))) { tx.meta[m[1].toLowerCase()] = unq(m[2]); continue; }
      if ((m = raw.match(/^\s+(?:[!*]\s+)?(\S+)(?:(?:\s{2,}|\t)\s*([^;]*))?(?:;(.*))?$/))) {
        var body = (m[2] || '').trim(), price = null, total = false;
        var at = body.indexOf('@');
        if (at >= 0) { total = body.charAt(at + 1) === '@'; price = amount(body.slice(at + (total ? 2 : 1))); body = body.slice(0, at); }
        tx.posts.push({ line: i + 1, acct: m[1], amt: amount(body), price: price, total: total });
        if (m[3]) tags(m[3], tx.meta);
      }
    }
    return txs;
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text);
    var tm = String(opts.today || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    var today = tm ? Date.UTC(+tm[1], +tm[2] - 1, +tm[3]) : Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    var findings = [], zm = {};
    function add(id, line, msg) { var r = R[id]; findings.push({ check: id, sev: r.sev, line: line, msg: r.title + ': ' + msg + ' (' + r.law + ') ' + r.fix }); }

    parse(src).forEach(function (tx) {
      var income = tx.posts.filter(function (p) { return INCOME.test(p.acct); });
      if (!income.length) return;
      var rc = tx.posts.some(function (p) { return RC.test(p.acct); }) || TRUE.test(pick(tx.meta, ['rc', 'reverse_charge', 'reverse-charge']) || '');
      var idRaw = pick(tx.meta, ['ust_id', 'ustid', 'ust-idnr', 'vat_id', 'vat-id', 'vatid']);
      var id = idRaw ? idRaw.toUpperCase().replace(/[\s.\-]/g, '') : null;
      var pre = id && /^[A-Z]{2}/.test(id) ? id.slice(0, 2) : null;
      var zmTag = pick(tx.meta, ['zm']);
      var nonEU = false, fx = false, eurSum = 0;
      var q = Math.floor((tx.mo - 1) / 3) + 1;

      if (id) {
        if (pre === 'GR') add('gr_statt_el', tx.line, idRaw + ' – Griechenland hat im MwSt-System den Code EL.');
        else if (!pre) add('ustid_format', tx.line, idRaw + ' hat keinen Ländercode.');
        else if (FMT[pre] && !FMT[pre].test(id)) add('ustid_format', tx.line, idRaw + ' entspricht nicht dem Format für ' + pre + '.');
        else if (!FMT[pre]) {
          nonEU = true;
          if (rc || zmTag) add('drittland_ustid', tx.line, idRaw + ' ist keine EU-USt-IdNr.' + (pre === 'GB' ? ' Großbritannien ist seit 2021-01-01 Drittland.' : ''));
        }
        if (pre === 'DE' && rc) add('de_ustid_rc', tx.line, idRaw + ' ist eine deutsche USt-IdNr.; Reverse Charge bei Leistungen ins EU-Ausland setzt einen dort ansässigen Kunden voraus.');
      } else if (rc) add('rc_ohne_ustid', tx.line, 'Reverse-Charge-Umsatz vom ' + tx.y + '-' + String(tx.mo).padStart(2, '0') + ' ohne ust_id.');

      if (rc) {
        var vat = tx.posts.filter(function (p) { return VAT.test(p.acct) && !/vorsteuer/i.test(p.acct) && p.amt && p.amt.n; });
        if (vat.length) add('rc_mit_ust', vat[0].line, 'Auf einem Reverse-Charge-Umsatz ist ' + eur(vat[0].amt.n) + ' deutsche USt gebucht.');
      }

      income.forEach(function (p) {
        if (!p.amt) return;
        if (p.amt.c === 'EUR') { eurSum += Math.abs(p.amt.n); return; }
        fx = true;
        if (p.price && p.price.c === 'EUR') { eurSum += p.total ? Math.abs(p.price.n) : Math.abs(p.amt.n * p.price.n); return; }
        add('fx_ohne_eur', p.line, Math.abs(p.amt.n).toFixed(2) + ' ' + p.amt.c + ' auf ' + p.acct + ' ohne Euro-Betrag; UStVA und EÜR brauchen Euro.');
      });

      if ((rc || fx || (id && pre !== 'DE')) && !pick(tx.meta, ['rechnung', 'invoice', 're_nr', 'rechnungsnr', 'rechnungsnummer']))
        add('rechnungsnr_fehlt', tx.line, 'Auslandsumsatz vom ' + tx.y + '-' + String(tx.mo).padStart(2, '0') + ' ohne rechnung-Vermerk.');

      if (zmTag) {
        var zq = zmTag.match(/(\d{4})\s*[-\/ ]?\s*Q\s*([1-4])/i), zmo = zmTag.match(/(\d{4})-(\d{2})/);
        var zy = zq ? +zq[1] : zmo ? +zmo[1] : null, zqq = zq ? +zq[2] : zmo ? Math.floor((+zmo[2] - 1) / 3) + 1 : null;
        if (zy !== tx.y || zqq !== q) add('zm_quartal', tx.line, 'Buchung vom ' + tx.y + '-' + String(tx.mo).padStart(2, '0') + ' (Q' + q + ' ' + tx.y + '), aber zm: "' + zmTag + '".');
      } else if (rc && !nonEU && pre !== 'DE') {
        var k = tx.y + '-Q' + q;
        if (!zm[k]) zm[k] = { y: tx.y, q: q, line: tx.line, n: 0, sum: 0 };
        zm[k].n++; zm[k].sum += eurSum;
      }
    });

    Object.keys(zm).sort().forEach(function (k) {
      var z = zm[k], dl = deadline(z.y, z.q), late = Math.floor((today - dl) / 86400000);
      if (late <= 0) return;
      add('zm_frist', z.line, 'Q' + z.q + ' ' + z.y + ': ' + z.n + ' Reverse-Charge-Umsätze (' + eur(z.sum) + ') ohne zm-Vermerk. Frist war der ' + iso(dl) +
        ' (25. Tag nach Quartalsende, Wochenende verschoben), Stand ' + iso(today) + ' seit ' + late + ' Tagen überfällig. Eine Dauerfristverlängerung gilt für die ZM nicht.');
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.AUSLENGINE = api;
})();
