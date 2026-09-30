// Podman Migration Check engine: finds Docker Desktop ties line by line.
// Same file runs in Node (VS Code extension, verify) and in the browser (free web page).
(function (root) {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.PM_RULES;

  const PORT_RES = [
    /^\s*-\s*["']?(?:\d{1,3}(?:\.\d{1,3}){3}:)?(\d{1,5})(?:-\d{1,5})?:\d{1,5}/, // compose ports list
    /(?:^|\s)(?:-p|--publish)[\s=]+["']?(?:\d{1,3}(?:\.\d{1,3}){3}:)?(\d{1,5})(?:-\d{1,5})?:\d{1,5}/ // docker run -p
  ];
  const IMAGE_RES = [
    /^\s*image:\s*["']?([^\s"'#]+)/,
    /^\s*FROM\s+(?:--platform=\S+\s+)?([^\s#]+)/i,
    /"image"\s*:\s*"([^"]+)"/
  ];

  function isQualified(ref, stages) {
    if (!ref || ref === 'scratch' || ref.startsWith('$') || stages.has(ref.toLowerCase())) return true;
    const first = ref.split('/')[0];
    if (!ref.includes('/')) return false;
    return first.includes('.') || first.includes(':') || first === 'localhost';
  }

  function check(text, opts) {
    const lines = String(text || '').split(/\r?\n/);
    const findings = [];
    const stages = new Set();
    lines.forEach(l => { const m = l.match(/^\s*FROM\s+\S+(?:\s+\S+)*?\s+AS\s+([\w.-]+)/i); if (m) stages.add(m[1].toLowerCase()); });
    const compiled = RULES.map(r => r.kind === 'regex' ? Object.assign({ rx: new RegExp(r.re, r.flags || '') }, r) : r);
    lines.forEach((line, i) => {
      if (/^\s*(#|\/\/)/.test(line)) return;
      for (const r of compiled) {
        let hit = false;
        if (r.kind === 'regex') hit = r.rx.test(line);
        else if (r.kind === 'port') hit = PORT_RES.some(rx => { const m = line.match(rx); return m && +m[1] > 0 && +m[1] < 1024; });
        else if (r.kind === 'image') hit = IMAGE_RES.some(rx => { const m = line.match(rx); return m && !isQualified(m[1], stages); });
        if (hit) findings.push({ check: r.check, id: r.id, sev: r.sev, msg: r.msg, line: i + 1, text: line.trim() });
      }
    });
    return { findings, errors: findings.filter(f => f.sev === 'error').length, warnings: findings.filter(f => f.sev === 'warn').length, as_of: (opts && opts.today) || '' };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  root.PMENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
