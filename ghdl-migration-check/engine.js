// GHDL Migration Check engine: finds VHDL lines that Vivado xsim accepts but GHDL rejects or needs a flag for.
// Same file runs in Node (VS Code extension, verify) and in the browser (free web page).
(function (root) {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.GH_RULES;

  // Flags already set for this file, read from comments such as "-- ghdl -a --std=08 -fsynopsys".
  function flagsIn(lines) {
    const c = lines.filter(l => /--/.test(l)).map(l => l.slice(l.indexOf('--'))).join(' ');
    return {
      std08: /--std=(?:08|2008)\b/i.test(c),
      synopsys: /-fsynopsys\b|--ieee=synopsys\b/i.test(c),
      relaxed: /-frelaxed\b/i.test(c)
    };
  }

  function check(text, opts) {
    const lines = String(text || '').split(/\r?\n/);
    const flags = flagsIn(lines);
    const compiled = RULES.map(r => Object.assign({ rx: new RegExp(r.re, r.flags || '') }, r));
    const code = lines.map(l => { const k = l.indexOf('--'); return k >= 0 ? l.slice(0, k) : l; });
    const raw = [];
    code.forEach((line, i) => {
      if (!line.trim()) return;
      for (const r of compiled) {
        if (r.needs && flags[r.needs]) continue;
        if (r.rx.test(line)) raw.push({ r, line: i + 1, text: lines[i].trim() });
      }
    });
    // A plain shared variable only breaks once the file needs --std=08.
    const needs08 = flags.std08 || raw.some(h => h.r.needs === 'std08');
    const findings = raw
      .filter(h => h.r.kind !== 'shared' || needs08)
      .map(h => ({ check: h.r.check, id: h.r.id, sev: h.r.sev, msg: h.r.msg, line: h.line, text: h.text }));
    const ghdlFlags = [needs08 ? '--std=08' : '', findings.some(f => f.id === 'GH05') || flags.synopsys ? '-fsynopsys' : ''].filter(Boolean).join(' ');
    return { findings, errors: findings.filter(f => f.sev === 'error').length, warnings: findings.filter(f => f.sev === 'warn').length,
      ghdl_cmd: ('ghdl -a ' + ghdlFlags).trim(), as_of: (opts && opts.today) || '' };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  root.GHENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
