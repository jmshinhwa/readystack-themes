// Datenschutzerklärung Check – same engine in VS Code (node) and in the free web page (browser).
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.DS_RULES;
  var DAY = 86400000;

  function isoDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '').trim());
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(t) ? null : t;
  }

  // Collapse all whitespace (hard-wrapped lines) and remember the source line of every kept char.
  function flatten(text) {
    var flat = '', lineOf = [], line = 1, inSpace = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (/\s/.test(c)) {
        if (!inSpace && flat.length) { flat += ' '; lineOf.push(line); }
        inSpace = true;
        if (c === '\n') line++;
      } else { flat += c; lineOf.push(line); inSpace = false; }
    }
    return { flat: flat, lineOf: lineOf };
  }

  var MONTHS = { januar: 1, februar: 2, 'märz': 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };

  // "Stand: 12.03.2023" · "Stand: 03/2023" · "Stand: März 2023" · "Stand: 2023-03-12"
  function parseStand(s) {
    var m;
    if ((m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(s))) return Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1);
    if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s))) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
    if ((m = /^(\d{1,2})[\/.](\d{4})/.exec(s))) return Date.UTC(+m[2], +m[1] - 1, 1);
    if ((m = /^([A-Za-zÄÖÜäöü]+)\s+(\d{4})/.exec(s)) && MONTHS[m[1].toLowerCase()]) return Date.UTC(+m[2], MONTHS[m[1].toLowerCase()] - 1, 1);
    return null;
  }

  function fmt(t) { var d = new Date(t); return d.toISOString().slice(0, 10); }

  function check(text, opts) {
    opts = opts || {};
    var today = isoDay(opts.today) || isoDay(new Date().toISOString());
    var f = flatten(String(text || '')), flat = f.flat, lineOf = f.lineOf;
    var findings = [], seen = {};
    function add(rule, idx, extra) {
      var line = idx >= 0 && idx < lineOf.length ? lineOf[idx] : 1;
      var key = rule.id + ':' + line;
      if (seen[key]) return;
      seen[key] = 1;
      findings.push({ check: rule.id, sev: rule.sev, msg: rule.msg + (extra || ''), line: line });
    }
    RULES.forEach(function (rule) {
      var re, m;
      if (rule.kind === 'stale') {
        re = new RegExp(rule.re, 'gi');
        while ((m = re.exec(flat))) {
          var since = isoDay(rule.since), extra = '';
          if (since !== null && today !== null && today >= since) extra = ' (seit ' + Math.floor((today - since) / DAY) + ' Tagen)';
          add(rule, m.index, extra);
          if (!m[0].length) re.lastIndex++;
        }
      } else if (rule.kind === 'missing') {
        if (!new RegExp(rule.re, 'i').test(flat)) add(rule, 0);
      } else if (rule.kind === 'transfer') {
        m = new RegExp(rule.re, 'i').exec(flat);
        if (m && !new RegExp(rule.basis, 'i').test(flat)) add(rule, m.index);
      } else if (rule.kind === 'stand') {
        re = /Stand:?\s+/g;
        var cutoff = isoDay(rule.cutoff);
        while ((m = re.exec(flat))) {
          var t = parseStand(flat.slice(m.index + m[0].length, m.index + m[0].length + 20));
          if (t !== null && cutoff !== null && t < cutoff) {
            var age = today !== null ? ' Stand ' + fmt(t) + ', ' + Math.floor((today - t) / DAY) + ' Tage alt.' : '';
            add(rule, m.index, age);
          }
        }
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.DSENGINE = api;
})();
