/* 源泉徴収 計算チェック — 報酬・料金の源泉徴収を計算するコードを国税庁の式で検査する */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.GENSEN_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.id] = r; });

  var WHT = /gensen|源泉|withhold|holding|\bwht\b/i;          // 源泉徴収の文脈
  var CTAX = /消費税|shohi|shouhi|consumption|\bvat\b|ctax/i;   // 消費税の文脈
  var FUKKO = /fukko|fukkou|復興|reconstruction|surtax/i;
  var R10 = /(^|[^\d.])0\.10?(?![\d])/;                       // 0.1 / 0.10
  var R20 = /(^|[^\d.])0\.20?(?![\d])/;                       // 0.2 / 0.20
  var R2042 = /0\.2042(?![\d])|20\.42\s*%/;
  var OFFSET_BAD = /(^|[^\d_,])10[02][_,]?000(?![\d_,])/;      // 100000 / 102000
  var ROUND = /Math\.round|Math\.ceil|\bround\s*\(|\bceil\s*\(|ROUND_HALF|ROUND_UP|toFixed\s*\(\s*0\s*\)/;
  var RATE_LIT = /0\.1021|0\.2042|102[_,]?100/;
  var F11 = /(^|[^\d.])0\.011(?![\d])|1\.1\s*%/;
  var DEFENSE = /(^|[^\d.])0\.01(?![\d])|防衛|bouei|boei|defen[cs]e/i;
  var GATE27 = /2027|令和\s*9|R0?9\b/;
  var END37 = /2037|令和\s*19|R19\b/;
  var TAXINC = /tax_?included|taxincl|with_?tax|including_?tax|zeikomi|税込|gross_?with/i;
  var SPLIT = /1[_,]?000[_,]?000|100\s*万|102[_,]?100/;

  function isComment(l) { return /^\s*(\/\/|#|\*|\/\*)/.test(l); }

  function check(text, opts) {
    opts = opts || {};
    var today = String(opts.today || new Date().toISOString().slice(0, 10));
    var lines = String(text || '').split(/\r?\n/);
    var all = lines.join('\n');
    var findings = [];
    function add(id, i, extra) {
      var r = BY[id]; if (!r) return;
      var sev = r.sev;
      if (id === 'G06' && today >= '2027-01-01') sev = 'warn';
      findings.push({ check: id, sev: sev, line: i + 1,
        msg: r.title + ' → ' + r.fix + (extra ? ' ' + extra : '') + '（' + r.src + '）', code: lines[i].trim().slice(0, 120) });
    }
    var codeOnly = lines.filter(function (l) { return !isComment(l); }).map(function (l) { return l.replace(/\/\/.*$/, '').replace(/\s#.*$/, ''); }).join('\n');
    var hasGate = GATE27.test(codeOnly), hasDefense = DEFENSE.test(all.replace(/\/\/.*$|#.*$/gm, '')) || /防衛/.test(all);
    lines.forEach(function (l, i) {
      var code = l.replace(/\/\/.*$/, '').replace(/\s#.*$/, '');
      var wht = WHT.test(l) && !(CTAX.test(l) && !/源泉|gensen|withhold/i.test(code));
      if (isComment(l)) {
        if (END37.test(l) && FUKKO.test(l)) add('G08', i);
        return;
      }
      if (wht && R10.test(code) && !/0\.1021/.test(code)) add('G01', i, '例: 報酬¥100,000 なら ¥10,000 ではなく ¥10,210。');
      if (wht && R20.test(code) && !R2042.test(code)) add('G02', i);
      if (R2042.test(code)) {
        var win = lines.slice(Math.max(0, i - 4), i + 5).join('\n');
        if (!SPLIT.test(win)) add('G03', i);
        if (TAXINC.test(code)) add('G09', i);
      }
      if ((R2042.test(code) && OFFSET_BAD.test(code)) || (WHT.test(l) && /(^|[^\d_,])102[_,]?000(?![\d_,])/.test(code))) add('G04', i);
      if (ROUND.test(code) && (wht || RATE_LIT.test(code) || FUKKO.test(l))) add('G05', i);
      if (F11.test(code) && (FUKKO.test(l) || wht)) {
        if (!hasGate) add('G06', i);
        if (!hasDefense) add('G07', i);
      }
      if (END37.test(code) && FUKKO.test(l)) add('G08', i);
      if (!R2042.test(code) && /0\.1021/.test(code) && TAXINC.test(code)) add('G09', i);
    });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.GENSENENGINE = api;
})();
