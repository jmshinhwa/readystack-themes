/* Nómina ES: tablas de cotización 2026 — mismo motor en VS Code y en el navegador. */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.NOMINA_RULES;

  // "4.909,50" · "4909.50" · "0,80 %" · "28.30" → número
  function parseNum(raw) {
    if (raw === null || raw === undefined) return null;
    var s = String(raw).replace(/["'%€\s]/g, '');
    var m = s.match(/-?[0-9][0-9.,]*/);
    if (!m) return null;
    s = m[0].replace(/[.,]+$/, '');
    var hasDot = s.indexOf('.') >= 0, hasCom = s.indexOf(',') >= 0;
    if (hasDot && hasCom) s = s.replace(/\./g, '').replace(',', '.');
    else if (hasCom) s = s.replace(',', '.');
    else if (hasDot) { var p = s.split('.'); if (p.length > 2) s = p.join(''); }
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  // Una línea de configuración: clave y valor (YAML plano, JSON, .env, CSV de dos columnas).
  function readLine(line) {
    var t = String(line).replace(/^[\s\-]*/, '');
    if (!t || /^(#|\/\/)/.test(t)) return null;
    var m = t.match(/^["']?([A-Za-z0-9_.\[\]À-ſ-]+)["']?\s*[:=;,]\s*(.+)$/);
    if (!m) return null;
    return { key: m[1].toLowerCase().replace(/[áéíóúüñ]/g, function (c) {
      return { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n' }[c];
    }), value: m[2] };
  }

  function fmt(n) {
    var s = (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
    return s.replace(/,00$/, '').replace(/^(\d)(\d{3}),/, '$1.$2,');
  }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text === null || text === undefined ? '' : text).split(/\r?\n/);
    var findings = [];
    var parsed = [];
    for (var i = 0; i < lines.length; i++) {
      var p = readLine(lines[i]);
      if (p) { p.line = i + 1; parsed.push(p); }
    }
    var esTabla = parsed.some(function (p) { return /cotiza|solidarid|\bmei\b|mei[._]|tope.?maxim|base.?maxim|contingencias/.test(p.key); });
    if (!esTabla) return { findings: findings };

    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      var re = new RegExp(rule.key);
      var hit = false;
      for (var j = 0; j < parsed.length; j++) {
        var row = parsed[j];
        if (!re.test(row.key)) continue;
        hit = true;
        if (rule.kind === 'present') continue;
        var v = parseNum(row.value);
        if (v === null) continue;
        if (rule.kind === 'minYear') {
          if (v < rule.expected) {
            findings.push({ check: rule.check, sev: rule.sev, line: row.line,
              msg: row.key + ' = ' + v + ' → el ejercicio vigente es ' + rule.expected + '. ' + rule.msg + ' [' + rule.cite + ']' });
          }
          continue;
        }
        if (Math.abs(v - rule.expected) > 0.0001) {
          findings.push({ check: rule.check, sev: rule.sev, line: row.line,
            msg: row.key + ' = ' + fmt(v) + ' → 2026: ' + fmt(rule.expected) + (rule.unit ? ' ' + rule.unit : '') + '. ' + rule.msg + ' [' + rule.cite + ']' });
        }
      }
      if (!hit && rule.kind === 'present') {
        findings.push({ check: rule.check, sev: rule.sev, line: 1,
          msg: rule.msg + ' [' + rule.cite + ']' });
      }
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, parseNum: parseNum };
  if (typeof module !== 'undefined') module.exports = API;
  if (typeof window !== 'undefined') window.NOMINAENGINE = API;
})();
