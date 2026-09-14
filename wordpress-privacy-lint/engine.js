// WordPress Privacy Lint - one brain, used by the VS Code extension and by the free web page.
const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.WPPL_RULES;

function isComment(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('#') || t.startsWith('*') || t.startsWith('/*');
}

function check(text, opts) {
  opts = opts || {};
  const src = String(text == null ? '' : text);
  const lines = src.split(/\r?\n/);
  // code-only view: comment lines blanked so a rule name written in a comment is not a hit
  const code = lines.map(function (l) { return isComment(l) ? '' : l; });
  const codeText = code.join('\n');
  const findings = [];

  RULES.forEach(function (rule) {
    if (rule.mode === 'absent') {
      const trig = new RegExp(rule.trigger, 'i');
      const req = new RegExp(rule.require, 'i');
      if (!trig.test(codeText) || req.test(codeText)) return;
      let at = 1;
      for (let i = 0; i < code.length; i++) { if (trig.test(code[i])) { at = i + 1; break; } }
      findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: at });
      return;
    }
    const pat = new RegExp(rule.pattern, 'i');
    const unless = rule.unless ? new RegExp(rule.unless, 'i') : null;
    for (let i = 0; i < code.length; i++) {
      const l = code[i];
      if (!l || !pat.test(l)) continue;
      if (unless && unless.test(l)) continue;
      findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: i + 1 });
    }
  });

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings };
}

const engine = { check: check };
const RULE_COUNT = RULES.length;

if (typeof module !== 'undefined') module.exports = { engine: engine, RULES: RULES, RULE_COUNT: RULE_COUNT };
if (typeof window !== 'undefined') window.WPPLENGINE = { engine: engine, RULES: RULES, RULE_COUNT: RULE_COUNT };
