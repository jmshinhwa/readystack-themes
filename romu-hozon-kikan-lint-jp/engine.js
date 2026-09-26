/* 労務書類 保存期間チェック — engine (Node + browser) */
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.HOZON_RULES;
  var DOCS = RULES.filter(function (r) { return r.check === 'hozon_nensu'; });
  var KISAN = RULES.filter(function (r) { return r.check === 'kisanbi'; })[0];
  var HAIKI = RULES.filter(function (r) { return r.check === 'haiki_yoteibi'; })[0];

  function half(s) { return s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }); }
  function effective(r) { return r.transitional || r.years; }
  function parseYears(s) {
    if (/永年|永久/.test(s)) return Infinity;
    var t = s.replace(/\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}/g, ' ').replace(/\d{4}年\d{1,2}月(\d{1,2}日)?/g, ' ');
    var m = t.match(/(?:^|[^\d])(\d{1,2})\s*年(?![度\d月])/);
    if (m) return +m[1];
    var mo = t.match(/(?:^|[^\d])(\d{1,3})\s*(?:ヶ|か|カ|ケ|箇)月/);
    return mo ? +mo[1] / 12 : null;
  }
  function addYears(d, y) { var x = new Date(d.getTime()); x.setUTCFullYear(x.getUTCFullYear() + y); return x; }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function dates(s) {
    var re = new RegExp(HAIKI.date_re, 'g'), out = [], m;
    while ((m = re.exec(s))) { var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (!isNaN(d)) out.push(d); }
    return out;
  }
  function need(r) { return r.transitional ? r.transitional + '年（原則' + r.years + '年・経過措置' + r.transitional + '年）' : r.years + '年'; }
  function fine(r) { return r.fine ? ' 違反は' + r.fine_basis + 'で罰金' + r.fine + '以下。' : ''; }

  function check(text, opts) {
    opts = opts || {};
    var today = new Date(String(opts.today || new Date().toISOString()).slice(0, 10) + 'T00:00:00Z');
    if (isNaN(today)) today = new Date();
    var lines = half(String(text || '')).split(/\r?\n/), findings = [];
    lines.forEach(function (ln, i) {
      var r = null;
      for (var k = 0; k < DOCS.length; k++) { if (new RegExp(DOCS[k].match).test(ln)) { r = DOCS[k]; break; } }
      if (!r) return;
      var line = i + 1, y = parseYears(ln);
      if (y !== null && y < effective(r)) {
        findings.push({ check: 'hozon_nensu', rule: r.id, sev: 'error', line: line,
          msg: r.doc + ': 保存期間' + (Math.round(y * 10) / 10) + '年は法定' + need(r) + 'より短い（' + r.basis + '）。起算は' + r.kisan + '。' + fine(r) });
      }
      if (KISAN && r.id === KISAN.applies_to && r.kisan_bad && new RegExp(r.kisan_bad).test(ln) && !/退職|死亡|解雇/.test(ln)) {
        findings.push({ check: 'kisanbi', rule: KISAN.id, sev: 'error', line: line,
          msg: r.doc + ': 起算日は' + r.kisan + '（労基則56条）。作成日・入社日から数えると在職中に廃棄期限が来る。' + fine(r) });
      }
      var ds = dates(ln);
      if (ds.length >= 2) {
        var end = addYears(ds[0], effective(r));
        if (ds[1] < end) {
          var days = Math.round((ds[1] - today) / 864e5);
          var when = days <= 0 ? opts.today ? '基準日' + iso(today) + '時点で既に廃棄期日を' + (-days) + '日過ぎている' : '既に廃棄期日を過ぎている' : 'あと' + days + '日で早すぎる廃棄';
          findings.push({ check: 'haiki_yoteibi', rule: HAIKI.id, sev: 'error', line: line,
            msg: r.doc + ': 廃棄予定日' + iso(ds[1]) + 'は法定の保存満了' + iso(end) + '（起算' + iso(ds[0]) + '＋' + effective(r) + '年・' + r.basis + '）より前。' + when + '。' + fine(r) });
        }
      }
    });
    return { findings: findings };
  }

  root.HOZONENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = root.HOZONENGINE;
})();
