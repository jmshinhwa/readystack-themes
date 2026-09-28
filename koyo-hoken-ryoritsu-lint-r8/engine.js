/* 雇用保険料率 lint 令和8年度 — same file runs in VS Code and in the browser */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.KOYO_RULES;
  var EI = /雇用保険|雇保|koyo_?hoken|koyou|koyo|employment[_\s-]?insurance|emp_?ins|\bei_rate/i;
  var OTHER = /健康保険|厚生年金|介護|労災|子ども・子育て|kenpo|kenko|health|pension|nenkin|kaigo|rosai|workers?_?comp/i;
  var AGRI = /農林|水産|清酒|agri|forestry|fishery|sake/i;
  var CONS = /建設|construction|kensetsu/i;
  var GEN = /一般の事業|一般|general|ippan/i;
  var HIST = /令和\s*[1-7１-７]\s*年度|平成|R0?[1-7]\b|FY\s?20(1\d|2[0-5])|20(1\d|2[0-5])年度/i;
  var DATE = /(20\d\d)[-\/.年](\d{1,2})[-\/.月](\d{1,2})/g;
  var CUTOVER = '2026-04-01';
  var byId = {};
  RULES.forEach(function (r) { byId[r.id] = r; });
  var rateRule = { general: byId['ei-rate-stale-general'], agri: byId['ei-rate-stale-agri'], construction: byId['ei-rate-stale-construction'] };

  function norm(n) { return String(Math.round(n * 1000) / 1000).replace(/\.0+$/, ''); }
  // every per-mille value written on the line: 14.5/1000 · 14.5/1,000 · 1000分の14.5 · 14.5‰ · 1.45% · 0.0145
  function rates(line) {
    var out = [], m, s = line.replace(/(\d),(\d{3})/g, '$1$2');
    var re = /(\d+(?:\.\d+)?)\s*\/\s*1000\b|1000\s*分の\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*‰|(\d+(?:\.\d+)?)\s*[%％]|(?:^|[^\d.\/])(0\.0\d{1,4})(?![\d\/])/g;
    while ((m = re.exec(s))) {
      if (m[1] || m[2]) out.push(norm(parseFloat(m[1] || m[2])));
      else if (m[3]) out.push(norm(parseFloat(m[3])));
      else if (m[4]) { var p = parseFloat(m[4]); if (p < 3) out.push(norm(p * 10)); }
      else if (m[5]) out.push(norm(parseFloat(m[5]) * 1000));
    }
    return out;
  }
  function oldDate(text) {
    var m, hit = false; DATE.lastIndex = 0;
    while ((m = DATE.exec(text))) {
      var d = m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
      if (d < CUTOVER) hit = true;
    }
    return hit;
  }
  function yen(n) { return '¥' + Math.round(n).toLocaleString('en-US'); }

  function check(text, opts) {
    opts = opts || {};
    var wage = opts.wage || 300000;
    var lines = String(text || '').split(/\r?\n/), findings = [];
    var inEI = false, industry = 'general', eiIndent = -1;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i], indent = L.search(/\S/);
      if (indent < 0) continue;
      var isComment = /^\s*(#|\/\/|\*|\/\*)/.test(L);
      if (EI.test(L)) { inEI = true; eiIndent = indent; }
      else if (OTHER.test(L) && !isComment) { inEI = false; }
      else if (inEI && indent < eiIndent && !isComment) { inEI = false; }
      if (CONS.test(L)) industry = 'construction';
      else if (AGRI.test(L)) industry = 'agri';
      else if (GEN.test(L)) industry = 'general';
      if (!inEI || isComment) continue;
      var ctx = (lines[i - 2] || '') + ' ' + (lines[i - 1] || '') + ' ' + L;
      var historical = HIST.test(L) || oldDate(ctx);

      var rule = rateRule[industry];
      if (!historical) {
        rates(L).forEach(function (v) {
          var s = rule.stale[v];
          if (!s) return;
          var msg = rule.title + ': ' + v + '/1,000 は' + s[1] + 'です。令和8年4月1日以降は ' + s[0] + '/1,000 (令和8年度の' + rule.title.split(':')[0] + ')。';
          if (/労働者/.test(s[1])) {
            var diff = wage * (parseFloat(v) - parseFloat(s[0])) / 1000;
            msg += ' 月給' + yen(wage) + 'なら労働者負担 ' + yen(wage * parseFloat(v) / 1000) + ' → ' + yen(wage * parseFloat(s[0]) / 1000) + ' (1人あたり月' + yen(diff) + 'の控除しすぎ)。';
          }
          msg += ' 過去分の料率なら、同じ行か直前2行に 2026-04-01 より前の適用開始日を書くと対象外になります。';
          findings.push({ check: rule.id, sev: rule.sev, msg: msg, line: i + 1 });
        });
      }
      if (/(^|\D)6[45](\D|$)/.test(L) && /免除|exempt|menjo|skip|zero|=\s*0\b|:\s*0\b/i.test(L) && !historical) {
        var r = byId['ei-over64-exemption'];
        findings.push({ check: r.id, sev: r.sev, msg: r.title + ': ' + r.msg, line: i + 1 });
      }
      if (/Math\.round\s*\(|\bround\s*\(|ROUND\s*\(/.test(L)) {
        var r2 = byId['ei-rounding-half'];
        findings.push({ check: r2.id, sev: r2.sev, msg: r2.title + ': ' + r2.msg, line: i + 1 });
      }
      if (/(^|\D)20(\D|$)/.test(L) && /時間|hours?|jikan/i.test(L)) {
        var r3 = byId['ei-hours-threshold-2028'];
        findings.push({ check: r3.id, sev: r3.sev, msg: r3.title + ': ' + r3.msg, line: i + 1 });
      }
    }
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.KOYOENGINE = api;
})();
