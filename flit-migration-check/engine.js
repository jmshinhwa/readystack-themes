/* Flit Migration Check engine: setup.py / setup.cfg / pyproject.toml -> flit_core 4 map. Runs in Node and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FLIT_RULES;
  var DV = '_' + '_version_' + '_';
  var DYN_OK = ['version', 'description', 'import-names', 'import-namespaces'];

  function detectKind(text, opts) {
    var f = (opts && opts.filename) ? String(opts.filename).toLowerCase() : '';
    if (/pyproject\.toml$/.test(f)) return 'pyproject.toml';
    if (/setup\.cfg$/.test(f)) return 'setup.cfg';
    if (/\.py$/.test(f)) return 'setup.py';
    if (/^\s*\[(build-system|project|tool\.[\w-]+)[\].]/m.test(text)) return 'pyproject.toml';
    if (/^\s*\[(metadata|options[\w.]*)\]/m.test(text)) return 'setup.cfg';
    if (/\bsetup\s*\(|\bimport\s+setuptools|\bfrom\s+(setuptools|distutils)/.test(text)) return 'setup.py';
    return '';
  }

  function ver(s) {
    var p = String(s).split('.').map(function (x) { return parseInt(x, 10) || 0; });
    return (p[0] || 0) * 10000 + (p[1] || 0) * 100 + (p[2] || 0);
  }

  function fmt(rule) {
    return (rule.msg + ' -> ' + rule.fix).split('{DV}').join(DV);
  }

  function check(text, opts) {
    opts = opts || {};
    var kind = detectKind(text, opts);
    var findings = [];
    if (!kind) return { kind: '', findings: findings, blockers: 0, ready: false };
    var lines = String(text).split(/\r?\n/);
    var byId = {};
    RULES.forEach(function (r) { byId[r.id] = r; });
    function add(rule, line) {
      findings.push({ check: rule.id + ' ' + rule.check, sev: rule.sev, msg: fmt(rule), line: line, fix: rule.fix.split('{DV}').join(DV), source: rule.source });
    }
    var section = '';
    var st = { reqLine: 0, req: '', inReq: false, licLine: 0, lic: '', impLine: 0, hasProject: false, hasFlitMeta: false };
    lines.forEach(function (raw, i) {
      var ln = i + 1;
      var t = raw.trim();
      if (!t || t.charAt(0) === '#' || (kind === 'setup.cfg' && t.charAt(0) === ';')) return;
      var h = /^\[([^\]]+)\]/.exec(t);
      if (h && kind !== 'setup.py') section = h[1].trim();
      RULES.forEach(function (r) {
        if (!r.re || r.files.indexOf(kind) < 0) return;
        if (new RegExp(r.re).test(raw)) add(r, ln);
      });
      if (kind !== 'pyproject.toml') return;
      if (section === 'project') st.hasProject = true;
      if (/^tool\.flit\.metadata/.test(section)) st.hasFlitMeta = true;
      if (section === 'build-system' && /^requires\s*=/.test(t)) { st.reqLine = ln; st.inReq = true; st.req = ''; }
      if (st.inReq) { st.req += ' ' + t; if (/\]/.test(t)) st.inReq = false; }
      if (section === 'project') {
        var lic = /^license\s*=\s*"([^"]*)"/.exec(t);
        if (lic) { st.licLine = ln; st.lic = lic[1]; }
        if (/^import-(names|namespaces)\s*=/.test(t) && !st.impLine) st.impLine = ln;
        var dyn = /^dynamic\s*=\s*\[([^\]]*)\]/.exec(t);
        if (dyn) {
          var items = (dyn[1].match(/"([^"]+)"|'([^']+)'/g) || []).map(function (s) { return s.slice(1, -1); });
          if (items.indexOf('import-names') >= 0 || items.indexOf('import-namespaces') >= 0) st.impLine = st.impLine || ln;
          var bad = items.filter(function (x) { return DYN_OK.indexOf(x) < 0; });
          if (bad.length) {
            var r10 = byId.PP10;
            findings.push({ check: r10.id + ' ' + r10.check, sev: r10.sev, msg: fmt(r10) + ' (' + bad.join(', ') + ')', line: ln, fix: r10.fix, source: r10.source });
          }
        }
      }
    });
    if (kind === 'pyproject.toml') {
      var m = /flit[_-]core\s*([^"'\]]*)/i.exec(st.req);
      if (m) {
        var spec = m[1];
        var lo = /(?:>=|~=|==)\s*([\d.]+)/.exec(spec);
        var lower = lo ? ver(lo[1]) : 0;
        if (/<\s*4\b/.test(spec)) { if (st.hasProject && !st.hasFlitMeta) add(byId.PP06, st.reqLine); }
        else if (!/<\s*5\b/.test(spec)) add(byId.PP05, st.reqLine);
        if (st.licLine && lower < ver('3.11')) add(byId.PP07, st.licLine);
        if (st.licLine && /\bWITH\b/.test(st.lic) && lower < ver('4.1')) add(byId.PP08, st.licLine);
        if (st.impLine && lower < ver('4')) add(byId.PP09, st.impLine);
      }
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    var blockers = findings.filter(function (f) { return /BLOCKER/.test(f.msg); }).length;
    return { kind: kind, findings: findings, blockers: blockers, ready: findings.length === 0 };
  }

  var api = { engine: { check: check, detectKind: detectKind }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.FLITENGINE = api;
})();
