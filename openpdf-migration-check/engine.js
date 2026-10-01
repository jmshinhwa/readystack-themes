/* OpenPDF migration check — shared engine (VS Code + web page). */
(function () {
  var DOC = (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') ? require('./rules.json')
    : (typeof window !== 'undefined' ? window.OPM_RULES : []);
  var RULES = Array.isArray(DOC) ? DOC : (DOC && DOC.rules) || [];
  var DEPS = RULES.filter(function (r) { return r.kind === 'dep'; });

  // Blank comments char-for-char so offsets (and line numbers) stay put.
  function blank(s) {
    return s.replace(/<!--[\s\S]*?-->/g, function (c) { return c.replace(/[^\n]/g, ' '); })
      .replace(/\/\*[\s\S]*?\*\//g, function (c) { return c.replace(/[^\n]/g, ' '); })
      .replace(/(^|[^:'"])\/\/[^\n]*/g, function (c, p) { return p + c.slice(p.length).replace(/[^\n]/g, ' '); });
  }
  function lineAt(s, i) { return s.slice(0, i).split('\n').length; }
  function tag(block, name) { var m = new RegExp('<' + name + '>\\s*([^<]*?)\\s*</' + name + '>').exec(block); return m ? m[1] : null; }
  function flat(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  function props(src) {
    var p = {}, re = /<([\w.-]+)>\s*([^<]*?)\s*<\/\1>/g, blk = /<properties>([\s\S]*?)<\/properties>/.exec(src), m;
    if (blk) while ((m = re.exec(blk[1]))) p[m[1]] = m[2];
    return p;
  }
  function resolve(v, p) { return v ? v.replace(/\$\{([^}]+)\}/g, function (a, k) { return p[k] !== undefined ? p[k] : a; }) : v; }

  function deps(src) {
    var out = [], p = props(src), m;
    var pom = /<dependency>([\s\S]*?)<\/dependency>/g;
    while ((m = pom.exec(src))) {
      var g = tag(m[1], 'groupId'), a = tag(m[1], 'artifactId');
      if (g !== 'com.itextpdf' || !a) continue;
      var at = m.index + m[0].indexOf('<artifactId>');
      out.push({ art: a, ver: resolve(tag(m[1], 'version'), p), line: lineAt(src, at), text: flat(m[0]), pom: true });
    }
    var gr = /['"]com\.itextpdf:([\w.-]+)(?::([^'"\s:@)]+))?[^'"]*['"]|group\s*[:=]\s*['"]com\.itextpdf['"]\s*,\s*(?:name|module)\s*[:=]\s*['"]([\w.-]+)['"](?:\s*,\s*version\s*[:=]\s*['"]([^'"]+)['"])?/g;
    while ((m = gr.exec(src))) {
      var ls = src.lastIndexOf('\n', m.index) + 1, le = src.indexOf('\n', m.index);
      out.push({ art: m[1] || m[3], ver: m[2] || m[4] || null, line: lineAt(src, m.index), text: flat(src.slice(ls, le < 0 ? src.length : le)), pom: false });
    }
    return out;
  }
  function line(coord, pom, kts) {
    if (!coord) return '';
    var c = coord.split(':');
    if (pom) return '<dependency><groupId>' + c[0] + '</groupId><artifactId>' + c[1] + '</artifactId><version>' + c[2] + '</version></dependency>';
    return kts ? 'implementation("' + coord + '")' : "implementation '" + coord + "'";
  }

  function check(text, opts) {
    opts = opts || {};
    var raw = String(text || '').replace(/\r\n?/g, '\n'), src = blank(raw), findings = [];
    var kts = /implementation\s*\(/.test(src);
    deps(src).forEach(function (d) {
      var r = DEPS.filter(function (x) { return new RegExp(x.art).test(d.art); })[0];
      if (!r) return;
      var repl = line(r.to, d.pom, kts);
      findings.push({ check: r.id, sev: r.sev, line: d.line, text: d.text, fix: repl || r.api,
        msg: r.msg + ' Found: com.itextpdf:' + d.art + (d.ver ? ' ' + d.ver : '') + '.' + (repl ? ' Replace with: ' + repl + '.' : '') + ' Code: ' + r.api + '.' });
    });
    var lines = src.split('\n');
    RULES.forEach(function (r) {
      if (r.kind !== 'import' && r.kind !== 'prop') return;
      var re = new RegExp(r.re, 'i');
      lines.forEach(function (l, i) {
        var m = re.exec(l);
        if (!m) return;
        var extra = r.kind === 'prop' ? ' Found: ' + (m[1] || m[3]) + ' = ' + (m[2] || m[4]) + '.' : '';
        findings.push({ check: r.id, sev: r.sev, line: i + 1, text: flat(raw.split('\n')[i]), fix: r.api, msg: r.msg + extra + ' Next: ' + r.api + '.' });
      });
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    var today = /^\d{4}-\d{2}-\d{2}/.exec(String(opts.today || ''));
    return { findings: findings, checked: today ? today[0] : null, itext_uses: findings.filter(function (f) { return f.check !== 'ITX015'; }).length };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.OPMENGINE = api;
})();
