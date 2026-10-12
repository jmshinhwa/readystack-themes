/* Apache ECharts migration map: finds Highcharts in package.json, .csproj, HTML and JS/TS
   and gives the exact Apache ECharts line that replaces each one. Same file runs in node and the browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.ECM_RULES;
  var DEP_KEYS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  var EULA = 'Highcharts EULA 1.4: any use within a company, for clients or in internal operations needs a separate Commercial Use License.';

  function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); }
  function msg(r, found) { return found + ' → ' + r.replace + ' — ' + r.note + (r.sev === 'info' ? '' : ' ' + EULA); }

  function checkPackageJson(text, pkg, out) {
    var seen = {};
    RULES.forEach(function (r) {
      if (r.kind !== 'npm') return;
      DEP_KEYS.forEach(function (k) {
        var deps = pkg[k];
        if (!deps || typeof deps !== 'object' || !(r.name in deps) || seen[r.name + k]) return;
        seen[r.name + k] = 1;
        var m = new RegExp('"' + esc(r.name) + '"\\s*:').exec(text);
        out.push({ check: r.id, sev: r.sev, line: m ? lineOf(text, m.index) : 1,
          msg: msg(r, '"' + r.name + '": "' + deps[r.name] + '" in ' + k) });
      });
    });
  }

  function scan(text, out) {
    var lines = text.split('\n');
    lines.forEach(function (raw, i) {
      var ln = raw.replace(/\s+/g, ' ');
      RULES.forEach(function (r) {
        var m = null;
        if (r.kind === 'nuget') {
          m = new RegExp('<PackageReference[^>]*Include\\s*=\\s*"' + esc(r.name) + '"[^>]*?(Version\\s*=\\s*"([^"]+)")?', 'i').exec(ln);
          if (m) out.push({ check: r.id, sev: r.sev, line: i + 1, msg: msg(r, 'PackageReference ' + r.name + (m[2] ? ' ' + m[2] : '')) });
        } else if (r.kind === 'cdn') {
          m = /<script[^>]*src\s*=\s*["']([^"']*code\.highcharts\.com[^"']*)["']/i.exec(ln);
          if (m) out.push({ check: r.id, sev: r.sev, line: i + 1, msg: msg(r, '<script src="' + m[1] + '">') });
        } else if (r.kind === 'import') {
          m = /(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*)['"](highcharts(?:\/[\w\-\/.]+)?)['"]/.exec(ln);
          if (m) out.push({ check: r.id, sev: r.sev, line: i + 1, msg: msg(r, "'" + m[1] + "'") });
        }
      });
    });
  }

  function check(text, opts) {
    text = String(text || '').replace(/\r\n?/g, '\n');
    var out = [], pkg = null, t = text.trim();
    if (t.charAt(0) === '{') { try { pkg = JSON.parse(t); } catch (e) { pkg = null; } }
    if (pkg && typeof pkg === 'object') checkPackageJson(text, pkg, out);
    else scan(text, out);
    out.sort(function (a, b) { return a.line - b.line; });
    return { findings: out, today: (opts && opts.today) || '' };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ECMENGINE = api;
})();
