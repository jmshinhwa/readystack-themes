// rf-detr Migration Check engine: finds Ultralytics YOLO (AGPL-3.0) ties in requirements, pyproject, environment.yml, Dockerfiles and Python.
// Same file runs in Node (VS Code extension, verify) and in the browser (free web page).
(function (root) {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.UL_RULES;
  const COMPILED = RULES.map(r => ({ r, rx: new RegExp(r.re, r.flags || '') }));
  // A project that declares itself AGPL-3.0 may use Ultralytics YOLO under the free licence (it must publish the whole source).
  const AGPL_DECL = /(?:^\s*license\s*=\s*(?:\{\s*text\s*=\s*)?["']AGPL-3\.0|org\.opencontainers\.image\.licenses\s*=\s*["']?AGPL-3\.0|^\s*#\s*SPDX-License-Identifier:\s*AGPL-3\.0|License\s*::\s*OSI Approved\s*::\s*GNU Affero)/im;

  function check(text, opts) {
    const today = (opts && opts.today) || new Date().toISOString().slice(0, 10);
    const src = String(text || '');
    const lines = src.split(/\r?\n/);
    const agpl = AGPL_DECL.test(src);
    const findings = [];
    lines.forEach((line, i) => {
      if (/^\s*#/.test(line) && !/^\s*#\s*(?:RUN|FROM)\b/.test(line)) return;   // comments, but not commented-out Dockerfile steps
      // one finding per line: the first (most specific) rule that matches
      const hit = COMPILED.find(c => c.rx.test(line));
      if (!hit) return;
      const r = hit.r;
      let sev = r.sev, msg = r.msg;
      if (agpl && r.check !== 'rfdetr-pml-model') {
        sev = 'info';
        msg = 'This file declares the project AGPL-3.0, which the free Ultralytics licence allows if the complete source of the whole project is published. ' + msg;
      }
      findings.push({ check: r.check, id: r.id, sev, msg, fix: r.fix, source: r.source, line: i + 1, text: line.trim() });
    });
    return {
      findings,
      errors: findings.filter(f => f.sev === 'error').length,
      warnings: findings.filter(f => f.sev === 'warn').length,
      agpl_declared: agpl,
      as_of: today
    };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  root.ULENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
