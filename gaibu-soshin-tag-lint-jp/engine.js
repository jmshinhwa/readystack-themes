/* 外部送信規律（電気通信事業法27条の12）公表事項チェック — 同じ両脳を VS Code と ブラウザで使う */
var RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : window.GSTL_RULES;

function lineAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

function strip(text) {
  // 検出はソース全文、開示の有無は「人が読める本文」だけを見る
  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ');
}

function check(text, opts) {
  opts = opts || {};
  text = String(text == null ? '' : text);
  var prose = strip(text);
  var lines = text.split('\n');
  var findings = [];
  var tagCount = 0;
  var firstTagLine = 0;
  var noticeLine = 0;

  var nm = /外部送信|公表事項/.exec(prose);
  if (nm) {
    for (var i = 0; i < lines.length; i++) {
      if (/外部送信|公表事項/.test(lines[i])) { noticeLine = i + 1; break; }
    }
  }

  RULES.filter(function (r) { return r.kind === 'tag'; }).forEach(function (r) {
    var m = new RegExp(r.detect, 'i').exec(text);
    if (!m) return;
    tagCount++;
    var ln = lineAt(text, m.index);
    if (!firstTagLine || ln < firstTagLine) firstTagLine = ln;
    if (new RegExp(r.disclose, 'i').test(prose)) return;
    findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: ln });
  });

  if (tagCount > 0) {
    RULES.filter(function (r) { return r.kind === 'item'; }).forEach(function (r) {
      if (new RegExp(r.detect, 'i').test(prose)) return;
      findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: noticeLine || firstTagLine || 1 });
    });

    RULES.filter(function (r) { return r.kind === 'struct'; }).forEach(function (r) {
      var ln = noticeLine || firstTagLine || 1;
      var hay = text;
      if (r.when) {
        var m = new RegExp(r.when).exec(text);
        if (!m) return;
        ln = lineAt(text, m.index);
        if (r.scope === 'line') hay = lines[ln - 1] || '';
      }
      if (r.unless && new RegExp(r.unless, 'i').test(r.scope === 'line' ? hay : prose + ' ' + hay)) return;
      findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: ln });
    });
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings, tagCount: tagCount, ruleCount: RULES.length, today: opts.today || '' };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
if (typeof window !== 'undefined') { window.GSTLENGINE = API; }
