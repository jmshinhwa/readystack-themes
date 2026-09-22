/* MyInvois Field Check — one brain, used by the VS Code extension and by the free web page. */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.MYINVOIS_RULES;
  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  /* ---- MyInvois JSON is UBL 2.1 in its array-of-one form: {"ID":[{"_":"INV-1"}]} ---- */
  function arr(o, k) {
    if (!o) return [];
    var v = o[k];
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  }
  function one(o, k) { return arr(o, k)[0]; }
  function txt(o, k) {
    var n = one(o, k);
    if (n == null) return '';
    if (typeof n === 'object') return n._ == null ? '' : String(n._).trim();
    return String(n).trim();
  }
  function attr(o, k, a) {
    var n = one(o, k);
    return (n && typeof n === 'object' && n[a] != null) ? String(n[a]).trim() : '';
  }
  function lineOf(text, needle) {
    if (!needle) return 1;
    var at = text.indexOf(needle);
    if (at < 0) return 1;
    return text.slice(0, at).split('\n').length;
  }

  function make(id, text, needle, v) {
    var r = BY_ID[id];
    var shown = (v == null || v === '') ? '(empty)' : String(v);
    var body = (r.msg + ' Fix: ' + r.fix).replace(/\{v\}/g, shown);
    return { check: id, sev: r.sev, msg: r.name + ' — ' + body, line: lineOf(text, needle) };
  }

  function partyIds(party) {
    var out = [];
    var list = arr(party, 'PartyIdentification');
    for (var i = 0; i < list.length; i++) {
      var node = one(list[i], 'ID');
      if (!node || typeof node !== 'object') continue;
      out.push({ scheme: String(node.schemeID || '').toUpperCase(), value: node._ == null ? '' : String(node._).trim() });
    }
    return out;
  }
  function idOf(ids, scheme) {
    for (var i = 0; i < ids.length; i++) if (ids[i].scheme === scheme) return ids[i].value;
    return null;
  }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    var doc;
    try { doc = JSON.parse(text); } catch (e) { return { findings: findings }; }
    var inv = one(doc, 'Invoice');
    if (!inv || typeof inv !== 'object') return { findings: findings };  /* not a MyInvois document */

    /* ---- supplier ---- */
    var supplier = one(one(inv, 'AccountingSupplierParty') || {}, 'Party') || {};
    var sIds = partyIds(supplier);
    var tin = idOf(sIds, 'TIN');
    if (tin == null || tin === '') {
      findings.push(make('supplier_tin_missing', text, '"AccountingSupplierParty"', ''));
    } else if (tin === BY_ID.supplier_general_tin.general_tin) {
      findings.push(make('supplier_general_tin', text, tin, tin));
    } else if (!new RegExp(BY_ID.supplier_tin_format.pattern).test(tin)) {
      findings.push(make('supplier_tin_format', text, tin, tin));
    }

    var msic = txt(supplier, 'IndustryClassificationCode');
    if (!/^[0-9]{5}$/.test(msic)) {
      findings.push(make('supplier_msic_code', text, '"IndustryClassificationCode"', msic));
    }
    if (!attr(supplier, 'IndustryClassificationCode', 'name')) {
      findings.push(make('supplier_msic_name', text, '"IndustryClassificationCode"', ''));
    }

    var contact = one(supplier, 'Contact') || {};
    var phone = txt(contact, 'Telephone');
    if (phone.replace(/[^0-9]/g, '').length < 8) {
      findings.push(make('supplier_contact_phone', text, '"Telephone"', phone));
    }

    /* ---- buyer ---- */
    var buyer = one(one(inv, 'AccountingCustomerParty') || {}, 'Party') || {};
    var bIds = partyIds(buyer);
    var second = false;
    for (var b = 0; b < bIds.length; b++) {
      if (['BRN', 'NRIC', 'PASSPORT', 'ARMY'].indexOf(bIds[b].scheme) >= 0 && bIds[b].value) second = true;
    }
    if (!second) findings.push(make('buyer_registration_missing', text, '"AccountingCustomerParty"', ''));

    /* ---- header ---- */
    var typeCode = txt(inv, 'InvoiceTypeCode');
    var typeRule = BY_ID.invoice_type_code;
    if (typeRule.codes.indexOf(typeCode) < 0) {
      findings.push(make('invoice_type_code', text, '"InvoiceTypeCode"', typeCode));
    } else if (typeRule.note_codes.indexOf(typeCode) >= 0) {
      var ref = '';
      var brs = arr(inv, 'BillingReference');
      for (var r0 = 0; r0 < brs.length; r0++) {
        var adr = one(brs[r0], 'AdditionalDocumentReference');
        if (adr) ref = ref || txt(adr, 'ID');
      }
      if (!ref) findings.push(make('note_reference_missing', text, '"InvoiceTypeCode"', typeCode));
    }

    var version = attr(inv, 'InvoiceTypeCode', 'listVersionID');
    if (BY_ID.einvoice_version.versions.indexOf(version) < 0) {
      findings.push(make('einvoice_version', text, '"InvoiceTypeCode"', version));
    } else if (version === '1.1' && !one(inv, 'UBLExtensions')) {
      findings.push(make('signature_missing', text, '"InvoiceTypeCode"', version));
    }

    var cur = txt(inv, 'DocumentCurrencyCode');
    if (!/^[A-Z]{3}$/.test(cur)) {
      findings.push(make('currency_code', text, '"DocumentCurrencyCode"', cur));
    } else if (cur !== 'MYR') {
      var rate = 0;
      var xr = one(inv, 'TaxExchangeRate');
      if (xr) rate = parseFloat(txt(xr, 'CalculationRate')) || 0;
      if (!(rate > 0)) findings.push(make('exchange_rate_missing', text, '"DocumentCurrencyCode"', cur));
    }

    /* ---- lines ---- */
    var lines = arr(inv, 'InvoiceLine');
    var clsRule = BY_ID.line_classification_code;
    var taxRule = BY_ID.line_tax_type_code;
    for (var l = 0; l < lines.length; l++) {
      var lineNo = txt(lines[l], 'ID') || String(l + 1);
      var item = one(lines[l], 'Item') || {};
      var cls = '';
      var ccs = arr(item, 'CommodityClassification');
      for (var c = 0; c < ccs.length; c++) {
        var node = one(ccs[c], 'ItemClassificationCode');
        if (node && typeof node === 'object' && String(node.listID || '').toUpperCase() === 'CLASS') {
          cls = node._ == null ? '' : String(node._).trim();
        }
      }
      var n = /^[0-9]{3}$/.test(cls) ? parseInt(cls, 10) : -1;
      if (!(n >= clsRule.min && n <= clsRule.max)) {
        findings.push(make('line_classification_code', text, '"ItemClassificationCode"', lineNo));
      }
      var cat = '';
      var tts = arr(lines[l], 'TaxTotal');
      for (var t = 0; t < tts.length; t++) {
        var subs = arr(tts[t], 'TaxSubtotal');
        for (var s = 0; s < subs.length; s++) {
          var tc = one(subs[s], 'TaxCategory');
          if (tc) cat = cat || txt(tc, 'ID');
        }
      }
      if (taxRule.codes.indexOf(cat) < 0) {
        findings.push(make('line_tax_type_code', text, '"TaxCategory"', lineNo));
      }
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.MYINVOIS_ENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
