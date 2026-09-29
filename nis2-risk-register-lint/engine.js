/* Risk Register Lint engine — NIS2 Art. 21(2) coverage + row completeness.
   Same file runs in node (VS Code extension) and in the browser (free web page). */
(function () {
  var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.RR_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.id] = r; });
  var LETTERS = 'abcdefghij'.split('');
  var DAY = 86400000;

  function cells(line) {
    var s = line.trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.charAt(s.length - 1) === '|') s = s.slice(0, -1);
    return s.split('|').map(function (c) { return c.replace(/\s+/g, ' ').trim(); });
  }
  function isSep(cs) { return cs.length > 0 && cs.every(function (c) { return /^:?-{2,}:?$/.test(c); }); }
  function day(s) {
    var m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(s == null ? '' : s));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (new Date(t).getUTCDate() !== +m[3]) return null;
    return t;
  }
  function find(h, re) { for (var k = 0; k < h.length; k++) if (re.test(h[k])) return k; return -1; }
  function columns(h) {
    return {
      id: find(h, /^(id|ref|#|no\.?)$/),
      measure: find(h, /21|measure|article|art\./),
      owner: find(h, /owner/),
      likelihood: find(h, /likelihood|probability/),
      impact: find(h, /impact|consequence|severity/),
      treatment: find(h, /treat/),
      review: find(h, /review/)
    };
  }
  function letters(text) {
    var out = [];
    var s = String(text || '').toLowerCase().replace(/21\s*\(\s*2\s*\)/g, ' ');
    var re = /(?:^|[^a-z])\(?([a-j])\)?(?![a-z])/g, m;
    while ((m = re.exec(s))) out.push(m[1]);
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = day(opts.today);
    if (today == null) { var n = new Date(); today = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); }
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var findings = [], covered = {}, headerLine = 1, rows = 0;
    function add(id, line, detail) {
      var r = BY[id];
      findings.push({ check: id, sev: r.sev, msg: r.title + (detail ? ' — ' + detail : '') + ' [' + r.ref + ']', line: line });
    }
    for (var i = 0; i < lines.length; i++) {
      if (!/^\s*\|/.test(lines[i])) continue;
      var col = columns(cells(lines[i]).map(function (c) { return c.toLowerCase(); }));
      if (col.owner < 0 || col.treatment < 0) continue;
      if (!rows) headerLine = i + 1;
      for (i++; i < lines.length && /^\s*\|/.test(lines[i]); i++) {
        var cs = cells(lines[i]);
        if (isSep(cs)) continue;
        rows++;
        var ln = i + 1;
        var rid = (col.id >= 0 && cs[col.id]) ? cs[col.id] : 'row ' + ln;
        if (col.measure >= 0) letters(cs[col.measure]).forEach(function (x) { covered[x] = true; });
        var owner = cs[col.owner] || '';
        if (!owner || /^(-+|tbd|tba|n\/?a|\?+|none|unassigned|todo)$/i.test(owner)) add('owner-missing', ln, rid + ' owner is "' + (owner || 'empty') + '"');
        var L = col.likelihood >= 0 ? (cs[col.likelihood] || '') : '';
        var I = col.impact >= 0 ? (cs[col.impact] || '') : '';
        var okL = /^[1-5]$/.test(L), okI = /^[1-5]$/.test(I);
        if (!okL || !okI) add('score-invalid', ln, rid + (okL ? '' : ' likelihood "' + (L || 'empty') + '"') + (okI ? '' : ' impact "' + (I || 'empty') + '"'));
        var tr = cs[col.treatment] || '';
        if (!/^(mitigate|accept|transfer|avoid)/i.test(tr)) add('treatment-invalid', ln, rid + ' treatment "' + (tr || 'empty') + '"');
        else if (okL && okI && +L * +I >= 15 && /^accept/i.test(tr)) add('high-risk-accepted', ln, rid + ' score ' + L + 'x' + I + ' = ' + (+L * +I) + ' marked Accept');
        var rv = col.review >= 0 ? (cs[col.review] || '') : '';
        var t = day(rv);
        if (t == null) add('review-date', ln, rid + ' last review "' + (rv || 'empty') + '"');
        else if (t > today) add('review-date', ln, rid + ' last review ' + rv.match(/\d{4}-\d{2}-\d{2}/)[0] + ' is in the future');
        else {
          var age = Math.round((today - t) / DAY);
          if (age > 365) add('review-stale', ln, rid + ' last review ' + rv.match(/\d{4}-\d{2}-\d{2}/)[0] + ' is ' + age + ' days old (limit 365)');
        }
      }
    }
    LETTERS.forEach(function (x) {
      if (!covered[x]) add('measure-' + x, headerLine, rows ? 'none of ' + rows + ' risk rows cites (' + x + ')' : 'no risk table with Owner and Treatment columns found');
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, rows: rows };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.RRENGINE = api;
})();
