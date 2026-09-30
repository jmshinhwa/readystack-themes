// resend-migration-check engine: SendGrid lines that break on Resend. Same file runs in VS Code and the browser.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.RMC_RULES;
  const GATE = new RegExp(RULES[0].gate, 'i');   // files that never mention SendGrid stay silent
  const COMPILED = RULES.map(r => Object.assign({}, r, { rx: new RegExp(r.re) }));

  function day(s) {
    const d = new Date(String(s || '').slice(0, 10) + 'T00:00:00Z');
    return isNaN(d) ? null : d;
  }

  function check(text, opts) {
    opts = opts || {};
    const today = day(opts.today) || day(new Date().toISOString());
    const todayIso = today.toISOString().slice(0, 10);
    const findings = [];
    const src = String(text || '');
    if (!GATE.test(src)) return { findings, today: todayIso };
    const lines = src.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|#|\*|\/\*)/.test(line)) return;
      for (const r of COMPILED) {
        const m = line.match(r.rx);
        if (!m) continue;
        let msg = r.msg;
        if (r.type === 'ts_past') {
          const at = new Date(Number(m[1]) * 1000);
          if (!(at < today)) continue;
          msg = msg.replace('{ts}', at.toISOString().slice(0, 10)).replace('{today}', todayIso);
        } else if (r.type === 'event_map') {
          msg = msg.replace('{ev}', m[2]).replace('{to}', r.map[m[2]]);
        }
        findings.push({ check: r.id, sev: r.sev, msg, line: i + 1 });
      }
    });
    return { findings, today: todayIso };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.RMCENGINE = api;
})();
