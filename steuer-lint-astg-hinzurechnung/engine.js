// Steuer-Lint AStG — Regel-Engine. Dieselbe Datei läuft in Node und im Browser.
var RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : ((typeof window !== 'undefined' && window.ASTG_RULES) ? window.ASTG_RULES : []);

// Geprüft werden nur Texte, die überhaupt von der Hinzurechnungsbesteuerung handeln.
var SCOPE = /(hinzurechnung|astg|außensteuer|aussensteuer|zwischengesellschaft|zwischeneinkünfte)/i;

// Zeilenumbrüche und Mehrfach-Leerzeichen werden zu einem Leerzeichen; map führt zurück ins Original.
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

// Die Zeilen des Originals, über die sich ein Treffer erstreckt — dort wird nach Verneinung gesucht.
function linesAround(text, a, b) {
  var s = text.lastIndexOf('\n', a - 1) + 1;
  var e = text.indexOf('\n', b);
  return text.slice(s, e < 0 ? text.length : e);
}

// Datum defensiv lesen: nur YYYY-MM-DD zählt, alles andere ergibt null.
function parseISO(v) {
  var m = String(v == null ? '' : v).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  var d = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d) ? null : d;
}

function sinceTail(since, today) {
  var a = parseISO(since);
  if (a === null || today === null) return ' · geltende Fassung seit ' + String(since) + '.';
  var tage = Math.floor((today - a) / 86400000);
  if (tage < 0) tage = 0;
  return ' · geltende Fassung seit ' + String(since) + ' (' + tage + ' Tage).';
}

function firstLine(text) {
  var m = text.match(/hinzurechnung|zwischengesellschaft|niedrig\w*\s?besteuer/i);
  return m ? lineOf(text, m.index) : 1;
}

function check(text, opts) {
  opts = opts || {};
  var src = String(text == null ? '' : text);
  var today = parseISO(opts.today);
  var f = flatten(src);
  var flat = f.flat;
  var findings = [], seen = {};
  if (!SCOPE.test(flat)) return { findings: findings };

  function push(r, msg, line) {
    var key = r.id + '@' + line;
    if (seen[key]) return;
    seen[key] = 1;
    findings.push({ check: r.id, sev: r.sev, msg: msg, line: line });
  }

  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i];
    if (r.guard && !new RegExp(r.guard, 'i').test(flat)) continue;
    if (r.mode === 'forbid') {
      var re = new RegExp(r.re, 'gi'), un = r.unless ? new RegExp(r.unless, 'i') : null, m;
      while ((m = re.exec(flat)) !== null) {
        var a = f.map[m.index], b = f.map[m.index + Math.max(m[0].length - 1, 0)];
        if (un && un.test(linesAround(src, a, b))) { re.lastIndex = m.index + 1; continue; }
        push(r, r.msg + ' — ' + r.law + sinceTail(r.since, today), lineOf(src, b));
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    } else if (!new RegExp(r.re, 'i').test(flat)) {
      push(r, r.msg + ' — ' + r.law + sinceTail(r.since, today), firstLine(src));
    }
  }
  findings.sort(function (x, y) { return (x.line - y.line) || (x.check < y.check ? -1 : 1); });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
if (typeof window !== 'undefined') { window.ASTGENGINE = API; }
