// Livewire 3 Upgrade Blocker Lint — one brain, two homes (Node extension + browser page).
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.XLW3_RULES;

var LOOP_OPEN = /@(foreach|forelse|for|while)\s*\(/;
var LOOP_CLOSE = /@(endforeach|endforelse|endfor|endwhile)\b/;
var LIVEWIRE_TAG = /<livewire:[a-zA-Z0-9_.\-]+/;
var HAS_KEY = /:key\s*=/;

function stripComment(line) {
  // a rule name inside a comment or a migration note is not a runtime blocker
  return line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\{--[\s\S]*?--\}\}/g, '').replace(/^\s*[*#]\s.*$/, '');
}

function check(text, opts) {
  opts = opts || {};
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var findings = [];
  var depth = 0;
  var i, r, code;
  var compiled = [];
  for (i = 0; i < RULES.length; i++) {
    r = RULES[i];
    compiled.push(r.pattern ? new RegExp(r.pattern) : null);
  }
  for (var ln = 0; ln < lines.length; ln++) {
    code = stripComment(lines[ln]);
    if (!code.trim()) { continue; }
    for (i = 0; i < RULES.length; i++) {
      r = RULES[i];
      if (r.kind === 'loop_key') {
        if (depth > 0 && LIVEWIRE_TAG.test(code) && !HAS_KEY.test(code)) {
          findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: ln + 1, fix: r.fix, excerpt: code.trim().slice(0, 120) });
        }
        continue;
      }
      if (compiled[i] && compiled[i].test(code)) {
        findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: ln + 1, fix: r.fix, excerpt: code.trim().slice(0, 120) });
      }
    }
    if (LOOP_OPEN.test(code)) { depth++; }
    if (LOOP_CLOSE.test(code)) { depth = depth > 0 ? depth - 1 : 0; }
  }
  return { findings: findings, rule_count: RULES.length, today: opts.today || '' };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') { module.exports = API; }
if (typeof window !== 'undefined') { window.XLW3 = API; }
