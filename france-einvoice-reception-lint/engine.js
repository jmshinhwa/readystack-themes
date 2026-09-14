// France E-Invoice Reception Lint — the brain. Same file runs in Node (the extension) and in the browser (the free web page).
'use strict';
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FX_RULES;

var RECEPTION_DATE = '2026-09-01';   // all French businesses must be able to receive e-invoices from this date
var FINE_PER_MENTION = 15;           // CGI art. 1737: 15 EUR per missing or wrong mandatory mention
var FINE_CAP_YEAR = 15000;           // annual cap on the per-invoice transmission fine
var LATE_INDEMNITY = 40;             // C. com. art. L441-10: 40 EUR fixed recovery indemnity

function leaves(text) {
  var out = {}, re = /<(?:[\w.-]+:)?([\w.-]+)\b[^>]*>([^<]*)<\/(?:[\w.-]+:)?\1>/g, m;
  while ((m = re.exec(text))) {
    var v = m[2].trim();
    if (!out[m[1]]) out[m[1]] = [];
    out[m[1]].push(v);
  }
  return out;
}
function block(text, name) {
  var re = new RegExp('<(?:[\\w.-]+:)?' + name + '\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + name + '>', 'i');
  var m = re.exec(text);
  return m ? m[1] : '';
}
function first(L, names) {
  for (var i = 0; i < names.length; i++) {
    var v = L[names[i]] || [];
    for (var j = 0; j < v.length; j++) if (v[j]) return v[j];
  }
  return '';
}
function lineOf(text, re) {
  var i = text.search(re);
  if (i < 0) return 1;
  return text.slice(0, i).split('\n').length;
}
function digitsOnly(s) { return String(s || '').replace(/\D/g, ''); }
function luhn(n) {
  if (!/^\d+$/.test(n)) return false;
  var sum = 0, alt = false;
  for (var i = n.length - 1; i >= 0; i--) {
    var d = +n[i];
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
function sirenLike(s) { var d = digitsOnly(s); return (d.length === 9 || d.length === 14) ? d : ''; }
function vatKey(siren) {
  var k = (12 + 3 * (Number(siren) % 97)) % 97;
  return (k < 10 ? '0' : '') + k;
}
function num(s) {
  var v = parseFloat(String(s || '').replace(/\s| /g, '').replace(',', '.'));
  return isFinite(v) ? v : null;
}
function eur(n) { return n.toFixed(2).replace('.', ',') + ' EUR'; }

function partyIds(text, ublName, ciiName) {
  var b = block(text, ublName) || block(text, ciiName);
  if (!b) return { found: false, ids: [], block: '' };
  var L = leaves(b), ids = [];
  ['CompanyID', 'ID', 'EndpointID'].forEach(function (k) {
    (L[k] || []).forEach(function (v) { var d = sirenLike(v); if (d) ids.push(d); });
  });
  return { found: true, ids: ids, block: b };
}

function check(text, opts) {
  text = String(text == null ? '' : text);
  opts = opts || {};
  var today = /^\d{4}-\d{2}-\d{2}$/.test(opts.today || '') ? opts.today : new Date().toISOString().slice(0, 10);
  var F = [], L = leaves(text);
  function add(id, sev, msg, line) { F.push({ check: id, sev: sev, msg: msg, line: line || 1 }); }
  if (!/</.test(text)) {
    add('bt1_invoice_id', 'error', 'No XML found. Paste the Factur-X, UBL or CII invoice, not the PDF cover page.', 1);
    return { findings: F, rule_count: RULES.length, today: today, reception_date: RECEPTION_DATE };
  }

  // 1 — BT-1 invoice number, BT-2 issue date, and the date must not be later than the as-of date
  var head = block(text, 'ExchangedDocument');
  var docId = head ? first(leaves(head), ['ID']) : ((/<(?:[\w.-]+:)?ID\b[^>]*>([^<]*)</.exec(text) || [])[1] || '').trim();
  var issued = (first(L, ['IssueDate', 'DateTimeString', 'IssueDateTime']).match(/\d{4}-?\d{2}-?\d{2}/) || [''])[0].replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  if (!docId) add('bt1_invoice_id', 'error', 'BT-1 invoice number is missing. A PDP rejects an invoice with no number.', 1);
  else if (!issued) add('bt1_invoice_id', 'error', 'BT-2 issue date is missing next to invoice ' + docId + '.', lineOf(text, /IssueDate/i));
  else if (issued > today) add('bt1_invoice_id', 'error', 'BT-2 issue date ' + issued + ' is later than the as-of date ' + today + '. Post-dated invoices are refused.', lineOf(text, /IssueDate/i));

  // 2 — BT-24 profile identifier
  var ctx = block(text, 'GuidelineSpecifiedDocumentContextParameter');
  var prof = first(L, ['CustomizationID']) || (ctx ? first(leaves(ctx), ['ID']) : '');
  if (!prof) add('bt24_profile', 'error', 'BT-24 profile identifier is missing. France routes on the Factur-X / EN 16931 profile URN; without it the PDP cannot decide the flow.', 1);
  else if (!/en16931|factur-x|facturx|urn:cen\.eu/i.test(prof)) add('bt24_profile', 'error', 'BT-24 is "' + prof + '", which is not an EN 16931 or Factur-X profile URN.', lineOf(text, /CustomizationID|GuidelineSpecified/i));
  else if (/minimum|basic ?wl/i.test(prof)) add('bt24_profile', 'warn', 'Profile ' + prof + ' carries no invoice lines. Use BASIC or higher so the buyer can post the invoice.', lineOf(text, /CustomizationID|GuidelineSpecified/i));

  // 3 — currency: EUR, or the VAT total restated in EUR (BT-111)
  var cur = (first(L, ['DocumentCurrencyCode', 'InvoiceCurrencyCode']) || '').toUpperCase();
  var eurTax = first(L, ['TaxAmountInAccountingCurrency', 'TaxTotalAmountInAccountingCurrency', 'TaxCurrencyCode']);
  if (!cur) add('currency_eur', 'error', 'Document currency is missing. A French invoice states its currency.', 1);
  else if (cur !== 'EUR' && !eurTax) add('currency_eur', 'error', 'Currency is ' + cur + ' and the VAT total is not restated in EUR (BT-111). French law wants the VAT amount in euro.', lineOf(text, /CurrencyCode/i));

  // 4 — seller SIREN / SIRET
  var sell = partyIds(text, 'AccountingSupplierParty', 'SellerTradeParty');
  if (!sell.found) add('seller_siren', 'error', 'No seller party block. The seller SIREN is a mandatory mention.', 1);
  else if (!sell.ids.length) add('seller_siren', 'error', 'Seller SIREN (9 digits) or SIRET (14) is missing from the seller party.', lineOf(text, /AccountingSupplierParty|SellerTradeParty/i));
  else if (!luhn(sell.ids[0])) add('seller_siren', 'error', 'Seller identifier ' + sell.ids[0] + ' fails its Luhn check digit, so it is not a real SIREN.', lineOf(text, /AccountingSupplierParty|SellerTradeParty/i));

  // 5 — buyer SIREN: one of the four mentions France added for the reform
  var buy = partyIds(text, 'AccountingCustomerParty', 'BuyerTradeParty');
  if (!buy.found) add('buyer_siren', 'error', 'No buyer party block. The buyer SIREN is a mandatory mention.', 1);
  else if (!buy.ids.length) add('buyer_siren', 'error', 'Buyer SIREN is missing. France added the buyer SIREN to the mandatory mentions for the e-invoicing reform; the name and address alone are not enough.', lineOf(text, /AccountingCustomerParty|BuyerTradeParty/i));
  else if (!luhn(buy.ids[0])) add('buyer_siren', 'error', 'Buyer identifier ' + buy.ids[0] + ' fails its Luhn check digit, so it is not a real SIREN.', lineOf(text, /AccountingCustomerParty|BuyerTradeParty/i));

  // 6 — FR intra-EU VAT number: the two-character key is computed from the SIREN
  var vats = text.match(/FR[\s]?[0-9A-Z]{2}[\s]?\d{9}/gi) || [];
  if (!vats.length) add('fr_vat_key', 'error', 'No French intra-EU VAT number (FR + 2-character key + 9-digit SIREN) anywhere in the invoice.', 1);
  else {
    var bad = null;
    for (var i = 0; i < vats.length; i++) {
      var v = vats[i].replace(/\s/g, '').toUpperCase(), k = v.slice(2, 4), s = v.slice(4);
      if (/^\d{2}$/.test(k) && k !== vatKey(s)) { bad = { v: v, k: k, want: vatKey(s), s: s }; break; }
    }
    if (bad) add('fr_vat_key', 'error', 'VAT number ' + bad.v + ' has key ' + bad.k + '. The key computed from SIREN ' + bad.s + ' is ' + bad.want + '.', lineOf(text, /FR[\s]?[0-9A-Z]{2}[\s]?\d{9}/i));
  }

  // 7 — delivery address (BG-15), another mention France added
  var del = block(text, 'Delivery') || block(text, 'ShipToTradeParty');
  var delAddr = del && /Address|PostalTradeAddress|CountryCode|CityName|PostalZone/i.test(del);
  if (!del) add('delivery_address', 'error', 'Delivery address is missing. France added "adresse de livraison" to the mandatory mentions; the billing address does not stand in for it.', 1);
  else if (!delAddr) add('delivery_address', 'error', 'The delivery block carries no address. France added "adresse de livraison" to the mandatory mentions; a date alone is not the address.', lineOf(text, /<(?:[\w.-]+:)?Delivery\b|ShipToTradeParty/i));

  // 8 — delivery / supply date (BT-72)
  if (!/ActualDeliveryDate|ActualDeliverySupplyChainEvent/i.test(text)) add('delivery_date', 'error', 'BT-72 delivery or supply date is missing. It sets the VAT due date, so the buyer cannot post the invoice without it.', 1);

  // 9 — category of operation: goods, services, or mixed
  var hasCat = /livraison de biens|prestation[s]? de services?|op[ée]ration[s]? mixte/i.test(text);
  if (!hasCat) add('operation_category', 'error', 'Category of operation is missing. State "livraison de biens", "prestation de services" or "operations mixtes" — France added this mention for the reform.', 1);

  // 10 — option to account for VAT on debits, for service invoices
  var isService = /prestation[s]? de services?|op[ée]ration[s]? mixte/i.test(text);
  if ((isService || !hasCat) && !/d'?apr[eè]s les d[ée]bits/i.test(text))
    add('debits_option', 'warn', 'A service invoice that has taken the option must print "Option pour le paiement de la taxe d\'apres les debits". Without it the buyer deducts VAT on payment, not on invoice.', 1);

  // 11 — totals reconcile: BT-109 + BT-110 = BT-112
  var net = num(first(L, ['TaxExclusiveAmount', 'TaxBasisTotalAmount']));
  var vat = num(first(L, ['TaxAmount', 'TaxTotalAmount']));
  var gross = num(first(L, ['TaxInclusiveAmount', 'GrandTotalAmount']));
  if (net === null || vat === null || gross === null) add('totals_balance', 'error', 'One of BT-109 (net), BT-110 (VAT) or BT-112 (total with VAT) is missing, so the totals cannot be reconciled.', 1);
  else if (Math.abs(net + vat - gross) > 0.01)
    add('totals_balance', 'error', 'Totals do not reconcile: ' + eur(net) + ' + ' + eur(vat) + ' = ' + eur(net + vat) + ', but BT-112 says ' + eur(gross) + ' — off by ' + eur(Math.abs(net + vat - gross)) + '.', lineOf(text, /TaxInclusiveAmount|GrandTotalAmount/i));

  // 12 — late payment penalty rate and the fixed recovery indemnity
  var hasRate = /p[ée]nalit[ée]s? de retard/i.test(text) && /\d+([.,]\d+)?\s*%/.test(text);
  var hasIndem = /indemnit[ée] forfaitaire/i.test(text) && /\b40\b/.test(text);
  if (!hasRate || !hasIndem)
    add('late_payment_terms', 'error', 'Late-payment mentions are incomplete' + (hasRate ? '' : ' (no penalty rate)') + (hasIndem ? '' : ' (no ' + LATE_INDEMNITY + ' EUR recovery indemnity)') + '. Code de commerce art. L441-10 requires both on every B2B invoice.', 1);

  return {
    findings: F, rule_count: RULES.length, today: today, reception_date: RECEPTION_DATE,
    fine_per_mention: FINE_PER_MENTION, fine_cap_year: FINE_CAP_YEAR
  };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.FXENGINE = API;
