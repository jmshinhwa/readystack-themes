// 退職手続き 期限リント — engine (Node + browser)
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.TK_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });

  const KANJI = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  function kanjiNum(s) {
    if (!/^[一二三四五六七八九十]+$/.test(s)) return NaN;
    let n = 0, cur = 0;
    for (const ch of s) {
      if (ch === '十') { n += (cur || 1) * 10; cur = 0; } else cur = KANJI[ch];
    }
    return n + cur;
  }
  function norm(s) {
    return s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/([一二三四五六七八九十]+)(?=\s*(営業日|日|か月|ヶ月|カ月|ヵ月|年))/g, m => { const n = kanjiNum(m); return isNaN(n) ? m : String(n); });
  }

  // topic keywords, longest first so 国民健康保険 is not read as 健康保険
  const TOPIC_RE = /任意継続|国民健康保険|国保|国民年金|雇用保険|離職証明書|離職票|健康保険|厚生年金|社会保険|社保|源泉徴収票/g;
  const TOPIC_OF = { '任意継続': 'ninkei', '国民健康保険': 'kokuho', '国保': 'kokuho', '国民年金': 'kokunen', '雇用保険': 'koyo', '離職証明書': 'koyo', '離職票': 'koyo', '健康保険': 'shaho', '厚生年金': 'shaho', '社会保険': 'shaho', '社保': 'shaho', '源泉徴収票': 'gensen' };
  const DAY_RE = /(\d{1,3})\s*(営業日|日)\s*(以内|まで|間|を過ぎ|経過)/g;

  function topicsIn(seg) {
    const out = []; let m; TOPIC_RE.lastIndex = 0;
    while ((m = TOPIC_RE.exec(seg))) out.push({ pos: m.index, t: TOPIC_OF[m[0]] });
    return out;
  }
  function topicFor(tops, pos) {
    // 任意継続 dominates the health-insurance words in the same segment
    if (tops.some(x => x.t === 'ninkei')) {
      const other = tops.filter(x => x.t !== 'ninkei' && x.t !== 'shaho');
      if (!other.length) return 'ninkei';
    }
    let best = null;
    for (const x of tops) if (x.pos <= pos && (!best || x.pos > best.pos)) best = x;
    if (!best) for (const x of tops) if (!best || x.pos < best.pos) best = x;
    return best && best.t;
  }

  function check(text, opts) {
    opts = opts || {};
    const today = String(opts.today || new Date().toISOString()).slice(0, 10);
    const findings = [];
    const add = (id, line, said) => {
      const r = R[id];
      findings.push({ check: id, sev: r.sev, line, msg: r.msg + (said ? '(記載: ' + said + ')' : '') + ' → ' + r.fix + ' [' + r.law + ']' });
    };
    const lines = String(text || '').split(/\r?\n/);
    lines.forEach((raw, i) => {
      const ln = i + 1;
      const segs = norm(raw).split('。');
      segs.forEach(seg => {
        if (!seg.trim()) return;
        const tops = topicsIn(seg);
        const hit = new Set();
        const once = (id, said) => { if (!hit.has(id)) { hit.add(id); add(id, ln, said); } };
        let m; DAY_RE.lastIndex = 0;
        while (tops.length && (m = DAY_RE.exec(seg))) {
          const prev = seg.charAt(m.index - 1);
          if (prev === '月' || prev === '/') continue; // a calendar date such as 翌月10日まで
          const n = +m[1], unit = m[2], said = m[0];
          const t = topicFor(tops, m.index);
          if (unit === '営業日' && t && t !== 'gensen') once('eigyobi', said);
          if (t === 'ninkei' && n !== 20) once('ninkei-20', said);
          else if (t === 'kokuho' && n !== 14) once('kokuho-14', said);
          else if (t === 'kokunen' && n !== 14) once('kokunen-14', said);
          else if (t === 'shaho' && /資格(取得|喪失)|被扶養者/.test(seg) && n !== 5) once('shaho-5', said);
          else if (t === 'koyo') {
            if (/資格取得/.test(seg) && !/資格喪失|離職/.test(seg)) once('koyo-shutoku-10th', said);
            else if (/資格喪失|離職/.test(seg) && n !== 10) once('koyo-soshitsu-10', said);
          }
        }
        if (/任意継続/.test(seg)) {
          const y = seg.match(/(\d)\s*年\s*(間|まで|以上|を限度|が上限)/);
          const k = seg.match(/(\d+)\s*(か月|ヶ月|カ月|ヵ月)\s*以上/) || seg.match(/(\d)\s*年\s*以上/);
          if (k) { const n = /年/.test(k[0]) ? 12 * +k[1] : +k[1]; if (n !== 2) once('ninkei-yoken', k[0]); }
          if (y && y[2] !== '以上' && +y[1] !== 2) once('ninkei-2nen', y[0]);
        }
        if (/源泉徴収票/.test(seg) && /退職/.test(seg)) {
          const g = seg.match(/(\d+)\s*(日|週間|か月|ヶ月|カ月|ヵ月)\s*以内|年末調整後|年末に|翌年\d*月?/);
          if (g && !/^1\s*(か月|ヶ月|カ月|ヵ月)/.test(g[0])) once('gensen-1m', g[0]);
        }
        if (/算定基礎届|月額変更届|賞与支払届|年度更新|雇用保険.{0,12}資格(取得|喪失)届/.test(seg) && /郵送|紙で|紙の|窓口/.test(seg) && !/電子申請|e-Gov|特定の法人/.test(seg)) once('e-shinsei', (seg.match(/郵送|紙で|紙の|窓口/) || [''])[0]);
        if (today >= R['hokensho'].since && /(?:^|[^ナ])保険証/.test(seg.replace(/マイナ保険証/g, '')) && /保険証[^。]{0,8}(発行|交付|届|郵送|送付)/.test(seg) && !/資格確認書|マイナ/.test(seg)) once('hokensho', '保険証');
      });
    });
    return { findings };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.TKENGINE = api;
})();
