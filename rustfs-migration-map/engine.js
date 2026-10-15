// RustFS Migration Map engine: one line in, one MinIO finding + the RustFS line out.
// The same file runs in VS Code (node) and in the free web page (window).
(function () {
  var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.RUSTFS_RULES;
  var LAST_PUSH = Date.UTC(2026, 3, 24); // minio/minio last push before the archive (GitHub API pushed_at)

  function compiled() {
    return RULES.map(function (r) { return { rule: r, re: new RegExp(r.re, 'i') }; });
  }

  function frozenDays(today) {
    var m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(today || ''));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(t) || t < LAST_PUSH) return null;
    return Math.floor((t - LAST_PUSH) / 86400000);
  }

  function isComment(line) {
    return /^\s*(#|\/\/|\/\*|\*)/.test(line);
  }

  function check(text, opts) {
    opts = opts || {};
    var days = frozenDays(opts.today);
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var rs = compiled();
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim() || isComment(line)) continue;
      for (var j = 0; j < rs.length; j++) {
        if (!rs[j].re.test(line)) continue;
        var r = rs[j].rule;
        var msg = r.msg;
        if (r.sev === 'error' && days !== null && /minio\/minio|dl\.min\.io/i.test(line)) msg += ' (no upstream commit for ' + days + ' days)';
        findings.push({ check: r.id, sev: r.sev, msg: msg + ' -> ' + r.fix, line: i + 1, text: line.trim(), fix: r.fix, source: r.source });
        break;
      }
    }
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.RUSTFSENGINE = api;
})();
