/* Payroll Deduction Code Audit — one brain, used by the VS Code extension and by the free web page. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : (root.PDCA_RULES || []);

  var RULE_BY_ID = {};
  for (var r = 0; r < RULES.length; r++) { RULE_BY_ID[RULES[r].id] = RULES[r]; }

  // IRS W-2 Box 12 code letters.
  var BOX12 = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','V','W','Y','Z',
               'AA','BB','DD','EE','FF','GG','HH','II'];
  var DEFERRAL_BOX12 = ['D','E','G','S','H','AA','BB','EE'];
  var PLAN_BASIS = ['125','129','132','401K','403B','457B','408P','501C18D'];

  var RE_ROTH = /roth/i;
  var RE_GARNISH = /garnish|levy|child\s*support|childsup|chld|creditor\s*withhold/i;
  var RE_DEFERRAL = /401\s*\(?k|401k|403\s*\(?b|403b|457\s*\(?b|457b|elective\s*deferral|deferral/i;
  var RE_HSA = /\bhsa\b|health\s*savings/i;

  function flat(s) { return String(s === undefined || s === null ? '' : s).replace(/\s+/g, ' ').trim(); }

  function planYear(opts) {
    var t = flat((opts || {}).today);
    var m = t.match(/(\d{4})/);          // tolerate 2026-09-19, 2026/09/19, "2026-09-19x"
    var y = m ? parseInt(m[1], 10) : NaN;
    if (!y || y < 1990 || y > 2999) { y = new Date().getFullYear(); }
    return y;
  }

  function splitRow(line) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line.charAt(i);
      if (c === '"') { if (q && line.charAt(i + 1) === '"') { cur += '"'; i++; } else { q = !q; } }
      else if (c === ',' && !q) { out.push(cur); cur = ''; }
      else { cur += c; }
    }
    out.push(cur);
    for (var j = 0; j < out.length; j++) { out[j] = flat(out[j]); }
    return out;
  }

  function norm(h) { return h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    var year = planYear(opts);
    var lines = String(text === undefined || text === null ? '' : text).split(/\r\n|\r|\n/);

    function add(id, line, extra) {
      var rule = RULE_BY_ID[id] || { id: id, sev: 'med', msg: id };
      findings.push({ check: id, sev: rule.sev, msg: extra ? rule.msg + ' ' + extra : rule.msg, line: line });
    }

    // 1. locate the header row
    var hIdx = -1, head = null;
    for (var i = 0; i < lines.length; i++) {
      if (!flat(lines[i])) { continue; }
      var cells = splitRow(lines[i]).map(norm);
      if (cells.indexOf('code') >= 0 || cells.indexOf('deduction_code') >= 0) { hIdx = i; head = cells; break; }
      if (hIdx < 0 && i > 4) { break; }
    }
    if (hIdx < 0) { return { findings: findings, rows: 0, ruleCount: RULES.length, planYear: year }; }

    function col(names) {
      for (var n = 0; n < names.length; n++) { var k = head.indexOf(names[n]); if (k >= 0) { return k; } }
      return -1;
    }
    var cCode = col(['code', 'deduction_code']);
    var cDesc = col(['description', 'name', 'label']);
    var cTax = col(['tax_treatment', 'tax', 'treatment', 'pre_tax']);
    var cPlan = col(['plan_basis', 'plan', 'basis', 'plan_type']);
    var cBox = col(['box12', 'w2_box12', 'box_12']);
    var cEr = col(['employer_amount', 'employer', 'er_amount']);
    var cEe = col(['employee_amount', 'employee', 'ee_amount']);
    var cEff = col(['effective_date', 'effective', 'start_date']);
    var cOrd = col(['order', 'priority', 'withholding_order', 'sequence']);

    var seen = {}, rows = 0, sawGarnish = false;

    for (var li = hIdx + 1; li < lines.length; li++) {
      var raw = lines[li];
      if (!flat(raw)) { continue; }
      var f = splitRow(raw);
      var get = function (k) { return k >= 0 && k < f.length ? f[k] : ''; };
      var code = get(cCode);
      if (!code) { continue; }
      rows++;
      var ln = li + 1;
      var desc = get(cDesc);
      var blob = code + ' ' + desc;
      var tax = get(cTax).toLowerCase().replace(/[^a-z]/g, '');   // pre_tax -> pretax
      var isPre = tax === 'pretax' || tax === 'pre' || tax === 'true' || tax === 'yes';
      var plan = get(cPlan).toUpperCase().replace(/[^A-Z0-9]/g, '');
      var box = get(cBox).toUpperCase().replace(/[^A-Z]/g, '');
      var eff = get(cEff);
      var garnish = RE_GARNISH.test(blob);
      if (garnish) { sawGarnish = true; }

      if (RE_ROTH.test(blob) && isPre) { add('roth_marked_pretax', ln, '(' + code + ')'); }
      if (garnish && isPre) { add('garnishment_pretax', ln, '(' + code + ')'); }
      if (!get(cTax)) { add('missing_tax_treatment', ln, '(' + code + ')'); }

      var key = code.toUpperCase();
      if (Object.prototype.hasOwnProperty.call(seen, key)) {
        if (seen[key].tax !== tax) { add('duplicate_code_conflict', ln, '(' + code + ' first seen on line ' + seen[key].line + ')'); }
      } else { seen[key] = { tax: tax, line: ln }; }

      if (isPre && PLAN_BASIS.indexOf(plan) < 0) { add('pretax_without_plan_basis', ln, '(' + code + ')'); }
      if (box && BOX12.indexOf(box) < 0) { add('bad_box12_letter', ln, '(' + code + ' carries ' + box + ')'); }
      if (!box && RE_DEFERRAL.test(blob) && !RE_HSA.test(blob)) { add('deferral_without_box12', ln, '(' + code + ')'); }
      if (RE_HSA.test(blob)) {
        if (box !== 'W') { add('hsa_without_box12_w', ln, '(' + code + ')'); }
        if (!get(cEr)) { add('hsa_no_employer_split', ln, '(' + code + ')'); }
      }
      var ym = eff.match(/(\d{4})/);
      if (!eff) { add('missing_effective_date', ln, '(' + code + ')'); }
      else if (ym && parseInt(ym[1], 10) < year) { add('stale_plan_year', ln, '(' + code + ' is dated ' + eff + ', plan year ' + year + ')'); }
      void cEe; void DEFERRAL_BOX12;
    }

    if (sawGarnish && cOrd < 0) { add('no_withholding_order', hIdx + 1, '(header row has no order column)'); }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, rows: rows, ruleCount: RULES.length, planYear: year };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.PDCAENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
