/* E-Invoice Mandate Lint - engine
 * One brain, two homes: node (VS Code extension) and the browser (free web page).
 */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : window.EINV_RULES;

  var byId = {};
  RULES.rules.forEach(function (r) { byId[r.id] = r; });

  // ---------- tiny XML reader (namespace-prefix tolerant) ----------

  function localName(tag) {
    var i = tag.indexOf(':');
    return i < 0 ? tag : tag.slice(i + 1);
  }

  function lineAt(text, index) {
    if (index < 0) return 1;
    return text.slice(0, index).split('\n').length;
  }

  // First <...:Name ...> ... </...:Name> block inside `text`. Returns null if absent.
  function block(text, name, from) {
    var ln = localName(name);
    var open = new RegExp('<(?:[A-Za-z0-9_.-]+:)?' + ln + '(\\s[^>]*)?(/)?>', 'g');
    open.lastIndex = from || 0;
    var m = open.exec(text);
    if (!m) return null;
    if (m[2] === '/') return { inner: '', start: m.index, end: open.lastIndex, self: true };
    var close = new RegExp('</(?:[A-Za-z0-9_.-]+:)?' + ln + '>', 'g');
    close.lastIndex = open.lastIndex;
    var c = close.exec(text);
    if (!c) return null;
    return {
      inner: text.slice(open.lastIndex, c.index),
      attrs: m[1] || '',
      start: m.index,
      innerStart: open.lastIndex,
      end: close.lastIndex
    };
  }

  // Walk a chain of element names. Each hop searches inside the previous hop.
  // Returns {value, line, attrs} or null.
  function pick(text, offset, chain) {
    var cur = text, base = offset || 0;
    for (var i = 0; i < chain.length; i++) {
      var b = block(cur, chain[i]);
      if (!b) return null;
      if (i === chain.length - 1) {
        return {
          value: b.inner.replace(/<[^>]*>/g, '').trim(),
          attrs: b.attrs || '',
          line: lineAt(text, base + b.start) + (base ? 0 : 0)
        };
      }
      base = base + b.innerStart;
      cur = b.inner;
    }
    return null;
  }

  function allBlocks(text, name) {
    var out = [], from = 0, b;
    while ((b = block(text, name, from))) {
      out.push(b);
      from = b.end;
      if (out.length > 5000) break;
    }
    return out;
  }

  function num(s) {
    if (s === null || s === undefined || s === '') return null;
    var v = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
    return isNaN(v) ? null : v;
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  // ---------- document facts ----------

  function readDoc(text) {
    var d = { text: text, syntax: null, root: null, line: {} };

    var rootMatch = /<(?:[A-Za-z0-9_.-]+:)?(Invoice|CreditNote|CrossIndustryInvoice|Faktura)(\s|>)/.exec(text);
    if (rootMatch) {
      d.root = rootMatch[1];
      d.syntax = RULES.syntaxes[d.root] || null;
      d.rootLine = lineAt(text, rootMatch.index);
    }

    var cii = d.root === 'CrossIndustryInvoice';

    function g(chain) { return pick(text, 0, chain); }

    d.customization = cii
      ? g(['GuidelineSpecifiedDocumentContextParameter', 'ID'])
      : g(['CustomizationID']);

    d.sellerCountry = g(['AccountingSupplierParty', 'PostalAddress', 'IdentificationCode'])
      || g(['SellerTradeParty', 'PostalTradeAddress', 'CountryID']);
    d.buyerCountry = g(['AccountingCustomerParty', 'PostalAddress', 'IdentificationCode'])
      || g(['BuyerTradeParty', 'PostalTradeAddress', 'CountryID']);

    d.sellerLegalId = g(['AccountingSupplierParty', 'PartyLegalEntity', 'CompanyID']);
    d.buyerLegalId = g(['AccountingCustomerParty', 'PartyLegalEntity', 'CompanyID']);
    d.buyerReference = g(['BuyerReference']);

    var sup = block(text, 'AccountingSupplierParty');
    d.sellerContact = sup ? {
      name: pick(sup.inner, 0, ['Contact', 'Name']),
      tel: pick(sup.inner, 0, ['Contact', 'Telephone']),
      mail: pick(sup.inner, 0, ['Contact', 'ElectronicMail'])
    } : { name: null, tel: null, mail: null };
    d.sellerEndpoint = sup ? pick(sup.inner, 0, ['EndpointID']) : null;
    var cus = block(text, 'AccountingCustomerParty');
    d.buyerEndpoint = cus ? pick(cus.inner, 0, ['EndpointID']) : null;

    d.paymentMeans = block(text, 'PaymentMeans');
    d.dueDate = g(['DueDate']);
    d.paymentTerms = block(text, 'PaymentTerms');

    d.lines = allBlocks(text, cii ? 'IncludedSupplyChainTradeLineItem' : 'InvoiceLine');
    d.lineSum = 0;
    d.lines.forEach(function (l) {
      var a = pick(l.inner, 0, ['LineExtensionAmount']) || pick(l.inner, 0, ['LineTotalAmount']);
      var v = a ? num(a.value) : null;
      if (v !== null) d.lineSum += v;
    });
    d.lineSum = round2(d.lineSum);

    var tot = block(text, 'LegalMonetaryTotal') || block(text, 'SpecifiedTradeSettlementHeaderMonetarySummation');
    d.totals = {};
    ['LineExtensionAmount', 'TaxExclusiveAmount', 'TaxInclusiveAmount', 'PayableAmount',
     'PrepaidAmount', 'PayableRoundingAmount'].forEach(function (k) {
      var p = tot ? pick(tot.inner, 0, [k]) : null;
      d.totals[k] = p ? { value: num(p.value), line: tot ? lineAt(text, tot.innerStart + p.line) : 1 } : null;
    });
    if (tot) {
      d.totalsLine = lineAt(text, tot.start);
      // re-resolve each amount's line against the whole document for accurate anchors
      ['LineExtensionAmount', 'TaxExclusiveAmount', 'TaxInclusiveAmount', 'PayableAmount',
       'PrepaidAmount', 'PayableRoundingAmount'].forEach(function (k) {
        if (!d.totals[k]) return;
        var b = block(tot.inner, k);
        d.totals[k].line = lineAt(text, tot.innerStart + b.start);
      });
    } else {
      d.totalsLine = 1;
    }

    var tax = block(text, 'TaxTotal');
    var ta = tax ? pick(tax.inner, 0, ['TaxAmount']) : null;
    d.taxAmount = ta ? { value: num(ta.value), line: lineAt(text, tax.innerStart + block(tax.inner, 'TaxAmount').start) } : null;

    d.profile = null;
    if (d.customization && d.customization.value) {
      d.profile = RULES.profiles[d.customization.value.trim()] || null;
    }
    d.country = (d.sellerCountry && d.sellerCountry.value)
      ? d.sellerCountry.value.trim().toUpperCase()
      : (d.profile && d.profile.country && d.profile.country !== '*' ? d.profile.country : null);
    d.domestic = !!(d.country && d.buyerCountry &&
      d.buyerCountry.value.trim().toUpperCase() === d.country);
    d.mandate = null;
    for (var i = 0; i < RULES.mandates.length; i++) {
      if (RULES.mandates[i].country === d.country) { d.mandate = RULES.mandates[i]; break; }
    }
    return d;
  }

  // ---------- checks ----------

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || '2026-09-11';
    text = String(text || '');
    var findings = [];
    var d = readDoc(text);

    function add(id, extra, line) {
      var r = byId[id];
      if (!r) return;
      findings.push({
        check: r.id,
        sev: r.sev,
        msg: r.msg + (extra ? ' - ' + extra : ''),
        line: line || 1,
        bt: r.bt,
        fix: r.fix
      });
    }

    if (!d.syntax) {
      add('EINV-SYNTAX', d.root ? 'found <' + d.root + '>' : 'no invoice root element found', d.rootLine || 1);
      if (d.root === 'Faktura') {
        // Polish KSeF document: check the schema variant and stop.
        var fa = /wersja\s*=\s*"?(1|2|3)/.exec(text) || /FA\s*\(?\s*([23])\s*\)?/.exec(text);
        var isFa2 = /http:\/\/crd\.gov\.pl\/wzor\/2023\/06\/29\/12648/.test(text) || /"FA\(2\)"/.test(text);
        if (isFa2) add('EINV-PL-FA2', 'FA(3) is required since ' + mandateDate('PL'), 1);
      }
      return finish(findings, d, today);
    }

    // profile
    if (!d.customization || !d.customization.value) {
      add('EINV-BT-24', null, d.rootLine || 1);
    } else if (!d.profile) {
      add('EINV-PROFILE-UNKNOWN', '"' + d.customization.value + '"', d.customization.line);
    } else if (d.profile.status === 'retired') {
      add('EINV-PROFILE-RETIRED',
        d.profile.label + ' was retired on ' + d.profile.retired_on + '; use ' + d.profile.replaced_by,
        d.customization.line);
    }

    // presence rules
    RULES.rules.forEach(function (r) {
      if (r.kind !== 'present') return;
      var p = pick(text, 0, r.path);
      if (!p || !p.value) add(r.id, null, d.rootLine || 1);
    });

    if (d.lines.length === 0) add('EINV-LINE', null, d.rootLine || 1);

    // arithmetic
    var T = d.totals;
    if (T.LineExtensionAmount && d.lines.length &&
        round2(T.LineExtensionAmount.value) !== d.lineSum) {
      add('EINV-BR-CO-10',
        'declared ' + T.LineExtensionAmount.value.toFixed(2) + ', lines add up to ' + d.lineSum.toFixed(2),
        T.LineExtensionAmount.line);
    }
    if (T.TaxExclusiveAmount && T.TaxInclusiveAmount && d.taxAmount) {
      var expect = round2(T.TaxExclusiveAmount.value + d.taxAmount.value);
      if (round2(T.TaxInclusiveAmount.value) !== expect) {
        add('EINV-BR-CO-15',
          'declared ' + T.TaxInclusiveAmount.value.toFixed(2) + ', ' +
          T.TaxExclusiveAmount.value.toFixed(2) + ' + ' + d.taxAmount.value.toFixed(2) +
          ' = ' + expect.toFixed(2),
          T.TaxInclusiveAmount.line);
      }
    }
    if (T.PayableAmount && T.TaxInclusiveAmount) {
      var pre = T.PrepaidAmount ? T.PrepaidAmount.value : 0;
      var rnd = T.PayableRoundingAmount ? T.PayableRoundingAmount.value : 0;
      var due = round2(T.TaxInclusiveAmount.value - pre + rnd);
      if (round2(T.PayableAmount.value) !== due) {
        add('EINV-BR-CO-16',
          'declared ' + T.PayableAmount.value.toFixed(2) + ', expected ' + due.toFixed(2),
          T.PayableAmount.line);
      }
      if (due > 0 && !d.dueDate && !d.paymentTerms) {
        add('EINV-BR-CO-25', due.toFixed(2) + ' is due', T.PayableAmount.line);
      }
    }

    // country mandate rules
    var c = d.country;
    var live = mandateLive(c, today);

    if (c === 'FR' && live) {
      if (!d.sellerLegalId || !/^\d{9}(\d{5})?$/.test(d.sellerLegalId.value.replace(/\s/g, ''))) {
        add('EINV-FR-SIREN',
          d.sellerLegalId ? 'found "' + d.sellerLegalId.value + '"' : 'no cac:PartyLegalEntity/cbc:CompanyID',
          d.sellerLegalId ? d.sellerLegalId.line : d.rootLine);
      }
      if (d.domestic && (!d.buyerLegalId || !/^\d{9}(\d{5})?$/.test(d.buyerLegalId.value.replace(/\s/g, '')))) {
        add('EINV-FR-BUYER-SIREN',
          d.buyerLegalId ? 'found "' + d.buyerLegalId.value + '"' : 'no buyer SIREN/SIRET',
          d.buyerLegalId ? d.buyerLegalId.line : d.rootLine);
      }
      if (d.profile && d.profile.status === 'insufficient') {
        add('EINV-FR-MINIMUM', d.profile.note, d.customization.line);
      }
    }

    var isXR = !!(d.customization && /xrechnung/i.test(d.customization.value));
    if (c === 'DE' || isXR) {
      if (!d.buyerReference || !d.buyerReference.value) {
        add('EINV-DE-LEITWEG', 'BR-DE-15', d.rootLine);
      }
      var miss = [];
      if (!d.sellerContact.name) miss.push('cbc:Name');
      if (!d.sellerContact.tel) miss.push('cbc:Telephone');
      if (!d.sellerContact.mail) miss.push('cbc:ElectronicMail');
      if (miss.length) add('EINV-DE-CONTACT', 'missing ' + miss.join(', '), d.rootLine);
      if (!d.paymentMeans) add('EINV-DE-PAYMENT', 'BR-DE-1', d.rootLine);
    }

    if (c === 'BE' && live) {
      if (!d.sellerEndpoint || !d.buyerEndpoint ||
          !/schemeID/i.test((d.sellerEndpoint.attrs || '') + (d.buyerEndpoint.attrs || ''))) {
        add('EINV-BE-PEPPOL',
          (d.sellerEndpoint ? '' : 'seller ') + (d.buyerEndpoint ? '' : 'buyer ') + 'endpoint missing',
          d.rootLine);
      }
      if (d.customization && !/peppol/i.test(d.customization.value)) {
        add('EINV-BE-PROFILE', 'declares "' + d.customization.value + '"', d.customization.line);
      }
    }

    if (c === 'PL' && d.domestic && live) {
      add('EINV-PL-KSEF', 'FA(3) mandatory since ' + mandateDate('PL'), d.rootLine);
    }
    if (c === 'IT' && d.domestic) {
      add('EINV-IT-SDI', null, d.rootLine);
    }
    if (c === 'ES') {
      add('EINV-ES-VERIFACTU', null, d.rootLine);
    }

    return finish(findings, d, today);
  }

  function mandateDate(country) {
    for (var i = 0; i < RULES.mandates.length; i++) {
      if (RULES.mandates[i].country === country) return RULES.mandates[i].issue_from;
    }
    return '';
  }

  function mandateLive(country, today) {
    if (!country) return false;
    for (var i = 0; i < RULES.mandates.length; i++) {
      if (RULES.mandates[i].country === country) return RULES.mandates[i].receive_from <= today;
    }
    return false;
  }

  function finish(findings, d, today) {
    if (d.mandate) {
      var r = byId['EINV-MANDATE-LIVE'];
      var live = d.mandate.receive_from <= today;
      findings.push({
        check: r.id,
        sev: 'info',
        msg: d.mandate.name + ': receive from ' + d.mandate.receive_from +
             ', issue from ' + d.mandate.issue_from +
             ' (' + (live ? 'live as of ' + today : 'not yet in force on ' + today) + ')',
        line: 1,
        bt: '-',
        fix: d.mandate.note
      });
    }
    findings.sort(function (a, b) { return (a.line - b.line) || a.check.localeCompare(b.check); });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.rules.length };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.EINVENGINE = api;
})();
