// Vagrantfile EOL box lint: flags config.vm.box values whose OS is past end of support.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.VEOL_RULES;
  var DAY = 86400000;

  function parseDay(s) {
    var m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(t) ? null : t;
  }

  function todayOf(opts) {
    var t = parseDay(opts && opts.today);
    if (t !== null) return t;
    var n = new Date();
    return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  }

  // box = "x" · box: "x" · :box => "x" · box: x (unquoted, YAML-driven labs)
  var BOX_RE = /(?:^|[\s.{,(:])(?::)?box["']?\s*(?:=>|=|:)\s*["']?([A-Za-z0-9._\/-]+)["']?/;

  function check(text, opts) {
    var today = todayOf(opts);
    var warnDays = (opts && opts.warnDays) || 180;
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var line = raw.replace(/\s+/g, ' ').trim();
      if (!line || line.charAt(0) === '#') continue;
      var code = line.replace(/\s#.*$/, '');
      var bm = BOX_RE.exec(code);
      var box = bm ? bm[1] : null;
      for (var r = 0; r < RULES.length; r++) {
        var rule = RULES[r];
        var re = new RegExp(rule.re, 'i');
        var hit = rule.kind === 'box' ? (box && re.test(box)) : re.test(code);
        if (!hit) continue;
        var eol = parseDay(rule.eol);
        var days = Math.round((today - eol) / DAY);
        var what = rule.kind === 'box' ? 'box "' + box + '" is ' + rule.os : rule.os + ' is used on this line';
        if (days >= 0) {
          findings.push({ check: rule.id, sev: 'error', line: i + 1,
            msg: what + ' - end of support ' + rule.eol + ' (' + days + ' days ago). Fix: ' + rule.fix + '.' });
        } else if (-days <= warnDays) {
          findings.push({ check: rule.id, sev: 'warning', line: i + 1,
            msg: what + ' - end of support ' + rule.eol + ' (in ' + (-days) + ' days). Fix: ' + rule.fix + '.' });
        }
        if (rule.kind === 'box') break;
      }
    }
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VEOLENGINE = api;
})();
