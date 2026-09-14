// PQC Deprecation Lint — the brain. Same file runs in Node (VS Code) and in the browser (free web check).
// It answers one question per line: which NIST clock is this algorithm on, and where is that clock now?
'use strict';

var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.PQC_RULES;

// NIST IR 8547 — transition to post-quantum cryptography standards.
// 112-bit-classical public-key (RSA-2048, ECDSA/EdDSA, finite-field DH) is deprecated after 2030,
// and disallowed after 2035. Those two dates are the whole clock.
var DEPRECATED_AFTER = '2030-12-31';
var DISALLOWED_AFTER = '2035-12-31';

function toDay(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000;
}

function daysBetween(a, b) {
  var x = toDay(a), y = toDay(b);
  return (x === null || y === null) ? null : (y - x);
}

// Where the IR 8547 clock stands on `today`, and what that does to the severity.
function phase(today) {
  var t = toDay(today);
  if (t === null) return { stage: 'deprecating', sev: 'warn', note: 'deprecated after ' + DEPRECATED_AFTER + ' (NIST IR 8547)' };
  if (t <= toDay(DEPRECATED_AFTER)) {
    var left = daysBetween(today, DEPRECATED_AFTER);
    return {
      stage: 'deprecating', sev: 'warn',
      note: 'deprecated after ' + DEPRECATED_AFTER + ' — ' + left + ' days from ' + today + ' (NIST IR 8547)'
    };
  }
  if (t <= toDay(DISALLOWED_AFTER)) {
    return {
      stage: 'deprecated', sev: 'error',
      note: 'deprecated since ' + DEPRECATED_AFTER + ', disallowed after ' + DISALLOWED_AFTER + ' (NIST IR 8547)'
    };
  }
  return {
    stage: 'disallowed', sev: 'error',
    note: 'disallowed since ' + DISALLOWED_AFTER + ' — not a plan any more, a finding (NIST IR 8547)'
  };
}

function rx(src, flags) { return new RegExp(src, flags || 'i'); }

// Comment-only lines are advice, not code. A rule should not fire on the sentence telling you to migrate.
function isProse(line) {
  return /^\s*(#|\/\/|\*|--|;)/.test(line);
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || new Date().toISOString().slice(0, 10);
  var ph = phase(today);
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var findings = [];
  var clockHits = 0;

  for (var r = 0; r < RULES.length; r++) {
    var rule = RULES[r];
    if (rule.scope === 'doc') continue;
    var re = rx(rule.re);
    var unless = rule.unless_line ? rx(rule.unless_line) : null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line || isProse(line)) continue;
      if (!re.test(line)) continue;
      if (unless && unless.test(line)) continue;
      var onClock = rule.clock === 'ir8547';
      if (onClock) clockHits++;
      var msg = onClock
        ? (rule.what.charAt(0).toUpperCase() + rule.what.slice(1) + ' — ' + ph.note + '. ' + rule.fix)
        : (rule.msg + ' ' + rule.fix);
      findings.push({
        check: rule.check,
        sev: onClock ? ph.sev : (rule.sev || 'error'),
        msg: msg + ' [' + rule.ref + ']',
        line: i + 1
      });
    }
  }

  // Document-level rules run last: some of them ask whether anything was found at all.
  for (var d = 0; d < RULES.length; d++) {
    var dr = RULES[d];
    if (dr.scope !== 'doc') continue;
    if (dr.needs_findings && !clockHits) continue;
    if (dr.unless_doc && rx(dr.unless_doc).test(text || '')) continue;
    findings.push({
      check: dr.check,
      sev: dr.sev || 'warn',
      msg: dr.msg + ' ' + dr.fix + ' [' + dr.ref + ']',
      line: 1
    });
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return {
    findings: findings,
    today: today,
    stage: ph.stage,
    deprecated_after: DEPRECATED_AFTER,
    disallowed_after: DISALLOWED_AFTER
  };
}

var PQCENGINE = { engine: { check: check, phase: phase }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = PQCENGINE;
else window.PQCENGINE = PQCENGINE;
