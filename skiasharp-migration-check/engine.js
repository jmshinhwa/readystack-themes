/* SkiaSharp migration check — shared engine (VS Code + web page). */
(function () {
  var DOC = (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') ? require('./rules.json')
    : (typeof window !== 'undefined' ? window.ISM_RULES : []);
  var RULES = Array.isArray(DOC) ? DOC : (DOC && DOC.rules) || [];
  var SPLIT = Date.UTC(2023, 2, 1); // SixLabors.ImageSharp 3.0.0 published on nuget.org

  function splitDays(today) {
    var m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(today || ''));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(t) || t < SPLIT) return null;
    return Math.round((t - SPLIT) / 86400000);
  }
  // Blank XML comments char-for-char so offsets (and line numbers) stay put.
  function blankComments(s) {
    return s.replace(/<!--[\s\S]*?-->/g, function (c) { return c.replace(/[^\n]/g, ' '); });
  }
  function lineAt(s, i) { return s.slice(0, i).split('\n').length; }
  function attr(a, names) {
    for (var k = 0; k < names.length; k++) {
      var m = new RegExp('\\b' + names[k] + '\\s*=\\s*"([^"]*)"', 'i').exec(a);
      if (m) return m[1].trim();
    }
    return null;
  }
  function major(v) { var m = /^\s*\[?\s*(\d+)/.exec(v || ''); return m ? +m[1] : null; }
  function floating(v) { return /\*/.test(v) || /^[\[(]\s*[^,\])]*,\s*\)$/.test(v); }

  function packages(src) {
    var out = [], re = /<(PackageReference|PackageVersion|package)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1\s*>)/g, m;
    while ((m = re.exec(src))) {
      var name = attr(m[2], ['Include', 'Update', 'id']);
      if (!name) continue;
      var ver = attr(m[2], ['VersionOverride', 'Version', 'version']);
      if (!ver && m[4]) { var c = /<(?:VersionOverride|Version)>\s*([^<]+?)\s*<\//.exec(m[4]); if (c) ver = c[1]; }
      out.push({ name: name, ver: ver, line: lineAt(src, m.index), text: m[0].replace(/\s+/g, ' ').trim() });
    }
    return out;
  }
  function nonWindowsTfm(src) {
    var m = /<TargetFrameworks?>\s*([^<]+?)\s*<\/TargetFrameworks?>/i.exec(src);
    if (!m) return false;
    return m[1].split(';').some(function (t) { t = t.trim(); var n = /^net(\d+)\.\d/.exec(t); return n && +n[1] >= 6 && !/-windows/i.test(t); });
  }

  function check(text, opts) {
    opts = opts || {};
    var raw = String(text || '').replace(/\r\n?/g, '\n'), src = blankComments(raw);
    var days = splitDays(opts.today), findings = [];
    var tail = days !== null ? ' ImageSharp 3.0.0 has been under the Split License for ' + days + ' days as of ' + String(opts.today).slice(0, 10) + '.' : '';
    var pk = packages(src), skia = pk.filter(function (p) { return p.name === 'SkiaSharp'; })[0];
    function add(r, p, extra) {
      findings.push({ check: r.id, sev: r.sev, msg: r.msg + (r.tail ? tail : '') + (extra || ''), line: p.line, fix: r.fix, text: p.text });
    }
    pk.forEach(function (p) {
      var isFloat = p.ver && floating(p.ver), mj = major(p.ver), hitPkg = false;
      RULES.forEach(function (r) {
        if (!r.pkg || !new RegExp(r.pkg).test(p.name)) return;
        if (r.kind === 'float' && isFloat) add(r, p, ' Found: ' + p.name + ' ' + p.ver + '.');
        if (r.kind === 'pkg' && !isFloat && mj !== null && mj >= r.line_major) { hitPkg = true; add(r, p, ' Found: ' + p.name + ' ' + p.ver + '.'); }
        if (r.kind === 'sdc' && mj !== null && mj >= 6 && nonWindowsTfm(src)) add(r, p);
        if (r.kind === 'skia_native' && !pk.some(function (q) { return /^SkiaSharp\.NativeAssets\.Linux/.test(q.name); })) add(r, p);
        if (r.kind === 'skia_mismatch' && skia && skia.ver && p.ver && skia.ver !== p.ver) add(r, p, ' SkiaSharp ' + skia.ver + ' vs ' + p.name + ' ' + p.ver + '.');
      });
      if (!hitPkg && !isFloat && mj !== null) RULES.forEach(function (r) {
        if (r.kind !== 'below' || !new RegExp(r.pkg).test(p.name)) return;
        var line = RULES.filter(function (x) { return x.kind === 'pkg' && new RegExp(x.pkg).test(p.name); })[0];
        if (line && mj < line.line_major) add(r, p, ' Found: ' + p.name + ' ' + p.ver + ' (licence line at ' + line.line_major + '.0.0).');
      });
    });
    // C# source rules, line by line; call-site rules only in files that import Six Labors.
    var lines = src.split('\n'), usesSix = /^\s*using\s+(static\s+)?SixLabors\./m.test(src);
    lines.forEach(function (l, i) {
      var s = l.replace(/\/\/.*$/, '');
      RULES.forEach(function (r) {
        if (r.kind !== 'code' || (r.gate && !usesSix)) return;
        if (new RegExp(r.re).test(s)) findings.push({ check: r.id, sev: r.sev, msg: r.msg, line: i + 1, fix: r.fix, text: l.trim() });
      });
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, split_days: days };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ISMENGINE = api;
})();
