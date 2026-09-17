/* SB 942 / AB 853 disclosure engine - one brain, used by the extension and by the web page. */
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SB942_RULES;

var OPERATIVE = '2026-08-02'; // California SB 942 as amended by AB 853

function rx(p) { return new RegExp(p, 'i'); }

function lineHit(line, pats) {
  for (var i = 0; i < pats.length; i++) { if (rx(pats[i]).test(line)) return true; }
  return false;
}

function fileIndex(lines, pats) {
  for (var i = 0; i < lines.length; i++) { if (lineHit(lines[i], pats)) return i; }
  return -1;
}

function daysSince(today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(today || ''))) return null;
  var a = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  var b = Date.UTC(2026, 7, 2);
  return Math.round((a - b) / 86400000);
}

function clockLine(today) {
  var d = daysSince(today);
  if (d === null) return '';
  if (d >= 0) return ' SB 942 has been operative since ' + OPERATIVE + ' - ' + d + ' day(s) as of ' + today + ', and each day a violation continues is a separate $5,000 penalty.';
  return ' SB 942 becomes operative on ' + OPERATIVE + ' - ' + (-d) + ' day(s) left as of ' + today + '.';
}

function check(text, opts) {
  opts = opts || {};
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var findings = [];
  var clock = clockLine(opts.today);
  for (var r = 0; r < RULES.length; r++) {
    var rule = RULES[r];
    var anchor = 0;
    if (rule.file_has) {
      anchor = fileIndex(lines, rule.file_has);
      if (anchor < 0) continue;
    }
    if (rule.file_lacks && fileIndex(lines, rule.file_lacks) >= 0) continue;
    var msg = rule.msg + (rule.append_days ? clock : '');
    if (rule.line_any) {
      var hits = 0;
      for (var i = 0; i < lines.length; i++) {
        if (!lineHit(lines[i], rule.line_any)) continue;
        if (rule.line_not && lineHit(lines[i], rule.line_not)) continue;
        findings.push({ check: rule.id, sev: rule.sev, msg: msg, line: i + 1 });
        if (++hits >= (rule.limit || 20)) break;
      }
    } else {
      findings.push({ check: rule.id, sev: rule.sev, msg: msg, line: anchor + 1 });
    }
  }
  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings, rule_count: RULES.length, operative: OPERATIVE, today: opts.today || '' };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') { module.exports = API; }
if (typeof window !== 'undefined') { window.SB942ENGINE = API; }
