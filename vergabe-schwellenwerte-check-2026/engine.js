/* Vergabe Schwellenwerte Check 2026 — one engine for VS Code and the web page.
   EU thresholds 2026/2027: Delegierte VO (EU) 2025/2150–2152, dynamic via §106 GWB. */
(function () {
  'use strict';
  var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.VS_RULES;
  var CTX = /schwell|threshold|vergabe|auftragswert|gwb|vgv|sektvo|konzvgv|vsvgv|eu-weit|europaweit|oberschwell|unterschwell|\bted\b|eforms/i;
  var SEP = "[.,'’   ]?";

  function numRe(digits) {
    var s = digits, g = [];
    while (s.length > 3) { g.unshift(s.slice(-3)); s = s.slice(0, -3); }
    g.unshift(s);
    return new RegExp("(?<![\\d.,'’])" + g.join(SEP) + "(?!\\d)(?![.,'’]\\d{3}(?!\\d))", 'g');
  }

  function parseDay(v) {
    var m = String(v == null ? '' : v).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(t) ? null : t;
  }

  function daysSince2026(opts) {
    var t = parseDay(opts && opts.today);
    if (t == null) return null;
    var d = Math.round((t - Date.UTC(2026, 0, 1)) / 86400000);
    return d >= 0 ? d : null;
  }

  function fmt(digits) { return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  function check(text, opts) {
    var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    var days = daysSince2026(opts || {});
    var tail = days == null ? '' : ' · seit ' + days + ' Tagen überholt';
    var findings = [];
    var compiled = RULES.map(function (r) {
      if (r.kind === 'stale') return { r: r, re: numRe(r.old) };
      if (r.kind === 'text') return { r: r, re: new RegExp(r.pattern, 'gi') };
      return { r: r, re: /\b(20[0-2]\d)\s*[\/–-]\s*((?:20)?\d{2})\b/g };
    });
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\s+/g, ' ');
      var ctx = [lines[i - 2] || '', lines[i - 1] || '', lines[i]].join(' ');
      var hasCtx = CTX.test(ctx);
      compiled.forEach(function (c) {
        var r = c.r, m;
        c.re.lastIndex = 0;
        if (r.kind === 'stale') {
          if (!hasCtx || !c.re.test(line)) return;
          findings.push({ check: r.id, sev: r.sev, line: i + 1,
            msg: 'Veralteter EU-Schwellenwert ' + fmt(r.old) + ' € (' + r.period + ', ' + r.cls + ') — seit 2026-01-01 gilt ' + r.now + ' € (Delegierte VO (EU) 2025/2150–2152, §106 GWB)' + tail });
        } else if (r.kind === 'period') {
          if (!/schwell|threshold/i.test(ctx)) return;
          while ((m = c.re.exec(line))) {
            var y1 = +m[1], y2 = +m[2].slice(-2) + 2000;
            if (y2 === y1 + 1 && y2 <= 2025) {
              findings.push({ check: r.id, sev: r.sev, line: i + 1, msg: r.msg.replace('{p}', m[1] + '/' + m[2]) + tail });
              break;
            }
          }
        } else if (c.re.test(line)) {
          findings.push({ check: r.id, sev: r.sev, line: i + 1, msg: r.msg });
        }
      });
    }
    return { findings: findings, rule_count: RULES.length, days_since_2026: days };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.VSENGINE = API;
})();
