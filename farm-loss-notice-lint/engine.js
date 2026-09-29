/* Farm Loss Notice Lint — crop insurance notice and claim deadlines, 7 CFR 457.8 section 14. Runs in Node and in the browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FL_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });

  const DAY = 86400000;
  // "2026-07-14" -> {d, iso:true}; "07/14/2026" -> read as US month/day, iso:false
  function parseDate(v) {
    v = String(v || '').trim();
    let m = v.match(/^(20\d\d)-(\d\d)-(\d\d)\b/);
    if (m) return { t: Date.UTC(+m[1], +m[2] - 1, +m[3]), iso: true };
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/);
    if (m) return { t: Date.UTC(+m[3], +m[1] - 1, +m[2]), iso: false };
    return null;
  }
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const plus = (t, days) => t + days * DAY;
  const yes = v => /^(y|yes|true|left|done)\b/i.test(String(v || '').trim());

  function units(lines) {
    const out = []; let u = null;
    lines.forEach((line, i) => {
      const h = line.match(/^#{1,4}\s+(.*)$/);
      if (h) { u = { title: h[1].trim(), line: i + 1, f: {} }; out.push(u); return; }
      const kv = line.match(/^\s*[-*]?\s*([a-z_]+)\s*:\s*(.*?)\s*$/i);
      if (kv && u) u.f[kv[1].toLowerCase()] = { v: kv[2], line: i + 1 };
    });
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    const todayS = String(opts.today || new Date().toISOString()).slice(0, 10);
    const today = (parseDate(todayS) || { t: Date.now() }).t;
    const findings = [];
    const lines = String(text || '').split(/\r?\n/);
    units(lines).forEach(u => {
      const F = u.f;
      const add = (id, msg, line) => findings.push({ check: id, sev: R[id].sev, msg: `${u.title}: ${msg}`, line: line || u.line });
      const D = {};
      Object.keys(F).forEach(k => {
        const p = parseDate(F[k].v);
        if (!p) return;
        D[k] = p.t;
        if (!p.iso) add('ambiguous-date', `${k} "${F[k].v}" — write ${iso(p.t)} (YYYY-MM-DD); read here as US month/day.`, F[k].line);
      });
      const found = D.damage_discovered, notice = D.notice_given, end = D.insurance_period_end;

      if (found != null && notice != null && notice > plus(found, R['notice-72h'].hours / 24))
        add('notice-72h', `damage found ${iso(found)}, notice ${iso(notice)} — due by ${iso(plus(found, 3))} (72 hours).`, F.notice_given.line);
      if (notice != null && end != null && notice > plus(end, R['notice-after-period'].days_after_period))
        add('notice-after-period', `insurance period ended ${iso(end)}, notice ${iso(notice)} — due by ${iso(plus(end, 15))}.`, F.notice_given.line);
      if (found != null && notice == null && today > plus(found, R['notice-missing'].hours / 24))
        add('notice-missing', `damage found ${iso(found)}, no notice_given — overdue since ${iso(plus(found, 3))}; the loss counts as uninsured.`, F.damage_discovered.line);

      if (notice != null && /phone|call|person|verbal|oral/i.test((F.notice_method || {}).v || '')) {
        const due = plus(notice, R['written-confirmation-15d'].days), w = D.written_confirmation;
        if (w != null ? w > due : today > due)
          add('written-confirmation-15d', `${F.notice_method.v} notice ${iso(notice)}, written confirmation ${w != null ? iso(w) : 'missing'} — due by ${iso(due)}.`, (F.written_confirmation || F.notice_method).line);
      }

      const fpd = D.final_planting_date, pp = D.pp_notice;
      if (yes((F.prevented_planting || {}).v) && fpd != null && !yes((F.late_planting || {}).v)) {
        const due = plus(fpd, R['prevented-planting-72h'].hours / 24);
        if (pp != null ? pp > due : today > due)
          add('prevented-planting-72h', `final planting date ${iso(fpd)}, pp_notice ${pp != null ? iso(pp) : 'missing'} — due by ${iso(due)} (72 hours).`, (F.pp_notice || F.final_planting_date).line);
      }

      const rp = /^\s*(rp|revenue)/i.test((F.plan || {}).v || '');
      if (rp && D.harvest_price_release == null && (end != null || found != null))
        add('rp-harvest-price-date', `revenue protection unit without harvest_price_release — the claim date cannot be computed.`, (F.plan).line);
      if (end != null && (!rp || D.harvest_price_release != null)) {
        let due = plus(end, R['claim-60d'].days);
        if (rp) due = Math.max(due, plus(D.harvest_price_release, 60));
        const c = D.claim_submitted;
        if (c != null ? c > due : ((found != null || notice != null) && today > due))
          add('claim-60d', `insurance period ended ${iso(end)}, claim ${c != null ? iso(c) : 'not submitted'} — due by ${iso(due)} (60 days).`, (F.claim_submitted || F.insurance_period_end).line);
      }

      const hs = D.harvest_start;
      if (found != null && hs != null && found > plus(hs, -R['samples-before-harvest'].days) && !yes((F.samples || {}).v))
        add('samples-before-harvest', `damage found ${iso(found)}, harvest starts ${iso(hs)} — leave representative samples intact (samples: left).`, F.damage_discovered.line);
    });
    findings.sort((a, b) => a.line - b.line);
    return { findings };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.FLENGINE = api;
})();
