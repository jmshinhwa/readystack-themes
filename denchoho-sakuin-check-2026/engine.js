/* engine.js — 電帳法 索引簿チェック 2026
 * 電子帳簿保存法の電子取引データ保存で使う「索引簿」(取引年月日・取引金額・取引先・ファイル名の一覧) を
 * 検索要件の観点で検査する。VS Code 拡張と無料ウェブ版が ★同じこのファイルを使う。
 */
(function (root, factory) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : (root.DENCHOHO_RULES || []);
  var api = factory(RULES);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DENCHOHO_ENGINE = api;
}(typeof window !== 'undefined' ? window : globalThis, function (RULES) {
  'use strict';

  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  function msgOf(id, extra) {
    var r = BY_ID[id];
    var m = r ? r.msg : id;
    return extra ? m + ' — ' + extra : m;
  }
  function sevOf(id) { var r = BY_ID[id]; return r ? r.sev : 'error'; }

  /* 日付は防御的に読む: 末尾のゴミ・全角・区切り違いを落としてから測る */
  function isoDays(s) {
    var m = String(s || '').replace(/[^0-9-]/g, '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(t) ? null : Math.floor(t / 86400000);
  }

  function splitRow(line) {
    var t = line.trim();
    if (t.charAt(0) !== '|') return null;
    if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1);
    return t.slice(1).split('|').map(function (c) { return c.trim(); });
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text);
    var lines = src.split(/\r?\n/);
    /* 文書全体の規定は ★空白をつぶしてから探す (折り返された行で取りこぼさない) */
    var flat = src.replace(/\s+/g, '');
    var today = isoDays(opts.today) ;
    var findings = [];
    var push = function (id, line, extra) {
      findings.push({ check: id, sev: sevOf(id), msg: msgOf(id, extra), line: line });
    };

    var col = { seq: 0, date: 1, amount: 2, partner: 3, file: 4 };
    var sawHeader = false, dataRows = 0, firstDataLine = 1;
    var seenFile = {}, seenSeq = {}, seqNums = [];

    for (var n = 0; n < lines.length; n++) {
      var cells = splitRow(lines[n]);
      if (!cells || cells.length < 5) continue;
      var joined = cells.join('');
      if (/^[\s:\-]*$/.test(joined)) continue;                      /* 罫線行 */
      if (!sawHeader && /取引年月日|日付/.test(joined) && /ファイル名/.test(joined)) {
        for (var c = 0; c < cells.length; c++) {
          if (/連番|No/i.test(cells[c])) col.seq = c;
          else if (/取引年月日|日付/.test(cells[c])) col.date = c;
          else if (/金額/.test(cells[c])) col.amount = c;
          else if (/取引先|相手/.test(cells[c])) col.partner = c;
          else if (/ファイル名/.test(cells[c])) col.file = c;
        }
        sawHeader = true;
        continue;
      }
      if (/取引年月日|ファイル名/.test(joined) && !dataRows) continue;
      var ln = n + 1;
      if (!dataRows) firstDataLine = ln;
      dataRows++;

      var date = cells[col.date] || '';
      var amount = cells[col.amount] || '';
      var partner = cells[col.partner] || '';
      var file = cells[col.file] || '';
      var seq = cells[col.seq] || '';

      /* ── 取引年月日 ── */
      if (/令和|平成|昭和|^[RHS]\s?\d/.test(date)) push('date_wareki', ln, '「' + date + '」');
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) push('date_not_iso', ln, date ? '「' + date + '」' : '空欄');
      else if (today != null && isoDays(date) > today) push('date_future', ln, '「' + date + '」');

      /* ── 取引金額 ── */
      if (/[¥￥＄$円、,][\s]*\d|[０-９]/.test(amount)) push('amount_mark', ln, '「' + amount + '」');
      else if (!/^\d+$/.test(amount.replace(/\s/g, ''))) push('amount_not_number', ln, amount ? '「' + amount + '」' : '空欄');

      /* ── 取引先 ── */
      if (!partner || /^(同上|〃|々|上記と同じ|同左|-|―)$/.test(partner)) push('partner_empty', ln, partner ? '「' + partner + '」' : '空欄');

      /* ── ファイル名 ── */
      if (!file || /^(-|―|なし)$/.test(file)) push('filename_empty', ln, '');
      else if (/[\u3000\\/:*?"<>|]/.test(file)) push('filename_char', ln, '「' + file + '」');
      else if (seenFile[file]) push('filename_dup', ln, '「' + file + '」は ' + seenFile[file] + ' 行目と同じ');
      if (file) seenFile[file] = ln;

      /* ── 連番 ── */
      if (/^\d+$/.test(seq)) {
        if (seenSeq[seq]) push('seq_number', ln, '連番 ' + seq + ' が重複');
        seenSeq[seq] = ln;
        seqNums.push(Number(seq));
      }
    }

    if (seqNums.length > 1) {
      var lo = Math.min.apply(null, seqNums), hi = Math.max.apply(null, seqNums), missing = [];
      for (var k = lo; k <= hi; k++) if (seenSeq[String(k)] === undefined) missing.push(k);
      if (missing.length) push('seq_number', firstDataLine, '連番 ' + missing.join('・') + ' が欠番');
    }

    if (dataRows) {
      if (!/事務処理規程/.test(flat)) push('no_jimushori_kitei', 1, '');
      if (!/ダウンロードの求め|税務職員からの求め/.test(flat)) push('no_download_pledge', 1, '');
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, rows: dataRows };
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
}));
