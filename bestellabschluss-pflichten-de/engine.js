// Bestellabschluss-Check DE — Regel-Engine. Dieselbe Datei läuft in Node und im Browser.
var RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : ((typeof window !== 'undefined' && window.CKDE_RULES) ? window.CKDE_RULES : []);

// Die Regeln gelten nur für Vorlagen der Bestellstrecke, nicht für jede HTML-Datei.
var SCOPE = /(warenkorb|zur kasse|kassenseite|bestell(?:ü|ue)bersicht|bestellabschluss|bestellstrecke|order-summary|basket|checkout)/i;

function flatten(text) {
  var out = [], map = [], i = 0;
  while (i < text.length) {
    if (/\s/.test(text.charAt(i))) {
      var start = i;
      while (i < text.length && /\s/.test(text.charAt(i))) i++;
      out.push(' '); map.push(start);
    } else {
      out.push(text.charAt(i)); map.push(i); i++;
    }
  }
  return { flat: out.join(''), map: map };
}

function lineOf(text, idx) {
  if (idx == null || idx < 0) return 1;
  var n = 1;
  for (var i = 0; i < idx && i < text.length; i++) if (text.charAt(i) === '\n') n++;
  return n;
}

function parseISO(v) {
  var m = String(v == null ? '' : v).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  var d = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d) ? null : d;
}

function sinceTail(since, today) {
  var a = parseISO(since), b = today;
  if (a === null || b === null) return ' · Pflicht seit ' + String(since) + '.';
  var tage = Math.floor((b - a) / 86400000);
  if (tage < 0) tage = 0;
  return ' · Pflicht seit ' + String(since) + ' (' + tage + ' Tage).';
}

function anchorLine(text) {
  var m = text.match(/<button\b|<\/form>|type=["']?submit/i);
  return m ? lineOf(text, m.index) : 1;
}

function check(text, opts) {
  opts = opts || {};
  var src = String(text == null ? '' : text);
  var today = parseISO(opts.today);
  var f = flatten(src);
  var flat = f.flat;
  var findings = [];
  if (!SCOPE.test(flat)) return { findings: findings };

  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i];
    if (r.guard && !new RegExp(r.guard, 'i').test(flat)) continue;
    if (r.mode === 'forbid') {
      var re = new RegExp(r.re, 'gi'), m;
      while ((m = re.exec(flat)) !== null) {
        findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' — ' + r.law + '.', line: lineOf(src, f.map[m.index]) });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    } else if (!new RegExp(r.re, 'i').test(flat)) {
      findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' — ' + r.law + sinceTail(r.since, today), line: anchorLine(src) });
    }
  }
  findings.sort(function (a, b) { return (a.line - b.line) || (a.check < b.check ? -1 : 1); });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
if (typeof window !== 'undefined') { window.CKDEENGINE = API; }
