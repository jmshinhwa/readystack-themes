/* Notebook Share Gate — one brain, used by the VS Code extension and by the free web page.
   Rules live in rules.json; this file only decides what counts as a finding in a .ipynb. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.NB_RULES;

  function re(src, flags) {
    return new RegExp(src, flags || 'gi');
  }

  function joinSource(v) {
    if (v == null) return '';
    return Array.isArray(v) ? v.join('') : String(v);
  }

  // Everything a saved output can carry: stream text, text/plain, text/html, tracebacks.
  function outputText(out) {
    var parts = [];
    if (!out || typeof out !== 'object') return '';
    parts.push(joinSource(out.text));
    if (Array.isArray(out.traceback)) parts.push(out.traceback.join('\n'));
    if (out.evalue) parts.push(String(out.evalue));
    var data = out.data;
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(function (mime) {
        if (mime.indexOf('text/') === 0 || mime === 'application/json') {
          parts.push(joinSource(data[mime]));
        }
      });
    }
    return parts.filter(Boolean).join('\n');
  }

  // A hit is reported at the raw file line it sits on, so the editor can jump there.
  function lineOf(rawLines, hit, fallback) {
    if (!hit) return fallback;
    var needles = [hit];
    try { needles.push(JSON.stringify(hit).slice(1, -1)); } catch (e) { /* not encodable */ }
    for (var n = 0; n < needles.length; n++) {
      for (var i = 0; i < rawLines.length; i++) {
        if (rawLines[i].indexOf(needles[n]) !== -1) return i + 1;
      }
    }
    return fallback;
  }

  function cellStartLines(rawLines) {
    var starts = [];
    for (var i = 0; i < rawLines.length; i++) {
      if (rawLines[i].indexOf('"cell_type"') !== -1) starts.push(i + 1);
    }
    return starts;
  }

  function short(s) {
    s = String(s).replace(/\s+/g, ' ').trim();
    return s.length > 48 ? s.slice(0, 24) + '…' + s.slice(-12) : s;
  }

  function check(text, opts) {
    opts = opts || {};
    var raw = String(text == null ? '' : text);
    var rawLines = raw.split(/\r?\n/);
    var findings = [];
    var seen = {};

    function add(rule, hit, line) {
      var key = rule.id + '@' + line;
      if (seen[key]) return;
      seen[key] = 1;
      findings.push({
        check: rule.id,
        sev: rule.sev,
        msg: rule.msg.replace('{hit}', short(hit)),
        line: line
      });
    }

    var nb = null;
    try { nb = JSON.parse(raw); } catch (e) { nb = null; }

    // Segments carry their own kind so a rule only reads the part of the notebook it owns.
    var segs = [];
    if (nb && Array.isArray(nb.cells)) {
      var starts = cellStartLines(rawLines);
      nb.cells.forEach(function (cell, idx) {
        var at = starts[idx] || 1;
        segs.push({ kind: 'source', text: joinSource(cell.source), at: at });
        (cell.outputs || []).forEach(function (out) {
          segs.push({ kind: 'output', text: outputText(out), at: at });
        });
      });
    } else {
      // Not parseable as a notebook: read the whole file rather than report nothing.
      segs.push({ kind: 'output', text: raw, at: 1 });
      segs.push({ kind: 'source', text: raw, at: 1 });
    }

    RULES.forEach(function (rule) {
      if (rule.where === 'struct') return;
      var rx = re(rule.pat);
      segs.forEach(function (seg) {
        if (seg.kind !== rule.where || !seg.text) return;
        rx.lastIndex = 0;
        var m, guard = 0;
        while ((m = rx.exec(seg.text)) !== null && guard++ < 200) {
          add(rule, m[0], lineOf(rawLines, m[0], seg.at));
          if (m.index === rx.lastIndex) rx.lastIndex++;
        }
      });
    });

    if (nb) {
      var order = ruleById('execution_order_regressed');
      if (order && Array.isArray(nb.cells)) {
        var starts2 = cellStartLines(rawLines);
        var high = 0;
        for (var i = 0; i < nb.cells.length; i++) {
          var n = nb.cells[i].execution_count;
          if (typeof n !== 'number') continue;
          if (n < high) { add(order, '', starts2[i] || 1); break; }
          high = n;
        }
      }
      var wid = ruleById('widget_state_saved');
      var w = nb.metadata && nb.metadata.widgets;
      if (wid && w && Object.keys(w).length) {
        add(wid, '', lineOf(rawLines, '"widgets"', 1));
      }
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  function ruleById(id) {
    for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i];
    return null;
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NBGATE = api;
}(typeof window !== 'undefined' ? window : this));
