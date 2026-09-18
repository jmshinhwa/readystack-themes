/* Ingress-NGINX Retirement Lint — one brain, used by the VS Code extension and by the free web page. */
var RULES_DOC = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : window.INGX_RULES;

var RULES = RULES_DOC;

function dayDiff(a, b) {
  var ms = Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z');
  return Math.round(ms / 86400000);
}

function ruleById(id) {
  for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i];
  return null;
}

/* Split the text into YAML documents, keeping each document's first global line number. */
function documents(lines) {
  var docs = [], cur = { start: 0, lines: [] };
  for (var i = 0; i < lines.length; i++) {
    if (/^---\s*$/.test(lines[i])) {
      docs.push(cur);
      cur = { start: i + 1, lines: [] };
    } else {
      cur.lines.push(lines[i]);
    }
  }
  docs.push(cur);
  return docs;
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || '2026-09-17';
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var findings = [];

  /* Per-document rules: the retirement clock and the missing ingressClassName. */
  var clock = ruleById('clock.ingress-nginx-retired');
  var RETIRED_ON = clock.retired_on;
  var klass = ruleById('class.missing-ingressclassname');
  var docs = documents(lines);
  for (var d = 0; d < docs.length; d++) {
    var doc = docs[d], kindLine = -1, hasClassName = false;
    for (var j = 0; j < doc.lines.length; j++) {
      if (/^\s*kind:\s*["']?Ingress["']?\s*(#.*)?$/.test(doc.lines[j])) kindLine = doc.start + j + 1;
      if (/^\s*ingressClassName\s*:\s*\S/.test(doc.lines[j])) hasClassName = true;
    }
    if (kindLine === -1) continue;

    var elapsed = dayDiff(today, RETIRED_ON);
    var when = elapsed >= 0
      ? 'unmaintained for ' + elapsed + ' days (since ' + RETIRED_ON + ')'
      : 'unmaintained in ' + (-elapsed) + ' days (on ' + RETIRED_ON + ')';
    findings.push({
      check: clock.id, sev: clock.sev, line: kindLine,
      msg: clock.msg + ' — ' + when + '. ' + clock.fix
    });

    if (!hasClassName) {
      findings.push({
        check: klass.id, sev: klass.sev, line: kindLine,
        msg: klass.msg + ' — ' + klass.fix
      });
    }
  }

  /* Per-line annotation rules. */
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (/^\s*#/.test(line)) continue;
    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      if (!rule.re) continue;
      if (new RegExp(rule.re).test(line)) {
        findings.push({
          check: rule.id, sev: rule.sev, line: i + 1,
          msg: rule.msg + ' — ' + rule.fix
        });
      }
    }
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.INGXENGINE = API;
