/* 確定申告 添付書類チェッカー engine — same file runs in Node (VS Code) and the browser */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.TNP_RULES;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  function z2h(s) {
    return String(s).replace(/[０-９Ａ-Ｚａ-ｚ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/，/g, ',').replace(/：/g, ':').replace(/－/g, '-');
  }
  function yen(n) { return '¥' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function amount(s) {
    var m = s.match(/[¥￥]\s?([0-9][0-9,]*)|([0-9][0-9,]*)\s?円/);
    return m ? parseInt((m[1] || m[2]).replace(/,/g, ''), 10) : 0;
  }
  function iso(y, m, d) { return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2); }
  function parseDate(s) {
    var m = s.match(/(20\d\d)\s*[年\/\-.]\s*(\d{1,2})\s*[月\/\-.]\s*(\d{1,2})/);
    return m ? iso(m[1], +m[2], +m[3]) : null;
  }
  // 法定申告期限: 翌年3月15日（土日なら翌月曜）
  function deadline(y) {
    var d = new Date(Date.UTC(y + 1, 2, 15));
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  function jpDate(s) { var p = s.split('-'); return p[0] + '年' + (+p[1]) + '月' + (+p[2]) + '日'; }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    function add(id, line, extra) {
      var r = BY_ID[id];
      findings.push({ check: id, sev: r.sev, msg: r.title + (extra ? ' — ' + extra : '') + '（' + r.law + '）→ ' + r.fix, line: line });
    }
    var lines = String(text).split(/\r?\n/).map(z2h);
    // split: attachment section (見出しに 添付/提出書類/用意) vs the rest
    var body = [], att = [], inAtt = false;
    lines.forEach(function (l, i) {
      if (/^\s*#/.test(l)) { inAtt = /添付|提出書類|用意/.test(l); return; }
      (inAtt ? att : body).push({ t: l, n: i + 1 });
    });
    function bodyHit(re) { for (var i = 0; i < body.length; i++) if (re.test(body[i].t)) return body[i]; return null; }
    function attHit(re) { for (var i = 0; i < att.length; i++) if (re.test(att[i].t)) return att[i]; return null; }
    var all = lines.join('\n');
    var firstLine = 1;

    // 年分
    var year = null, ym = all.match(/令和\s*(\d{1,2})\s*年分/), wm = all.match(/(20\d\d)\s*年分/);
    if (ym) year = 2018 + parseInt(ym[1], 10); else if (wm) year = parseInt(wm[1], 10);
    if (!year) year = parseInt((opts.today || '2026-09-28').slice(0, 4), 10) - 1;
    var due = deadline(year);

    var methodLine = bodyHit(/提出方法/);
    var method = methodLine ? methodLine.t : '';
    var etax = /e-?Tax|電子/i.test(method);
    var paper = !etax && /郵送|窓口|持参|書面|紙/.test(method);
    var planLine = bodyHit(/提出(予定)?日/);
    var plan = planLine ? parseDate(planLine.t) : null;
    var refund = /還付/.test(all) && !/納付/.test(method);
    var late = !!(plan && plan > due);
    var atRisk = 0;

    // 源泉徴収票・特定口座年間取引報告書
    var g = attHit(/源泉徴収票|年間取引報告書/);
    if (g) add('TNP-GENSEN-UNNEEDED', g.n);

    // 医療費控除
    var med = bodyHit(/医療費控除/);
    if (med && !/セルフメディケーション/.test(med.t) && !attHit(/医療費(控除)?の?明細|医療費通知/)) {
      var ma = amount(med.t); atRisk += ma;
      var rc = attHit(/領収書/);
      add('TNP-MED-STATEMENT', med.n, (ma ? '控除 ' + yen(ma) : '') + (rc ? '・' + rc.n + '行目の領収書では足りない' : ''));
    }
    // 国民年金
    var nk = bodyHit(/国民年金/);
    if (nk && !attHit(/国民年金.*証明書|年金.*控除証明/)) { var na = amount(nk.t); atRisk += na; add('TNP-NENKIN-CERT', nk.n, na ? '控除 ' + yen(na) : ''); }
    // 国保の納付証明書
    var kh = attHit(/国民健康保険.*(証明|納付)|国保.*(証明|納付)/);
    if (kh) add('TNP-KOKUHO-UNNEEDED', kh.n);
    // 生命保険料
    var sh = bodyHit(/生命保険料控除|介護医療保険料|個人年金保険料/);
    if (sh && !attHit(/(生命|介護|年金)保険.*証明書/)) {
      var oldSmall = /旧/.test(sh.t) && /保険料/.test(sh.t) && amount(sh.t) > 0 && amount(sh.t) <= 9000;
      if (!oldSmall) { var sa = amount(sh.t); atRisk += sa; add('TNP-SEIHO-CERT', sh.n, sa ? '控除 ' + yen(sa) : ''); }
    }
    // 地震保険料
    var js = bodyHit(/地震保険料/);
    if (js && !attHit(/地震保険.*証明書/)) { var ja = amount(js.t); atRisk += ja; add('TNP-JISHIN-CERT', js.n, ja ? '控除 ' + yen(ja) : ''); }
    // 小規模企業共済・iDeCo
    var sk = bodyHit(/小規模企業共済|iDeCo|確定拠出年金/i);
    if (sk && !attHit(/(小規模企業共済|iDeCo|確定拠出年金|掛金).*証明書/i)) { var ka = amount(sk.t); atRisk += ka; add('TNP-SHOKIBO-CERT', sk.n, ka ? '控除 ' + yen(ka) : ''); }
    // 寄附金・ワンストップ
    var kf = bodyHit(/寄附金控除|ふるさと納税/);
    if (kf) {
      var cnt = (kf.t.match(/(\d+)\s*件/) || [])[1];
      var yearly = attHit(/年間寄附額証明書/);
      var certs = 0;
      att.forEach(function (a) { if (/受領証明書/.test(a.t)) { var c = a.t.match(/(\d+)\s*(枚|通|件)/); certs += c ? +c[1] : 1; } });
      var os = bodyHit(/ワンストップ/);
      if (os && !/無効|取り消|全件/.test(os.t)) add('TNP-ONESTOP-VOID', os.n, cnt ? '寄附 ' + cnt + '件すべて・受領証明書 ' + certs + '枚' : '');
      else if (!yearly && (certs === 0 || (cnt && certs < +cnt))) add('TNP-KIFU-CERT', kf.n, (cnt ? '寄附 ' + cnt + '件・' : '') + '受領証明書 ' + certs + '枚');
    }
    // 青色申告特別控除
    var ao = bodyHit(/青色申告特別控除/);
    if (ao && late && amount(ao.t) > 100000) add('TNP-AOIRO-LATE', ao.n, yen(amount(ao.t)) + ' → ¥100,000（期限 ' + jpDate(due) + '）');
    else if (ao && paper && /65万|650,000/.test(ao.t)) add('TNP-AOIRO-65', ao.n, '¥650,000 → ¥550,000');
    // 決算書
    var biz = bodyHit(/事業所得|不動産所得/);
    if (biz && !attHit(/決算書|収支内訳書/)) add('TNP-KESSANSHO', biz.n);
    // 本人確認書類
    if (paper && !attHit(/本人確認|マイナンバーカード.*写し|通知カード|個人番号カード/)) add('TNP-MYNUMBER-ID', methodLine.n);
    // 期限
    if (late && !refund) add('TNP-DEADLINE', planLine.n, jpDate(plan) + ' ＞ 期限 ' + jpDate(due));
    if (refund && plan) {
      var kdue = (year + 5) + '-12-31';
      if (plan > kdue) add('TNP-KANPU-5Y', planLine.n, year + '年分の期限は' + jpDate(kdue));
    }
    // 国外居住親族
    var kg = bodyHit(/国外居住|海外(に住む|在住)/);
    if (kg && !attHit(/親族関係書類|送金関係書類|戸籍|送金/)) add('TNP-KOKUGAI-FUYO', kg.n);
    // e-Tax 保存期限
    if (etax && !/保存/.test(all)) {
      var keep = (parseInt(due.slice(0, 4), 10) + 5) + due.slice(4);
      add('TNP-ETAX-KEEP', methodLine.n, '保存期限 ' + jpDate(keep));
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, atRisk: atRisk, atRiskText: yen(atRisk), deadline: due, year: year };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.TNPENGINE = api;
})();
