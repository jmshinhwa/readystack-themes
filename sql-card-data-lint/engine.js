// SQL Card Data Lint — the one brain. Runs in Node (the extension) and in the browser (the free web page).
'use strict';
(function (root) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : (root.SCD_RULES || []);

  var CARD_TABLE_RE = /\b(pan|card_?number|cc_?number|credit_?card|cardholder|card_?token|card_?ref|card_?fingerprint|card_?data)\b/i;
  var RETENTION_RE = /\b(purge_?after|purge_?at|retain_?until|retention|delete_?after|expires_?at|expire_?at|valid_?until|ttl)\b/i;
  var CREATE_TABLE_RE = /\bcreate\s+(?:or\s+replace\s+)?(?:global\s+temporary\s+)?table\s+(?:if\s+not\s+exists\s+)?[`"\[]?([A-Za-z_][\w$.]*)[`"\]]?/i;
  var ALTER_TABLE_RE = /\balter\s+table\s+[`"\[]?([A-Za-z_][\w$.]*)[`"\]]?/i;
  var INSERT_RE = /\binsert\s+into\s+[`"\[]?([A-Za-z_][\w$.]*)[`"\]]?/i;
  var CREATE_VIEW_RE = /\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\b/i;
  var COL_RE = /^\s*[`"\[]?([A-Za-z_][\w$]*)[`"\]]?\s+/;
  var DIGITS_RE = /\d[\d \-]{11,24}\d/g;

  function rx(src, extra) { return new RegExp(src, 'i' + (extra || '')); }

  function luhn(d) {
    var sum = 0, alt = false;
    for (var i = d.length - 1; i >= 0; i--) {
      var n = d.charCodeAt(i) - 48;
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  function codeOf(line) {
    var i = line.indexOf('--');
    return i >= 0 ? line.slice(0, i) : line;
  }

  function isComment(line) {
    var t = line.replace(/^\s+/, '');
    return t.indexOf('--') === 0 || t.indexOf('#') === 0 || t.indexOf('/*') === 0 || t.indexOf('*') === 0;
  }

  function matchAll(rule, text) {
    var i;
    for (i = 0; i < (rule.all || []).length; i++) if (!rx(rule.all[i]).test(text)) return false;
    for (i = 0; i < (rule.none || []).length; i++) if (rx(rule.none[i]).test(text)) return false;
    return true;
  }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var findings = [];
    var byRule = {};
    var table = null, inTable = false, inView = false;
    var tableStart = 0, tableText = '', tables = 0, cardTables = 0, colCount = 0;

    function push(rule, n, extra) {
      byRule[rule.id] = (byRule[rule.id] || 0) + 1;
      findings.push({
        check: rule.id,
        sev: rule.sev || 'error',
        req: rule.req || '',
        msg: rule.msg + (extra ? ' (' + extra + ')' : ''),
        fix: rule.fix || '',
        line: n
      });
    }

    for (var n = 0; n < lines.length; n++) {
      var raw = lines[n], code = codeOf(raw), lineNo = n + 1;
      var mT = CREATE_TABLE_RE.exec(code);

      if (mT) { table = mT[1]; inTable = true; tableStart = lineNo; tableText = ''; tables++; }
      else if (ALTER_TABLE_RE.test(code)) { table = ALTER_TABLE_RE.exec(code)[1]; }
      else if (INSERT_RE.test(code)) { table = INSERT_RE.exec(code)[1]; }
      else if (/\bcreate\s+(?:unique\s+)?index\b/i.test(code)) {
        var mi = /\bon\s+[`"\[]?([A-Za-z_][\w$.]*)/i.exec(code);
        if (mi) table = mi[1];
      }
      if (CREATE_VIEW_RE.test(code)) { inView = true; table = null; }

      if (inTable) {
        tableText += ' ' + code;
        if (COL_RE.test(code) && !mT) colCount++;
      }

      for (var r = 0; r < RULES.length; r++) {
        var rule = RULES[r];
        if (rule.kind === 'line') {
          if (isComment(raw)) continue;
          if (matchAll(rule, code)) push(rule, lineNo, table ? 'table ' + table : '');
        } else if (rule.kind === 'table_col') {
          if (isComment(raw) || !table) continue;
          if (rx(rule.all[0]).test(table) && matchAll({ all: [rule.all[1]], none: rule.none }, code)) {
            push(rule, lineNo, 'table ' + table);
          }
        } else if (rule.kind === 'view') {
          if (isComment(raw) || !inView) continue;
          if (matchAll(rule, code)) push(rule, lineNo, '');
        } else if (rule.kind === 'luhn') {
          var m, hits = [];
          DIGITS_RE.lastIndex = 0;
          while ((m = DIGITS_RE.exec(raw)) !== null) {
            var d = m[0].replace(/[^0-9]/g, '');
            if (d.length >= 13 && d.length <= 19 && /^[3-6]/.test(d) && luhn(d)) hits.push(d.slice(0, 6) + '…' + d.slice(-4));
          }
          if (hits.length) push(rule, lineNo, hits.join(', '));
        }
      }

      if (inView && /;\s*$/.test(code)) inView = false;

      if (inTable && /^\s*\)/.test(code)) {
        inTable = false;
        if (CARD_TABLE_RE.test(tableText)) {
          cardTables++;
          if (!RETENTION_RE.test(tableText)) {
            for (var q = 0; q < RULES.length; q++) {
              if (RULES[q].kind === 'table') push(RULES[q], tableStart, 'table ' + table);
            }
          }
        }
        tableText = '';
      }
    }

    var errors = 0, warnings = 0;
    for (var f = 0; f < findings.length; f++) {
      if (findings[f].sev === 'error') errors++; else warnings++;
    }

    return {
      findings: findings,
      summary: {
        today: opts.today || '',
        lines: lines.length,
        rules: RULES.length,
        rules_hit: Object.keys(byRule).length,
        tables: tables,
        card_tables: cardTables,
        columns: colCount,
        errors: errors,
        warnings: warnings
      }
    };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.SCDENGINE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
