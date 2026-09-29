// Dependency Checker — EOL Dates · one brain for the VS Code extension and the free web page.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.DEOL_RULES;
  var DAY = 86400000;
  var SECTIONS = /"(dependencies|devDependencies|peerDependencies|optionalDependencies|require|require-dev)"\s*:\s*\{/;

  function num(v) {
    var m = String(v).match(/(\d+)(?:\.(\d+))?/);
    if (!m) return null;
    return parseInt(m[1], 10) * 1000 + (m[2] ? parseInt(m[2], 10) : 0);
  }
  function specNum(spec) {
    var s = String(spec).trim();
    if (!/^[\^~><=v\s]*\d/.test(s)) return null;   // skip "*", "latest", git urls, workspace:
    return num(s);
  }
  function toDay(s) {
    var t = Date.parse(String(s || '').slice(0, 10) + 'T00:00:00Z');
    return isNaN(t) ? null : t;
  }
  function norm(eco, name) {
    return eco === 'pypi' ? name.toLowerCase().replace(/[_.]+/g, '-') : name.toLowerCase();
  }

  // → [{eco, name, spec, line}]
  function parseDeps(text) {
    var lines = String(text).replace(/\r/g, '').split('\n');
    var out = [];
    var isJson = /^\s*\{/.test(text);
    if (isJson) {
      var composer = /"require(-dev)?"\s*:/.test(text) && !/"dependencies"\s*:/.test(text);
      var depth = 0, inSec = false;
      lines.forEach(function (ln, i) {
        if (!inSec && SECTIONS.test(ln)) { inSec = true; depth = 0; }
        if (inSec) {
          var m = ln.match(/^\s*"([^"]+)"\s*:\s*"([^"]*)"/);
          if (m && depth === 1) out.push({ eco: composer ? 'composer' : 'npm', name: m[1], spec: m[2], line: i + 1 });
          depth += (ln.match(/\{/g) || []).length - (ln.match(/\}/g) || []).length;
          if (depth <= 0) inSec = false;
        }
      });
    } else {
      lines.forEach(function (ln, i) {
        var s = ln.replace(/#.*/, '').trim();
        if (!s || s[0] === '-') return;
        var m = s.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?\s*(==|~=|>=|===|<=|<|>|!=)?\s*([^;,\s]*)/);
        if (m && m[2] && m[3]) out.push({ eco: 'pypi', name: m[1], spec: m[3], line: i + 1 });
      });
    }
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = toDay(opts.today) || toDay(new Date().toISOString());
    var findings = [];
    parseDeps(text).forEach(function (d) {
      var v = specNum(d.spec);
      if (v === null) return;
      RULES.forEach(function (r) {
        if (r.eco !== d.eco || norm(r.eco, r.pkg) !== norm(d.eco, d.name)) return;
        if (v < num(r.min) || v > num(r.max)) return;
        var eol = toDay(r.eol);
        var days = Math.round((eol - today) / DAY);
        var when = r.label || r.eol;
        var pin = d.name + ' ' + d.spec;
        if (days < 0) {
          findings.push({ check: r.id, sev: 'error', line: d.line,
            msg: r.what + ' (' + pin + ') is past end of support since ' + when + ' — ' + (-days) + ' days without security fixes. Upgrade: ' + r.fix + '. Source: ' + r.src });
        } else if (days <= r.warn_days) {
          findings.push({ check: r.id, sev: 'warning', line: d.line,
            msg: r.what + ' (' + pin + ') reaches end of support on ' + when + ' — in ' + days + ' days. Upgrade: ' + r.fix + '. Source: ' + r.src });
        }
      });
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check, parseDeps: parseDeps }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.DEOL_ENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
