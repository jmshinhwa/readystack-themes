// Stale Standard Citation Lint — the brain. Same file runs in Node (the extension) and in the browser (the free web page).
'use strict';
(function (root) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : (root.SCC_RULES || []);

  var DAY = 86400000;

  function parseDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(t) ? null : t;
  }

  function todayOf(opts) {
    var t = parseDay(opts && opts.today);
    return t === null ? parseDay(new Date().toISOString().slice(0, 10)) : t;
  }

  // "dead 2020-07-16" reads differently depending on the day you run it.
  function deadPhrase(dead, today) {
    var d = parseDay(dead);
    if (d === null) return '';
    var days = Math.round((d - today) / DAY);
    var iso = new Date(d).toISOString().slice(0, 10);
    if (days > 0) return ' [effective ' + iso + ' — ' + days + ' day' + (days === 1 ? '' : 's') + ' from now]';
    if (days === 0) return ' [effective ' + iso + ' — today]';
    return ' [dead since ' + iso + ' — ' + (-days) + ' day' + (days === -1 ? '' : 's') + ' ago]';
  }

  function quote(s) {
    s = String(s).replace(/\s+/g, ' ').trim();
    return s.length > 48 ? s.slice(0, 45) + '...' : s;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = todayOf(opts);
    var lines = String(text == null ? '' : text).split(/\r\n|\r|\n/);
    var findings = [];
    var sawDate = false;
    var counts = { error: 0, warn: 0, info: 0 };

    RULES.forEach(function (rule) {
      if (!rule.re) return;
      var re;
      try { re = new RegExp(rule.re, 'gi'); } catch (e) { return; }

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line) continue;
        re.lastIndex = 0;
        var m, hitsOnThisLine = 0;
        while ((m = re.exec(line)) !== null) {
          if (m[0] === '') { re.lastIndex++; continue; }
          if (rule.kind === 'docdate') {
            sawDate = true;
            var stamp = parseDay(m[1]);
            if (stamp !== null) {
              var age = Math.round((today - stamp) / DAY);
              if (age > (rule.max_age_days || 540)) {
                findings.push(mk(rule, i + 1, rule.msg + ' — dated ' + m[1] + ', ' + age + ' days old'));
              }
            }
          } else if (hitsOnThisLine === 0) {
            findings.push(mk(rule, i + 1, rule.msg + deadPhrase(rule.dead, today) + ' — found "' + quote(m[0]) + '"'));
          }
          hitsOnThisLine++;
        }
      }
    });

    // reStructuredText is hard-wrapped at 79 columns, so half the citations in a
    // real docs tree straddle a line break. Re-scan each line boundary and report
    // only matches that actually span it.
    var seen = {};
    findings.forEach(function (f) { seen[f.check + '@' + f.line] = 1; });
    RULES.forEach(function (rule) {
      if (!rule.re || rule.kind !== 'cite') return;
      var re;
      try { re = new RegExp(rule.re, 'gi'); } catch (e) { return; }
      for (var i = 0; i + 1 < lines.length; i++) {
        var left = lines[i].replace(/\s+$/, '');
        var right = lines[i + 1].replace(/^\s+/, '');
        if (!left || !right) continue;
        var joined = left + ' ' + right;
        var cut = left.length;
        re.lastIndex = 0;
        var m;
        while ((m = re.exec(joined)) !== null) {
          if (m[0] === '') { re.lastIndex++; continue; }
          var start = m.index, end = m.index + m[0].length;
          if (start < cut && end > cut + 1 && !seen[rule.id + '@' + (i + 1)]) {
            seen[rule.id + '@' + (i + 1)] = 1;
            findings.push(mk(rule, i + 1, rule.msg + deadPhrase(rule.dead, today) + ' — found "' + quote(m[0]) + '" wrapped across lines ' + (i + 1) + '-' + (i + 2)));
          }
          break;
        }
      }
    });

    if (!sawDate) {
      var nd = null;
      for (var j = 0; j < RULES.length; j++) if (RULES[j].kind === 'nodate') nd = RULES[j];
      if (nd) findings.push(mk(nd, 1, nd.msg));
    }

    findings.sort(function (a, b) { return a.line - b.line || (a.check < b.check ? -1 : 1); });
    findings.forEach(function (f) { if (counts[f.sev] !== undefined) counts[f.sev]++; });

    return {
      findings: findings,
      summary: {
        lines: lines.length,
        rules_run: RULES.length,
        dead: counts.error,
        undated: counts.warn,
        notes: counts.info,
        today: new Date(today).toISOString().slice(0, 10)
      }
    };
  }

  function mk(rule, line, msg) {
    return { check: rule.id, sev: rule.sev || 'error', msg: msg, line: line };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.SCCENGINE = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
