/* Belegfelder-Lint für Getränkehandel — Prüfkern.
   Dieselbe Datei läuft in VS Code (require) und im Browser (window). */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined')
    ? require('./rules.json')
    : window.ALK_RULES;

  function rx(src) { return new RegExp(src, 'i'); }

  function firstLine(lines, re, fallback) {
    for (var i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) return i + 1;
    }
    return fallback || 1;
  }

  function toNumber(raw) {
    var s = String(raw).trim();
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/\./g, '').replace(/,/g, '');
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function parseDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '').slice(0, 10));
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  }

  function check(text, opts) {
    opts = opts || {};
    var today = parseDay(opts.today) || parseDay('2026-09-22');
    var src = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
    var lines = src.split('\n');
    var findings = [];

    function add(rule, line, msg) {
      findings.push({ check: rule.id, sev: rule.sev || 'warn', msg: msg || rule.msg, line: line || 1 });
    }

    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];

      if (r.kind === 'doc' || r.kind === 'date_doc') {
        var trig = rx(r.trigger);
        if (!trig.test(src)) continue;
        if (rx(r.need).test(src)) continue;
        var ln = firstLine(lines, trig);
        if (r.kind === 'doc') { add(r, ln); continue; }
        var due = parseDay(r.deadline);
        var days = Math.round((due - today) / 86400000);
        if (days > (r.warn_days || 365)) continue;
        if (days >= 0) add(r, ln, r.msg + ' Noch ' + days + ' Tage bis zum ' + r.deadline + '.');
        else { findings.push({ check: r.id, sev: 'error', msg: r.msg + ' Die Frist ist seit ' + (-days) + ' Tagen abgelaufen.', line: ln }); }
        continue;
      }

      for (var l = 0; l < lines.length; l++) {
        var line = lines[l];

        if (r.kind === 'line') {
          if (rx(r.re).test(line)) add(r, l + 1);
          continue;
        }

        var m = rx(r.re).exec(line);
        if (!m || !m[1]) continue;
        var val = m[1];

        if (r.kind === 'capture_len') {
          if (val.length !== r.len) add(r, l + 1, r.msg + ' Gefunden: ' + val.length + ' Zeichen (' + val + ').');
        } else if (r.kind === 'capture_re') {
          if (!new RegExp(r.ok).test(val)) add(r, l + 1, r.msg + ' Gefunden: ' + val + '.');
        } else if (r.kind === 'capture_num') {
          var n = toNumber(val);
          if (n !== null && n !== r.expect) add(r, l + 1, r.msg + ' Gefunden: ' + val + '.');
        }
      }
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.ALKENGINE = api;
})();
