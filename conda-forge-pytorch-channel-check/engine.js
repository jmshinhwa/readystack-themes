/* conda-forge PyTorch Channel Migration Check engine — same file runs in VS Code (Node) and in the browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.CFP_RULES;

  function compiled() {
    return RULES.map(r => Object.assign({}, r, {
      rx: new RegExp(r.re, r.flags || ''),
      rxAny: r.re_any ? new RegExp(r.re_any, r.flags || '') : null
    }));
  }

  // Track the YAML block a line sits in, so "- pytorch" under channels: is a channel
  // and "- pytorch=2.5.1" under dependencies: is a package.
  function sections(lines) {
    const out = [];
    let cur = '', keyIndent = -1;
    lines.forEach(raw => {
      const t = raw.trim();
      if (t && !t.startsWith('#')) {
        const ind = raw.search(/\S/);
        const key = /^\s*([\w.-]+)\s*:\s*(?:#.*)?$/.exec(raw);
        if (cur && (ind < keyIndent || (ind === keyIndent && !t.startsWith('-')))) cur = '';
        if (key) { cur = key[1] === 'channels' ? 'channels' : key[1] === 'dependencies' ? 'dependencies' : ''; keyIndent = ind; }
      }
      out.push(cur);
    });
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const sec = sections(lines);
    const rules = compiled();
    let raw = [];
    lines.forEach((l, i) => {
      const t = l.trim();
      if (!t || t.startsWith('#')) return;                 // comments in YAML and Dockerfiles
      const code = l.replace(/\s#.*$/, '');
      rules.forEach(r => {
        const inSec = !r.section || sec[i] === r.section;
        const hit = (inSec && r.rx.test(code)) || (r.rxAny && r.rxAny.test(code));
        if (!hit) return;
        raw.push({ check: r.id, sev: r.sev, line: i + 1, msg: r.title + ' → ' + r.fix, fix: r.fix, text: t.slice(0, 160), needs: !!r.needs_channel, marks: !!r.marks_channel });
      });
    });
    const usesChannel = raw.some(f => f.marks);
    const findings = raw.filter(f => !f.needs || usesChannel).map(f => { delete f.needs; delete f.marks; return f; });
    const errors = findings.filter(f => f.sev === 'error').length;
    return { findings, errors, warnings: findings.length - errors, uses_pytorch_channel: usesChannel, rule_count: RULES.length, as_of: opts.today || '' };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.CFPENGINE = api;
})();
