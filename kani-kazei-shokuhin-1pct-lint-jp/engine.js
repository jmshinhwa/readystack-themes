/* 消費税 簡易課税チェック — same file runs in VS Code (require) and in the browser (window). */
(function (root) {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.KK_RULES;
  var R = {}; RULES.forEach(function (r) { R[r.id] = r; });
  var MINASHI = { 1: 0.9, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.5, 6: 0.4 };
  var CUT_FROM = '2027-04-01', CUT_TO = '2029-03-31';
  function re(id) { return R[id] && R[id].kw ? new RegExp(R[id].kw) : null; }

  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false;
    text = String(text || '').replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function col(h, pats) { for (var i = 0; i < h.length; i++) for (var j = 0; j < pats.length; j++) if (pats[j].test(h[i])) return i; return -1; }
  function num(s) { var n = parseFloat(String(s || '').replace(/[¥￥円,，\s]/g, '').replace(/[０-９]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0xFEE0); })); return isNaN(n) ? 0 : n; }
  function date(s) { var m = String(s || '').match(/(\d{4})[-\/.年](\d{1,2})[-\/.月](\d{1,2})/); return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : ''; }
  function yen(n) { return '¥' + Math.round(n).toLocaleString('en-US'); }

  // 簡易課税の仕入控除税額（特例：1%売上税額は同額控除 · 75%ルールは1%取引を除いて判定）
  function calc(lines) {
    var special = 0, total = 0, sales = {}, tax = {};
    lines.forEach(function (l) {
      var t = l.amt * l.rate / 100; total += t;
      if (l.rate === 1 && l.inWin) { special += t; return; }
      sales[l.k] = (sales[l.k] || 0) + l.amt; tax[l.k] = (tax[l.k] || 0) + t;
    });
    var ks = Object.keys(sales).map(Number), S = 0, T = 0;
    ks.forEach(function (k) { S += sales[k]; T += tax[k]; });
    var best = 0, method = '原則（加重平均）';
    ks.forEach(function (k) { best += tax[k] * MINASHI[k]; });
    if (ks.length >= 2) ks.forEach(function (k) {
      if (sales[k] * 4 >= S * 3 && T * MINASHI[k] > best + 0.5) { best = T * MINASHI[k]; method = '75%ルール（第' + k + '種を全体に）'; }
    });
    if (ks.length >= 3) for (var a = 0; a < ks.length; a++) for (var b = a + 1; b < ks.length; b++) {
      var hi = Math.min(ks[a], ks[b]), lo = Math.max(ks[a], ks[b]);
      if ((sales[hi] + sales[lo]) * 4 < S * 3) continue;
      var d = tax[hi] * MINASHI[hi] + (T - tax[hi]) * MINASHI[lo];
      if (d > best + 0.5) { best = d; method = '75%ルール（第' + hi + '種＋第' + lo + '種）'; }
    }
    var gensoku = 0; ks.forEach(function (k) { gensoku += tax[k] * MINASHI[k]; });
    return { salesTax: Math.floor(total), specialDeduction: Math.floor(special), minashiDeduction: Math.floor(best),
      payable: Math.max(0, Math.floor(total - special - best)), payableGensoku: Math.max(0, Math.floor(total - special - gensoku)), method: method };
  }

  function check(text, opts) {
    opts = opts || {};
    var rows = parseCSV(text).filter(function (r) { return r.join('').trim() !== ''; });
    var findings = [];
    if (rows.length < 2) return { findings: findings, summary: null };
    var h = rows[0];
    var cD = col(h, [/日付|date|取引日/i]), cN = col(h, [/内容|摘要|品目|取引/]), cP = col(h, [/相手|取引先|顧客/]),
        cA = col(h, [/税抜|金額|amount/i]), cR = col(h, [/税率|rate/i]), cK = col(h, [/区分|種/]), cF = col(h, [/飲食料品|軽減|食品/]);
    var add = function (id, line, extra) { findings.push({ check: id, sev: R[id].sev, msg: R[id].title + '：' + R[id].msg + (extra || '') + '（根拠：' + R[id].basis + '）', line: line }); };
    var asIs = [], fixed = [], present = {}, net = 0, anyOne = false;
    rows.slice(1).forEach(function (r) { var k = parseInt(num(r[cK]), 10); if (MINASHI[k]) present[k] = 1; });
    var lowest = Math.max.apply(null, Object.keys(present).map(Number).concat([4]).filter(function (k) { return present[k] || Object.keys(present).length === 0; }));
    rows.slice(1).forEach(function (r, i) {
      var line = i + 2, d = date(r[cD]), name = String(r[cN] || ''), party = String(r[cP] || ''), amt = num(r[cA]);
      var rawR = num(String(r[cR] || '').replace('%', '')), k = parseInt(num(r[cK]), 10);
      var foodFlag = /^(○|◯|〇|1|true|yes|はい|y|✓|※)$/i.test(String(r[cF] || '').trim());
      var inWin = d >= CUT_FROM && d <= CUT_TO, rate = rawR, fr, fk;
      if ([10, 8, 1].indexOf(rawR) < 0) { add('rate_unknown', line, ' 記載：' + (r[cR] || '空欄')); rate = 10; }
      var food = foodFlag || rate === 8 || rate === 1;
      var eatin = re('eatin_rate').test(name);
      if (!MINASHI[k]) { add('kubun_missing', line, ' 記載：' + (r[cK] || '空欄')); k = lowest; }
      fr = rate; fk = k;
      if (eatin) { if (rate !== 10) { add('eatin_rate', line, ' 記載：' + rate + '%'); fr = 10; } }
      else if (food && rate === 8 && inWin) {
        if (re('keizoku_8').test(name)) add('keizoku_8', line); else { add('food_8_in_window', line, ' 日付：' + d); fr = 1; }
      } else if (rate === 1 && !inWin) { add('food_1_outside', line, ' 日付：' + (d || '不明')); fr = 8; }
      else if (rate === 1 && inWin && re('keizoku_8').test(name)) add('keizoku_8', line);
      if (fr === 1 && inWin) anyOne = true;
      var special = fr === 1 && inWin;
      if (!special) {
        var want = 0, why = '';
        if (eatin) { want = 4; why = 'eatin_kubun'; }
        else [['kotei_shisan'], ['kakouchin'], ['fudosan'], ['service'], ['seizo_kouri'], ['nogyo_food']].some(function (x) {
          var id = x[0]; if (id === 'nogyo_food' && !food) return false;
          if (re(id).test(name)) { want = R[id].expect; why = id; return true; } return false;
        });
        if (!want && k === 1 && re('wholesale_consumer').test(party)) { want = 2; why = 'wholesale_consumer'; }
        if (want && want !== fk) { add(why, line, ' 記載：第' + fk + '種 → 第' + want + '種'); fk = want; }
      }
      net += amt;
      asIs.push({ amt: amt, rate: rate, k: k, inWin: inWin });
      fixed.push({ amt: amt, rate: fr, k: fk, inWin: inWin });
    });
    if (net > 50000000) add('base_50m', 1, ' 合計：' + yen(net));
    if (anyOne) add('tokurei_fudeki', 1);
    var A = calc(asIs), B = calc(fixed), diff = B.payable - A.payable;
    var summary = { asIs: A, fixed: B, diff: diff, rule75Saving: B.payableGensoku - B.payable, taxableSales: Math.floor(net) };
    findings.push({ check: 'summary', sev: 'info', line: 1, msg: '簡易課税の納付税額（概算・国地方合計）：記載どおり ' + yen(A.payable) + ' ／ 修正後 ' + yen(B.payable) +
      (diff > 0 ? '（' + yen(diff) + ' 不足）' : diff < 0 ? '（' + yen(-diff) + ' 払い過ぎ）' : '（差なし）') + ' · 1%売上の同額控除 ' + yen(B.specialDeduction) +
      ' · 計算方法 ' + B.method + (summary.rule75Saving > 0 ? '（原則より ' + yen(summary.rule75Saving) + ' 少ない）' : '') });
    return { findings: findings, summary: summary };
  }

  var api = root.KKENGINE = { engine: { check: check, calc: calc }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
