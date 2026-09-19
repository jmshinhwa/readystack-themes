/* Consent Proof Record Lint — engine
   One file, two homes: node (require) and the browser (window). */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.CPR_RULES;

  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  var ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

  /* Line of every object opening, with its nesting depth. Strings are skipped
     so a brace inside a value cannot move the count. */
  function objectStarts(text) {
    var out = [], depth = 0, line = 1, inStr = false, esc = false;
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (c === '\n') { line++; continue; }
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === '{') { depth++; out.push({ line: line, depth: depth }); }
      else if (c === '[') { depth++; }
      else if (c === '}' || c === ']') { depth--; }
    }
    return out;
  }

  /* The depth at which exactly `n` objects open is the record level. */
  function recordLines(text, n) {
    var starts = objectStarts(text), d, k, lines;
    for (d = 1; d <= 8; d++) {
      lines = [];
      for (k = 0; k < starts.length; k++) if (starts[k].depth === d) lines.push(starts[k].line);
      if (lines.length === n) return lines;
    }
    lines = [];
    for (k = 0; k < n; k++) lines.push(1);
    return lines;
  }

  function records(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.records)) return data.records;
    if (data && Array.isArray(data.consents)) return data.consents;
    if (data && typeof data === 'object') return [data];
    return [];
  }

  function months(fromISO, toISO) {
    var a = Date.parse(fromISO), b = Date.parse(toISO);
    if (isNaN(a) || isNaN(b)) return null;
    return (b - a) / (1000 * 60 * 60 * 24 * 30.4375);
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || '2026-09-18';
    var findings = [];

    function hit(id, line) {
      var r = BY_ID[id];
      findings.push({ check: id, sev: r.sev, msg: r.article + ' — ' + r.msg, line: line || 1 });
    }

    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return {
        findings: [{
          check: 'parse', sev: 'err', line: 1,
          msg: 'This file is not valid JSON, so no consent record can be read from it: ' + e.message
        }]
      };
    }

    var rows = records(data);
    var lines = recordLines(text, rows.length);

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var ln = lines[i] || 1;

      if (!r.subject_id && !r.subject_ref && !r.device_id) hit('subject_ref', ln);

      var at = r.collected_at || r.timestamp || r.created_at;
      if (!at) hit('collected_at', ln);
      else if (!ISO_UTC.test(String(at))) hit('timestamp_utc', ln);

      var p = r.purposes;
      var keys = (p && typeof p === 'object' && !Array.isArray(p)) ? Object.keys(p) : [];
      if (keys.length < 2) hit('purpose_granularity', ln);

      if (!r.notice_version) hit('notice_version', ln);
      if (!r.notice_text_hash) hit('notice_text_hash', ln);

      var pre = r.prechecked_defaults === true || r.default_on === true;
      if (!pre && p && typeof p === 'object') {
        for (var k = 0; k < keys.length; k++) {
          var v = p[keys[k]];
          if (v && typeof v === 'object' && v.granted === true && v.user_action === false) pre = true;
        }
      }
      if (pre) hit('prechecked_default', ln);

      if (!r.withdrawal_method) hit('withdrawal_method', ln);
      if (!r.controller) hit('controller_identity', ln);

      var exp = r.expires_at || r.expiry;
      if (!exp) hit('consent_expiry', ln);
      else {
        if (at) {
          var m = months(at, exp);
          if (m !== null && m > 13) hit('expiry_too_long', ln);
        }
        if (Date.parse(exp) < Date.parse(today + 'T00:00:00Z')) hit('already_expired', ln);
      }

      var basis = r.legal_basis || r.basis;
      if (basis && String(basis).toLowerCase() !== 'consent') hit('legal_basis', ln);

      var tcf = r.tcf || {};
      var tcString = tcf.tc_string || r.tc_string;
      var cmpId = tcf.cmp_id || r.cmp_id;
      if (tcString && !cmpId) hit('tcf_pair', ln);
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.CPRENGINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
