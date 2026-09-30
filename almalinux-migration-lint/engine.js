/* AlmaLinux migration lint: one engine for VS Code and the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.AL_RULES;
  var COMMENT = /^\s*(#|\/\/|;)/;

  var COMPILED = RULES.map(function (r) {
    return {
      rule: r,
      pats: (r.pats || []).map(function (p) {
        return { re: new RegExp(p.re), near: p.near ? new RegExp(p.near) : null, within: p.within || 0 };
      })
    };
  });

  // A Dockerfile RUN or shell line may continue with "\": join it so an install list reads as one line.
  function logical(lines) {
    var out = [], buf = '', start = 0;
    for (var i = 0; i < lines.length; i++) {
      if (buf === '') start = i;
      var l = lines[i];
      if (/\\\s*$/.test(l) && !COMMENT.test(l)) { buf += l.replace(/\\\s*$/, ' '); continue; }
      out.push({ text: buf + l, line: start + 1, raw: lines.slice(start, i + 1) });
      buf = '';
    }
    if (buf) out.push({ text: buf, line: start + 1, raw: lines.slice(start) });
    return out;
  }

  function lineOf(entry, re) {
    for (var j = 0; j < entry.raw.length; j++) if (re.test(entry.raw[j])) return entry.line + j;
    return entry.line;
  }

  function check(text, opts) {
    var entries = logical(String(text || '').split(/\r?\n/));
    var findings = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i], isComment = COMMENT.test(e.text);
      for (var k = 0; k < COMPILED.length; k++) {
        var r = COMPILED[k].rule;
        if (isComment && !r.any) continue;
        if (r.any && i > 0) continue;
        for (var p = 0; p < COMPILED[k].pats.length; p++) {
          var pat = COMPILED[k].pats[p];
          if (!pat.re.test(e.text)) continue;
          if (pat.near && !pat.near.test(e.text)) {
            var ok = false;
            for (var b = i - 1; b >= 0 && b >= i - pat.within; b--) if (pat.near.test(entries[b].text)) { ok = true; break; }
            if (!ok) continue;
          }
          findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' Fix: ' + r.fix, line: lineOf(e, pat.re) });
          break;
        }
      }
    }
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.ALENGINE = api;
})();
