/* 固定資産台帳 CSV Lint — 少額減価償却資産の判定エンジン（VS Code 拡張と無料ウェブ版で共用） */
(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.SG_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });
  const yen = n => '¥' + Math.round(n).toLocaleString('en-US');

  function splitCsv(line) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',' || c === '\t') { out.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    out.push(cur.trim()); return out;
  }
  const pad = n => String(n).padStart(2, '0');
  function parseDate(s) {
    if (!s) return null;
    s = s.normalize('NFKC');
    let m = s.match(/(令和|R)\s*(\d+|元)\s*[年.\/-]\s*(\d{1,2})\s*[月.\/-]\s*(\d{1,2})/);
    if (m) return (2018 + (m[2] === '元' ? 1 : +m[2])) + '-' + pad(m[3]) + '-' + pad(m[4]);
    m = s.match(/(\d{4})\s*[-\/.年]\s*(\d{1,2})\s*[-\/.月]\s*(\d{1,2})/);
    if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    return null;
  }
  function parseYen(s) {
    if (!s) return null;
    const t = s.normalize('NFKC').replace(/[¥￥円,\s]/g, '');
    return /^\d+$/.test(t) ? +t : null;
  }
  function kindOf(s) {
    s = (s || '').normalize('NFKC');
    if (/一括/.test(s)) return 'ikkatsu';
    if (/特例|措法|28条の2|67条の5|中小/.test(s)) return 'tokurei';
    if (/即時|令133|10万/.test(s)) return 'sokuji';
    return 'normal';
  }
  const col = (hdr, re) => hdr.findIndex(h => re.test(h));

  function check(text, opts) {
    opts = opts || {};
    const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
    const findings = []; const dir = {};
    const add = (id, line, msg) => findings.push({ check: id, sev: R[id].sev, msg: R[id].title + '：' + msg + '（' + R[id].basis + '）', line });
    let hdr = null, rows = [];
    lines.forEach((raw, i) => {
      const t = raw.trim(); if (!t) return;
      const d = t.match(/^#\s*([^:：]+)[:：]\s*(.+)$/);
      if (d) { dir[d[1].trim()] = d[2].trim(); return; }
      if (t.startsWith('#')) return;
      const cells = splitCsv(raw);
      if (!hdr) { hdr = cells; return; }
      rows.push({ line: i + 1, cells });
    });
    if (!hdr) return { findings, excluded_yen: 0, tokurei_yen: 0, cap_yen: R.SG02.annual_cap };
    const ci = { name: col(hdr, /資産名|名称|品名/), date: col(hdr, /取得日|取得年月日|供用/), amt: col(hdr, /取得価額|金額|価額/), kind: col(hdr, /区分|処理|償却方法/), use: col(hdr, /用途|備考/) };
    let fyFrom = null, fyTo = null, months = 12;
    const fy = dir['事業年度'] || dir['会計期間'];
    if (fy) {
      const ds = fy.split(/[〜~～]|から|-(?=\s*(?:\d{4}|令和|R))/).map(parseDate).filter(Boolean);
      if (ds.length >= 2) {
        fyFrom = ds[0]; fyTo = ds[1];
        const [y1, m1, d1] = fyFrom.split('-').map(Number), [y2, m2, d2] = fyTo.split('-').map(Number);
        months = Math.min(12, Math.max(1, (y2 - y1) * 12 + (m2 - m1) + (d2 >= d1 - 1 ? 1 : 0)));
      }
    }
    const emp = dir['従業員数'] ? parseInt(dir['従業員数'].normalize('NFKC').replace(/[^\d]/g, ''), 10) : null;
    const cap = Math.floor(R.SG02.annual_cap * months / 12);
    const useRe = new RegExp(R.SG06.pattern);
    let cum = 0, excluded = 0, tokureiRows = 0, tokureiBig = 0;
    for (const r of rows) {
      const g = k => (ci[k] >= 0 ? (r.cells[ci[k]] || '') : '');
      const name = g('name') || ('行' + r.line), date = parseDate(g('date')), amt = parseYen(g('amt')), kind = kindOf(g('kind'));
      if (!date || amt === null) { add('SG08', r.line, name + ' の取得日「' + g('date') + '」／取得価額「' + g('amt') + '」を読めません'); continue; }
      const rental = ci.use >= 0 && useRe.test(g('use').normalize('NFKC'));
      if (rental && kind !== 'normal') add('SG06', r.line, name + ' は用途「' + g('use') + '」。主要な事業でなければ通常の減価償却');
      if (kind === 'sokuji' && amt >= R.SG05.limit) add('SG05', r.line, name + ' ' + yen(amt) + ' は10万円以上。即時損金にできません');
      if (kind === 'ikkatsu' && amt >= R.SG04.limit) add('SG04', r.line, name + ' ' + yen(amt) + ' は20万円以上。一括償却（3年均等）にできません');
      if (kind !== 'tokurei') continue;
      if (fyFrom && (date < fyFrom || date > fyTo)) continue;
      const after = date >= R.SG01.switch_date;
      const lim = after ? R.SG01.limit_after : R.SG01.limit_before;
      if (amt >= lim) { add('SG01', r.line, name + ' ' + yen(amt) + '（取得 ' + date + '）。' + (after ? '2026-04-01以後の取得でも上限は40万円未満' : '2026-03-31以前の取得は30万円未満まで。40万円未満は2026-04-01以後の取得だけ')); excluded += amt; continue; }
      const maxEmp = after ? R.SG07.max_after : R.SG07.max_before;
      if (emp !== null && emp > maxEmp) { add('SG07', r.line, name + ' ' + yen(amt) + '：従業員数 ' + emp + '人 > ' + maxEmp + '人（取得 ' + date + '）'); excluded += amt; continue; }
      if (cum + amt > cap) { add('SG02', r.line, name + ' ' + yen(amt) + ' を足すと累計 ' + yen(cum + amt) + ' > 枠 ' + yen(cap) + (months < 12 ? '（' + months + 'か月の事業年度）' : '') + '。この資産は丸ごと特例の対象外'); excluded += amt; continue; }
      cum += amt; tokureiRows++;
      if (amt < R.SG03.limit) add('SG03', r.line, name + ' ' + yen(amt) + ' は法令133条で即時損金にでき、300万円枠を使わずに済みます');
      else tokureiBig++;
    }
    if (tokureiRows && !/添付/.test(dir['明細書'] || '')) add('SG09', 1, '少額特例 ' + tokureiRows + '件・合計 ' + yen(cum) + '。確定申告書に明細の添付がないと特例が使えません（台帳に「# 明細書: 添付」で確認済みにできます）');
    if (tokureiBig && !/済|計上/.test(dir['償却資産申告'] || '')) add('SG10', 1, '10万円以上の少額特例 ' + tokureiBig + '件は固定資産税（償却資産）の申告に載せます（「# 償却資産申告: 済」で確認済み）');
    findings.sort((a, b) => a.line - b.line);
    return { findings, excluded_yen: excluded, tokurei_yen: cum, cap_yen: cap };
  }
  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  root.SGENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
