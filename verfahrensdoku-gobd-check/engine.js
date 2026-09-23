// Verfahrensdokumentation Check (GoBD, §147 AO) — shared brain: Node + browser.
const RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : window.VFD_RULES;

const RULE_COUNT = RULES.length;

function monthsBetween(fromIso, toIso) {
  const a = new Date(fromIso + 'T00:00:00Z'), b = new Date(toIso + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return 0;
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) m -= 1;
  return m;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function firstMatch(text, source) {
  const re = new RegExp(source, 'i');
  const m = re.exec(text);
  return m ? { m: m, line: lineOf(text, m.index) } : null;
}

function allMatches(text, source) {
  const re = new RegExp(source, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ m: m, line: lineOf(text, m.index) });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

function check(text, opts) {
  opts = opts || {};
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const src = String(text || '');
  const findings = [];
  const fired = {};

  RULES.forEach(function (rule) {
    if (rule.skipIf && fired[rule.skipIf]) return;

    if (rule.kind === 'require') {
      if (!firstMatch(src, rule.re)) {
        findings.push({ check: rule.id, sev: rule.sev, msg: rule.title + ' — ' + rule.msg + ' [' + rule.ref + ']', line: 1 });
        fired[rule.id] = true;
      }
      return;
    }

    if (rule.kind === 'forbid') {
      allMatches(src, rule.re).forEach(function (hit) {
        findings.push({ check: rule.id, sev: rule.sev, msg: rule.title + ' — ' + rule.msg + ' [' + rule.ref + ']', line: hit.line });
        fired[rule.id] = true;
      });
      return;
    }

    if (rule.kind === 'stale') {
      const hit = firstMatch(src, rule.re);
      if (!hit || !hit.m[1]) return;                // VFD-06 already reports a missing date
      const age = monthsBetween(hit.m[1], today);
      if (age > rule.months) {
        findings.push({
          check: rule.id, sev: rule.sev, line: hit.line,
          msg: rule.title + ' — Stand ' + hit.m[1] + ', das sind ' + age + ' Monate. ' + rule.msg + ' [' + rule.ref + ']'
        });
        fired[rule.id] = true;
      }
    }
  });

  findings.sort(function (a, b) { return a.line - b.line || a.check.localeCompare(b.check); });
  return { findings: findings };
}

const engine = { check: check };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { engine: engine, RULES: RULES, RULE_COUNT: RULE_COUNT };
} else {
  window.VFDENGINE = { engine: engine, RULES: RULES, RULE_COUNT: RULE_COUNT };
}
if (typeof window !== 'undefined') window.VFDENGINE = { engine: engine, RULES: RULES, RULE_COUNT: RULE_COUNT };
