/* Bescheid-Vorlagen Lint — ein Gehirn für VS Code und Browser */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.BSC_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });

  const RE = {
    rbbHead: /Rechtsbehelfsbelehrung|Rechtsmittelbelehrung/i,
    rbbAny: /Rechtsbehelfsbelehrung|Rechtsmittelbelehrung|Widerspruch|Klage\s+(erhoben|beim|bei\s+dem)/i,
    remedy: /Widerspruch|Klage|Rechtsbehelf/i,
    dritter: /(dritten|3\.)\s+Tag(e)?\s+nach\s+(der\s+|dem\s+)?(Aufgabe|Absendung|Abgang|Versand)/i,
    wrongSpan: /\b(zwei|drei|vier|sechs|acht|\d+)\s*(Wochen|Tagen|Tage)\b/i,
    schriftlich: /schriftlich/i,
    niederschrift: /Niederschrift|elektronisch/i,
    aufschiebend: /(hat|haben|entfaltet|entfalten)\s+aufschiebende\s+Wirkung|bis\s+zur\s+Entscheidung\s+(über\s+den\s+Widerspruch\s+)?(müssen|brauchen)\s+Sie\s+nicht\s+(zu\s+)?zahlen/i,
    keineAufschiebend: /keine\s+aufschiebende/i,
    saeumnis: /S(ä|ae)umniszuschl(a|ä|ae)g/i,
    pct: /(\d+(?:[,.]\d+)?)\s*(%|Prozent|v\.\s?H\.)/i,
    vollerMonat: /(jeden|je|pro)\s+(vollen|vollendeten|ganzen)\s+Monat/i,
    klage: /Klage/i,
    vg: /Verwaltungsgericht/i,
    nrw: /Nordrhein-Westfalen|\bNRW\b/i,
    erhalt: /nach\s+(Erhalt|Zugang|Eingang)\b/i
  };

  function find(check, line) {
    const r = R[check];
    return { check, sev: r.sev, msg: r.msg + ' (' + r.law + ') Korrektur: ' + r.fix, line };
  }

  function check(text, opts) {
    opts = opts || {};
    const today = String(opts.today || new Date().toISOString()).slice(0, 10);
    const lines = String(text || '').split(/\r?\n/);
    const out = [];
    const docHas = re => lines.some(l => re.test(l));

    let rbbStart = lines.findIndex(l => RE.rbbHead.test(l));
    const hasRbb = rbbStart >= 0 || docHas(RE.rbbAny);
    if (rbbStart < 0) rbbStart = 0;
    const nrw = opts.land === 'NW' || docHas(RE.nrw);
    let nwDone = false, klageLine = -1, schriftLine = -1;

    lines.forEach((l, i) => {
      const n = i + 1;
      if (RE.dritter.test(l) && today >= R.bekanntgabe_dritter_tag.since) out.push(find('bekanntgabe_dritter_tag', n));
      if (RE.saeumnis.test(l)) {
        const m = l.match(RE.pct);
        if (m && parseFloat(m[1].replace(',', '.')) !== R.saeumnis_satz.rate) out.push(find('saeumnis_satz', n));
        if (RE.vollerMonat.test(l)) out.push(find('saeumnis_voller_monat', n));
      }
      if (RE.aufschiebend.test(l) && !RE.keineAufschiebend.test(l)) out.push(find('aufschiebende_wirkung', n));
      if (i < rbbStart) return;
      if (RE.remedy.test(l) && RE.wrongSpan.test(l)) out.push(find('frist_nicht_monat', n));
      if (RE.remedy.test(l) && RE.erhalt.test(l)) out.push(find('fristbeginn_erhalt', n));
      if (RE.klage.test(l) && klageLine < 0) klageLine = n;
      if (RE.schriftlich.test(l) && schriftLine < 0) schriftLine = n;
      if (nrw && !nwDone && /Widerspruch/i.test(l)) { out.push(find('land_nw_widerspruch', n)); nwDone = true; }
    });

    if (!hasRbb) out.push(find('rbb_fehlt', 1));
    if (klageLine > 0 && !docHas(RE.vg)) out.push(find('klage_ohne_gericht', klageLine));
    if (schriftLine > 0 && !docHas(RE.niederschrift)) out.push(find('form_ohne_niederschrift', schriftLine));

    out.sort((a, b) => a.line - b.line);
    return { findings: out };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.BSCENGINE = api;
})();
