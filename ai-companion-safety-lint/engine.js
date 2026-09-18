// AI Companion Safety Lint - one engine, used by the extension and by the web page.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.AICS_RULES;

  // A prompt file is only held to the "must say" duties if it reads like a companion persona.
  var GATE = "(?:system ?prompt|persona|character card|companion (?:bot|chatbot|ai)|role-?play|you are [^.\\n]{0,60}(?:companion|friend|girlfriend|boyfriend|partner|buddy|character))";

  function rx(src) { return new RegExp(src, 'i'); }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text);
    var lines = src.split(/\r?\n/);
    var findings = [];
    var gate = rx(GATE), gateLine = 0;
    for (var i = 0; i < lines.length && !gateLine; i++) { if (gate.test(lines[i])) gateLine = i + 1; }

    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      var re = rx(rule.pattern);
      var un = rule.unless ? rx(rule.unless) : null;
      if (rule.kind === 'violation') {
        for (var j = 0; j < lines.length; j++) {
          if (!re.test(lines[j])) continue;
          if (un && un.test(lines[j])) continue;
          findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg + ' [' + rule.cite + ']', line: j + 1 });
        }
      } else if (gateLine && !re.test(src)) {
        findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg + ' [' + rule.cite + ']', line: gateLine });
      }
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = API;
  if (typeof window !== 'undefined') window.AICSENGINE = API;
})();
