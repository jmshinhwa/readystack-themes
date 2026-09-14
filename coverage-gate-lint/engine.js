// Coverage Gate Lint — one brain, used by the extension and by the free web page.
const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.CGL_RULES;

// A coverage config is only interesting if it talks about coverage at all.
const SCOPE = /(coverage|codecov|fail_under|coverageThreshold|pytest-cov|nyc|jacoco|lcov|cobertura)/i;

function lines(text) { return String(text == null ? '' : text).split(/\r\n|\r|\n/); }

function lineOf(text, index) {
  return text.slice(0, index).split(/\r\n|\r|\n/).length;
}

function check(text, opts) {
  opts = opts || {};
  const src = String(text == null ? '' : text);
  const findings = [];
  if (!src.trim()) return { findings: findings, scanned: 0, rule_count: RULES.length };

  const rows = lines(src);
  const inScope = SCOPE.test(src);

  for (let i = 0; i < RULES.length; i++) {
    const rule = RULES[i];

    if (rule.kind === 'line') {
      const re = new RegExp(rule.re, 'i');
      for (let n = 0; n < rows.length; n++) {
        const row = rows[n];
        if (/^\s*(#|\/\/)/.test(row)) continue;          // a commented-out gate is not a live gate
        if (!re.test(row)) continue;
        findings.push({ check: rule.check, sev: rule.sev, msg: rule.msg, line: n + 1, fix: rule.fix, text: row.trim() });
      }
      continue;
    }

    if (rule.kind === 'absent') {
      if (!inScope) continue;
      const when = new RegExp(rule.when, 'mi');
      const hit = when.exec(src);
      if (!hit) continue;
      if (new RegExp(rule.missing, 'mi').test(src)) continue;
      findings.push({
        check: rule.check, sev: rule.sev, msg: rule.msg,
        line: lineOf(src, hit.index), fix: rule.fix, text: String(hit[0]).trim()
      });
    }
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings, scanned: rows.length, rule_count: RULES.length, today: opts.today || '' };
}

const _API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') { module.exports = _API; }
if (typeof window !== 'undefined') { window.CGLENGINE = _API; }
