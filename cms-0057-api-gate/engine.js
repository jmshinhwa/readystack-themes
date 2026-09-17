/* CMS-0057 API Gate - engine
 * Reads a FHIR CapabilityStatement (JSON text) and reports the gaps that stop it
 * from standing as evidence for the four CMS-0057-F APIs due 1 January 2027.
 * Same file runs in Node (extension) and in the browser (free web page).
 */
const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.CMS57_RULES;

const DEADLINE = '2027-01-01';
const STALE_DAYS = 365;
const DAY = 86400000;

function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
}

function lineOf(lines, src) {
  if (!src) return 1;
  let re;
  try { re = new RegExp(src); } catch (e) { return 1; }
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
  return 1;
}

function fill(msg, vals) {
  return String(msg).replace(/\{(\w+)\}/g, function (m, k) {
    return Object.prototype.hasOwnProperty.call(vals, k) ? String(vals[k]) : m;
  });
}

function check(text, opts) {
  opts = opts || {};
  const today = /^\d{4}-\d{2}-\d{2}$/.test(opts.today || '') ? opts.today : '2026-09-16';
  const src = String(text == null ? '' : text);
  const lines = src.split(/\r?\n/);
  const findings = [];
  const push = function (rule, msg, line) {
    findings.push({ check: rule.id, sev: rule.sev, msg: String(msg).replace(/\b1 days\b/g, '1 day'), line: line || 1 });
  };

  RULES.forEach(function (rule) {
    if (rule.kind === 'version') {
      const m = src.match(/"fhirVersion"\s*:\s*"([^"]+)"/);
      const line = lineOf(lines, rule.anchor);
      if (!m) push(rule, rule.msg, lineOf(lines, '"resourceType"'));
      else if (!/^4\.0/.test(m[1])) push(rule, fill(rule.msg_bad, { v: m[1] }), line);
      return;
    }
    if (rule.kind === 'require_any') {
      const hit = (rule.patterns || []).some(function (p) { return new RegExp(p).test(src); });
      if (!hit) push(rule, rule.msg, lineOf(lines, rule.anchor));
      return;
    }
    if (rule.kind === 'forbid') {
      (rule.patterns || []).forEach(function (p) {
        const re = new RegExp(p);
        for (let i = 0; i < lines.length; i++) {
          if (re.test(lines[i])) { push(rule, rule.msg, i + 1); return; }
        }
      });
      return;
    }
    if (rule.kind === 'stale_date') {
      const m = src.match(/"date"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
      if (!m) return;
      const age = daysBetween(m[1], today);
      if (age > STALE_DAYS) push(rule, fill(rule.msg, { d: m[1], n: age }), lineOf(lines, '"date"'));
      return;
    }
    if (rule.kind === 'clock') {
      const errs = findings.filter(function (f) { return f.sev === 'error'; }).length;
      if (!errs) return;
      const left = daysBetween(today, DEADLINE);
      const line = lineOf(lines, rule.anchor);
      if (left >= 0) push(rule, fill(rule.msg, { n: left, e: errs }), line);
      else push(rule, fill(rule.msg_past, { n: -left, e: errs }), line);
    }
  });

  return { findings: findings };
}

const API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.CMS57ENGINE = API;
