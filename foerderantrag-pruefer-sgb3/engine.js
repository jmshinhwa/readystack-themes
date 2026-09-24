/* Förderantrag-Prüfer – SGB III engine. Same file runs in Node and the browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FOERDER_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });

  const MONATE = { januar: 1, jan: 1, februar: 2, feb: 2, 'märz': 3, maerz: 3, mrz: 3, april: 4, apr: 4, mai: 5, juni: 6, jun: 6, juli: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12 };

  function parseDate(s) {
    if (!s) return null;
    let m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    m = String(s).match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
    if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    return null;
  }
  function parseMonth(s) {
    if (!s) return null;
    let m = String(s).match(/(\d{4})-(\d{2})(?!-\d)/);
    if (m) return { y: +m[1], m: +m[2] };
    m = String(s).match(/\b(\d{1,2})\s*[\/.]\s*(\d{4})\b/);
    if (m) return { y: +m[2], m: +m[1] };
    m = String(s).toLowerCase().match(/([a-zäöü]+)\s+(\d{4})/);
    if (m && MONATE[m[1]]) return { y: +m[2], m: MONATE[m[1]] };
    return null;
  }
  function parseNum(s) {
    if (s == null) return null;
    const m = String(s).match(/\d[\d.]*(,\d+)?/);
    if (!m) return null;
    return parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
  }
  function eur(n) {
    const r = Math.round(n * 100) / 100;
    const [i, d] = r.toFixed(2).split('.');
    return '€' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d === '00' ? '' : ',' + d);
  }
  function fmtDate(d) {
    return String(d.getUTCDate()).padStart(2, '0') + '.' + String(d.getUTCMonth() + 1).padStart(2, '0') + '.' + d.getUTCFullYear();
  }

  // label patterns (umlaut and ae/oe/ue spellings)
  const F = {
    antrag: /^(antragsdatum|antrag gestellt( am)?|antrag eingereicht( am)?|antrag vom|leistungsantrag( gestellt)?( am)?)$/,
    beginn: /^(beschäftigungsbeginn|beschaeftigungsbeginn|arbeitsbeginn|arbeitsaufnahme|einstellung( am)?|eintritt|maßnahmebeginn|massnahmebeginn|kursbeginn|gründungsdatum|gruendungsdatum|gründung( am)?|gruendung( am)?|beginn( der tätigkeit| der taetigkeit| der selbständigkeit| der selbstaendigkeit)?)$/,
    entgelt: /^(arbeitsentgelt|bruttoentgelt|bruttolohn|bruttogehalt|monatsentgelt|monatsgehalt)( monatlich| \(monatlich\)| pro monat)?$/,
    quote: /^(förderhöhe|foerderhoehe|zuschusshöhe|zuschusshoehe|zuschuss|förderquote|foerderquote)$/,
    dauer: /^(förderdauer|foerderdauer|dauer der förderung|dauer der foerderung)$/,
    beschaeftigte: /^(beschäftigte|beschaeftigte|mitarbeitende|mitarbeiter|betriebsgröße|betriebsgroesse|anzahl beschäftigte|anzahl beschaeftigte)$/,
    lehrgang: /^(lehrgangskosten|übernahme lehrgangskosten|uebernahme lehrgangskosten|erstattung lehrgangskosten)$/,
    entgeltzuschuss: /^(arbeitsentgeltzuschuss|zuschuss zum arbeitsentgelt|entgeltzuschuss)$/,
    stunden: /^(umfang|dauer der maßnahme|dauer der massnahme|stunden|unterrichtsstunden|maßnahmeumfang|massnahmeumfang)$/,
    kugBeginn: /^(beginn kurzarbeit|kurzarbeit ab|kurzarbeit seit|arbeitsausfall ab)$/,
    anzeige: /^(anzeige( arbeitsausfall)?( eingegangen)?( am)?|anzeige über arbeitsausfall|anzeige ueber arbeitsausfall)$/,
    anspruchsmonat: /^(anspruchsmonat|abrechnungsmonat|anspruchszeitraum)$/,
    restanspruch: /^(restanspruch( alg| arbeitslosengeld)?|restanspruch auf arbeitslosengeld|alg-restanspruch)$/,
    pauschale: /^(pauschale|sozialversicherungspauschale|sv-pauschale)$/
  };

  function sectionsOf(lines) {
    const out = []; let cur = { start: 0, lines: [] };
    lines.forEach((l, i) => {
      if (/^#{1,3}\s/.test(l) && cur.lines.length) { out.push(cur); cur = { start: i, lines: [] }; }
      cur.lines.push(l);
    });
    out.push(cur);
    return out;
  }
  function kindOf(text) {
    const t = text.toLowerCase();
    if (/eingliederungszuschuss|\begz\b/.test(t)) return 'egz';
    if (/kurzarbeit/.test(t)) return 'kug';
    if (/gründungszuschuss|gruendungszuschuss/.test(t)) return 'gz';
    if (/weiterbildung|§\s*82\b|qualifizierungschancen/.test(t)) return 'wb';
    return null;
  }
  function fields(sec) {
    const f = {};
    sec.lines.forEach((l, k) => {
      const m = l.replace(/^[\s>*\-|]+/, '').match(/^\**([^:|*]{2,60}?)\**\s*[:|]\s*(.+)$/);
      if (!m) return;
      const key = m[1].trim().toLowerCase(); const val = m[2].replace(/\|\s*$/, '').trim();
      for (const name in F) if (!f[name] && F[name].test(key)) f[name] = { v: val, line: sec.start + k + 1 };
    });
    return f;
  }
  function tierCap(rule, n) { for (const [lt, cap] of rule.tiers) if (n < lt) return cap; return rule.tiers[rule.tiers.length - 1][1]; }

  function check(text, opts) {
    opts = opts || {};
    const today = parseDate(opts.today) || new Date();
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const findings = []; let loss = 0;
    const add = (id, line, msg) => { findings.push({ check: id, sev: R[id].sev, msg: msg + ' (' + R[id].law + ') → ' + R[id].fix, line: line || 1 }); };

    sectionsOf(lines).forEach(sec => {
      const body = sec.lines.join('\n'); const low = body.toLowerCase();
      const kind = kindOf(sec.lines[0]) || kindOf(body);
      if (!kind) return;
      const f = fields(sec);
      const sb = /schwerbehindert|behinderung|behinderte/.test(low);
      const besonders = /besonders betroffen/.test(low);
      const tarif = /betriebsvereinbarung|tarifvertrag|strukturwandel/.test(low);

      // § 324: Antrag vor Beginn (EGZ, WB, GZ)
      if (kind !== 'kug' && f.antrag && f.beginn) {
        const a = parseDate(f.antrag.v), b = parseDate(f.beginn.v);
        if (a && b && a > b) {
          let msg = 'Antrag vom ' + fmtDate(a) + ' liegt nach dem Beginn am ' + fmtDate(b) + ' – die Leistung ist damit ausgeschlossen';
          if (kind === 'egz' && f.entgelt && f.quote && f.dauer) {
            const e = Math.min(parseNum(f.entgelt.v), R.entgelt_ueber_bbg.bbg_2026), q = parseNum(f.quote.v), d = parseNum(f.dauer.v);
            if (e && q && d) { const lost = e * q / 100 * d; loss += lost; msg += '; verloren: ' + eur(lost) + ' (' + eur(e) + ' × ' + q + ' % × ' + d + ' Monate, ohne SV-Pauschale)'; }
          }
          add('antrag_nach_beginn', f.antrag.line, msg);
        }
      }

      if (kind === 'egz') {
        const q = f.quote && parseNum(f.quote.v), d = f.dauer && parseNum(f.dauer.v);
        const qmax = sb ? R.egz_quote_ueber_grenze.max_sb : R.egz_quote_ueber_grenze.max_normal;
        if (q != null && q > qmax) add('egz_quote_ueber_grenze', f.quote.line, 'Förderhöhe ' + q + ' % über dem Höchstsatz von ' + qmax + ' %');
        const r = R.egz_dauer_ueber_grenze; const dmax = sb ? (besonders ? r.max_sb_besonders : r.max_sb) : r.max_normal;
        if (d != null && d > dmax) add('egz_dauer_ueber_grenze', f.dauer.line, 'Förderdauer ' + d + ' Monate über der Höchstdauer von ' + dmax + ' Monaten');
        if (!/nachbeschäftigung|nachbeschaeftigung/.test(low)) add('egz_nachbeschaeftigung_fehlt', sec.start + 1, 'Keine Nachbeschäftigungszeit genannt – endet das Arbeitsverhältnis vorher, wird der Zuschuss teilweise zurückgefordert');
        const e = f.entgelt && parseNum(f.entgelt.v);
        if (e != null && e > R.entgelt_ueber_bbg.bbg_2026) add('entgelt_ueber_bbg', f.entgelt.line, 'Arbeitsentgelt ' + eur(e) + ' über der BBG von ' + eur(R.entgelt_ueber_bbg.bbg_2026) + ' – der Rest zählt nicht');
      }

      if (kind === 'wb') {
        const n = f.beschaeftigte && parseNum(f.beschaeftigte.v);
        [['lehrgang', 'wb_lehrgangskosten_staffel', 'Lehrgangskosten'], ['entgeltzuschuss', 'wb_entgeltzuschuss_staffel', 'Arbeitsentgeltzuschuss']].forEach(([k, id, lab]) => {
          const p = f[k] && parseNum(f[k].v);
          if (p == null || n == null) return;
          const cap = tierCap(R[id], n);
          if (p > cap + R[id].bonus_max || (p > cap && !tarif)) add(id, f[k].line, lab + ' ' + p + ' % bei ' + n + ' Beschäftigten – zulässig sind ' + cap + ' %');
        });
        const h = f.stunden && /stunde|std|ue\b|unterrichtseinheit/i.test(f.stunden.v) ? parseNum(f.stunden.v) : null;
        if (h != null && h <= R.wb_unter_120_stunden.min_hours_exclusive) add('wb_unter_120_stunden', f.stunden.line, 'Umfang ' + h + ' Stunden – gefördert wird erst ab mehr als 120 Stunden');
        if (!/azav|maßnahmenummer|massnahmenummer|zugelassen/.test(low)) add('wb_azav_fehlt', sec.start + 1, 'Keine AZAV-Zulassung der Maßnahme genannt');
      }

      if (kind === 'kug') {
        const kb = f.kugBeginn && parseDate(f.kugBeginn.v), an = f.anzeige && parseDate(f.anzeige.v);
        if (kb && an) {
          const diff = (an.getUTCFullYear() - kb.getUTCFullYear()) * 12 + an.getUTCMonth() - kb.getUTCMonth();
          if (diff > 0) add('kug_anzeige_zu_spaet', f.anzeige.line, 'Anzeige am ' + fmtDate(an) + ', Kurzarbeit seit ' + fmtDate(kb) + ' – ' + diff + (diff === 1 ? ' Monat' : ' Monate') + ' ohne Kurzarbeitergeld');
        }
        const am = f.anspruchsmonat && parseMonth(f.anspruchsmonat.v);
        if (am) {
          const dl = new Date(Date.UTC(am.y, am.m - 1 + R.kug_ausschlussfrist.months_after + 1, 0));
          const la = f.antrag && parseDate(f.antrag.v);
          const mm = String(am.m).padStart(2, '0') + '/' + am.y;
          if (la && la > dl) add('kug_ausschlussfrist', f.antrag.line, 'Leistungsantrag am ' + fmtDate(la) + ' – Frist für ' + mm + ' endete am ' + fmtDate(dl) + ', der Monat ist verloren');
          else if (!la) {
            const days = Math.round((dl - today) / 86400000);
            if (days < 0) add('kug_ausschlussfrist', f.anspruchsmonat.line, 'Kein Leistungsantrag – Frist für ' + mm + ' endete am ' + fmtDate(dl));
            else if (days <= R.kug_ausschlussfrist.warn_days) findings.push({ check: 'kug_ausschlussfrist', sev: 'warning', msg: 'Frist für ' + mm + ' endet am ' + fmtDate(dl) + ' (noch ' + days + ' Tage) (' + R.kug_ausschlussfrist.law + ') → ' + R.kug_ausschlussfrist.fix, line: f.anspruchsmonat.line });
          }
        }
      }

      if (kind === 'gz') {
        const rest = f.restanspruch && parseNum(f.restanspruch.v);
        if (rest != null && rest < R.gz_restanspruch_150.min_days) add('gz_restanspruch_150', f.restanspruch.line, 'Restanspruch ' + rest + ' Tage – nötig sind mindestens 150 Tage bei Gründung');
        if (!/tragfähigkeit|tragfaehigkeit|fachkundige stelle/.test(low)) add('gz_tragfaehigkeit_fehlt', sec.start + 1, 'Keine Tragfähigkeitsbescheinigung einer fachkundigen Stelle erwähnt');
        const p = f.pauschale && parseNum(f.pauschale.v);
        if (p != null && p !== R.gz_pauschale_300.pauschale) add('gz_pauschale_300', f.pauschale.line, 'Pauschale ' + eur(p) + ' statt ' + eur(R.gz_pauschale_300.pauschale) + ' im Monat');
      }
    });
    findings.sort((a, b) => a.line - b.line);
    return { findings, loss: Math.round(loss * 100) / 100, loss_text: loss ? eur(loss) : '' };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.FOERDERENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
