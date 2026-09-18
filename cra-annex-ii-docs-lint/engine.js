/* CRA Annex II User Docs Lint - engine. Same file runs in Node (VS Code) and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.CRADOCS_RULES;

  var MONTHS = {jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12};
  var SUPPORT_CTX = /(support period|security update|security support|end of support|supported until|patches until)/i;
  var DATE_ISO = /(\d{4})-(\d{2})-(\d{2})/;
  var DATE_DMY = /(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})/;
  var DATE_MDY = /([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function monthNum(w) { return MONTHS[String(w).slice(0, 3).toLowerCase()] || 0; }

  function dateIn(line) {
    var m = DATE_ISO.exec(line);
    if (m) { return m[1] + '-' + m[2] + '-' + m[3]; }
    m = DATE_DMY.exec(line);
    if (m && monthNum(m[2])) { return m[3] + '-' + pad(monthNum(m[2])) + '-' + pad(parseInt(m[1], 10)); }
    m = DATE_MDY.exec(line);
    if (m && monthNum(m[1])) { return m[3] + '-' + pad(monthNum(m[1])) + '-' + pad(parseInt(m[2], 10)); }
    return null;
  }

  function plusYears(iso, n) {
    var p = iso.split('-');
    return (parseInt(p[0], 10) + n) + '-' + p[1] + '-' + p[2];
  }

  function byCheck(name) {
    for (var i = 0; i < RULES.length; i++) { if (RULES[i].check === name) { return RULES[i]; } }
    return null;
  }

  function push(out, rule, line, extra) {
    if (!rule) { return; }
    out.push({check: rule.check, sev: rule.sev, msg: extra ? rule.msg + ' ' + extra : rule.msg, line: line || 1});
  }

  function check(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var today = /^\d{4}-\d{2}-\d{2}$/.test(opts.today || '') ? opts.today : '2026-09-16';
    var lines = text.split(/\r?\n/);
    var findings = [];
    var i, j, k, r, hit, m;

    for (i = 0; i < RULES.length; i++) {
      r = RULES[i];
      if (r.kind === 'require_any') {
        hit = false;
        for (j = 0; j < r.need.length; j++) { if (new RegExp(r.need[j], 'i').test(text)) { hit = true; break; } }
        if (!hit) { push(findings, r, 1); }
      } else if (r.kind === 'require_all') {
        hit = true;
        for (j = 0; j < r.need.length; j++) { if (!new RegExp(r.need[j], 'i').test(text)) { hit = false; break; } }
        if (!hit) { push(findings, r, 1); }
      } else if (r.kind === 'forbid') {
        for (j = 0; j < lines.length; j++) {
          for (k = 0; k < r.need.length; k++) {
            m = new RegExp(r.need[k], 'i').exec(lines[j]);
            if (m) { push(findings, r, j + 1, '(reads "' + String(m[0]).slice(0, 44) + '")'); break; }
          }
        }
      }
    }

    var ctxLine = 0, endDate = null;
    for (j = 0; j < lines.length; j++) {
      if (SUPPORT_CTX.test(lines[j])) {
        if (!ctxLine) { ctxLine = j + 1; }
        var d = dateIn(lines[j]);
        if (d) { endDate = d; ctxLine = j + 1; break; }
      }
    }
    if (!endDate) {
      push(findings, byCheck('support_end_date'), ctxLine);
    } else if (endDate < today) {
      push(findings, byCheck('support_end_expired'), ctxLine, '(found ' + endDate + ', today is ' + today + ')');
    } else if (endDate < plusYears(today, 5)) {
      push(findings, byCheck('support_period_short'), ctxLine, '(ends ' + endDate + ')');
    }

    var errors = 0, warnings = 0;
    for (i = 0; i < findings.length; i++) { if (findings[i].sev === 'error') { errors++; } else { warnings++; } }
    return {findings: findings, ok: findings.length === 0, errors: errors, warnings: warnings,
            rules_checked: RULES.length, support_end_date: endDate, today: today};
  }

  var api = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (typeof window !== 'undefined') { window.CRADOCS = api; }
})();
