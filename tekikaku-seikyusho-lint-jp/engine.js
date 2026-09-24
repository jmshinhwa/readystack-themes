/* 請求書インボイス チェッカー engine — same file runs in Node (VS Code) and the browser */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.INV_RULES;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  var AMT = /[¥￥]\s?([0-9０-９][0-9０-９,，]*)|([0-9０-９][0-9０-９,，]*)\s?円/g;

  function z2h(s) { return String(s).replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).replace(/，/g, ','); }
  function yen(n) { return '¥' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function amounts(s) {
    var out = [], m; AMT.lastIndex = 0;
    while ((m = AMT.exec(s))) out.push(parseInt(z2h(m[1] || m[2]).replace(/,/g, ''), 10));
    return out;
  }
  function cells(line) { return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); }); }
  function stripHtml(t) {
    return t.replace(/<\/(td|th)>\s*<(td|th)[^>]*>/gi, ' | ').replace(/<tr[^>]*>/gi, '| ').replace(/<\/tr>/gi, ' |\n')
      .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li)>/gi, '\n').replace(/<[^>]+>/g, '');
  }
  function docDate(text) {
    var m = z2h(text).match(/(20\d\d)\s*[年\/\-.]\s*(\d{1,2})\s*[月\/\-.]\s*(\d{1,2})/);
    if (!m) return null;
    return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  }
  function keikaRate(date) {
    if (date < '2023-10-01') return 100;
    if (date <= '2026-09-30') return 80;
    if (date <= '2028-09-30') return 70;
    if (date <= '2030-09-30') return 50;
    if (date <= '2031-09-30') return 30;
    return 0;
  }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    function add(id, line, extra) {
      var r = BY_ID[id];
      findings.push({ check: id, sev: r.sev, msg: r.title + (extra ? ' — ' + extra : '') + '（' + r.law + '）→ ' + r.fix, line: line });
    }
    var isHtml = /<(table|div|p|td|html)\b/i.test(text);
    var raw = isHtml ? stripHtml(text) : text;
    var lines = raw.split(/\r?\n/);
    var flat = z2h(raw);
    var date = docDate(raw);
    var dateLine = 1;
    lines.some(function (l, i) { if (docDate(l)) { dateLine = i + 1; return true; } return false; });
    var refDate = date || opts.today || '2026-09-23';
    var inclusive = /税込/.test(flat) && !/税抜/.test(flat);

    // --- parse item tables (header-driven) and summary lines
    var items = [], perRate = {}, taxTotal = null, taxLine = 0, total = null, totalLine = 0, lineTaxHeader = 0;
    var hdr = null;
    lines.forEach(function (l, i) {
      var ln = i + 1, L = z2h(l);
      if (/^\s*\|/.test(L)) {
        var c = cells(L);
        if (c.every(function (x) { return /^:?-{2,}:?$/.test(x) || x === ''; })) return;
        if (/品目|品名|内容|摘要|商品/.test(L) && !/[¥￥\d]{3,}/.test(L.replace(/\d+%/g, ''))) {
          hdr = { amt: -1, rate: -1, tax: -1 };
          c.forEach(function (x, k) {
            if (/金額|小計|価格/.test(x) && !/単価/.test(x)) hdr.amt = k;
            if (/税率/.test(x)) hdr.rate = k;
            if (/消費税|税額/.test(x)) { hdr.tax = k; lineTaxHeader = ln; }
          });
          return;
        }
        if (/(10|8)\s?%\s*対象/.test(L)) { hdr = null; }
        else if (hdr && hdr.amt >= 0 && c[hdr.amt] && amounts(c[hdr.amt]).length) {
          var rate = 10;
          if (hdr.rate >= 0 && /8\s?%/.test(c[hdr.rate])) rate = 8;
          else if (/※|軽減/.test(L) && hdr.rate < 0) rate = 8;
          items.push({ amt: amounts(c[hdr.amt])[0], rate: rate, tax: hdr.tax >= 0 ? (amounts(c[hdr.tax] || '')[0]) : undefined, line: ln });
          return;
        }
      } else if (L.trim()) { hdr = null; }
      var pr = L.match(/(10|8)\s?%\s*対象/);
      if (pr) {
        var a = amounts(L);
        if (a.length) perRate[pr[1]] = { base: a[0], tax: a.length > 1 ? a[1] : null, line: ln };
        return;
      }
      if (/^[\s|#*]*(消費税|消費税額|税額)(等|合計)?[\s|:：]*[¥￥\d]/.test(L) && amounts(L).length) { taxTotal = amounts(L)[0]; taxLine = ln; return; }
      if (/合計|ご?請求金額|ご請求額/.test(L) && !/小計/.test(L) && amounts(L).length) { total = amounts(L)[amounts(L).length - 1]; totalLine = ln; }
    });

    // --- registration number
    var regLabel = -1, regTok = null;
    lines.forEach(function (l, i) {
      if (regLabel < 0 && /登録番号/.test(l)) regLabel = i + 1;
      if (!regTok) { var m = l.match(/(?:^|[^A-Za-z])([TＴ][\s\-0-9０-９－]{8,20})/); if (m) regTok = { s: m[1].trim(), line: i + 1 }; }
    });
    var stated = 0;
    Object.keys(perRate).forEach(function (r) { if (perRate[r].tax != null) stated += perRate[r].tax; });
    if (!stated && taxTotal != null) stated = taxTotal;
    var kr = keikaRate(refDate);
    var loss = stated ? Math.floor(stated * (100 - kr) / 100) : 0;
    var lossTxt = stated ? '買手は' + refDate + '取引の消費税 ' + yen(stated) + ' のうち ' + (100 - kr) + '%（' + yen(loss) + '）を控除できない（経過措置 ' + kr + '%）' : '';
    var pendLine = 0;
    lines.forEach(function (l, i) { if (!pendLine && /登録番号/.test(l) && /申請中|取得予定|未登録|準備中/.test(l)) pendLine = i + 1; });
    if (pendLine) add('INV-REG-PENDING', pendLine, lossTxt);
    else if (!regTok && regLabel < 0) add('INV-REG-MISSING', 1, lossTxt);
    else if (!regTok) add('INV-REG-FORMAT', regLabel, '「T」で始まる番号が見つからない。' + lossTxt);
    else {
      var digits = regTok.s.replace(/[\s\-－]/g, '').slice(1);
      var full = /[Ｔ０-９－]/.test(regTok.s);
      var d = z2h(digits);
      if (d.length !== 13 || full) add('INV-REG-FORMAT', regTok.line, '「' + regTok.s + '」は数字' + d.length + '桁' + (full ? '・全角文字を含む' : '') + '。' + lossTxt);
    }

    if (!date) add('INV-DATE-MISSING', 1);
    if (!/御中|様/.test(raw)) add('INV-BUYER-MISSING', 1);
    if (!/(10|8)\s?[%％]/.test(raw)) add('INV-RATE-MISSING', 1);

    var has8 = items.some(function (x) { return x.rate === 8; }) || !!perRate['8'];
    if (has8 && !/軽減/.test(raw)) {
      var l8 = items.filter(function (x) { return x.rate === 8; })[0];
      add('INV-REDUCED-MARK', l8 ? l8.line : perRate['8'].line);
    }

    var sums = {};
    items.forEach(function (x) { sums[x.rate] = (sums[x.rate] || 0) + x.amt; });
    var ratesUsed = Object.keys(sums);
    var perRateTaxed = Object.keys(perRate).filter(function (r) { return perRate[r].tax != null; });
    if (ratesUsed.length && perRateTaxed.length < ratesUsed.length) {
      add('INV-TAX-PER-RATE', taxLine || (items.length ? items[items.length - 1].line : 1),
        ratesUsed.map(function (r) { return r + '%対象 ' + yen(sums[r]); }).join('・') + ' の区分ごとの消費税額がない');
    }
    if (lineTaxHeader) add('INV-LINE-TAX', lineTaxHeader);

    function expect(base, r) {
      var v = inclusive ? base * r / (100 + r) : base * r / 100;
      return [Math.floor(v + 1e-9), Math.round(v), Math.ceil(v - 1e-9)];
    }
    Object.keys(perRate).forEach(function (r) {
      var p = perRate[r];
      if (sums[r] != null && sums[r] !== p.base) add('INV-BASE-MISMATCH', p.line, r + '%対象 ' + yen(p.base) + ' ≠ 品目合計 ' + yen(sums[r]));
      if (p.tax != null) {
        var e = expect(p.base, +r);
        if (e.indexOf(p.tax) < 0) add('INV-TAX-MISMATCH', p.line, r + '%の消費税 ' + yen(p.tax) + '、' + yen(p.base) + '×' + r + '%を1回端数処理すると ' + yen(e[0]) + '（切捨て）');
      }
    });
    if (!perRateTaxed.length && taxTotal != null && ratesUsed.length) {
      var once = 0, perLine = 0, hasLineTax = true;
      ratesUsed.forEach(function (r) { once += expect(sums[r], +r)[0]; });
      items.forEach(function (x) { if (x.tax == null) hasLineTax = false; else perLine += x.tax; });
      if (taxTotal !== once) add('INV-TAX-MISMATCH', taxLine, '記載 ' + yen(taxTotal) + (hasLineTax && perLine === taxTotal ? '（品目ごとに切捨てた合計）' : '') + '、税率ごと1回の切捨てなら ' + yen(once));
    }

    if (total != null) {
      var bases = 0, taxes = 0, src = '';
      if (Object.keys(perRate).length) {
        Object.keys(perRate).forEach(function (r) { bases += perRate[r].base; taxes += perRate[r].tax || 0; });
      } else { ratesUsed.forEach(function (r) { bases += sums[r]; }); taxes = taxTotal || 0; }
      var want = inclusive ? bases : bases + taxes;
      if (bases && want !== total) add('INV-TOTAL-MISMATCH', totalLine, '合計 ' + yen(total) + ' ≠ ' + yen(want));
    }

    if (refDate >= '2026-10-01') {
      lines.forEach(function (l, i) { if (/(80\s?[%％]|8割)/.test(l) && /控除/.test(l)) add('INV-KEIKA-80', i + 1, refDate + ' の取引は ' + kr + '%控除'); });
    }
    return { findings: findings, meta: { date: refDate, keika_rate: kr, stated_tax: stated, buyer_loss: loss, items: items.length } };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.INVENGINE = api;
})();
