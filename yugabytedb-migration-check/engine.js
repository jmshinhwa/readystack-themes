// YugabyteDB migration check: CockroachDB SQL that YSQL rejects or reads differently.
// Same file runs in node (VS Code) and in the browser (index.html).
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.YB_RULES;
  var LICENCE_DAY = Date.UTC(2024, 10, 18); // CockroachDB 24.3.0, new licence

  // Blank comments and string literals char-for-char, so offsets and line numbers survive
  // and a regex with \s+ can still span hard-wrapped statements.
  function blank(text) {
    var out = text.split(''), i = 0, n = text.length;
    function wipe(a, b) { for (var k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; }
    while (i < n) {
      var c = text[i], d = text[i + 1];
      if (c === '-' && d === '-') { var e = text.indexOf('\n', i); if (e < 0) e = n; wipe(i, e); i = e; }
      else if (c === '/' && d === '*') { var f = text.indexOf('*/', i + 2); f = f < 0 ? n : f + 2; wipe(i, f); i = f; }
      else if (c === "'") {
        var j = i + 1;
        while (j < n) { if (text[j] === "'" && text[j + 1] === "'") j += 2; else if (text[j] === "'") break; else j++; }
        wipe(i + 1, j); i = j + 1;
      } else i++;
    }
    return out.join('');
  }

  function lineAt(text, idx) { var l = 1; for (var k = 0; k < idx; k++) if (text.charCodeAt(k) === 10) l++; return l; }

  function dayTail(today) {
    var m = String(today || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(t)) return '';
    var days = Math.round((t - LICENCE_DAY) / 86400000);
    return days >= 0 ? ' (' + m[0] + ' is ' + days + ' days after 2024-11-18)' : '';
  }

  function imageCovered(tag) {
    if (/^latest$/i.test(tag)) return true;
    var v = tag.replace(/^v/i, '').split('.');
    var major = +v[0], minor = +v[1];
    return major > 23 || (major === 23 && minor >= 1);
  }

  function check(text, opts) {
    text = String(text || '');
    opts = opts || {};
    var sql = blank(text), tail = dayTail(opts.today), findings = [];
    RULES.forEach(function (r) {
      var re = new RegExp(r.pattern, 'gi'), src = r.scope === 'image' ? text : sql, m;
      while ((m = re.exec(src)) !== null) {
        if (m[0] === '') { re.lastIndex++; continue; }
        var lead = m[0].search(/[^,(\s]/);
        var line = lineAt(src, m.index + (lead > 0 ? lead : 0));
        if (r.scope === 'image') {
          var raw = text.split('\n')[line - 1] || '';
          if (/^\s*(#|--)/.test(raw) || !imageCovered(m[1])) continue;
        }
        var msg = r.msg + (r.id.indexOf('licence') === 0 ? tail : '') + ' -> ' + r.fix;
        findings.push({ check: r.id, sev: r.sev, msg: msg, line: line, fix: r.fix });
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.YBENGINE = API;
})();
