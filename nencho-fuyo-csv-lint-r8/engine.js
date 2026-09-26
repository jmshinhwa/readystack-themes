/* 年末調整 扶養親族CSV チェック（令和8年分） — VS Code 拡張と無料ウェブ版で同じ判定を使う */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.NENCHO_RULES;
  var BY_ID = {}; RULES.forEach(function (r) { BY_ID[r.id] = r; });
  var LIMIT = { fuyo: 620000, spouse: 620000, spouseSp: 1330000, tokutei: 1230000 };
  var FUYO_AMT = { '一般扶養': 380000, '特定扶養': 630000, '老人扶養': 480000, '同居老親': 580000 };
  var SPOUSE_SP = [[950000, 380000], [1000000, 360000], [1050000, 310000], [1100000, 260000], [1150000, 210000], [1200000, 160000], [1250000, 110000], [1300000, 60000], [1330000, 30000]];
  var TOKUTEI = [[850000, 630000], [900000, 610000], [950000, 510000], [1000000, 410000], [1050000, 310000], [1100000, 210000], [1150000, 110000], [1200000, 60000], [1230000, 30000]];
  var CLAIMED = ['一般扶養', '特定扶養', '老人扶養', '同居老親', '特定親族', '配偶者控除', '配偶者特別控除'];
  var CHOKKEI = /^(父|母|祖父|祖母|曾祖父|曾祖母|義父|義母|配偶者の父|配偶者の母)$/;

  function yen(n) { return '¥' + Math.round(n).toLocaleString('en-US'); }
  function money(s) {
    s = String(s == null ? '' : s).replace(/[円,\s"¥]/g, '');
    if (s === '') return 0;
    var m = s.match(/^(\d+(?:\.\d+)?)万$/); if (m) return Math.round(parseFloat(m[1]) * 10000);
    return /^\d+$/.test(s) ? parseInt(s, 10) : NaN;
  }
  function band(tbl, x) { for (var i = 0; i < tbl.length; i++) if (x <= tbl[i][0]) return tbl[i][1]; return 0; }
  // 令和8年分 給与所得（所得税法28条・別表第五の簡略：219.1万円未満は収入−74万円）
  function kyuyoShotoku(r) {
    if (r < 691000) return 0;
    if (r < 2191000) return r - 740000;
    var k = r <= 3600000 ? r * 0.3 + 80000 : r <= 6600000 ? r * 0.2 + 440000 : r <= 8500000 ? r * 0.1 + 1100000 : 1950000;
    return Math.floor(r - k);
  }
  function ageAt(birth, year) {
    var m = String(birth).match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/); if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var a = year - y; if (mo === 1 && d === 1) a += 1; // 年齢計算ニ関スル法律：誕生日の前日に加齢
    return { age: a, naive: year - y, jan1: mo === 1 && d === 1 };
  }
  function yes(v) { return /^(有|はい|○|済|y|yes|true|1)$/i.test(String(v || '').trim()); }
  function splitCsv(line) { return line.split(',').map(function (c) { return c.trim().replace(/^"|"$/g, ''); }); }
  function fuyoKind(age, rel, dokyo) {
    if (age < 16) return '年少';
    if (age >= 19 && age < 23) return '特定扶養';
    if (age >= 70) return (CHOKKEI.test(rel) && dokyo) ? '同居老親' : '老人扶養';
    return '一般扶養';
  }
  function correct(p) {
    if (p.rel === '配偶者') {
      if (p.inc <= LIMIT.spouse) return { kind: '配偶者控除', amt: p.age >= 70 ? 480000 : 380000 };
      if (p.inc <= LIMIT.spouseSp) return { kind: '配偶者特別控除', amt: band(SPOUSE_SP, p.inc) };
      return { kind: '対象外', amt: 0 };
    }
    if (p.abroad && p.age >= 30 && p.age < 70 && !p.ryugaku && !p.shogai && p.soukin < 380000) return { kind: '対象外', amt: 0 };
    if (p.inc <= LIMIT.fuyo) { var k = fuyoKind(p.age, p.rel, p.dokyo && !p.abroad); return { kind: k, amt: FUYO_AMT[k] || 0 }; }
    if (p.age >= 19 && p.age < 23 && p.inc <= LIMIT.tokutei) return { kind: '特定親族', amt: band(TOKUTEI, p.inc) };
    return { kind: '対象外', amt: 0 };
  }
  function claimedAmt(p) {
    if (FUYO_AMT[p.cls]) return FUYO_AMT[p.cls];
    if (p.cls === '配偶者控除') return p.age >= 70 ? 480000 : 380000;
    if (p.cls === '配偶者特別控除') return band(SPOUSE_SP, p.inc) || 0;
    if (p.cls === '特定親族') return (p.inc > LIMIT.fuyo ? band(TOKUTEI, p.inc) : 0);
    return 0;
  }

  function check(text, opts) {
    opts = opts || {};
    var year = opts.year || (opts.today ? +String(opts.today).slice(0, 4) : 2026);
    var findings = [], missed = 0, over = 0, rows = 0;
    function add(id, line, extra) { var r = BY_ID[id]; findings.push({ check: id, sev: r.sev, line: line, msg: r.title + (extra ? '（' + extra + '）' : '') + ' → ' + r.fix + ' [' + r.law + ']' }); }
    var lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
    var hi = lines.findIndex(function (l) { return /氏名/.test(l) && /区分/.test(l); });
    if (hi < 0) { add('BAD_ROW', 1, '見出し行（氏名・続柄・生年月日・区分・合計所得…）がない'); return { findings: findings, summary: { rows: 0, missed: 0, over: 0 } }; }
    var H = splitCsv(lines[hi]); function col(c, n) { var i = H.indexOf(n); return i < 0 ? '' : (c[i] || ''); }
    for (var i = hi + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      var c = splitCsv(lines[i]), ln = i + 1, A = ageAt(col(c, '生年月日'), year);
      var p = { name: col(c, '氏名'), rel: col(c, '続柄'), cls: col(c, '区分') || '対象外', inc: money(col(c, '合計所得')), sal: money(col(c, '給与収入')),
        dokyo: yes(col(c, '同居')), abroad: yes(col(c, '国外')), shogai: yes(col(c, '障害者')), ryugaku: yes(col(c, '留学')), soukin: money(col(c, '送金額')),
        docRel: yes(col(c, '親族関係書類')), docSou: yes(col(c, '送金関係書類')) };
      if (!A || isNaN(p.inc) || isNaN(p.sal) || isNaN(p.soukin)) { add('BAD_ROW', ln, p.name || ('行' + ln)); continue; }
      rows++; p.age = A.age; var who = p.name + '・' + year + '/12/31で' + p.age + '歳';
      if (p.sal > 0 && Math.abs(kyuyoShotoku(p.sal) - p.inc) > 1000) add('KYUYO_KOJO_OLD', ln, who + '・給与' + yen(p.sal) + 'なら所得は' + yen(kyuyoShotoku(p.sal)) + '、ファイルは' + yen(p.inc));
      if (p.sal > 0) p.inc = kyuyoShotoku(p.sal);
      var ok = correct(p), got = claimedAmt(p), isFuyo = !!FUYO_AMT[p.cls];
      if (A.jan1 && fuyoKind(A.age, p.rel, true) !== fuyoKind(A.naive, p.rel, true)) add('JAN1_BIRTHDAY', ln, who + '（生年だけで数えると' + A.naive + '歳）');
      if (isFuyo && p.age < 16) add('NENSHO_CLAIMED', ln, who);
      if (p.cls === '特定扶養' && !(p.age >= 19 && p.age < 23)) add('TOKUTEI_AGE', ln, who);
      if ((p.cls === '老人扶養' || p.cls === '同居老親') && p.age < 70) add('ROUJIN_AGE', ln, who);
      if (p.cls === '一般扶養' && p.age >= 70 && p.inc <= LIMIT.fuyo) add('ROUJIN_MISSED', ln, who + '・正しくは' + ok.kind + ' ' + yen(ok.amt));
      if (p.cls === '同居老親' && p.age >= 70 && (!CHOKKEI.test(p.rel) || !p.dokyo || p.abroad)) add('DOUKYO_ROUSHIN_REQ', ln, who + '・続柄' + p.rel + '・同居' + (p.dokyo ? '有' : '無'));
      if (isFuyo && p.inc > LIMIT.fuyo) add('FUYO_INCOME_OVER', ln, who + '・所得' + yen(p.inc));
      if (p.rel !== '配偶者' && (p.cls === '対象外' || p.cls === '') && ok.kind in FUYO_AMT) add('FUYO_MISSED', ln, who + '・所得' + yen(p.inc) + '・' + ok.kind + ' ' + yen(ok.amt));
      if (p.cls !== '特定親族' && ok.kind === '特定親族') add('TOKUTEI_SHINZOKU_MISSED', ln, who + '・所得' + yen(p.inc) + '・控除' + yen(ok.amt));
      if (p.cls === '特定親族' && ok.kind !== '特定親族') add('TOKUTEI_SHINZOKU_RANGE', ln, who + '・所得' + yen(p.inc) + '・正しくは' + ok.kind);
      if (p.cls === '配偶者控除' && p.inc > LIMIT.spouse) add('SPOUSE_KOJO_OVER', ln, who + '・所得' + yen(p.inc) + '・正しくは' + ok.kind + ' ' + yen(ok.amt));
      if (p.cls === '配偶者特別控除' && (p.inc <= LIMIT.spouse || p.inc > LIMIT.spouseSp)) add('SPOUSE_SPECIAL_RANGE', ln, who + '・所得' + yen(p.inc));
      if (p.rel === '配偶者' && (p.cls === '対象外' || p.cls === '') && ok.amt > 0) add('SPOUSE_MISSED', ln, who + '・所得' + yen(p.inc) + '・' + ok.kind + ' ' + yen(ok.amt));
      var claimedAbroad = p.abroad && CLAIMED.indexOf(p.cls) >= 0;
      if (claimedAbroad && p.age >= 30 && p.age < 70 && !p.ryugaku && !p.shogai && p.soukin < 380000) add('NONRES_30_69', ln, who + '・送金' + yen(p.soukin));
      if (claimedAbroad && !p.docRel) add('NONRES_SHINZOKU_DOC', ln, who);
      if (claimedAbroad && !p.docSou) add('NONRES_SOUKIN_DOC', ln, who);
      if (p.abroad && p.ryugaku && p.age >= 30 && p.age < 70) add('NONRES_RYUGAKU_DOC', ln, who);
      if (ok.amt > got) missed += ok.amt - got; else over += got - ok.amt;
    }
    findings.push({ check: 'SUMMARY', sev: 'info', line: hi + 1, msg: year + '年分（令和8年分）で' + rows + '人を判定：控除漏れ ' + yen(missed) + '・過大控除 ' + yen(over) + '（本人の合計所得900万円以下として計算）' });
    return { findings: findings, summary: { rows: rows, missed: missed, over: over } };
  }
  var api = { engine: { check: check, kyuyoShotoku: kyuyoShotoku }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.NENCHO_ENGINE = api;
})();
