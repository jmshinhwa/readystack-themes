// COPPA 2026 Notice Lint — the brain. One file, same bytes in Node and in the browser.
// Rules live in rules.json; this file only decides how a rule is applied to the text.
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.COPPA_RULES;

var MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
var DATE_SRC = '(\\d{4}-\\d{2}-\\d{2})|((January|February|March|April|May|June|July|August|September|October|November|December)\\s+(\\d{1,2}),?\\s+(\\d{4}))|((\\d{1,2})\\s+(January|February|March|April|May|June|July|August|September|October|November|December)\\s+(\\d{4}))';

function lineAt(text, index) { return text.slice(0, index).split('\n').length; }
function pad(n) { return (n < 10 ? '0' : '') + n; }

function parseDate(s) {
  if (!s) return null;
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(s.trim());
  if (m && MONTHS[m[1].toLowerCase()]) return m[3] + '-' + pad(MONTHS[m[1].toLowerCase()]) + '-' + pad(parseInt(m[2], 10));
  m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s.trim());
  if (m && MONTHS[m[2].toLowerCase()]) return m[3] + '-' + pad(MONTHS[m[2].toLowerCase()]) + '-' + pad(parseInt(m[1], 10));
  return null;
}
function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }

function firstMatch(text, src) {
  var re = new RegExp(src, 'i');
  var m = re.exec(text);
  return m ? { index: m.index, text: m[0] } : null;
}
function anyMatch(text, pats) {
  for (var i = 0; i < (pats || []).length; i++) { var m = firstMatch(text, pats[i]); if (m) return m; }
  return null;
}
function allMatches(text, src) {
  var re = new RegExp(src, 'gi'), out = [], m;
  while ((m = re.exec(text)) !== null) { out.push({ index: m.index, text: m[0] }); if (m[0] === '') re.lastIndex++; }
  return out;
}

function findRevisionDate(text) {
  var re = new RegExp('(last updated|last revised|last modified|effective date|effective|revised|updated)\\s*[:\\u2013\\u2014-]?\\s*(' + DATE_SRC + ')', 'i');
  var m = re.exec(text);
  if (!m) return null;
  return { iso: parseDate(m[2]), raw: m[2], index: m.index };
}

function check(text, opts) {
  var raw = String(text == null ? '' : text);
  text = raw.replace(/[\r\n]/g, ' ');   // same length, so every index still maps back to raw for the line number
  opts = opts || {};
  var today = opts.today || new Date().toISOString().slice(0, 10);
  var findings = [];
  function push(rule, index, msg) {
    findings.push({ check: rule.id, sev: rule.sev || 'error', clause: rule.clause || '', line: lineAt(raw, index || 0), msg: msg || rule.msg });
  }

  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i];
    if (r.mode === 'require_any') {
      if (!anyMatch(text, r.pats)) push(r, 0);

    } else if (r.mode === 'require_all') {
      var missing = 0;
      for (var j = 0; j < r.pats.length; j++) if (!firstMatch(text, r.pats[j])) missing++;
      if (missing) push(r, 0, r.msg + ' (' + missing + ' of ' + r.pats.length + ' missing)');

    } else if (r.mode === 'cond_require') {
      var trig = firstMatch(text, r.when);
      if (trig && !anyMatch(text, r.pats)) push(r, trig.index);

    } else if (r.mode === 'forbid') {
      for (var k = 0; k < r.pats.length; k++) {
        var hits = allMatches(text, r.pats[k]);
        for (var h = 0; h < hits.length; h++) push(r, hits[h].index);
      }

    } else if (r.mode === 'forbid_unless') {
      var ok = new RegExp(r.unless, 'i');
      for (var p = 0; p < r.pats.length; p++) {
        var hs = allMatches(text, r.pats[p]);
        for (var q = 0; q < hs.length; q++) if (!ok.test(hs[q].text)) push(r, hs[q].index, r.msg + ' Found: "' + hs[q].text.trim() + '".');
      }

    } else if (r.mode === 'revision_date') {
      var rev = findRevisionDate(text);
      if (!rev || !rev.iso) {
        push(r, rev ? rev.index : 0, 'No revision date. A children\'s notice has to show when it was last revised so a parent - and the FTC - can see it was rewritten for the amended Rule.');
      } else if (rev.iso < r.cutoff) {
        push(r, rev.index, 'This notice is dated ' + rev.iso + ', before the ' + r.cutoff + ' full-compliance date of the amended COPPA Rule. It cannot contain the clauses the amended Rule added.');
      } else {
        var age = daysBetween(rev.iso, today);
        if (age > (r.stale_days || 365)) {
          findings.push({ check: r.id, sev: 'warn', clause: r.clause, line: lineAt(raw, rev.index), msg: 'Last revised ' + rev.iso + ', ' + age + ' days before ' + today + '. Children\'s notices are expected to be reviewed at least annually.' });
        }
      }
    }
  }
  findings.sort(function (a, b) { return (a.line - b.line) || (a.check < b.check ? -1 : 1); });
  return { findings: findings, rule_count: RULES.length, today: today };
}

var COPPAENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = COPPAENGINE;
else window.COPPAENGINE = COPPAENGINE;
