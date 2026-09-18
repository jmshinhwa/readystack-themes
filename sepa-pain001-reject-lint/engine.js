/* SEPA pain.001 Reject Lint - engine
 * One brain, two homes: require()d by the VS Code extension, loaded as a
 * <script> by the free web page. Same rules, same findings, same line numbers.
 */
(function (root, factory) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.SEPA_RULES;
  var api = factory(RULES);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SEPAENGINE = api;
})(typeof self !== 'undefined' ? self : this, function (RULES) {
  'use strict';

  var RULE_BY_ID = {};
  (RULES || []).forEach(function (r) { RULE_BY_ID[r.id] = r; });

  // SEPA scheme countries (EU/EEA + the non-EEA participants).
  var SEPA_CC = ('AD AT BE BG CH CY CZ DE DK EE ES FI FR GB GI GR HR HU IE IS IT LI LT LU LV ' +
                 'MC MT NL NO PL PT RO SE SI SK SM VA').split(' ');
  var SEPA_CHARS = /^[A-Za-z0-9\/\-?:().,'+ ]*$/;
  var CURRENT_NS = 'pain.001.001.09';

  function mod97(s) {
    var rem = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i), d;
      if (c >= 48 && c <= 57) d = String(c - 48);
      else if (c >= 65 && c <= 90) d = String(c - 55);
      else if (c >= 97 && c <= 122) d = String(c - 87);
      else return -1;
      for (var j = 0; j < d.length; j++) rem = (rem * 10 + (d.charCodeAt(j) - 48)) % 97;
    }
    return rem;
  }

  function ibanValid(iban) {
    var s = String(iban).replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    return mod97(s.slice(4) + s.slice(0, 4)) === 1;
  }

  function rfValid(ref) {
    var s = String(ref).replace(/\s+/g, '').toUpperCase();
    if (!/^RF[0-9]{2}[A-Z0-9]{1,21}$/.test(s)) return false;
    return mod97(s.slice(4) + s.slice(0, 4)) === 1;
  }

  // Every <Tag ...>value</Tag> that closes on the line it opens on, with its line number.
  function scanTags(lines) {
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var re = /<([A-Za-z0-9_]+)((?:\s[^>]*?)?)>([^<]*)<\/\1>/g, m;
      while ((m = re.exec(lines[i])) !== null) {
        out.push({ tag: m[1], attr: m[2] || '', val: m[3], line: i + 1 });
      }
    }
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var src = String(text == null ? '' : text);
    var lines = src.split(/\r?\n/);
    var tags = scanTags(lines);
    var findings = [];

    function add(id, line, extra) {
      var r = RULE_BY_ID[id];
      if (!r) return;
      findings.push({
        check: id,
        sev: r.sev,
        msg: extra ? r.msg + ' ' + extra : r.msg,
        line: line || 1
      });
    }
    function pick(name) { return tags.filter(function (t) { return t.tag === name; }); }
    function lineOfText(needle, from) {
      for (var i = (from || 0); i < lines.length; i++) if (lines[i].indexOf(needle) >= 0) return i + 1;
      return 1;
    }

    /* --- message envelope ------------------------------------------------ */
    var nsLine = lineOfText('pain.001.001.');
    var nsMatch = src.match(/pain\.001\.001\.(\d{2})/);
    if (!nsMatch) {
      add('ns_absent', 1);
    } else if ('pain.001.001.' + nsMatch[1] !== CURRENT_NS) {
      add('ns_retired_version', nsLine,
          'Found pain.001.001.' + nsMatch[1] + ', expected ' + CURRENT_NS + '.');
    }

    var decl = src.match(/<\?xml[^>]*\?>/);
    if (decl && !/encoding\s*=\s*["']utf-?8["']/i.test(decl[0])) add('encoding_not_utf8', 1);

    pick('CreDtTm').forEach(function (t) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(t.val.trim())) add('creation_datetime_invalid', t.line);
    });
    pick('MsgId').forEach(function (t) {
      if (t.val.trim().length > 35) add('msgid_too_long', t.line, 'It is ' + t.val.trim().length + '.');
    });
    pick('PmtInfId').forEach(function (t) {
      if (t.val.trim().length > 35) add('pmtinfid_too_long', t.line, 'It is ' + t.val.trim().length + '.');
    });

    /* --- scheme-level payment information -------------------------------- */
    var svc = pick('Cd').filter(function (t) { return /^(SEPA|INST|SDVA|PRPT|NURG|URGP|[A-Z]{4})$/.test(t.val.trim()); });
    var svcSepa = pick('Cd').filter(function (t) { return t.val.trim() === 'SEPA' || t.val.trim() === 'INST'; });
    var hasSvcLvl = /<SvcLvl>/.test(src);
    if (!hasSvcLvl || svcSepa.length === 0) {
      add('svclvl_not_sepa', hasSvcLvl ? lineOfText('<SvcLvl>') : lineOfText('<PmtInf>'));
    }
    var isInstant = svcSepa.some(function (t) { return t.val.trim() === 'INST'; });

    var chrg = pick('ChrgBr');
    chrg.forEach(function (t) {
      if (t.val.trim() !== 'SLEV') add('chrgbr_not_slev', t.line, 'Found ' + t.val.trim() + '.');
    });

    for (var i = 0; i < lines.length; i++) {
      var bare = lines[i].match(/<ReqdExctnDt>\s*(\d{4}-\d{2}-\d{2})\s*<\/ReqdExctnDt>/);
      if (bare) add('reqdexctndt_legacy_form', i + 1);
    }
    var execDates = [];
    pick('Dt').forEach(function (t) { execDates.push(t); });
    lines.forEach(function (ln, i) {
      var m = ln.match(/<ReqdExctnDt>\s*(\d{4}-\d{2}-\d{2})/);
      if (m) execDates.push({ val: m[1], line: i + 1 });
    });
    execDates.forEach(function (t) {
      var v = t.val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v < today) add('reqdexctndt_past', t.line, 'It is ' + v + ', today is ' + today + '.');
    });

    /* --- accounts and parties -------------------------------------------- */
    pick('IBAN').forEach(function (t) {
      var v = t.val.trim().replace(/\s+/g, '').toUpperCase();
      if (!ibanValid(v)) add('iban_checksum_invalid', t.line, 'Rejected: ' + v + '.');
      else if (SEPA_CC.indexOf(v.slice(0, 2)) < 0) add('iban_country_outside_sepa', t.line, 'Country ' + v.slice(0, 2) + '.');
    });
    pick('BIC').concat(pick('BICFI')).forEach(function (t) {
      var v = t.val.trim().toUpperCase();
      if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v)) add('bic_malformed', t.line, 'Found ' + v + '.');
    });
    pick('Nm').forEach(function (t) {
      if (t.val.trim().length > 70) add('name_too_long', t.line, 'It is ' + t.val.trim().length + '.');
    });

    /* --- amounts ---------------------------------------------------------- */
    var amounts = pick('InstdAmt');
    var sum = 0;
    amounts.forEach(function (t) {
      var ccy = (t.attr.match(/Ccy\s*=\s*["']([A-Za-z]{3})["']/) || [])[1];
      if (ccy && ccy.toUpperCase() !== 'EUR') add('ccy_not_eur', t.line, 'Found ' + ccy.toUpperCase() + '.');
      var v = t.val.trim();
      if (!/^\d+(\.\d{1,2})?$/.test(v) || Number(v) <= 0) {
        add('amt_decimals_invalid', t.line, 'Found ' + v + '.');
      } else {
        sum += Math.round(Number(v) * 100);
      }
    });
    var sumStr = (sum / 100).toFixed(2);

    pick('CtrlSum').forEach(function (t) {
      var v = Number(t.val.trim());
      if (!isFinite(v) || Math.round(v * 100) !== sum) {
        add('ctrlsum_mismatch', t.line, 'Declared ' + t.val.trim() + ', the file adds up to ' + sumStr + '.');
      }
    });

    var txCount = (src.match(/<CdtTrfTxInf>/g) || []).length;
    pick('NbOfTxs').forEach(function (t) {
      if (Number(t.val.trim()) !== txCount) {
        add('nboftxs_mismatch', t.line, 'Declared ' + t.val.trim() + ', the file holds ' + txCount + '.');
      }
    });

    if (isInstant) {
      amounts.forEach(function (t) {
        var n = Number(t.val.trim());
        if (n >= 90000 && n < 100000) add('inst_legacy_cap_split', t.line, 'Amount ' + t.val.trim() + '.');
      });
    }

    /* --- remittance ------------------------------------------------------- */
    pick('Ustrd').forEach(function (t) {
      if (t.val.length > 140) add('ustrd_too_long', t.line, 'It is ' + t.val.length + '.');
    });
    pick('Ref').forEach(function (t) {
      var v = t.val.trim();
      if (/^RF/i.test(v) && !rfValid(v)) add('rf_reference_invalid', t.line, 'Rejected: ' + v + '.');
    });

    /* --- end-to-end identifiers ------------------------------------------ */
    var seen = {};
    pick('EndToEndId').forEach(function (t) {
      var v = t.val.trim();
      if (v.length > 35) add('e2e_too_long', t.line, 'It is ' + v.length + '.');
      if (seen[v]) add('e2e_duplicate', t.line, 'Also on line ' + seen[v] + ': ' + v + '.');
      else seen[v] = t.line;
    });
    var e2eCount = pick('EndToEndId').length;
    if (txCount > e2eCount) {
      add('e2e_missing', lineOfText('<CdtTrfTxInf>'), (txCount - e2eCount) + ' of ' + txCount + ' transactions have none.');
    }

    /* --- character set ---------------------------------------------------- */
    ['Nm', 'Ustrd', 'MsgId', 'PmtInfId', 'EndToEndId', 'InstrId', 'Ref', 'AdrLine', 'TwnNm', 'StrtNm'].forEach(function (name) {
      pick(name).forEach(function (t) {
        if (!SEPA_CHARS.test(t.val)) {
          var bad = t.val.split('').filter(function (c) { return !SEPA_CHARS.test(c); });
          add('charset_forbidden', t.line, 'In <' + name + '>: ' + bad.slice(0, 4).join(' ') + '.');
        }
      });
    });

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  return {
    engine: { check: check },
    RULES: RULES,
    RULE_COUNT: (RULES || []).length
  };
});
