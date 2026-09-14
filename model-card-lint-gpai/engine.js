// Model Card Lint — EU GPAI. One engine, two homes: Node (require) and the browser (window).
(function (root, factory) {
  var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : root.MCL_RULES;
  var api = factory(RULES || []);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MCLENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis, function (RULES) {

  var MAX_PER_RULE = 20;

  function parse(text) {
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var fm = null, bodyStart = 0, fmEnd = 0;
    if (lines.length && lines[0].trim() === '---') {
      for (var i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') { fmEnd = i; bodyStart = i + 1; break; }
      }
      if (fmEnd) {
        fm = {};
        for (var j = 1; j < fmEnd; j++) {
          var m = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(lines[j]);
          if (!m) continue;
          var child = '';
          for (var k = j + 1; k < fmEnd; k++) {
            if (/^[ \t]+\S/.test(lines[k])) child += lines[k].trim();
            else if (lines[k].trim() === '') continue;
            else break;
          }
          fm[m[1]] = { line: j + 1, value: m[2].trim(), child: child };
        }
      }
    }
    return { lines: lines, fm: fm, fmEnd: fmEnd || 0, bodyStart: bodyStart, anchor: (fmEnd ? fmEnd + 1 : 1) };
  }

  function has(fm, key) {
    if (!fm || !Object.prototype.hasOwnProperty.call(fm, key)) return false;
    var v = fm[key];
    if (v.value && v.value !== '[]' && v.value !== '{}' && v.value !== 'null') return true;
    return !!v.child;
  }

  // A line that is still a template placeholder documents nothing — it must not satisfy a required section.
  var PLACEHOLDER = /\[More Information Needed\]|\{\{|\b(TODO|TBD|FIXME|XXX)\b/i;
  function lower(doc) {
    return doc.lines.filter(function (l) { return !PLACEHOLDER.test(l); }).join('\n').toLowerCase();
  }

  function anyPresent(hay, list) {
    for (var i = 0; i < (list || []).length; i++) if (hay.indexOf(String(list[i]).toLowerCase()) !== -1) return true;
    return false;
  }

  function scanLines(doc, pattern, flags) {
    var out = [], re;
    try { re = new RegExp(pattern, flags || 'i'); } catch (e) { return out; }
    for (var i = 0; i < doc.lines.length && out.length < MAX_PER_RULE; i++) {
      if (re.test(doc.lines[i])) out.push(i + 1);
    }
    return out;
  }

  function dayDiff(from, to) {
    var a = Date.parse(from + 'T00:00:00Z'), b = Date.parse(to + 'T00:00:00Z');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  function check(text, opts) {
    opts = opts || {};
    var today = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today || '')) ? opts.today : new Date().toISOString().slice(0, 10);
    var doc = parse(text), hay = lower(doc), findings = [];
    var add = function (rule, line, extra) {
      findings.push({ check: rule.id, sev: rule.sev || 'error', line: line || 1, msg: rule.msg + (extra || '') });
    };

    RULES.forEach(function (rule) {
      switch (rule.kind) {

        case 'no_frontmatter':
          if (!doc.fm) add(rule, 1);
          break;

        case 'fm_required':
          if (doc.fm && !has(doc.fm, rule.key)) add(rule, doc.fmEnd || 1);
          break;

        case 'fm_requires_when':
          if (doc.fm && has(doc.fm, rule.key) && doc.fm[rule.key].value.toLowerCase() === String(rule.equals).toLowerCase()) {
            var miss = (rule.requires || []).filter(function (k) { return !has(doc.fm, k); });
            if (miss.length) add(rule, doc.fm[rule.key].line, ' Missing: ' + miss.join(', ') + '.');
          }
          break;

        case 'body_forbidden':
          scanLines(doc, rule.pattern, 'i').forEach(function (ln) { add(rule, ln); });
          break;

        case 'empty_section':
          for (var i = 0; i < doc.lines.length; i++) {
            if (i + 1 <= doc.bodyStart) continue;
            if (!/^#{1,6}\s+\S/.test(doc.lines[i])) continue;
            var n = i + 1;
            while (n < doc.lines.length && doc.lines[n].trim() === '') n++;
            if (n >= doc.lines.length || /^#{1,6}\s+\S/.test(doc.lines[n])) add(rule, i + 1);
          }
          break;

        case 'body_required':
          if (!anyPresent(hay, rule.any)) add(rule, doc.anchor);
          break;

        case 'deadline':
          if (!anyPresent(hay, rule.any)) {
            var d = dayDiff(today, rule.date);
            var tail = d === null ? '' : (d < 0
              ? ' This duty came into force on ' + rule.date + ' — ' + Math.abs(d) + ' days ago.'
              : ' The date that settles it is ' + rule.date + ' — ' + d + ' days from ' + today + '.');
            add(rule, doc.anchor, tail);
          }
          break;

        case 'cond_fm':
          if (doc.fm && !has(doc.fm, rule.key)) {
            var hits = scanLines(doc, rule.pattern, 'i');
            if (hits.length) add(rule, hits[0]);
          }
          break;

        case 'cond_body':
          var trig = scanLines(doc, rule.pattern, 'i');
          if (trig.length && !anyPresent(hay, rule.any)) add(rule, trig[0]);
          break;

        case 'stale_year':
          var yr = Number(today.slice(0, 4));
          var re = /(as of|last updated|updated|current as of|version dated|valid as of)\s+(?:[a-z]+\s+)?(20\d\d)/i;
          for (var q = 0; q < doc.lines.length; q++) {
            var mm = re.exec(doc.lines[q]);
            if (mm && Number(mm[2]) < yr) add(rule, q + 1, ' It says ' + mm[2] + '; today is ' + today + '.');
          }
          break;
      }
    });

    findings.sort(function (a, b) { return a.line - b.line || String(a.check).localeCompare(String(b.check)); });
    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return { findings: findings, errors: errors, rules_checked: RULES.length, today: today };
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
});
