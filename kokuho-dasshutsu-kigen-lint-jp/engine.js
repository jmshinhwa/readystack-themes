// 入退社チェックリストの社会保険 届出期限 lint — ブラウザと VS Code で同じファイルが動く
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.KK_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.topic] = r; });

  var KANJI = { '二十': '20', '十四': '14', '十': '10', '五': '5', '七': '7', '三十': '30' };
  function norm(s) {
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    return s.replace(/(二十|十四|三十|十|五|七)(日|営業日|週間)/g, function (m, k, u) { return KANJI[k] + u; });
  }
  var KOKUHO = /(国民健康保険|国保)/;
  var SHAHO = /(健康保険|厚生年金|社会保険|社保|健保)/;
  function topicOf(s) {
    if (/任意継続/.test(s)) return 'nini';
    if (/被扶養者|扶養(追加|異動|に入れ)/.test(s)) return 'fuyo';
    if (/雇用保険/.test(s)) {
      if (/(喪失|離職|退職|脱退)/.test(s)) return 'koyo_soshitsu';
      if (/(取得|加入|入社|雇入)/.test(s)) return 'koyo_shutoku';
      return null;
    }
    if (KOKUHO.test(s)) {
      if (/(脱退|喪失|抜け|やめ)/.test(s)) {
        if (!/自動では|自動で(は)?(抜けない|脱退しない|脱退されない)/.test(s) && /(自動|不要|しなくて(よい|良い|いい)|必要(は)?(ありません|ない|なし))/.test(s)) return 'kokuho_auto';
        return 'kokuho_dasshutsu';
      }
      if (/(加入|切り?替|取得|入る)/.test(s)) return 'kokuho_kanyu';
      return null;
    }
    if (SHAHO.test(s)) {
      if (/(資格喪失|喪失届)/.test(s)) return 'shaho_soshitsu';
      if (/(資格取得|取得届)/.test(s)) return 'shaho_shutoku';
    }
    return null;
  }
  // 行の中の「N日以内 / N日 / N週間」を日数で返す(日付「4月1日」は除く)
  function daysOf(s) {
    var m = s.match(/(^|[^月\d])(\d{1,3})\s*(営業日|日|週間|か月|ヶ月|カ月|ケ月)/);
    if (!m) return null;
    var n = +m[2];
    return { n: m[3] === '週間' ? n * 7 : /月/.test(m[3]) ? n * 30 : n, raw: m[2] + m[3] };
  }

  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    var prevTopic = null, prevAt = -9;
    var all = norm(String(text || ''));
    function add(r, line, extra) {
      findings.push({ check: r.id, sev: r.sev, line: line,
        msg: r.what + ' — ' + extra + '(' + r.law + ')。直し: ' + r.fix });
    }
    lines.forEach(function (raw, i) {
      var s = norm(raw);
      if (/^\s*$/.test(s)) return;
      var t = topicOf(s);
      if (!t && i - prevAt <= 3 && /(期限|deadline|due|以内|までに)/i.test(s)) t = prevTopic;
      if (t) { prevTopic = t; prevAt = i; }
      if (/保険証/.test(s) && /(発行|交付|届く|届き|待)/.test(s) && !/(資格確認書|マイナ)/.test(s))
        add(BY.hokensho, i + 1, '新しい健康保険証は交付されない。受診はマイナ保険証か資格確認書');
      if (!t) return;
      if (/営業日/.test(s)) add(BY['*'], i + 1, '条文は暦日。「' + (daysOf(s) || { raw: '営業日' }).raw + '」は土日祝の分だけ期限を過ぎる');
      var r = BY[t];
      if (t === 'kokuho_auto') { add(r, i + 1, '「自動」「不要」と書いてあるが、世帯主の届出が要る。未届は条例で¥100,000以下の過料(国民健康保険法 第127条)'); return; }
      if (t === 'koyo_shutoku') {
        if (/翌月\s*10\s*日/.test(s)) return;
        var d0 = daysOf(s);
        if (d0 || /(当月|同月|月末)/.test(s)) add(r, i + 1, '期限は「翌月10日まで」。この行は「' + (d0 ? d0.raw : '当月') + '」');
        return;
      }
      var d = daysOf(s);
      if (d && r.days && d.n !== r.days) {
        var fine = (t === 'kokuho_dasshutsu' || t === 'kokuho_kanyu') ? '。未届は条例で¥100,000以下の過料(国民健康保険法 第127条)'
          : (t === 'shaho_shutoku' || t === 'shaho_soshitsu') ? '。事業主の届出違反は¥500,000以下の罰金(健康保険法 第208条)' : '';
        add(r, i + 1, '期限は' + r.days + '日。この行は「' + d.raw + '」' + fine);
      }
    });
    // 退職の手順なのに、本人向けの切替案内が無い
    var headLine = 0;
    lines.some(function (l, i) { if (/(退職|退社|離職)/.test(l)) { headLine = i + 1; return true; } return false; });
    if (headLine && /(資格喪失|喪失届|離職票)/.test(all)) {
      if (!KOKUHO.test(all)) add(BY.missing_kokuho, headLine, '退職の手順に国保への切替(14日以内)が一行もない');
      if (!/任意継続/.test(all)) add(BY.missing_nini, headLine, '退職の手順に任意継続(20日以内)が一行もない');
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, rules: RULES.length, today: (opts && opts.today) || '' };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.KKENGINE = api;
})();
