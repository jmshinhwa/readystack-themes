// Python 3.10 End of Life — pin check. Finds every place a project PINS Python 3.10 (not stdlib API use).
// Every dated sentence comes from rules[0].facts (each with its source URL) — ⛔no date is computed from a rule.
(function () {
  'use strict';
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PY310_RULES;
  var BY = {}; RULES.forEach(function (r) { BY[r.id] = r; });
  var FACTS = RULES[0].facts;
  var RX = {
    docker: /\bpython:3\.10(?![\d])((?:\.\d+)?)((?:-[\w.]+)*)/,
    gha_one: /^\s*-?\s*python-version\s*:\s*(['"]?)3\.10(?:\.\d+|\.x)?\1\s*(?:#.*)?$/,
    arr: /^\s*-?\s*(?:python-version|python|python_version|py|pyver)\s*:\s*\[([^\]]*)\]/,
    arr310: /(['"]?)3\.10(?:\.\d+|\.x)?\1(?=\s*(?:,|$))/,
    arr313: /(['"]?)3\.13(?:\.\d+|\.x)?\1(?=\s*(?:,|$))/,
    key: /^(\s*)-?\s*(?:python-version|python|python_version)\s*:\s*(?:#.*)?$/,
    item: /^(\s*)-\s*(['"]?)3\.(1\d)(?:\.\d+|\.x)?\2\s*(?:#.*)?$/,
    tox: /^\s*(?:env_?list\s*=.*\bpy310\b|\[testenv:[^\]]*\bpy310\b|basepython\s*=\s*python3\.10(?![\d]))/,
    nox: /(?:@nox\.session\(|^\s*PYTHON\w*\s*=)[^#\n]*['"]3\.10['"]/,
    pyver: /^\s*(?:cpython-)?3\.10(?:\.\d+)?\s*$/,
    toolv: /^\s*python\s+(?:[\d.]+\s+)*3\.10(?:\.\d+)?\b/,
    rtxt: /^\s*python-3\.10(?:\.\d+)?\s*$/,
    pipfile: /^\s*python_(?:full_)?version\s*=\s*["']3\.10(?:\.\d+)?["']/,
    reqpy: /^\s*["']?(?:requires-python|python_requires)["']?\s*[=:]\s*["']?([^"'\n#]*)/,
    cap: /(?:==\s*3\.10(?![\d])|~=\s*3\.10(?![\d])|<\s*3\.11(?![\d])|<=\s*3\.10(?![\d]))/,
    classifier: /Programming Language :: Python :: 3\.10(?![\d])/,
    conda: /(?:^|[\s"'-])python\s*={1,2}\s*3\.10(?![\d])/,
    lambda: /(?:\b[Rr]untime["']?\s*[:=]\s*["']?python3\.10(?![\d])|--runtime[ =]["']?python3\.10(?![\d])|\bRuntime\.PYTHON_3_10\b)/,
    gcp: /(?:\b[Rr]untime["']?\s*[:=]\s*["']?python310\b|--runtime[ =]["']?python310\b)/,
    azure: /python\|3\.10(?![\d])/i,
    precommit: /^\s*(?:language_version|python)\s*:\s*["']?python3\.10(?![\d])/
  };
  function base(p) { return String(p || '').replace(/\\/g, '/').split('/').pop(); }
  function days(a, b) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(a || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(b || ''))) return '';
    var d = Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
    return d > 0 ? ' (' + d + ' days from ' + a + ')' : d < 0 ? ' (' + (-d) + ' days ago, counted from ' + a + ')' : ' (that is today)';
  }
  function fact(id, today) {
    var f = FACTS[id]; return f.text + (id === 'aws_lambda' ? ' Next: deprecation 2026-10-31' + days(today, '2026-10-31') + '.' : '') + ' Source: ' + f.source;
  }
  function check(text, opts) {
    opts = opts || {};
    var today = String(opts.today || new Date().toISOString().slice(0, 10)).slice(0, 10), bn = base(opts.path);
    var L = String(text == null ? '' : text).split(/\r?\n/), out = [];
    var real = L.filter(function (s) { return s.trim() && !/^\s*#/.test(s); });
    var isPyver = bn === '.python-version' || (!bn && real.length > 0 && real.length <= 2);
    var isApp = /^app\.ya?ml$/.test(bn);
    var block = null;   // a YAML key `python-version:` followed by a list of versions
    var toxc = false;   // s188 G5 — inside a multi-line tox value (envlist = / [gh-actions] python =): indented lines that name py310 are pins too
    function add(id, i, extra) {
      var r = BY[id];
      out.push({ check: id, sev: r.sev, line: i + 1,
        msg: r.title + ' — ' + fact(r.fact, today) + (extra || '') + ' Fix: ' + r.fix + '. ' + FACTS.replacement.text });
    }
    for (var i = 0; i < L.length; i++) {
      var s = L[i], m;
      if (block && s.trim() !== '' && !/^\s*-/.test(s)) block = null;
      if (/^\s*(?:#|\/\/)/.test(s)) continue;
      if (toxc && s.trim() && !/^\s/.test(s)) toxc = false;
      if (toxc && /^\s/.test(s)) { if (/\bpy310\b/.test(s)) add('tox_env', i); continue; }
      if (/^(?:env_?list|python)\s*=/.test(s)) toxc = true;
      if (block && (m = RX.item.exec(s))) { if (m[3] === '10') add(block.has313 ? 'gha_matrix_has_313' : 'gha_matrix', i); continue; }
      if ((m = RX.key.exec(s))) {
        var ind = m[1].length, has = false;
        for (var j = i + 1; j < L.length && j < i + 20; j++) { var mm = RX.item.exec(L[j]); if (!mm) break; if (mm[3] === '13') has = true; }
        block = { ind: ind, has313: has }; continue;
      }
      if ((m = RX.docker.exec(s))) { add(/(?:buster|bullseye)/.test(m[2]) ? 'docker_old_debian' : 'docker_image', i, /lambda\/python:3\.10/.test(s) ? ' ' + FACTS.aws_lambda.text : ''); continue; }
      if ((m = RX.arr.exec(s))) {
        var parts = m[1].split(',').map(function (x) { return x.trim(); });
        if (parts.some(function (x) { return /^['"]?3\.10(?:\.\d+|\.x)?['"]?$/.test(x); })) {
          add(parts.some(function (x) { return /^['"]?3\.13(?:\.\d+|\.x)?['"]?$/.test(x); }) ? 'gha_matrix_has_313' : 'gha_matrix', i); continue;
        }
      }
      if (RX.gha_one.test(s)) { add('gha_python_version', i); continue; }
      if (RX.lambda.test(s)) { add('aws_lambda_runtime', i); continue; }
      if (RX.gcp.test(s)) { add('gcp_runtime', i, isApp ? ' (app.yaml is App Engine: its runtimes follow the App Engine support schedule — the PSF end of life on 2026-10-01 still applies.)' : ''); continue; }
      if (RX.azure.test(s)) { add('azure_linuxfx', i); continue; }
      if (RX.precommit.test(s)) { add('precommit_python', i); continue; }
      if (RX.tox.test(s)) { add('tox_env', i); continue; }
      if (RX.nox.test(s) && (bn === 'noxfile.py' || /nox/.test(s))) { add('nox_python', i); continue; }
      if (RX.rtxt.test(s)) { add('runtime_txt', i); continue; }
      if (RX.toolv.test(s)) { add('python_version_file', i); continue; }
      if (isPyver && RX.pyver.test(s)) { add('python_version_file', i); continue; }
      if (RX.pipfile.test(s)) { add('pipfile_python', i); continue; }
      if ((m = RX.reqpy.exec(s)) && RX.cap.test(m[1])) { add('requires_python_cap', i); continue; }
      if (RX.classifier.test(s)) { add('classifier_310', i); continue; }
      if (RX.conda.test(s)) { add('conda_python', i); continue; }
    }
    return { findings: out, today: today, rules: RULES.length };
  }
  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, FACTS: FACTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PY310ENGINE = API;
})();
