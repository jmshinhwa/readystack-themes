/* Payroll Rate Expiry Lint — one engine, used by the VS Code extension and by the web page. */
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PAYRATE_RULES;

var PAY_KEY = /"(?:wage_base|wagebase|ceiling|threshold|limit|rate|contribution|bracket|deduction|allowance|amount|value)"\s*:/i;

/* Every leaf object literal in the text, with the line it starts on. Strings are skipped
   so a brace inside a quoted value cannot open a block. */
function leafObjects(src) {
  var stack = [], out = [], inStr = false, esc = false;
  for (var i = 0; i < src.length; i++) {
    var c = src[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { if (inStr) esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') {
      if (stack.length) stack[stack.length - 1].hasChild = true;
      stack.push({ start: i, hasChild: false });
    } else if (c === '}') {
      var b = stack.pop();
      if (b && !b.hasChild) out.push({ start: b.start, text: src.slice(b.start, i + 1) });
    }
  }
  return out;
}

function lineOf(src, idx) { return src.slice(0, idx).split('\n').length; }

function check(text, opts) {
  opts = opts || {};
  var today = String(opts.today || '');
  var src = String(text == null ? '' : text);
  var lines = src.split(/\r?\n/);
  var findings = [];

  RULES.forEach(function (r) {
    if (r.kind !== 'value' && r.kind !== 'line') return;
    var re = new RegExp(r.re, r.flags || '');
    var ctx = r.ctx ? new RegExp(r.ctx, 'i') : null;
    lines.forEach(function (ln, i) {
      /* the key that names a statutory figure often sits a line or two above the number,
         so the context test reads a small window, not the single line */
      if (ctx && !ctx.test(lines.slice(Math.max(0, i - 3), i + 4).join('\n'))) return;
      if (re.test(ln)) findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: i + 1 });
    });
  });

  leafObjects(src).forEach(function (b) {
    if (!PAY_KEY.test(b.text)) return;
    var line = lineOf(src, b.start);
    RULES.forEach(function (r) {
      if (r.kind === 'block_missing') {
        if (!new RegExp(r.need).test(b.text)) findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: line });
      } else if (r.kind === 'block_expired') {
        var m = b.text.match(/"(?:valid_to|effective_to|expires|until)"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
        if (m && today && m[1] < today) findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: line });
      } else if (r.kind === 'block_percent') {
        var p = b.text.match(/"(?:rate|percent|pct)"\s*:\s*(\d+(?:\.\d+)?)/);
        if (p && parseFloat(p[1]) > 1 && !/"unit"\s*:/.test(b.text)) {
          findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: line });
        }
      }
    });
  });

  findings.sort(function (a, c) { return a.line - c.line; });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.PAYRATE_ENGINE = API;
