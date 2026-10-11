// PySimpleGUI tie map: dependency lines (requirements*.txt, pyproject.toml, setup.py, setup.cfg, Pipfile) and .py imports.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PSG_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });
  const SUPPORT_END = R['psg-private-index'].support_end;   // PySimpleSoft support for commercial users ended
  const V6_DATE = R['psg-private-index'].v6_date;           // PySimpleGUI 6 (LGPL3) on PyPI

  function day(opts) {
    const t = String((opts && opts.today) || new Date().toISOString()).slice(0, 10);
    return isNaN(Date.parse(t)) ? new Date().toISOString().slice(0, 10) : t;
  }

  // Version text that follows a package name on the same line: ==5.0.8.3, >=4,<5, "^5.0", = "==5.0" (Pipfile)
  function specAfter(line, idx, name) {
    const rest = line.slice(idx + name.length).replace(/^\s*\[[^\]]*\]/, '');
    const m = rest.match(/^\s*["']?\s*(?:=\s*["'])?\s*((?:[=<>!~^]=?|===)\s*[\d*][\w.*]*(?:\s*,\s*(?:[=<>!~^]=?)\s*[\d*][\w.*]*)*)/);
    return m ? m[1].replace(/\s+/g, '') : '';
  }

  function classify(spec) {
    if (!spec) return 'unpinned';
    if (/^(==|===)5\.0\.8/.test(spec)) return 'stub';
    if (/<=?5(?![\d.]*[1-9])|<=4|^(==|===|~=|\^|~)4/.test(spec)) return 'v4';
    if (/^(==|===|~=|\^|~)5/.test(spec) || (/>=5/.test(spec) && /<6/.test(spec))) return 'v5';
    if (/^(==|===|~=|\^|~|>=)6/.test(spec)) return 'v6';
    return 'unpinned';
  }

  function f(id, line, msg, sev) {
    const r = R[id];
    return { check: id, sev: sev || r.sev, msg: r.title + ' — ' + msg + ' Fix: ' + r.fix, line: line };
  }

  function check(text, opts) {
    const today = day(opts);
    const afterSupport = today > SUPPORT_END;
    const v6Out = today >= V6_DATE;
    const findings = [];
    const lines = String(text || '').split(/\r?\n/);
    lines.forEach((raw, i) => {
      const n = i + 1;
      const line = raw.replace(/\s+#.*$/, '');
      if (/^\s*#/.test(raw)) return;
      if (/pysimplegui\.net\/install/i.test(line)) {
        findings.push(f('psg-private-index', n, 'pip pulls from the index of PySimpleSoft, which shut down (support ended ' + SUPPORT_END + ').', afterSupport ? 'error' : 'warn'));
        return;
      }
      const imp = line.match(/^\s*(?:import\s+(PySimpleGUI(?:Qt|Wx|Web)?)\b|from\s+(PySimpleGUI(?:Qt|Wx|Web)?)\s+import\b)/);
      if (imp) {
        const mod = imp[1] || imp[2];
        if (mod === 'PySimpleGUI') findings.push(f('psg-import', n, 'the licence of this line depends on the installed version: 4.x and 6.x are LGPL3, 5.x is proprietary.'));
        else findings.push(f('psg-port-import', n, mod + ' has an LGPL3 FreeSimpleGUI port.'));
        return;
      }
      const re = /(^|[\s"'\[,(])(PySimpleGUI(?:Qt|Wx|Web)?)(?=\s*$|\s*[=<>!~^;"'\[,\])]|\s+[=<>!~^]|\s*=\s*["{*])/gi;
      let m;
      while ((m = re.exec(line))) {
        const name = m[2];
        const idx = m.index + m[1].length;
        const spec = specAfter(line, idx, name);
        const low = name.toLowerCase();
        if (low === 'pysimpleguiqt') {
          if (/^(==|===|~=)0\.|<5|<=4/.test(spec)) findings.push(f('psg-port-stale', n, name + spec + ' is the pre-5 Qt port.', 'warn'));
          else findings.push(f('psgqt-restricted', n, (spec ? name + spec : 'an unpinned PySimpleGUIQt') + ' installs PyPI 5.0.0, licence "Free To Use But Restricted".'));
        } else if (low === 'pysimpleguiwx' || low === 'pysimpleguiweb') {
          findings.push(f('psg-port-stale', n, name + (spec || '') + ' has had no PyPI release since ' + (low === 'pysimpleguiwx' ? '2021-02-08' : '2020-06-06') + '.'));
        } else {
          const c = classify(spec);
          const sev5 = afterSupport ? 'error' : 'warn';
          if (c === 'stub') findings.push(f('psg5-stub', n, 'PySimpleGUI' + spec + ' on PyPI is a stub that prints a move notice; sg.Window does not exist.', sev5));
          else if (c === 'v5') findings.push(f('psg5-pin', n, 'PySimpleGUI' + spec + ' is proprietary 5.x; Hobbyist keys expire and PySimpleSoft issues no new ones.', sev5));
          else if (c === 'v4') findings.push(f('psg4-pin', n, 'PySimpleGUI' + spec + ' stays on the LGPL3 4.x line.'));
          else if (c === 'unpinned') findings.push(f('psg-unpinned', n, 'PySimpleGUI' + spec + (v6Out ? ' resolves to LGPL3 6.x on PyPI today, but a cache or lock from 2024-2025 can still hold proprietary 5.x.' : ' can resolve to proprietary 5.x.')));
        }
      }
    });
    return { findings: findings, today: today };
  }

  const api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.PSGENGINE = api;
})();
