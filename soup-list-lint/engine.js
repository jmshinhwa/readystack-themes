/* SOUP List Lint — IEC 62304 software-of-unknown-provenance records.
   Same file runs in Node (extension) and in the browser (free web tool). */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : window.SOUP_RULES;

  var RULE_BY_ID = {};
  for (var i = 0; i < RULES.rules.length; i++) RULE_BY_ID[RULES.rules[i].id] = RULES.rules[i];

  var FIELD_LABEL = {
    title: 'title',
    manufacturer: 'manufacturer',
    version: 'unique SOUP designator (version)',
    functional: 'functional and performance requirements',
    system: 'hardware and software requirements',
    safety: 'software safety class',
    anomaly: 'published anomaly list evaluation'
  };
  var REQUIRED = ['manufacturer', 'version', 'functional', 'system', 'safety', 'anomaly'];
  var MISSING_RULE = {
    manufacturer: 'soup_manufacturer_missing',
    version: 'soup_version_missing',
    functional: 'soup_functional_req_missing',
    system: 'soup_system_req_missing',
    safety: 'soup_safety_class_missing',
    anomaly: 'soup_anomaly_review_missing'
  };

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[`*_]/g, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9/&. ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function plain(s) {
    return String(s == null ? '' : s).replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
  }
  function inList(list, v) {
    var n = norm(v);
    for (var i = 0; i < list.length; i++) if (norm(list[i]) === n) return true;
    return false;
  }
  function isEmpty(v) {
    return plain(v) === '' || inList(RULES.empty_values, v);
  }
  function isPlaceholder(v) {
    var p = plain(v).toLowerCase();
    if (p === '') return false;
    for (var i = 0; i < RULES.placeholder_values.length; i++) {
      if (p === String(RULES.placeholder_values[i]).toLowerCase()) return true;
    }
    return /^(tbd|todo|tba|tbc|fixme|xxx|pending)\b/i.test(p);
  }
  function isUnpinned(v) {
    var p = plain(v);
    if (inList(RULES.unpinned_markers, p)) return true;
    var low = p.toLowerCase();
    for (var i = 0; i < RULES.unpinned_markers.length; i++) {
      if (low.indexOf(String(RULES.unpinned_markers[i]).toLowerCase()) === 0) return true;
    }
    if (/^[v]?\d+(\.\d+){0,3}([.\-+][0-9A-Za-z.\-]+)?$/.test(p)) return false;
    if (/[\^~*]|>=|<=|>|<|\bor\b|,|\bto\b|\.x\b/i.test(p)) return true;
    if (/^see\b/i.test(p)) return true;
    return false;
  }
  function matchColumn(headers, aliases) {
    var h, a;
    for (a = 0; a < aliases.length; a++) {
      for (h = 0; h < headers.length; h++) if (headers[h] === norm(aliases[a])) return h;
    }
    for (a = 0; a < aliases.length; a++) {
      for (h = 0; h < headers.length; h++) {
        if (headers[h] && headers[h].indexOf(norm(aliases[a])) !== -1) return h;
      }
    }
    return -1;
  }
  function cells(line) {
    var t = line.trim();
    if (t.charAt(0) === '|') t = t.slice(1);
    if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1);
    return t.split('|').map(function (c) { return c.trim(); });
  }
  function isSeparator(line) {
    return /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.indexOf('|') !== -1;
  }
  function toDay(s) {
    var m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (!m) return null;
    var d = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(d)) return null;
    return { ms: d, text: m[0] };
  }

  function parse(text) {
    var lines = String(text || '').split(/\r?\n/);
    var items = [];
    var columns = null;
    var headerLine = 0;
    var i, j;

    for (i = 0; i < lines.length - 1; i++) {
      if (lines[i].trim().charAt(0) !== '|' || !isSeparator(lines[i + 1])) continue;
      var headers = cells(lines[i]).map(norm);
      var cols = {};
      var hit = 0;
      for (var key in RULES.columns) {
        cols[key] = matchColumn(headers, RULES.columns[key]);
        if (cols[key] !== -1) hit++;
      }
      if (cols.title === -1 || hit < 3) continue;
      columns = cols;
      headerLine = i + 1;
      for (j = i + 2; j < lines.length && lines[j].trim().charAt(0) === '|'; j++) {
        var c = cells(lines[j]);
        var blank = true;
        for (var k = 0; k < c.length; k++) if (plain(c[k]) !== '') blank = false;
        if (blank) continue;
        var item = { line: j + 1, fields: {}, title: plain(c[cols.title] || '') };
        for (var f in cols) {
          if (cols[f] === -1) continue;
          item.fields[f] = { value: plain(c[cols[f]] || ''), line: j + 1 };
        }
        items.push(item);
      }
      break;
    }

    if (columns) return { mode: 'table', items: items, columns: columns, headerLine: headerLine, lines: lines };

    // Section form: "### axtls 2.1.5" followed by "- Manufacturer: ..." lines.
    var cur = null;
    for (i = 0; i < lines.length; i++) {
      var hm = /^#{2,5}\s+(.+?)\s*$/.exec(lines[i]);
      if (hm) {
        cur = { line: i + 1, fields: {}, title: plain(hm[1]), pairs: 0 };
        items.push(cur);
        continue;
      }
      if (!cur) continue;
      var pm = /^\s*(?:[-*+]\s*)?([A-Za-z][A-Za-z0-9 /&.()-]{2,60}?)\s*:\s*(.*)$/.exec(lines[i]);
      if (!pm) continue;
      var kn = norm(pm[1]);
      for (var key2 in RULES.columns) {
        if (key2 === 'title') continue;
        if (matchColumn([kn], RULES.columns[key2]) === 0) {
          cur.fields[key2] = { value: plain(pm[2]), line: i + 1 };
          cur.pairs++;
          break;
        }
      }
    }
    items = items.filter(function (it) { return it.pairs > 0; });
    return { mode: 'section', items: items, columns: null, headerLine: 0, lines: lines };
  }

  function check(text, opts) {
    opts = opts || {};
    var today = toDay(opts.today) || toDay(RULES.today_default);
    var doc = parse(text);
    var findings = [];

    function add(id, line, vars) {
      var rule = RULE_BY_ID[id];
      var msg = rule.msg.replace(/\{(\w+)\}/g, function (_, name) {
        if (name === 'clause') return rule.clause;
        if (name === 'today') return today.text;
        return vars && vars[name] !== undefined ? String(vars[name]) : '';
      });
      findings.push({ check: id, sev: rule.sev, msg: msg, line: line });
    }

    if (doc.items.length === 0) {
      add('soup_no_items', 1, {});
      return { findings: findings };
    }

    if (doc.mode === 'table') {
      for (var r = 0; r < REQUIRED.length; r++) {
        if (doc.columns[REQUIRED[r]] === -1) {
          add('soup_column_missing', doc.headerLine, { field: FIELD_LABEL[REQUIRED[r]] });
        }
      }
    }

    var seen = {};
    for (var i = 0; i < doc.items.length; i++) {
      var it = doc.items[i];
      var name = it.title;
      if (isEmpty(name) || isPlaceholder(name)) {
        add('soup_title_missing', it.line, {});
        name = 'row ' + (i + 1);
      }

      for (var r2 = 0; r2 < REQUIRED.length; r2++) {
        var f = REQUIRED[r2];
        var cell = it.fields[f];
        if (!cell) continue;                       // column/field absent: reported once at file level
        var v = cell.value;

        if (isEmpty(v)) { add(MISSING_RULE[f], cell.line, { item: name }); continue; }
        if (isPlaceholder(v)) { add('soup_placeholder_value', cell.line, { item: name, field: FIELD_LABEL[f], value: v }); continue; }

        if (f === 'version' && isUnpinned(v)) add('soup_version_not_pinned', cell.line, { item: name, value: v });

        if (f === 'safety' && !/^(class\s*)?[abc]$/i.test(v)) add('soup_safety_class_invalid', cell.line, { item: name, value: v });

        if (f === 'anomaly') {
          if (inList(RULES.not_reviewed_values, v)) { add('soup_anomaly_review_missing', cell.line, { item: name }); continue; }
          var d = toDay(v);
          if (!d) { add('soup_anomaly_date_missing', cell.line, { item: name }); continue; }
          var days = Math.round((today.ms - d.ms) / 86400000);
          if (days < 0) add('soup_anomaly_date_future', cell.line, { item: name, value: d.text });
          else if (days > RULES.stale_days) add('soup_anomaly_date_stale', cell.line, { item: name, value: d.text, days: days });
        }
      }

      var slug = norm(name).replace(/\s+v?\d+(\.\d+)*$/, '');
      if (slug) {
        if (seen[slug]) {
          var vs = [seen[slug].version, it.fields.version ? it.fields.version.value : ''].filter(Boolean).join(', ');
          add('soup_duplicate_item', it.line, { item: name, value: vs || 'not recorded' });
        } else {
          seen[slug] = { version: it.fields.version ? it.fields.version.value : '' };
        }
      }
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.rules.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SOUPENGINE = api;
})();
