/* Cybersecurity Container Audit — NIST SP 800-190 hardening engine.
 * Same file runs in VS Code (require) and in the free web page (window globals). */
'use strict';

var RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : window.CH190_RULES;

var RULE_COUNT = RULES.length;

/* DoD Assessment Methodology v1.2.1: a Basic Self-Assessment starts at 110 and
 * subtracts the weight of each NIST SP 800-171 Rev.2 requirement that is not met.
 * A requirement is subtracted once, however many container files reveal it. */
var SCORE_CEILING = 110;
var ASSESSMENT_VALID_YEARS = 3;

function splitLines(text) {
  return String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
}

/* Most recent YAML key that opened a block, so a bare "- SYS_ADMIN" item knows
 * whether it sits under cap_add: or under cap_drop:. */
function contextOf(lines) {
  var out = [], cur = null, i, m;
  for (i = 0; i < lines.length; i++) {
    m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([\s\S]*)$/.exec(lines[i]);
    if (m) cur = m[2].trim() === '' ? m[1] : null;
    out.push(cur);
  }
  return out;
}

function documentKind(lines) {
  var docker = false, compose = false, i, t;
  for (i = 0; i < lines.length; i++) {
    t = lines[i];
    if (/^\s*#/.test(t)) continue;
    if (/^\s*FROM\s+\S/i.test(t)) docker = true;
    if (/^\s*services\s*:\s*$/.test(t) || /^\s*version\s*:\s*["']?\d/.test(t)) compose = true;
  }
  return { docker: docker, compose: compose };
}

function applies(rule, kind) {
  if (rule.kind === 'dockerfile') return kind.docker;
  if (rule.kind === 'compose') return kind.compose;
  return kind.docker || kind.compose;
}

function finding(rule, line) {
  return {
    check: rule.id,
    sev: rule.sev,
    msg: rule.msg,
    line: line,
    ref: rule.ref,
    req: rule.req,
    points: rule.points,
    fix: rule.fix
  };
}

function plusYears(iso, years) {
  var m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  var y = parseInt(m[1], 10) + years;
  return y + '-' + m[2] + '-' + m[3];
}

function check(text, opts) {
  opts = opts || {};
  var lines = splitLines(text);
  var ctx = contextOf(lines);
  var kind = documentKind(lines);
  var findings = [], i, ri, rule, re, no, hit, inCtx;

  for (ri = 0; ri < RULES.length; ri++) {
    rule = RULES[ri];
    if (!applies(rule, kind)) continue;
    re = new RegExp(rule.re, rule.flags || '');
    no = rule.not ? new RegExp(rule.not, rule.flags || '') : null;

    if (rule.mode === 'absent') {
      hit = false;
      for (i = 0; i < lines.length; i++) {
        if (/^\s*#/.test(lines[i])) continue;
        if (re.test(lines[i])) { hit = true; break; }
      }
      if (!hit) findings.push(finding(rule, 1));
      continue;
    }

    for (i = 0; i < lines.length; i++) {
      if (/^\s*#/.test(lines[i])) continue;
      if (no && no.test(lines[i])) continue;
      if (!re.test(lines[i])) continue;
      if (rule.ctx) {
        inCtx = ctx[i] === rule.ctx ||
          new RegExp('^\\s*' + rule.ctx + '\\s*:').test(lines[i]);
        if (!inCtx) continue;
      }
      findings.push(finding(rule, i + 1));
    }
  }

  findings.sort(function (a, b) { return a.line - b.line || (a.check < b.check ? -1 : 1); });

  var weights = {}, points = 0;
  for (i = 0; i < findings.length; i++) {
    if (weights[findings[i].req] === undefined) {
      weights[findings[i].req] = findings[i].points;
      points += findings[i].points;
    }
  }
  var requirements = Object.keys(weights).sort();

  return {
    findings: findings,
    requirements: requirements,
    requirement_count: requirements.length,
    points_at_risk: points,
    score_from_110: SCORE_CEILING - points,
    doc: kind.docker && kind.compose ? 'dockerfile+compose'
       : kind.docker ? 'dockerfile' : kind.compose ? 'compose' : 'unknown',
    rule_count: RULE_COUNT,
    today: opts.today || '',
    assessment_stale_on: plusYears(opts.today, ASSESSMENT_VALID_YEARS)
  };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULE_COUNT };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.CH190ENGINE = API;
