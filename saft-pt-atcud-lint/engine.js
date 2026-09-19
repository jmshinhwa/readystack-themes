/* SAF-T (PT) + ATCUD Lint — mesmo motor no VS Code e na pagina web. */
(function (root, factory) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : (root.SAFT_RULES || []);
  var api = factory(RULES);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SAFTENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis, function (RULES) {

  var RATES = {
    'PT':    [0, 6, 13, 23],
    'PT-AC': [0, 4, 9, 16],
    'PT-MA': [0, 4, 5, 12, 22]
  };
  var QR_FIELDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'N', 'O', 'Q', 'R'];

  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  function lineAt(text, idx) {
    if (idx < 0) return 1;
    var n = 1;
    for (var i = 0; i < idx && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
    return n;
  }
  function pick(block, name) {
    var m = new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '>').exec(block);
    if (!m) return null;
    return { val: m[1].replace(/\s+/g, ' ').trim(), idx: m.index };
  }
  function val(block, name) { var p = pick(block, name); return p ? p.val : ''; }
  function blocks(text, name) {
    var out = [], re = new RegExp('<' + name + '\\b[^>]*>[\\s\\S]*?<\\/' + name + '>', 'g'), m;
    while ((m = re.exec(text)) !== null) out.push({ txt: m[0], idx: m.index });
    return out;
  }
  function num(s) { var n = parseFloat(String(s).replace(',', '.')); return isNaN(n) ? null : n; }
  function r2(n) { return Math.round(n * 100) / 100; }

  function nifOk(nif) {
    if (!/^\d{9}$/.test(nif)) return false;
    var sum = 0;
    for (var i = 0; i < 8; i++) sum += parseInt(nif.charAt(i), 10) * (9 - i);
    var chk = 11 - (sum % 11);
    if (chk >= 10) chk = 0;
    return chk === parseInt(nif.charAt(8), 10);
  }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    text = String(text || '');

    function add(id, line, fields) {
      var rule = BY_ID[id];
      if (!rule) return;
      var msg = rule.msg.replace(/\{(found|want|where|doc|seq)\}/g, function (_, k) {
        return (fields && fields[k] !== undefined && fields[k] !== null) ? String(fields[k]) : '?';
      });
      findings.push({ check: id, sev: rule.sev, msg: msg, line: line });
    }

    var header = blocks(text, 'Header')[0];
    var headerTxt = header ? header.txt : text;
    var headerIdx = header ? header.idx : 0;

    /* 1. versao do ficheiro */
    var ver = pick(headerTxt, 'AuditFileVersion');
    if (!ver || ver.val !== '1.04_01') {
      add('saft_version', lineAt(text, headerIdx + (ver ? ver.idx : 0)), { found: ver ? ver.val : 'ausente' });
    }

    /* 2. NIF do emitente */
    var ownNif = pick(headerTxt, 'TaxRegistrationNumber');
    if (ownNif && !nifOk(ownNif.val)) {
      add('nif_checksum', lineAt(text, headerIdx + ownNif.idx), { found: ownNif.val, where: 'Header' });
    }

    /* clientes do MasterFiles */
    var customers = {};
    blocks(text, 'Customer').forEach(function (c) {
      var id = val(c.txt, 'CustomerID');
      if (!id) return;
      var taxIdP = pick(c.txt, 'CustomerTaxID');
      customers[id] = {
        taxId: taxIdP ? taxIdP.val : '',
        taxIdLine: taxIdP ? lineAt(text, c.idx + taxIdP.idx) : lineAt(text, c.idx),
        country: val(c.txt, 'Country')
      };
      if (taxIdP && taxIdP.val !== '999999990' && !nifOk(taxIdP.val) && /^\d+$/.test(taxIdP.val)) {
        add('nif_checksum', customers[id].taxIdLine, { found: taxIdP.val, where: 'Customer ' + id });
      }
    });

    var period = { start: val(headerTxt, 'StartDate'), end: val(headerTxt, 'EndDate') };

    blocks(text, 'Invoice').forEach(function (inv) {
      var b = inv.txt, base = inv.idx;
      var noP = pick(b, 'InvoiceNo');
      var no = noP ? noP.val : '(sem InvoiceNo)';
      var line0 = lineAt(text, base);
      var noLine = noP ? lineAt(text, base + noP.idx) : line0;

      /* 3. numeracao do documento */
      var seqWanted = null;
      if (!noP || !/^[A-Z]{2,4} [A-Za-z0-9._\-]+\/\d+$/.test(no)) {
        add('invoice_no_format', noLine, { found: no });
      } else {
        seqWanted = no.split('/').pop();
      }

      /* 4-6. ATCUD */
      var atP = pick(b, 'ATCUD');
      if (!atP || !atP.val) {
        add('atcud_missing', line0, { doc: no });
      } else {
        var at = atP.val, atLine = lineAt(text, base + atP.idx);
        if (!/^[A-Z0-9]{8,}-\d+$/.test(at)) {
          add('atcud_format', atLine, { found: at, doc: no });
        } else if (seqWanted !== null) {
          var seq = at.split('-').pop();
          if (parseInt(seq, 10) !== parseInt(seqWanted, 10)) {
            add('atcud_seq_mismatch', atLine, { found: at, doc: no, seq: seq, want: seqWanted });
          }
        }
      }

      /* 7. hash */
      var hP = pick(b, 'Hash');
      var hash = hP ? hP.val : '';
      if (hash && hash.length !== 172) {
        add('hash_length', lineAt(text, base + hP.idx), { doc: no, found: hash.length });
      }

      /* 8-9. totais */
      var docT = blocks(b, 'DocumentTotals')[0];
      var net = null, tax = null, gross = null;
      if (docT) {
        net = num(val(docT.txt, 'NetTotal'));
        tax = num(val(docT.txt, 'TaxPayable'));
        gross = num(val(docT.txt, 'GrossTotal'));
        var tLine = lineAt(text, base + docT.idx);
        if (net !== null && tax !== null && gross !== null && Math.abs(r2(net + tax) - gross) > 0.005) {
          add('totals_mismatch', tLine, { doc: no, found: gross.toFixed(2), want: r2(net + tax).toFixed(2) });
        }
        var sum = 0, seen = false;
        blocks(b, 'Line').forEach(function (ln) {
          var c = num(val(ln.txt, 'CreditAmount'));
          var d = num(val(ln.txt, 'DebitAmount'));
          if (c !== null) { sum += c; seen = true; }
          if (d !== null) { sum -= d; seen = true; }
        });
        if (seen && net !== null && Math.abs(r2(sum) - net) > 0.005) {
          add('lines_vs_nettotal', tLine, { doc: no, found: r2(sum).toFixed(2), want: net.toFixed(2) });
        }
      }

      /* 10-11. taxas por regiao e isencoes */
      blocks(b, 'Line').forEach(function (ln) {
        var t = blocks(ln.txt, 'Tax')[0];
        if (!t) return;
        var region = val(t.txt, 'TaxCountryRegion') || 'PT';
        var pctP = pick(t.txt, 'TaxPercentage');
        var pct = pctP ? num(pctP.val) : null;
        var lnLine = lineAt(text, base + ln.idx);
        if (pct !== null && RATES[region] && RATES[region].indexOf(pct) === -1) {
          add('tax_rate_region', lnLine, { doc: no, found: pct, where: region, want: RATES[region].join('/') + '%' });
        }
        if (pct === 0) {
          var code = val(ln.txt, 'TaxExemptionCode');
          var reason = val(ln.txt, 'TaxExemptionReason');
          if (!/^M\d{2}$/.test(code) || !reason) {
            add('exemption_reason_missing', lnLine, { doc: no });
          }
        }
      });

      /* 12. dados do QR code */
      var custId = val(b, 'CustomerID');
      var cust = customers[custId] || null;
      var has = {
        A: ownNif ? ownNif.val : '',
        B: cust ? cust.taxId : '',
        C: cust ? cust.country : '',
        D: val(b, 'InvoiceType'),
        E: val(b, 'InvoiceStatus'),
        F: val(b, 'InvoiceDate'),
        G: noP ? no : '',
        H: atP ? atP.val : '',
        N: tax === null ? '' : String(tax),
        O: gross === null ? '' : String(gross),
        Q: hash,
        R: val(b, 'HashControl')
      };
      var missing = QR_FIELDS.filter(function (f) { return !has[f]; });
      if (missing.length) add('qr_fields_incomplete', line0, { doc: no, found: missing.join(', ') });

      /* 13. data fora do periodo */
      var dP = pick(b, 'InvoiceDate');
      if (dP && period.start && period.end && (dP.val < period.start || dP.val > period.end)) {
        add('date_out_of_period', lineAt(text, base + dP.idx), { doc: no, found: dP.val, want: period.start + ' .. ' + period.end });
      }
      /* 14. documento datado no futuro (usa a data de hoje do painel) */
      var today = opts.today || '';
      if (dP && today && dP.val > today) {
        add('date_in_future', lineAt(text, base + dP.idx), { doc: no, found: dP.val, want: today });
      }
    });

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
});
