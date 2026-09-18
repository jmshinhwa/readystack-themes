// EN 16931 e-Invoice Lint — the brain. Same file runs in Node (the extension) and in the browser (the free web check).
'use strict';
(function (root) {
  var DATA = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : root.EINV_RULES;
  var RULES = (DATA.meta.groups || ['core_terms', 'country_terms', 'invoice_defects', 'date_rules'])
    .reduce(function (all, g) { return all.concat(DATA[g] || []); }, []);
  var COUNTRIES = DATA.countries;

  function rx(s) { return new RegExp(s, 'i'); }
  function lineOf(lines, re) {
    for (var i = 0; i < lines.length; i++) { if (re.test(lines[i])) return i + 1; }
    return 1;
  }
  function days(from, to) { return Math.round((Date.parse(to) - Date.parse(from)) / 86400000); }

  function detectCountry(text) {
    var best = null, bestScore = 0;
    Object.keys(COUNTRIES).forEach(function (cc) {
      var score = 0;
      COUNTRIES[cc].detect.forEach(function (p) { if (rx(p).test(text)) score++; });
      if (score > bestScore) { bestScore = score; best = cc; }
    });
    return best;
  }

  function fill(msg, ctx) {
    return String(msg).replace(/\{(\w+)\}/g, function (m, k) { return (ctx[k] === undefined || ctx[k] === null) ? m : String(ctx[k]); });
  }

  function check(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var today = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today || '')) ? opts.today : new Date().toISOString().slice(0, 10);
    var lines = text.split(/\r?\n/);
    var cc = detectCountry(text);
    var C = cc ? COUNTRIES[cc] : null;
    var base = { country: C ? C.name : 'this country', cius: C ? C.cius : 'the national CIUS', statute: C ? C.statute : 'the national mandate', today: today };
    var findings = [];
    function add(rule, msg, sev, line) {
      findings.push({ check: rule.check, sev: sev || rule.sev || 'error', msg: msg, line: line || 1 });
    }

    if (!text.trim()) return { findings: [], country: cc, today: today, checked: RULES.length, empty: true };

    RULES.forEach(function (rule) {
      if (rule.country && rule.country !== cc) return;

      if (rule.kind === 'term') {
        var hit = rule.any.some(function (p) { return rx(p).test(text); });
        if (!hit) add(rule, fill(rule.msg, base), rule.sev, 1);
        return;
      }
      if (rule.kind === 'pair') {
        var trig = rx(rule['if']);
        if (trig.test(text) && !rx(rule.need).test(text)) add(rule, fill(rule.msg, base), rule.sev, lineOf(lines, trig));
        return;
      }
      if (rule.kind === 'forbid') {
        var bad = rx(rule.re);
        if (bad.test(text)) add(rule, fill(rule.msg, base), rule.sev, lineOf(lines, bad));
        return;
      }
      if (rule.kind === 'mandate') {
        var trg = rx(rule.re);
        if (!trg.test(text) || !C) return;
        var date = C[rule.field];
        var left = days(today, date);
        var ctx = { country: base.country, cius: base.cius, statute: base.statute, today: today, date: date, days_left: left, days_since: -left };
        if (left <= 0) add(rule, fill(rule.msg_live, ctx), rule.sev_live, lineOf(lines, trg));
        else add(rule, fill(rule.msg_before, ctx), rule.sev_before, lineOf(lines, trg));
        return;
      }
      if (rule.kind === 'date_mismatch') {
        if (!C) return;
        var re = new RegExp(rule.re, 'ig'), m, want = C[rule.field];
        while ((m = re.exec(text)) !== null) {
          var found = m[m.length - 1];
          if (found !== want) {
            var ctx2 = { country: base.country, cius: base.cius, statute: base.statute, today: today, date: want, found: found };
            add(rule, fill(rule.msg, ctx2), rule.sev, lineOf(lines, rx(found)));
          }
        }
        return;
      }
      if (rule.kind === 'no_country') {
        if (!cc) add(rule, fill(rule.msg, base), rule.sev, 1);
        return;
      }
    });

    findings.sort(function (a, b) { return (a.line - b.line) || 0; });
    return { findings: findings, country: cc, country_name: base.country, cius: base.cius, statute: base.statute, today: today, checked: RULES.length };
  }

  var API = { engine: { check: check, detectCountry: detectCountry }, RULES: RULES, RULE_COUNT: RULES.length, COUNTRIES: COUNTRIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.EINVENGINE = API;
})(typeof window !== 'undefined' ? window : this);
