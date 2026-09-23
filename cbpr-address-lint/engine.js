/* CBPR+ Structured Address Lint - one brain, used by the VS Code extension and by the free web page. */
(function (root, factory) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.CBPR_RULES;
  var api = factory(RULES);
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.CBPRENGINE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (RULES) {

  var RULE_BY_ID = {};
  (RULES || []).forEach(function (r) { RULE_BY_ID[r.id] = r; });

  /* Elements that live inside <PstlAdr> in ISO 20022 PostalAddress24. */
  var ADDR_TAGS = ['Dept', 'SubDept', 'StrtNm', 'BldgNb', 'BldgNm', 'Flr', 'Room',
                   'PstBx', 'PstCd', 'TwnNm', 'TwnLctnNm', 'DstrctNm',
                   'CtrySubDvsn', 'Ctry', 'AdrLine'];

  /* Party elements a CBPR+ address hangs off, nearest one above the block names the finding. */
  var OWNERS = ['Dbtr', 'Cdtr', 'UltmtDbtr', 'UltmtCdtr', 'InitgPty', 'DbtrAgt', 'CdtrAgt',
                'IntrmyAgt1', 'IntrmyAgt2', 'IntrmyAgt3', 'InstgAgt', 'InstdAgt', 'FinInstnId'];

  /* The SWIFT character set CBPR+ keeps for text elements. */
  var OK_CHARS = /^[A-Za-z0-9\/\-\?:\(\)\.,'\+ ]*$/;

  function decode(s) {
    return String(s)
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(parseInt(d, 10)); })
      .replace(/&amp;/g, '&');
  }

  function ownerOf(lines, idx) {
    for (var i = idx; i >= 0 && i > idx - 40; i--) {
      for (var k = 0; k < OWNERS.length; k++) {
        if (lines[i].indexOf('<' + OWNERS[k] + '>') !== -1) { return OWNERS[k]; }
      }
    }
    return 'party';
  }

  /* Cut the text into <PstlAdr> ... </PstlAdr> blocks, keeping real line numbers. */
  function addressBlocks(text) {
    var lines = String(text).split(/\r?\n/);
    var out = [], cur = null;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (!cur && /<PstlAdr[\s>]/.test(L)) {
        cur = { line: i + 1, owner: ownerOf(lines, i), rows: [] };
      }
      if (cur) { cur.rows.push({ n: i + 1, t: L }); }
      if (cur && /<\/PstlAdr>/.test(L)) { out.push(cur); cur = null; }
    }
    if (cur) { out.push(cur); }
    return out;
  }

  /* Every address element in one block, with its own line number. */
  function fieldsOf(block) {
    var found = {};
    ADDR_TAGS.forEach(function (t) { found[t] = []; });
    block.rows.forEach(function (row) {
      ADDR_TAGS.forEach(function (tag) {
        var re = new RegExp('<' + tag + '>([^<]*)</' + tag + '>', 'g'), m;
        while ((m = re.exec(row.t)) !== null) {
          found[tag].push({ value: decode(m[1]).trim(), raw: m[1], line: row.n });
        }
      });
    });
    return found;
  }

  function one(id, line, where, detail) {
    var r = RULE_BY_ID[id] || { sev: 'error', msg: id, title: id };
    return {
      check: id,
      sev: r.sev,
      line: line,
      msg: where + ': ' + r.title + (detail ? ' (' + detail + ')' : '') + ' - ' + r.msg
    };
  }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    addressBlocks(text).forEach(function (b) {
      var f = fieldsOf(b);
      var where = b.owner + ' PstlAdr line ' + b.line;
      var adr = f.AdrLine, twn = f.TwnNm[0], ctry = f.Ctry[0];
      var structured = ADDR_TAGS.some(function (t) {
        return t !== 'AdrLine' && f[t].length > 0;
      });

      if (adr.length > 0 && !twn && !ctry) {
        findings.push(one('unstructured_only', b.line, where,
          adr.length + ' AdrLine, no structured element'));
      } else {
        if (!ctry) { findings.push(one('no_country', b.line, where, null)); }
        if (adr.length > 0 && !twn) { findings.push(one('no_town', b.line, where, null)); }
      }

      if (ctry && !/^[A-Z]{2}$/.test(ctry.value)) {
        findings.push(one('ctry_code', ctry.line, where, ctry.value));
      }

      if (adr.length > 2) {
        findings.push(one('adrline_max2', adr[2].line, where, adr.length + ' occurrences'));
      }

      /* A component that owns a dedicated element must not be echoed in an AdrLine. */
      ['TwnNm', 'PstCd', 'StrtNm', 'BldgNb', 'CtrySubDvsn', 'DstrctNm'].forEach(function (tag) {
        f[tag].forEach(function (fld) {
          if (!fld.value) { return; }
          adr.forEach(function (a) {
            if (a.value.toLowerCase().indexOf(fld.value.toLowerCase()) !== -1) {
              findings.push(one('dup_in_adrline', a.line, where, tag + ' "' + fld.value + '"'));
            }
          });
        });
      });

      adr.forEach(function (a) {
        if (a.value.length > 70) {
          findings.push(one('adrline_70', a.line, where, a.value.length + ' chars'));
        }
      });

      ADDR_TAGS.forEach(function (tag) {
        f[tag].forEach(function (fld) {
          if (fld.value && !OK_CHARS.test(fld.value)) {
            var bad = fld.value.split('').filter(function (c) { return !OK_CHARS.test(c); });
            findings.push(one('charset', fld.line, where, tag + ' "' + bad.join('') + '"'));
          }
        });
      });

      if (f.StrtNm.length > 0 && f.BldgNb.length === 0) {
        f.StrtNm.forEach(function (s) {
          if (/(^\s*\d+[\s,])|([\s,]\d+\s*$)/.test(s.value)) {
            findings.push(one('bldgnb_in_strtnm', s.line, where, '"' + s.value + '"'));
          }
        });
      }
    });

    findings.sort(function (a, b) { return a.line - b.line; });
    if (opts.today) { findings.today = opts.today; }
    return { findings: findings };
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: (RULES || []).length };
});
