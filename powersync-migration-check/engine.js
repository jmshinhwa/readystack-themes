/* PowerSync Migration Check engine: finds MongoDB Atlas Device Sync (Realm Sync),
   Atlas Data API and HTTPS Endpoint calls and names the PowerSync replacement. */
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.PSM_RULES;
  var EOL = '2025-09-30';

  function dayNum(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(t) ? null : Math.round(t / 86400000);
  }

  function clock(today) {
    var t = dayNum(today), e = dayNum(EOL);
    if (t === null) return { sev: 'error', tail: ' End-of-life ' + EOL + '.' };
    var d = t - e;
    if (d >= 0) return { sev: 'error', tail: ' Stopped ' + EOL + ' (' + d + ' days before ' + today.slice(0, 10) + ').' };
    return { sev: 'warn', tail: ' Stops ' + EOL + ' (' + (-d) + ' days left).' };
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text || '');
    var flat = src.replace(/\s+/g, ' ');
    var c = clock(opts.today);
    var lines = src.split(/\r?\n/);
    var findings = [];
    RULES.forEach(function (r) {
      if (r.when && !new RegExp(r.when).test(flat)) return;
      var re = new RegExp(r.re, r.flags || '');
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        if (/^\s*(\/\/|\/\*|\*)/.test(ln)) continue;
        if (re.test(ln)) {
          findings.push({ check: r.id, sev: c.sev, line: i + 1,
            msg: r.id + ' ' + r.name + ': ' + r.what + '. PowerSync: ' + r.fix + '.' + c.tail });
        }
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PSMENGINE = API;
})();
