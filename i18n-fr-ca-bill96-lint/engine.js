/* i18n fr-CA Lint — Quebec Bill 96 / OQLF francization checks for a French-Canadian locale file.
   Same file runs in Node (VS Code extension) and in the browser (free web page). */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.FRCA_RULES;

  var ACCENT = /[àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ]/;
  var LETTER = 'A-Za-z0-9\\u00C0-\\u017F';
  var IN_FORCE = '2025-06-01';   // amended Charter of the French Language fully in force

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function wordRe(term) {
    return new RegExp('(^|[^' + LETTER + '])(' + esc(term) + ')([^' + LETTER + ']|$)', 'i');
  }

  function unescapeJson(s) {
    return s.replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  // Pull every JSON string value out of the text with the line it sits on.
  function entries(text) {
    var out = [], lines = String(text == null ? '' : text).split(/\r?\n/);
    var kv = /"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/;
    var bare = /^\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/;
    for (var i = 0; i < lines.length; i++) {
      var m = kv.exec(lines[i]);
      if (m) { out.push({ line: i + 1, key: unescapeJson(m[1]), value: unescapeJson(m[2]) }); continue; }
      var b = bare.exec(lines[i]);
      if (b) out.push({ line: i + 1, key: '', value: unescapeJson(b[1]) });
      else {
        var empty = /"((?:[^"\\]|\\.)*)"\s*:\s*""\s*,?\s*$/.exec(lines[i]);
        if (empty) out.push({ line: i + 1, key: unescapeJson(empty[1]), value: '' });
      }
    }
    return out;
  }

  // Only a French locale resource is linted — a random JSON file stays silent.
  function looksFrench(text, rows) {
    if (rows.length < 2) return false;
    if (/"(@@locale|locale|lang|language)"\s*:\s*"\s*fr/i.test(text)) return true;
    if (/fr[-_]CA|fr[-_]FR/i.test(text)) return true;
    var acc = 0;
    for (var i = 0; i < rows.length; i++) if (ACCENT.test(rows[i].value)) acc++;
    return acc >= 2;
  }

  function ruleById(id) {
    for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i];
    return null;
  }

  function fmt(msg, a, b) {
    return msg.replace('%s', a).replace('%s', b);
  }

  function isLocaleKey(key) {
    return /^(@@locale|locale|lang|language|_locale|localeIdentifier)$/i.test(key);
  }

  function check(text, opts) {
    opts = opts || {};
    var rows = entries(text);
    var findings = [];
    if (!looksFrench(String(text == null ? '' : text), rows)) {
      return { findings: findings, entries: rows.length, in_force: IN_FORCE, days_in_force: daysSince(opts.today) };
    }

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i], v = row.value, r, m, j;

      // 1 — France-French term
      r = ruleById('fr-fr-term');
      if (r) for (j = 0; j < r.pairs.length; j++) {
        m = wordRe(r.pairs[j][0]).exec(v);
        if (m) { push(findings, r, fmt(r.msg, m[2], r.pairs[j][1]), row.line); break; }
      }

      // 2 — English string left in the French file
      r = ruleById('english-left');
      if (r && !isLocaleKey(row.key) && v.length >= r.min_len && !ACCENT.test(v)) {
        var hits = 0;
        for (j = 0; j < r.stopwords.length; j++) if (wordRe(r.stopwords[j]).test(v)) hits++;
        if (hits >= r.min_hits) push(findings, r, r.msg, row.line);
      }

      // 3, 4, 5, 7 — plain regex rules on the value
      ['euro-currency', 'date-slash', 'number-separator', 'empty-or-todo'].forEach(function (id) {
        var rr = ruleById(id);
        if (!rr) return;
        if (id === 'empty-or-todo' && isLocaleKey(row.key)) return;
        if (id === 'empty-or-todo' && row.key === '') return;
        if (new RegExp(rr.re, 'i').test(v)) push(findings, rr, rr.msg, row.line);
      });

      // 6 — accent stripped from a capital
      r = ruleById('caps-accent');
      if (r) for (j = 0; j < r.caps.length; j++) {
        if (wordRe(r.caps[j][0]).test(v)) { push(findings, r, fmt(r.msg, r.caps[j][0], r.caps[j][1]), row.line); break; }
      }

      // 8 — locale tag must resolve fr-CA
      r = ruleById('locale-tag');
      if (r && isLocaleKey(row.key) && new RegExp(r.re, 'i').test(v.trim())) push(findings, r, r.msg, row.line);

      // 9 — anglicism
      r = ruleById('anglicism');
      if (r) for (j = 0; j < r.pairs.length; j++) {
        m = wordRe(r.pairs[j][0]).exec(v);
        if (m) { push(findings, r, fmt(r.msg, m[2], r.pairs[j][1]), row.line); break; }
      }
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, entries: rows.length, in_force: IN_FORCE, days_in_force: daysSince(opts.today) };
  }

  function daysSince(today) {
    if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
    var a = Date.parse(IN_FORCE + 'T00:00:00Z'), b = Date.parse(today + 'T00:00:00Z');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  function push(findings, rule, msg, line) {
    findings.push({ check: rule.id, sev: rule.sev, msg: rule.title + ' — ' + msg, line: line });
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.FRCAENGINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
