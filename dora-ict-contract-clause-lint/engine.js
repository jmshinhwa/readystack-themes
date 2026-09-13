// DORA Art. 30 ICT contract clause engine. Same file runs in Node and in the browser.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.DORA_RULES;

  function matches(patterns, hay) {
    for (var i = 0; i < patterns.length; i++) {
      if (new RegExp(patterns[i], 'i').test(hay)) return true;
    }
    return false;
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text);
    var lines = src.split('\n');
    var findings = [];
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];
      if (r.mode === 'forbid') {
        for (var l = 0; l < lines.length; l++) {
          if (matches(r.any, lines[l])) {
            findings.push({check: r.id, sev: r.sev, msg: r.msg, line: l + 1});
            break;
          }
        }
      } else if (!matches(r.any, src)) {
        findings.push({check: r.id, sev: r.sev, msg: r.msg, line: 1});
      }
    }
    return {findings: findings};
  }

  var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};
  if (typeof window !== 'undefined') window.DORAENGINE = API;
  if (typeof module !== 'undefined') module.exports = API;
})();
