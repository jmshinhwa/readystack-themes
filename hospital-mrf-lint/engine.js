/* Hospital Price Transparency MRF Lint - engine
 * One brain, two homes: node (require) and the browser (window).
 * Input: the text of a hospital standard-charges machine-readable file (CMS JSON template).
 * Output: {findings: [{check, sev, msg, line}]}
 */
(function () {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : window.HMRF_RULES;

  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  var TOP = ['hospital_name', 'last_updated_on', 'version', 'hospital_location', 'hospital_address', 'license_information'];
  var TEMPLATE_VERSIONS = ['2.0.0', '2.1.0', '2.2.0'];
  var CODE_TYPES = ['CPT', 'HCPCS', 'ICD', 'DRG', 'MS-DRG', 'APR-DRG', 'APC', 'NDC', 'HIPPS', 'LOCAL', 'EAPG', 'CDT', 'RC', 'TRIS-DRG'];
  var SETTINGS = ['inpatient', 'outpatient', 'both'];
  var METHODS = ['case rate', 'fee schedule', 'percent of total billed charges', 'per diem', 'other'];
  var PLACEHOLDER_TEXT = ['n/a', 'na', 'tbd', 'none', 'unknown', 'call', 'call for price', 'varies', 'see chargemaster'];
  var PLACEHOLDER_NUM = [0, 1, 9999, 99999, 999999, 9999999, 99999999];
  var MAX_AGE_DAYS = 365;

  function splitLines(text) { return String(text).split(/\r?\n/); }

  function lineOfNth(ls, token, nth) {
    var seen = 0;
    for (var i = 0; i < ls.length; i++) {
      if (ls[i].indexOf(token) !== -1) {
        seen++;
        if (seen === nth) return i + 1;
      }
    }
    return 1;
  }

  function lineFrom(ls, start, token, span) {
    var end = Math.min(ls.length, (start - 1) + (span || 60));
    for (var i = Math.max(0, start - 1); i < end; i++) {
      if (ls[i].indexOf(token) !== -1) return i + 1;
    }
    return start;
  }

  function days(from, to) {
    var a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
    var b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to);
    if (!a || !b) return null;
    var u = Date.UTC(+a[1], +a[2] - 1, +a[3]);
    var t = Date.UTC(+b[1], +b[2] - 1, +b[3]);
    return Math.floor((t - u) / 86400000);
  }

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function looksPlaceholderText(v) {
    if (typeof v !== 'string') return false;
    return PLACEHOLDER_TEXT.indexOf(v.trim().toLowerCase()) !== -1;
  }
  function looksPlaceholderNum(v) {
    if (!isNum(v)) return false;
    return PLACEHOLDER_NUM.indexOf(v) !== -1;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = /^\d{4}-\d{2}-\d{2}$/.test(opts.today || '') ? opts.today : '2026-09-17';
    var ls = splitLines(text);
    var out = [];

    function add(id, msg, line) {
      var r = BY_ID[id];
      out.push({ check: id, sev: r ? r.sev : 'warn', msg: msg, line: line || 1 });
    }

    var doc = null;
    try {
      doc = JSON.parse(text);
    } catch (e) {
      add('json_parses', 'File is not valid JSON: ' + String(e.message).replace(/\s+/g, ' ').slice(0, 120), 1);
      return { findings: out };
    }
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      add('json_parses', 'The CMS template is a JSON object with hospital_name at the top level; this file is a ' + (Array.isArray(doc) ? 'bare array' : typeof doc) + '.', 1);
      return { findings: out };
    }

    // 1. top-level fields
    for (var t = 0; t < TOP.length; t++) {
      var k = TOP[t];
      var v = doc[k];
      var empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
      if (empty) add('top_fields', 'Top-level field "' + k + '" is missing or empty.', 1);
    }
    if (doc.license_information && typeof doc.license_information === 'object') {
      if (!doc.license_information.state) {
        add('top_fields', 'license_information has no "state" - CMS wants the licensing state code.', lineOfNth(ls, '"license_information"', 1));
      }
    }

    // 2. version
    if (doc.version !== undefined) {
      if (TEMPLATE_VERSIONS.indexOf(String(doc.version)) === -1) {
        add('version_value', 'version is "' + doc.version + '"; the CMS template versions are ' + TEMPLATE_VERSIONS.join(', ') + '.', lineOfNth(ls, '"version"', 1));
      }
    }

    // 3+4. last_updated_on
    if (doc.last_updated_on !== undefined) {
      var lline = lineOfNth(ls, '"last_updated_on"', 1);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(doc.last_updated_on))) {
        add('updated_format', 'last_updated_on is "' + doc.last_updated_on + '"; the CMS template wants YYYY-MM-DD.', lline);
      } else {
        var age = days(String(doc.last_updated_on), today);
        if (age !== null && age > MAX_AGE_DAYS) {
          add('updated_stale', 'last_updated_on is ' + doc.last_updated_on + ', ' + age + ' days before ' + today + '; 45 CFR 180.50(d)(2) wants an update at least every 365 days.', lline);
        }
      }
    }

    // 5. affirmation
    var aff = doc.affirmation;
    if (!aff || typeof aff !== 'object') {
      add('affirmation', 'No affirmation block - CMS wants the signed statement that the file is true, accurate and complete.', 1);
    } else {
      if (aff.confirm_affirmation !== true) {
        add('affirmation', 'confirm_affirmation is ' + JSON.stringify(aff.confirm_affirmation) + '; it must be the boolean true.', lineFrom(ls, lineOfNth(ls, '"affirmation"', 1), '"confirm_affirmation"', 10));
      }
      if (!aff.affirmation || String(aff.affirmation).trim().length < 20) {
        add('affirmation', 'The affirmation statement text is missing or too short to be the CMS statement.', lineOfNth(ls, '"affirmation"', 1));
      }
    }

    // 6. items
    var items = doc.standard_charge_information;
    if (!Array.isArray(items) || items.length === 0) {
      add('charges_present', 'standard_charge_information is missing or empty - the file publishes no standard charges at all.', 1);
      return { findings: sortFindings(out) };
    }

    var descN = 0, chargeN = 0, payerN = 0;
    for (var ii = 0; ii < items.length; ii++) {
      var it = items[ii] || {};
      descN++;
      var itemLine = lineOfNth(ls, '"description"', descN);
      var label = it.description ? String(it.description).slice(0, 40) : 'item ' + (ii + 1);

      if (!it.description || !String(it.description).trim()) {
        add('charges_present', 'Item ' + (ii + 1) + ' has no plain-language description.', itemLine);
      }
      var codes = Array.isArray(it.code_information) ? it.code_information : [];
      if (codes.length === 0) {
        add('charges_present', '"' + label + '" carries no code_information - every item needs at least one billing code.', itemLine);
      }
      for (var ci = 0; ci < codes.length; ci++) {
        var c = codes[ci] || {};
        if (!c.code) add('charges_present', '"' + label + '" has a code entry with no code value.', itemLine);
        if (!c.type) {
          add('charges_present', '"' + label + '" has code ' + (c.code || '?') + ' with no code type.', itemLine);
        } else if (CODE_TYPES.indexOf(String(c.type).toUpperCase()) === -1) {
          add('code_type', 'Code type "' + c.type + '" on "' + label + '" is not in the CMS value list.', itemLine);
        }
      }
      if (it.drug_information) {
        var d = it.drug_information;
        if (!d.unit || !d.type) {
          add('drug_units', '"' + label + '" has drug_information without both unit and type of measurement.', itemLine);
        }
      }

      var charges = Array.isArray(it.standard_charges) ? it.standard_charges : [];
      if (charges.length === 0) {
        add('gross_and_cash', '"' + label + '" publishes no standard_charges block at all.', itemLine);
      }
      for (var si = 0; si < charges.length; si++) {
        var sc = charges[si] || {};
        chargeN++;
        var scLine = sc.setting !== undefined ? lineOfNth(ls, '"setting"', chargeN) : itemLine;

        if (sc.setting === undefined || SETTINGS.indexOf(String(sc.setting)) === -1) {
          add('setting_enum', '"' + label + '" has setting ' + JSON.stringify(sc.setting) + '; use inpatient, outpatient or both.', scLine);
        }
        if (sc.gross_charge === undefined) {
          add('gross_and_cash', '"' + label + '" has no gross_charge - the gross charge is required for every item.', scLine);
        } else if (!isNum(sc.gross_charge)) {
          add('number_type', 'gross_charge on "' + label + '" is ' + JSON.stringify(sc.gross_charge) + ', a string; the CMS validator wants a number.', lineFrom(ls, scLine, '"gross_charge"', 20));
        } else if (looksPlaceholderNum(sc.gross_charge)) {
          add('placeholder', 'gross_charge on "' + label + '" is ' + sc.gross_charge + ', a placeholder rather than an actual price.', lineFrom(ls, scLine, '"gross_charge"', 20));
        }
        if (sc.discounted_cash === undefined) {
          add('gross_and_cash', '"' + label + '" has no discounted_cash price for self-pay patients.', scLine);
        } else if (looksPlaceholderText(sc.discounted_cash) || looksPlaceholderNum(sc.discounted_cash)) {
          add('placeholder', 'discounted_cash on "' + label + '" is ' + JSON.stringify(sc.discounted_cash) + ', not an actual price.', lineFrom(ls, scLine, '"discounted_cash"', 20));
        } else if (!isNum(sc.discounted_cash)) {
          add('number_type', 'discounted_cash on "' + label + '" is ' + JSON.stringify(sc.discounted_cash) + ', a string; it must be a number.', lineFrom(ls, scLine, '"discounted_cash"', 20));
        }

        var payers = Array.isArray(sc.payers_information) ? sc.payers_information : [];
        for (var pi = 0; pi < payers.length; pi++) {
          var p = payers[pi] || {};
          payerN++;
          var pLine = lineOfNth(ls, '"payer_name"', payerN);
          var who = (p.payer_name || 'unnamed payer') + ' / ' + (p.plan_name || 'unnamed plan');

          if (!p.payer_name || !p.plan_name) {
            add('charges_present', 'A negotiated rate on "' + label + '" is missing payer_name or plan_name.', pLine);
          }
          var hasDollar = p.standard_charge_dollar !== undefined;
          var hasPct = p.standard_charge_percentage !== undefined;
          var hasAlgo = p.standard_charge_algorithm !== undefined;
          if (!hasDollar && !hasPct && !hasAlgo) {
            add('charges_present', who + ' on "' + label + '" carries no dollar, percentage or algorithm rate.', pLine);
          }
          if ((hasPct || hasAlgo) && !isNum(p.estimated_amount)) {
            add('estimated_amount', who + ' is published as a ' + (hasPct ? 'percentage' : 'algorithm') + ' with no estimated_amount in dollars.', pLine);
          }
          if (hasDollar && !isNum(p.standard_charge_dollar)) {
            add('number_type', 'standard_charge_dollar for ' + who + ' is ' + JSON.stringify(p.standard_charge_dollar) + ', not a number.', lineFrom(ls, pLine, '"standard_charge_dollar"', 20));
          }
          if (hasDollar && looksPlaceholderNum(p.standard_charge_dollar)) {
            add('placeholder', 'standard_charge_dollar for ' + who + ' is ' + p.standard_charge_dollar + ', a placeholder rather than the negotiated rate.', lineFrom(ls, pLine, '"standard_charge_dollar"', 20));
          }
          var m = p.methodology;
          if (m === undefined || String(m).trim() === '') {
            add('methodology', 'No standard charge methodology for ' + who + '.', pLine);
          } else if (METHODS.indexOf(String(m).toLowerCase()) === -1) {
            add('methodology', 'Methodology "' + m + '" for ' + who + ' is not one of the five CMS values.', lineFrom(ls, pLine, '"methodology"', 20));
          } else if (String(m).toLowerCase() === 'other' && !(p.additional_payer_notes && String(p.additional_payer_notes).trim())) {
            add('methodology', 'Methodology "other" for ' + who + ' with no additional_payer_notes explaining it.', lineFrom(ls, pLine, '"methodology"', 20));
          }
        }
      }
    }

    return { findings: sortFindings(out) };
  }

  function sortFindings(list) {
    return list.slice().sort(function (a, b) { return (a.line - b.line) || (a.check < b.check ? -1 : 1); });
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.HMRFENGINE = api;
})();
