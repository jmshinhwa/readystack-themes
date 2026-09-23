/* Webfont License Audit - engine. Same file runs in Node and in the browser. */
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.WFL_RULES;

var PROPRIETARY = [
  'helvetica neue', 'helvetica now', 'futura', 'gotham', 'avenir', 'avenir next',
  'proxima nova', 'din next', 'brandon grotesque', 'frutiger', 'univers',
  'trade gothic', 'neue haas grotesk', 'akzidenz-grotesk', 'sofia pro',
  'circular std', 'gill sans', 'museo sans', 'founders grotesk', 'tiempos',
  'canela', 'graphik', 'national 2', 'whitney', 'apercu'
];

var OFL = [
  'open sans', 'roboto', 'roboto mono', 'lato', 'montserrat', 'inter', 'noto sans',
  'noto serif', 'source sans 3', 'source sans pro', 'ibm plex sans', 'ibm plex mono',
  'fira sans', 'fira code', 'work sans', 'nunito', 'poppins', 'raleway',
  'merriweather', 'jetbrains mono', 'public sans', 'dm sans', 'space grotesk'
];

var STYLE_WORDS = [
  'italic', 'oblique', 'bold', 'light', 'regular', 'medium', 'semibold', 'semi',
  'black', 'heavy', 'thin', 'extralight', 'extrabold', 'condensed', 'display',
  'mono', 'text', 'sans', 'serif', 'var', 'variable', 'jp', 'kr', 'sc', 'tc'
];

var LICENSE_NOTE = /(sil open font license|open font license|ofl-1\.1|@license|licen[cs]e\s*[:=]|licen[cs]ed\s+(to|under|for)|eula|webfont licen[cs]e|copyright\s*\(c\)|foundry agreement)/i;
var OFL_NOTE = /(sil open font license|open font license|ofl-1\.1|ofl\.txt)/i;

function norm(s) {
  return String(s || '').replace(/["']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function ruleById(id) {
  for (var i = 0; i < RULES.length; i++) { if (RULES[i].id === id) return RULES[i]; }
  return { id: id, sev: 'warn', msg: id };
}

function push(out, seen, id, line) {
  var key = id + '@' + line;
  if (seen[key]) return;
  seen[key] = 1;
  var r = ruleById(id);
  out.push({ check: r.id, sev: r.sev, msg: r.msg, line: line });
}

/* Collect @font-face blocks with their family line and src lines. */
function blocks(lines) {
  var out = [], cur = null, depth = 0;
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    var bare = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    if (!cur && /@font-face/i.test(bare)) {
      cur = { start: i + 1, family: '', familyLine: i + 1, src: [] };
      depth = 0;
    }
    if (!cur) continue;
    var fam = bare.match(/font-family\s*:\s*([^;}]+)/i);
    if (fam && !cur.family) { cur.family = norm(fam[1]); cur.familyLine = i + 1; }
    var srcRe = /url\(\s*([^)]*)\)/gi, m;
    while ((m = srcRe.exec(bare)) !== null) {
      cur.src.push({ line: i + 1, url: norm(m[1]) });
    }
    if (/src\s*:/i.test(bare) && cur.src.length === 0) { cur.srcLine = i + 1; }
    for (var c = 0; c < bare.length; c++) {
      if (bare[c] === '{') depth++;
      else if (bare[c] === '}') {
        depth--;
        if (depth <= 0) { out.push(cur); cur = null; break; }
      }
    }
  }
  if (cur) out.push(cur);
  return out;
}

function isOflFamily(family) {
  for (var i = 0; i < OFL.length; i++) {
    if (family === OFL[i]) return true;
  }
  return false;
}

/* "Open Sans Custom" -> reserved-font-name problem. "Open Sans Condensed" -> a real style. */
function renamedOfl(family) {
  for (var i = 0; i < OFL.length; i++) {
    var base = OFL[i];
    if (family.length > base.length && family.indexOf(base + ' ') === 0) {
      var tail = family.slice(base.length + 1).split(' ');
      for (var t = 0; t < tail.length; t++) {
        if (STYLE_WORDS.indexOf(tail[t]) === -1) return base;
      }
    }
  }
  return null;
}

function check(text, opts) {
  opts = opts || {};
  var src = String(text == null ? '' : text);
  var lines = src.split(/\r?\n/);
  var out = [], seen = {};
  var hasNote = LICENSE_NOTE.test(src);
  var hasOflNote = OFL_NOTE.test(src);
  var bs = blocks(lines);

  for (var b = 0; b < bs.length; b++) {
    var blk = bs[b];
    var fam = blk.family;
    var localOnly = blk.src.length === 0;

    if (!localOnly && PROPRIETARY.indexOf(fam) !== -1) {
      push(out, seen, 'proprietary-selfhost', blk.familyLine);
    }

    var renamed = renamedOfl(fam);
    if (renamed) push(out, seen, 'ofl-reserved-font-name', blk.familyLine);

    if (isOflFamily(fam) && !hasOflNote) {
      push(out, seen, 'ofl-attribution-missing', blk.familyLine);
    }

    for (var s = 0; s < blk.src.length; s++) {
      var u = blk.src[s].url;
      if (/^data:/.test(u)) { push(out, seen, 'font-data-uri', blk.src[s].line); continue; }
      var path = u.split('?')[0].split('#')[0];
      if (/\.(ttf|otf|eot)$/.test(path) && !isOflFamily(fam) && !renamed) {
        push(out, seen, 'desktop-format-served', blk.src[s].line);
      }
    }
  }

  /* One licence line covers the whole stylesheet, so this fires once per file. */
  if (bs.length && !hasNote) push(out, seen, 'no-license-note', bs[0].start);

  /* Host rules read the whole file: @import and url() both count. */
  for (var i = 0; i < lines.length; i++) {
    var low = lines[i].toLowerCase();
    var n = i + 1;
    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      if (rule.kind !== 'host') continue;
      for (var h = 0; h < rule.hosts.length; h++) {
        if (low.indexOf(rule.hosts[h]) !== -1) { push(out, seen, rule.id, n); break; }
      }
    }
    if (low.indexOf('http://') !== -1 && /(licen[cs]e|eula|foundry|font|typekit|myfonts|fontshop)/.test(low)) {
      push(out, seen, 'insecure-license-url', n);
    }
  }

  out.sort(function (a, b2) { return a.line - b2.line; });
  return { findings: out, fileCount: 1, ruleCount: RULES.length, today: opts.today || '' };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
if (typeof window !== 'undefined') { window.WFLENGINE = API; }
