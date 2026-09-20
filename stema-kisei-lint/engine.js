/* ステマ規制チェック — 判定エンジン
 * 景品表示法5条3号の指定告示「一般消費者が事業者の表示であることを判別することが
 * 困難である表示」(2023-10-01 施行) と消費者庁の運用基準を、記事テキストに当てる。
 * 同じファイルが Node (拡張機能) でも window (無料ウェブ版) でも動く。 */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.STEMA_RULES;

  /* 「事業者の表示だと判別できる語」。ここに当たる語が記事のどこにも無ければ無表記。
     英字だけの Sponsored / #ad は日本語の読み手に伝わらないため、ここには入れない。 */
  var DISCLOSURE = '(広告|ＰＲ|\\bPR\\b|ピーアール|プロモーション|スポンサード|タイアップ|提供[：:])';

  function mk(rule, line) {
    return {
      check: rule.id,
      sev: rule.sev,
      line: line,
      msg: rule.msg + (rule.fix ? '｜直し方: ' + rule.fix : '')
    };
  }

  function firstLine(lines, re) {
    for (var i = 0; i < lines.length; i++) { if (re.test(lines[i])) return i + 1; }
    return 1;
  }

  function check(text, opts) {
    opts = opts || {};
    var head = opts.head_lines || 8;
    var src = String(text == null ? '' : text);
    var lines = src.split(/\r?\n/);
    /* 折り返しで語が切れても doc 単位の判定が崩れないよう、空白を潰した一本の文字列も持つ */
    var flat = src.replace(/\s+/g, ' ');

    var disc = new RegExp(DISCLOSURE);
    var discLine = 0;
    for (var i = 0; i < lines.length; i++) {
      if (disc.test(lines[i])) { discLine = i + 1; break; }
    }
    var hasDisc = disc.test(flat);

    var findings = [];
    RULES.forEach(function (r) {
      var re = new RegExp(r.pattern, r.flags || '');
      var un = r.unless ? new RegExp(r.unless, r.flags || '') : null;

      if (r.kind === 'doc_absent') {
        if (re.test(flat) && !hasDisc) findings.push(mk(r, firstLine(lines, re)));
        return;
      }
      if (r.kind === 'first_late') {
        if (re.test(flat) && discLine > head) findings.push(mk(r, discLine));
        return;
      }
      for (var i = 0; i < lines.length; i++) {
        var L = lines[i];
        if (!re.test(L)) continue;
        if (un && un.test(L)) continue;
        if (r.kind === 'hashtag_buried') {
          var tags = L.match(/#[^\s#]+/g);
          if (!tags || tags.length < (r.min_hashtags || 5)) continue;
        }
        findings.push(mk(r, i + 1));
      }
    });

    findings.sort(function (a, b) { return a.line - b.line || (a.check < b.check ? -1 : 1); });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = API;
  if (typeof window !== 'undefined') window.STEMA_ENGINE = API;
})();
