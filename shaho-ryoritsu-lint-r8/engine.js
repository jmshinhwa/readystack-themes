// 給与計算 社会保険料率チェッカー 令和8年度 — the same file runs in VS Code (node) and in the browser.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SHAHO_RULES;
  const R = {}; RULES.forEach(function (r) { R[r.id] = r; });

  // 協会けんぽ 都道府県単位保険料率 (%) — r8ippan3.xlsx (令和8年3月分〜) / r7ippan3.xlsx (令和7年3月分〜)
  const PREFS = [
    ['北海道', 'hokkaido', 10.28, 10.31], ['青森', 'aomori', 9.85, 9.85], ['岩手', 'iwate', 9.51, 9.62], ['宮城', 'miyagi', 10.10, 10.11],
    ['秋田', 'akita', 10.01, 10.01], ['山形', 'yamagata', 9.75, 9.75], ['福島', 'fukushima', 9.50, 9.62], ['茨城', 'ibaraki', 9.52, 9.67],
    ['栃木', 'tochigi', 9.82, 9.82], ['群馬', 'gunma', 9.68, 9.77], ['埼玉', 'saitama', 9.67, 9.76], ['千葉', 'chiba', 9.73, 9.79],
    ['東京', 'tokyo', 9.85, 9.91], ['神奈川', 'kanagawa', 9.92, 9.92], ['新潟', 'niigata', 9.21, 9.55], ['富山', 'toyama', 9.59, 9.65],
    ['石川', 'ishikawa', 9.70, 9.88], ['福井', 'fukui', 9.71, 9.94], ['山梨', 'yamanashi', 9.55, 9.89], ['長野', 'nagano', 9.63, 9.69],
    ['岐阜', 'gifu', 9.80, 9.93], ['静岡', 'shizuoka', 9.61, 9.80], ['愛知', 'aichi', 9.93, 10.03], ['三重', 'mie', 9.77, 9.99],
    ['滋賀', 'shiga', 9.88, 9.97], ['京都', 'kyoto', 9.89, 10.03], ['大阪', 'osaka', 10.13, 10.24], ['兵庫', 'hyogo', 10.12, 10.16],
    ['奈良', 'nara', 9.91, 10.02], ['和歌山', 'wakayama', 10.06, 10.19], ['鳥取', 'tottori', 9.86, 9.93], ['島根', 'shimane', 9.94, 9.94],
    ['岡山', 'okayama', 10.05, 10.17], ['広島', 'hiroshima', 9.78, 9.97], ['山口', 'yamaguchi', 10.15, 10.36], ['徳島', 'tokushima', 10.24, 10.47],
    ['香川', 'kagawa', 10.02, 10.21], ['愛媛', 'ehime', 9.98, 10.18], ['高知', 'kochi', 10.05, 10.13], ['福岡', 'fukuoka', 10.11, 10.31],
    ['佐賀', 'saga', 10.55, 10.78], ['長崎', 'nagasaki', 10.06, 10.41], ['熊本', 'kumamoto', 10.08, 10.12], ['大分', 'oita', 10.08, 10.25],
    ['宮崎', 'miyazaki', 9.77, 10.09], ['鹿児島', 'kagoshima', 10.13, 10.31], ['沖縄', 'okinawa', 9.44, 9.44]
  ];
  const KAIGO = { r8: 1.62, old: { '1.59': '令和7年度', '1.6': '令和6年度', '1.82': '令和5年度', '1.64': '令和4年度' } };
  const SHIENKIN = 0.23, KYOSHUTSU = 0.36, PENSION = 18.3, HEALTH_CAP = 1390000, PENSION_CAP = 650000;
  const RANGE = { health: [8.5, 12.5], combined: [10, 14.5], kaigo: [1, 2.5], shienkin: [0.05, 0.6], kyoshutsu: [0.05, 0.6], pension: [14, 20] };

  const KW = [
    ['shienkin', /支援金|shienkin|shien_?kin|kosodate_?shien|child_?support/i],
    ['kyoshutsu', /拠出金|kyoshutsu|kyousyutsu|kyosyutsu|child_?contribution/i],
    ['kaigo', /介護|kaigo|nursing|long_?term_?care|ltc_|care_?insurance/i],
    ['pension', /厚生年金|kosei_?nenkin|kousei|pension|nenkin/i],
    ['health', /健康保険|健保|kenko|kenkou|kenpo|health/i]
  ];
  const CAP = /上限|最高|_max|max_|maximum|ceiling|upper|_cap|cap_/i;
  const EMP = /本人|被保険者|従業員|employee|_ee\b|ee_|worker|折半|half/i;
  const PCT = /percent|pct|パーセント/i;

  function r3(x) { return Math.round(x * 1000) / 1000; }
  function fmt(x) { return String(r3(x)); }
  function prefOf(s) {
    let best = null, pos = 1e9;
    PREFS.forEach(function (p, i) {
      let k = s.indexOf(p[0]);
      if (p[0] === '京都') { const m = /(^|[^東])京都/.exec(s); k = m ? m.index + m[1].length : -1; }
      if (k < 0) { const m = new RegExp('(^|[^a-z])' + p[1] + '(?![a-z])', 'i').exec(s); k = m ? m.index + m[1].length : -1; }
      if (k >= 0 && k < pos) { pos = k; best = i; }
    });
    return best;
  }
  function kindOf(s) {
    const hit = KW.filter(function (k) { return k[1].test(s); }).map(function (k) { return k[0]; });
    if (!hit.length) return null;
    if (hit.indexOf('health') >= 0 && hit.indexOf('kaigo') >= 0 && hit.indexOf('shienkin') < 0) return 'combined';
    return hit[0];
  }
  function stripDates(s) {
    return s.replace(/(19|20)\d\d[-\/.年]\s*\d{1,2}([-\/.月]\s*\d{1,2}日?)?/g, ' ').replace(/(令和|平成|R|H)\s*\d{1,2}\s*[年.]\s*\d{1,2}\s*月?/g, ' ');
  }
  // rate tokens on a line → percent values that fit the kind's plausible range (full or half)
  function rates(s, kind, pctKey) {
    const out = [], rg = RANGE[kind]; if (!rg) return out;
    const re = /(\d+(?:\.\d+)?)\s*(%|％|‰|\/\s*1,?000)?/g; let m;
    const body = stripDates(s.replace(/^[^:=,]*?(?=[:=,])/, function (k) { return k.replace(/\d/g, 'x'); }));
    while ((m = re.exec(body))) {
      const t = parseFloat(m[1]), u = m[2] || '';
      if (u === '' && m[1].indexOf('.') < 0) continue;
      let cands;
      if (/[%％]/.test(u) || pctKey) cands = [t];
      else if (u) cands = [t / 10];
      else cands = t < 1 ? [t * 100, t] : [t];
      for (let i = 0; i < cands.length; i++) {
        const p = r3(cands[i]);
        if ((p >= rg[0] && p <= rg[1]) || (p >= rg[0] / 2 && p <= rg[1] / 2)) { out.push({ p: p, raw: m[0].trim() }); break; }
      }
    }
    return out;
  }
  function ints(s) {
    const out = []; const re = /(\d{1,3}(?:,\d{3})+|\d{5,8})(?![\d.])/g; let m;
    const body = stripDates(s); while ((m = re.exec(body))) out.push(parseInt(m[1].replace(/,/g, ''), 10));
    return out.filter(function (v) { return v >= 100000; });
  }
  function same(p, full) { return p === r3(full) || p === r3(full / 2); }

  function check(text, opts) {
    opts = opts || {};
    const lines = String(text || '').split(/\r?\n/);
    const findings = []; const stack = [];
    let csv = null, firstHealth = 0, hasShienkin = false;
    function add(id, line, msg) { const r = R[id]; findings.push({ check: id, sev: r.sev, msg: r.title + ' — ' + msg + ' (根拠: ' + r.basis + ')', line: line }); }

    function judge(kind, p, raw, pref, emp, lineNo, ctx) {
      const P = pref === null ? null : PREFS[pref];
      if (kind === 'health' || kind === 'combined') {
        if (!firstHealth) firstHealth = lineNo;
        const k = kind === 'combined' ? KAIGO.r8 : 0, k7 = kind === 'combined' ? 1.59 : 0;
        if (P) {
          const now = r3(P[2] + k), old = r3(P[3] + k7);
          if (same(p, now)) return;
          const half = p < RANGE[kind][0];
          const want = fmt(half ? now / 2 : now) + '%';
          if (same(p, old)) add(kind === 'combined' ? 'health-kaigo-combined-stale' : 'health-rate-r7-stale', lineNo, P[0] + ' ' + raw + ' は令和7年度の値。令和8年3月分からは ' + want);
          else add(kind === 'combined' ? 'health-kaigo-combined-stale' : 'health-rate-mismatch', lineNo, P[0] + ' の令和8年度は ' + want + ' (書かれている値 ' + raw + ')');
        } else {
          const anyNow = PREFS.some(function (q) { return same(p, q[2] + k); });
          const oldHit = PREFS.filter(function (q) { return same(p, q[3] + k7); });
          if (!anyNow && oldHit.length) add('health-rate-no-pref', lineNo, raw + ' は令和7年度の ' + oldHit.map(function (q) { return q[0] + ' ' + fmt(q[3] + k7) + '%'; }).join('・') + ' と同じ。令和8年度は ' + oldHit.map(function (q) { return q[0] + ' ' + fmt(q[2] + k) + '%'; }).join('・'));
        }
      } else if (kind === 'kaigo') {
        if (same(p, KAIGO.r8)) return;
        const tag = KAIGO.old[String(p)] || KAIGO.old[String(r3(p * 2))];
        add('kaigo-rate', lineNo, raw + (tag ? ' は' + tag + 'の値' : ' は現行値ではない') + '。令和8年3月分からは 1.62% (折半 0.81%)');
      } else if (kind === 'shienkin') {
        hasShienkin = true;
        if (same(p, KYOSHUTSU)) add('shienkin-kyoshutsu-mixup', lineNo, raw + ' は子ども・子育て拠出金率。支援金は 0.23% (折半 0.115%)');
        else if (emp && p === SHIENKIN) add('shienkin-employee-full', lineNo, '被保険者負担は 0.115%。0.23% は労使合計');
        else if (!same(p, SHIENKIN)) add('shienkin-rate', lineNo, raw + ' ではなく 0.23% (折半 0.115%)');
      } else if (kind === 'kyoshutsu') {
        if (same(p, SHIENKIN)) add('shienkin-kyoshutsu-mixup', lineNo, raw + ' は子ども・子育て支援金率。拠出金は事業主のみ 0.36%');
        else if (p !== KYOSHUTSU) add('kyoshutsu-rate', lineNo, raw + ' ではなく 0.36% (事業主のみ)');
      } else if (kind === 'pension') {
        if (!same(p, PENSION)) add('pension-rate', lineNo, raw + ' ではなく 18.3% (折半 9.15%)');
      }
    }
    function startCheck(s, lineNo) {
      if (/(2026|令和\s*8|R\s*8)\s*[-\/.年]\s*0?[1-3](?!\d)/.test(s) || /(2025|令和\s*7|R\s*7)\s*[-\/.年]\s*\d/.test(s)) add('shienkin-start-month', lineNo, '支援金は令和8年4月分(5月納付分)から。3月分以前の給与からは控除しない');
    }
    function line1(kind, s, pref, emp, pctKey, lineNo) {
      if (!kind) return;
      if (kind === 'shienkin') { hasShienkin = true; startCheck(s, lineNo); }
      if ((kind === 'health' || kind === 'pension' || kind === 'combined') && CAP.test(s)) {
        ints(s).forEach(function (v) {
          if (kind === 'pension' && v !== PENSION_CAP) add('pension-cap', lineNo, '¥' + v.toLocaleString('en-US') + ' ではなく ¥650,000');
          if (kind !== 'pension' && v !== HEALTH_CAP) add('health-cap', lineNo, '¥' + v.toLocaleString('en-US') + ' ではなく ¥1,390,000');
        });
        return;
      }
      rates(s, kind, pctKey).forEach(function (x) { judge(kind, x.p, x.raw, pref, emp, lineNo, s); });
    }

    lines.forEach(function (raw, i) {
      const n = i + 1, s = raw.replace(/\s+#.*$|^\s*#.*$|\s+\/\/.*$/, '');
      if (!s.trim()) return;
      // CSV: a header row with at least two rate columns
      if (i === 0 && s.split(',').length >= 3) {
        const cols = s.split(',').map(function (c) { return { kind: kindOf(c), emp: EMP.test(c), pct: PCT.test(c) || /%|％/.test(c) }; });
        if (cols.filter(function (c) { return c.kind; }).length >= 2) {
          csv = cols; if (cols.some(function (c) { return c.kind === 'shienkin'; })) hasShienkin = true; return;
        }
      }
      if (csv) {
        const cells = s.split(','); const pref = prefOf(s);
        cells.forEach(function (c, j) { const col = csv[j]; if (col && col.kind && c.trim()) line1(col.kind, c + (col.kind === 'shienkin' ? '' : ''), pref, col.emp, col.pct, n); });
        return;
      }
      const ind = s.match(/^\s*/)[0].length;
      while (stack.length && stack[stack.length - 1].ind >= ind) stack.pop();
      const key = (s.split(/[:=]/)[0] || '');
      const own = kindOf(key) || kindOf(s), ownPref = prefOf(s);
      let kind = own, pref = ownPref, emp = EMP.test(s), pctKey = PCT.test(key);
      for (let k = stack.length - 1; k >= 0; k--) {
        if (!kind && stack[k].kind) kind = stack[k].kind;
        if (pref === null && stack[k].pref !== null) pref = stack[k].pref;
        if (stack[k].emp) emp = true;
        if (stack[k].pct) pctKey = true;
      }
      if (/[:=]\s*[\{\[]?\s*$|\{\s*$|\[\s*$/.test(s) || /^\s*-\s*$/.test(s)) stack.push({ ind: ind, kind: own, pref: ownPref, emp: EMP.test(key), pct: PCT.test(key) });
      line1(kind, s, pref, emp, pctKey, n);
    });
    if (firstHealth && !hasShienkin) add('shienkin-missing', firstHealth, '令和8年4月分(5月納付分)から 0.23% (労使折半 0.115%) を控除・納付。標準報酬月額 ¥300,000 なら1人月 ¥690 (本人 ¥345)');
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  const api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, PREFS: PREFS };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.SHAHOENGINE = api;
})();
