/*
 * SBOM Field Check for CRA 2026 - engine
 *
 * One brain, two homes: Node (the VS Code extension) and the browser (the free web page).
 * Input  : the text of a CycloneDX / SPDX SBOM (JSON, JSON-LD or SPDX tag-value)
 * Output : {findings: [{check, sev, msg, line, fix?}]}
 *
 * Two passes, in this order:
 *   1. structure - if the text parses as a JSON object, every rules.json entry with a "json" block is
 *      evaluated against the document (doc · ver · each · each_bad). Not JSON = this pass is skipped.
 *   2. lines     - every line is tested against every rule with a "pattern"
 *      (rules.json + opts.extraRules + the keyed rules feed); one finding per (line, rule) match.
 */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SBOM_RULES;
  var JRULES = RULES.filter(function (r) { return r && r.json; });

  function feedRules() {
    var f = (typeof globalThis !== 'undefined') ? globalThis.__yjFeed : null;
    return (f && Array.isArray(f.rules)) ? f.rules : [];
  }

  function ruleId(r, idx) {
    if (r && r.id) return r.id;
    return idx < RULES.length ? 'sbom_' + (idx + 1) : 'custom_' + (idx - RULES.length + 1);
  }

  function jHas(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return true;
  }
  function jVal(o, p) {
    var parts = String(p).split('.'), cur = o, i, k, got;
    for (i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      if (Array.isArray(cur)) {                       // a list: ask each item for the rest of the path
        for (k = 0; k < cur.length; k++) {
          got = jVal(cur[k], parts.slice(i).join('.'));
          if (jHas(got)) return got;
        }
        return undefined;
      }
      if (typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  function jAny(o, paths) {
    for (var i = 0; i < (paths || []).length; i++) { if (jHas(jVal(o, paths[i]))) return true; }
    return false;
  }
  function jNum(s) {
    var m = String(s === undefined || s === null ? '' : s).match(/(\d+(?:\.\d+)*)/);
    return m ? m[1].split('.').map(Number) : null;
  }
  function jCmp(a, b) {
    for (var i = 0; i < Math.max(a.length, b.length); i++) {
      var x = a[i] || 0, y = b[i] || 0;
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }
  function jWhen(doc, w) {
    if (!w) return true;
    var v = jVal(doc, w.path);
    if (w.eq !== undefined) return String(jHas(v) ? v : '').toLowerCase() === String(w.eq).toLowerCase();
    if (w.has !== undefined) {
      var s = Array.isArray(v) ? v.join(' ') : String(jHas(v) ? v : '');
      return s.toLowerCase().indexOf(String(w.has).toLowerCase()) >= 0;
    }
    return jHas(v);
  }
  function jList(doc, j) {
    var arr = jVal(doc, j.list);
    if (!Array.isArray(arr)) return [];
    if (!j.filter) return arr;
    return arr.filter(function (e) {
      var v = jVal(e, j.filter.path);
      var s = Array.isArray(v) ? v.join(' ') : String(jHas(v) ? v : '');
      return s.toLowerCase().indexOf(String(j.filter.has).toLowerCase()) >= 0;
    });
  }
  function jLine(raw, needle) {
    if (!needle) return 1;
    var s = String(raw), i = s.indexOf(JSON.stringify(String(needle)));
    if (i < 0) i = s.indexOf(String(needle));
    if (i < 0) return 1;
    return s.slice(0, i).split(/\r?\n/).length;
  }
  function jName(e) {
    if (!e || typeof e !== 'object') return '';
    return String(e.name || e.packageName || e['bom-ref'] || e.bomRef || e.SPDXID || e.spdxId || '');
  }

  // returns null when the text is not a JSON object (then only the line rules run)
  function analyzeJson(raw) {
    var doc;
    try { doc = JSON.parse(raw); } catch (e) { return null; }
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
    var hits = [], i, r, j, id;
    for (i = 0; i < JRULES.length; i++) {
      r = JRULES[i]; j = r.json || {}; id = ruleId(r, RULES.indexOf(r));
      if (!jWhen(doc, j.when)) continue;
      if (j.kind === 'doc') {
        if (!jAny(doc, j.paths)) hits.push({ check: id, line: 1, msg: r.message, sev: r.sev || 'warn' });
      } else if (j.kind === 'ver') {
        var got = jNum(jVal(doc, j.path)), min = jNum(j.min);
        if (!got) hits.push({ check: id, line: 1, msg: r.message + ' — found: none', sev: r.sev || 'error' });
        else if (jCmp(got, min) < 0) hits.push({ check: id, line: jLine(raw, j.path),
          msg: r.message + ' — found: ' + got.join('.'), sev: r.sev || 'error' });
      } else if (j.kind === 'each' || j.kind === 'each_bad') {
        var arr = jList(doc, j), miss = [], k, e, v, sv;
        for (k = 0; k < arr.length; k++) {
          e = arr[k];
          if (j.kind === 'each') { if (!jAny(e, j.paths)) miss.push(e); }
          else {
            v = jVal(e, j.path);
            sv = jHas(v) ? String(v).trim().toLowerCase() : '';
            if ((j.bad || []).indexOf(sv) >= 0) miss.push(e);
          }
        }
        if (miss.length) {
          var ex = miss.slice(0, 4).map(jName).filter(Boolean);
          hits.push({ check: id, line: jLine(raw, jName(miss[0])),
            msg: r.message + ' — ' + miss.length + ' of ' + arr.length
                 + (ex.length ? ' (e.g. ' + ex.join(', ') + ')' : ''),
            sev: r.sev || 'error' });
        }
      }
    }
    return hits;
  }

  function check(text, opts) {
    opts = opts || {};
    var extra = Array.isArray(opts.extraRules) ? opts.extraRules : [];
    var rules = RULES.concat(extra, feedRules());
    var lines = String(text).split(/\r?\n/);
    var findings = JRULES.length ? (analyzeJson(text) || []) : [];
    var i, r, re;

    for (i = 0; i < lines.length; i++) {
      for (r = 0; r < rules.length; r++) {
        if (!rules[r] || !rules[r].pattern) continue;   // structure rules carry no pattern
        try { re = new RegExp(rules[r].pattern, rules[r].flags || ''); } catch (e) { continue; }
        if (!re.test(lines[i])) continue;
        findings.push({
          check: ruleId(rules[r], r),
          line: i + 1,
          msg: rules[r].message,
          fix: rules[r].fix || null,
          sev: rules[r].sev || 'warn'
        });
      }
    }
    return {findings: findings};
  }

  var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};

  if (typeof module !== 'undefined') { module.exports = API; }
  if (typeof window !== 'undefined') { window.SBOMENGINE = API; }
})();
