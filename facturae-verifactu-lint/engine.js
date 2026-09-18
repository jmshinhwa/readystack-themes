'use strict';
// Facturae 3.2.2 / FACe / Veri*factu — un solo cerebro: aqui dentro y en la pagina web.
var RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : (typeof window !== 'undefined' ? window.FVL_RULES : []);

var BY_ID = {};
for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

function lineOf(text, idx) {
  if (idx < 0) return 1;
  var n = 1;
  for (var k = 0; k < idx && k < text.length; k++) if (text.charCodeAt(k) === 10) n++;
  return n;
}

function tagRe(name) {
  return new RegExp('<(?:[A-Za-z0-9_]+:)?' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?' + name + '>', 'g');
}

// todas las apariciones de <name>…</name>: {v: contenido, i: indice absoluto}
function all(name, s, base) {
  var re = tagRe(name), m, out = [];
  base = base || 0;
  while ((m = re.exec(s)) !== null) out.push({ v: m[1], i: base + m.index });
  return out;
}
function one(name, s, base) { var a = all(name, s, base); return a.length ? a[0] : null; }
function txt(name, s) { var o = one(name, s, 0); return o ? o.v.replace(/<[^>]*>/g, '').trim() : null; }
function num(name, s) { var t = txt(name, s); if (t === null || t === '') return null; var n = parseFloat(t.replace(',', '.')); return isNaN(n) ? null : n; }
function r2(n) { return Math.round(n * 100) / 100; }

var LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

// devuelve true (valido), false (control incorrecto) o null (no tiene forma espanola)
function nifValid(raw) {
  var v = String(raw || '').toUpperCase().replace(/[\s.\-]/g, '');
  if (/^ES[0-9A-Z]{9}$/.test(v)) v = v.slice(2);
  if (/^[0-9]{8}[A-Z]$/.test(v)) return LETTERS.charAt(parseInt(v.slice(0, 8), 10) % 23) === v.charAt(8);
  if (/^[XYZ][0-9]{7}[A-Z]$/.test(v)) {
    var n = String('XYZ'.indexOf(v.charAt(0))) + v.slice(1, 8);
    return LETTERS.charAt(parseInt(n, 10) % 23) === v.charAt(8);
  }
  if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(v)) {
    var d = v.slice(1, 8).split('').map(Number);
    var even = d[1] + d[3] + d[5], odd = 0, j, x;
    for (j = 0; j < 7; j += 2) { x = d[j] * 2; odd += Math.floor(x / 10) + (x % 10); }
    var c = (10 - ((even + odd) % 10)) % 10;
    var ctrl = v.charAt(8);
    if ('PQRSNW'.indexOf(v.charAt(0)) >= 0) return ctrl === 'JABCDEFGHI'.charAt(c);
    if ('ABEH'.indexOf(v.charAt(0)) >= 0) return ctrl === String(c);
    return ctrl === String(c) || ctrl === 'JABCDEFGHI'.charAt(c);
  }
  return null;
}

