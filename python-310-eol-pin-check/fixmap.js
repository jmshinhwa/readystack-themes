// s188 G5 — Python 3.10 pins -> the safe one-line rewrite (kind 'line'). Pure: fixLine(line, rule) · fixText(text, findings).
// ⛔Never a broken edit: buster/bullseye images, matrices that already list 3.13, tox/nox/requires-python/classifiers and
//   Pipfile python_full_version stay as they are and get the how-to (a library may keep 3.10 support on purpose).
(function () {
  'use strict';
  var MANUAL = {
    docker_old_debian: 'There is no python:3.13 buster/bullseye image. Move to python:3.13-bookworm (or -slim-bookworm) and re-test the apt packages you install.',
    gha_matrix_has_313: 'This matrix already lists 3.13. Drop 3.10 from it, or keep it on purpose if you still promise 3.10 to library users.',
    tox_env: 'Add py313 to envlist (and a [testenv:py313] section if you have one). Drop py310 only when you stop supporting 3.10.',
    nox_python: 'Add "3.13" to the session python list. Drop "3.10" only when you stop supporting 3.10.',
    requires_python_cap: 'Widen the upper bound (for example ">=3.10,<3.14") and run the tests on 3.13. A library may keep 3.10 in the range on purpose.',
    classifier_310: 'Keep this classifier while you still test 3.10; add "Programming Language :: Python :: 3.13".',
    pipfile_python: 'Set python_full_version to the exact 3.13.x you install, then run pipenv lock.'
  };
  var SET = [
    { rule: 'docker_image', re: /\bpython:3\.10(?![\d])(?:\.\d+)?((?:-[\w.]+)*)/, to: function (m) { return 'python:3.13' + m[1]; }, ok: function (m) { return !/(?:buster|bullseye)/.test(m[1]); }, manualRule: 'docker_old_debian' },
    { rule: 'gha_python_version', re: /(python-version\s*:\s*)(['"]?)3\.10(?:\.\d+|\.x)?\2/, to: function (m) { return m[1] + "'3.13'"; } },
    { rule: 'gha_matrix', re: /(^|[\[,\s-])(['"]?)3\.10(?:\.\d+|\.x)?\2(?=\s*(?:,|\]|$|#))/, to: function (m) { return m[1] + (m[2] || "'") + '3.13' + (m[2] || "'"); } },
    { rule: 'python_version_file', re: /^(\s*(?:python\s+(?:[\d.]+\s+)*)?(?:cpython-)?)3\.10(?:\.\d+)?\b/, to: function (m) { return m[1] + '3.13'; } },
    { rule: 'runtime_txt', re: /python-3\.10(?:\.\d+)?/, to: function () { return 'python-3.13'; } },
    { rule: 'pipfile_python', re: /^(\s*python_version\s*=\s*)(["'])3\.10\2/, to: function (m) { return m[1] + m[2] + '3.13' + m[2]; } },
    { rule: 'conda_python', re: /(python\s*={1,2}\s*)3\.10(?![\d])(?:\.\*|\.\d+)?/, to: function (m) { return m[1] + '3.13'; } },
    { rule: 'aws_lambda_runtime', re: /python3\.10(?![\d])|Runtime\.PYTHON_3_10\b/, to: function (m) { return m[0] === 'python3.10' ? 'python3.13' : 'Runtime.PYTHON_3_13'; } },
    { rule: 'gcp_runtime', re: /python310\b/, to: function () { return 'python313'; } },
    { rule: 'azure_linuxfx', re: /(python)\|3\.10(?![\d])/i, to: function (m) { return m[1] + '|3.12'; } },
    { rule: 'precommit_python', re: /python3\.10(?![\d])/, to: function () { return 'python3.13'; } }
  ];
  function fixLine(line, rule) {
    var s = String(line == null ? '' : line);
    for (var k = 0; k < SET.length; k++) {
      var e = SET[k]; if (rule && e.rule !== rule) continue;
      var m = e.re.exec(s); if (!m) continue;
      if (e.ok && !e.ok(m)) return { manual: true, rule: e.manualRule, how: MANUAL[e.manualRule] };
      var after = s.slice(0, m.index) + e.to(m) + s.slice(m.index + m[0].length);
      if (after !== s) return { after: after, rule: e.rule };
    }
    if (rule && MANUAL[rule]) return { manual: true, rule: rule, how: MANUAL[rule] };
    return null;
  }
  function fixText(text, findings) {
    var nl = /\r\n/.test(String(text)) ? '\r\n' : '\n';
    var lines = String(text == null ? '' : text).split(/\r?\n/), applied = [], manual = [], seen = {};
    (findings || []).forEach(function (f) {
      var i = (parseInt(f.line, 10) || 0) - 1; if (i < 0 || i >= lines.length) return;
      var k = i + ':' + f.check; if (seen[k]) return; seen[k] = 1;
      var r = (f.check === 'pipfile_python' && /python_full_version/.test(lines[i])) ? { manual: true, how: MANUAL.pipfile_python } : fixLine(lines[i], f.check);
      if (r && r.after != null) { applied.push({ line: i + 1, rule: r.rule, before: lines[i], after: r.after }); lines[i] = r.after; }
      else manual.push({ line: i + 1, rule: f.check, how: (r && r.how) || MANUAL[f.check] || 'Change this line by hand (see the finding).' });
    });
    return { text: lines.join(nl), applied: applied, manual: manual };
  }
  var API = { fixLine: fixLine, fixText: fixText, MANUAL: MANUAL, kind: 'line' };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PY310FIX = API;
})();
