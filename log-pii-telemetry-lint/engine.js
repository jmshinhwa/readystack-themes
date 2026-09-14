'use strict';
// One brain, two homes: require() inside the extension, window.PIILOG_RULES inside the free web page.
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.PIILOG_RULES;

var COMPILED = RULES.map(function (r) {
  var re = null;
  try { re = new RegExp(r.re, r.flags || ''); } catch (e) { re = null; }
  return { id: r.id, sev: r.sev, msg: r.msg, re: re };
});

var engine = {
  check: function (text, opts) {
    opts = opts || {};
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line || line.length > 4000) continue;
      for (var j = 0; j < COMPILED.length; j++) {
        var rule = COMPILED[j];
        if (rule.re && rule.re.test(line)) {
          findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: i + 1 });
        }
      }
    }
    return { findings: findings, rule_count: COMPILED.length, today: opts.today || '' };
  }
};

var API = { engine: engine, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof window !== 'undefined') { window.PIILOGENGINE = API; }
if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