function check(text, opts) {
  text = String(text || '');
  opts = opts || {};
  var today = String(opts.today || '').slice(0, 10);
  var findings = [];
  function add(id, idx, extra) {
    var r = BY_ID[id];
    if (!r) return;
    findings.push({ check: id, sev: r.sev, msg: r.msg + (extra ? ' ' + extra : ''), line: lineOf(text, idx) });
  }
  if (!/Facturae|RegistroAlta|RegistroFactura/i.test(text)) return { findings: findings };

  var esFacturae = /<(?:[A-Za-z0-9_]+:)?Facturae(?:\s[^>]*)?>/.test(text) || /<(?:[A-Za-z0-9_]+:)?FileHeader/.test(text);

  // ── cabecera del fichero ────────────────────────────────────────
  if (esFacturae) {
    var headO = one('FileHeader', text, 0);
    var head = headO ? headO.v : '';
    var headI = headO ? headO.i : 0;

    var ver = txt('SchemaVersion', head);
    if (!ver) add('schema_version_missing', headI);
    else if (['3.2', '3.2.1'].indexOf(ver) >= 0) add('schema_version_old', headI, 'Encontrado ' + ver + '.');

    var mod = txt('Modality', head);
    if (mod === null || ['I', 'L'].indexOf(mod) < 0) add('modality_invalid', headI, 'Encontrado "' + (mod === null ? '' : mod) + '".');

    var iss = txt('InvoiceIssuerType', head);
    if (iss === null || ['EM', 'RE', 'TE'].indexOf(iss) < 0) add('issuer_type_invalid', headI, 'Encontrado "' + (iss === null ? '' : iss) + '".');

    // lote: recuento y suma
    var invoices = all('Invoice', text, 0);
    var batchO = one('Batch', head, headI);
    if (batchO) {
      var cnt = num('InvoicesCount', batchO.v);
      if (cnt !== null && cnt !== invoices.length) add('invoices_count_mismatch', batchO.i, 'Declara ' + cnt + ', el fichero trae ' + invoices.length + '.');
      var tiaO = one('TotalInvoicesAmount', batchO.v, 0);
      var declared = tiaO ? num('TotalAmount', tiaO.v) : null;
      if (declared !== null) {
        var sum = 0, hasAny = false;
        for (var q = 0; q < invoices.length; q++) {
          var totO = one('InvoiceTotals', invoices[q].v, 0);
          var it = totO ? num('InvoiceTotal', totO.v) : null;
          if (it !== null) { sum += it; hasAny = true; }
        }
        if (hasAny && Math.abs(r2(sum) - declared) > 0.01) add('batch_total_mismatch', batchO.i, 'Declara ' + declared.toFixed(2) + ' EUR, las facturas suman ' + r2(sum).toFixed(2) + ' EUR.');
      }
    }
  }

  // ── identificacion fiscal de cada parte ─────────────────────────
  var tids = all('TaxIdentification', text, 0);
  for (var t = 0; t < tids.length; t++) {
    var b = tids[t].v, bi = tids[t].i;
    var pt = txt('PersonTypeCode', b);
    if (pt === null || ['F', 'J'].indexOf(pt) < 0) add('person_type_invalid', bi, 'Encontrado "' + (pt === null ? '' : pt) + '".');
    var rt = txt('ResidenceTypeCode', b);
    if (rt === null || ['E', 'R', 'U'].indexOf(rt) < 0) add('residence_type_invalid', bi, 'Encontrado "' + (rt === null ? '' : rt) + '".');
    var tin = txt('TaxIdentificationNumber', b);
    if (tin) {
      var ok = nifValid(tin);
      if (ok === false) add('nif_checksum', bi, 'Encontrado "' + tin + '".');
      else if (ok === null && rt === 'R') add('nif_checksum', bi, '"' + tin + '" con ResidenceTypeCode R.');
    }
  }

  // ── cada factura ────────────────────────────────────────────────
  var invs = all('Invoice', text, 0);
  for (var k2 = 0; k2 < invs.length; k2++) {
    var inv = invs[k2].v, ii = invs[k2].i;

    var dt = txt('InvoiceDocumentType', inv);
    if (dt === null || ['FC', 'FA', 'AF'].indexOf(dt) < 0) add('document_type_invalid', ii, 'Encontrado "' + (dt === null ? '' : dt) + '".');
    var ic = txt('InvoiceClass', inv);
    if (ic === null || ['OO', 'OR', 'OC', 'CO', 'CR', 'CI'].indexOf(ic) < 0) add('invoice_class_invalid', ii, 'Encontrado "' + (ic === null ? '' : ic) + '".');

    var idO = one('InvoiceIssueData', inv, ii);
    var idb = idO ? idO.v : inv, idi = idO ? idO.i : ii;
    var date = txt('IssueDate', idb);
    if (date === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) add('issue_date_invalid', idi, 'Encontrado "' + (date === null ? '' : date) + '".');
    else if (today && date > today) add('issue_date_invalid', idi, 'Emitida el ' + date + ', hoy es ' + today + '.');

    var cur = txt('InvoiceCurrencyCode', idb);
    if (cur && cur !== 'EUR' && !/ExchangeRateDetails/.test(idb)) add('currency_without_exchange', idi, 'Moneda ' + cur + '.');

    // impuestos repercutidos
    var outO = one('TaxesOutputs', inv, ii);
    if (outO) {
      var taxes = all('Tax', outO.v, outO.i);
      for (var x2 = 0; x2 < taxes.length; x2++) {
        var tx = taxes[x2].v, xi = taxes[x2].i;
        var code = txt('TaxTypeCode', tx);
        var rate = num('TaxRate', tx);
        if (code === '01' && rate !== null && [21, 10, 4, 0].indexOf(r2(rate)) < 0) add('iva_rate_unknown', xi, 'Encontrado ' + rate.toFixed(2) + ' %.');
        var baseO = one('TaxableBase', tx, 0), amtO = one('TaxAmount', tx, 0);
        var base = baseO ? num('TotalAmount', baseO.v) : null;
        var amt = amtO ? num('TotalAmount', amtO.v) : null;
        if (base !== null && amt !== null && rate !== null) {
          var exp = r2(base * rate / 100);
          if (Math.abs(exp - amt) > 0.02) add('tax_amount_mismatch', xi, base.toFixed(2) + ' x ' + rate.toFixed(2) + ' % = ' + exp.toFixed(2) + ', el fichero dice ' + amt.toFixed(2) + '.');
        }
      }
    }

    // totales
    var totO2 = one('InvoiceTotals', inv, ii);
    if (totO2) {
      var T = totO2.v, ti = totO2.i;
      var gross = num('TotalGrossAmountBeforeTaxes', T);
      var outs = num('TotalTaxOutputs', T);
      var withh = num('TotalTaxesWithheld', T);
      var total = num('InvoiceTotal', T);
      if (gross !== null && outs !== null && total !== null) {
        var exp2 = r2(gross + outs - (withh || 0));
        if (Math.abs(exp2 - total) > 0.02) add('invoice_total_mismatch', ti, gross.toFixed(2) + ' + ' + outs.toFixed(2) + ' - ' + (withh || 0).toFixed(2) + ' = ' + exp2.toFixed(2) + ', el fichero dice ' + total.toFixed(2) + '.');
      }
    }
  }

  // ── firma XAdES ─────────────────────────────────────────────────
  if (esFacturae && !/<(?:[A-Za-z0-9_]+:)?Signature(?:\s[^>]*)?>/.test(text)) add('signature_missing', 0);

  // ── Veri*factu: encadenamiento ──────────────────────────────────
  var regs = all('RegistroAlta', text, 0);
  for (var z = 0; z < regs.length; z++) {
    var rg = regs[z].v, ri = regs[z].i, falta = [];
    if (!/<(?:[A-Za-z0-9_]+:)?Huella(?:\s[^>]*)?>/.test(rg)) falta.push('Huella');
    if (!/<(?:[A-Za-z0-9_]+:)?Encadenamiento(?:\s[^>]*)?>/.test(rg)) falta.push('Encadenamiento');
    if (!/<(?:[A-Za-z0-9_]+:)?IDVersion(?:\s[^>]*)?>/.test(rg)) falta.push('IDVersion');
    if (falta.length) add('verifactu_chain_missing', ri, 'Falta ' + falta.join(', ') + '.');
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, nifValid: nifValid };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.FVLENGINE = API;
