/* Kostentabellen-Lint — GKG & RVG ab 1.6.2025 (KostRÄG 2025). Läuft in Node und im Browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.KT_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });

  // "1.000" / "1 000" / "1_000" / "161,00" / "354.5" -> Zahl
  function numbers(line) {
    const out = [];
    const re = /\d{1,3}(?:[._  ]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?/g;
    let m;
    while ((m = re.exec(line))) {
      let t = m[0];
      if (/^\d{1,3}([._  ]\d{3})+(,\d+)?$/.test(t)) t = t.replace(/[._  ]/g, '').replace(',', '.');
      else t = t.replace(',', '.');
      const v = parseFloat(t);
      if (!isNaN(v)) out.push(v);
    }
    return out;
  }
  const has = (arr, v) => arr.some(x => Math.abs(x - v) < 1e-9);
  const eur = v => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  function tableRow(rule, nums, label) {
    for (const k of Object.keys(rule.old)) {
      const t = +k, o = rule.old[k], n = rule.new[k];
      if (has(nums, t) && has(nums, o) && !has(nums, n))
        return `${label} bis ${t.toLocaleString('de-DE')} €: ${eur(o)} ist der Wert von 2021 — seit 1.6.2025 gilt ${eur(n)}.`;
    }
    return null;
  }

  function isoDates(line) {
    const out = [];
    let m; const a = /\b(20\d\d)-(\d\d)-(\d\d)\b/g, b = /\b(\d{1,2})\.(\d{1,2})\.(20\d\d)\b/g;
    while ((m = a.exec(line))) out.push(`${m[1]}-${m[2]}-${m[3]}`);
    while ((m = b.exec(line))) out.push(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    const today = opts.today || new Date().toISOString().slice(0, 10);
    const findings = [];
    // § 71 GKG / § 60 RVG: vor dem 1.6.2025 eingeleitete Verfahren rechnen noch nach den Werten von 2021
    if (today < R['tabelle-stand-vor-2025'].cutoff) return { findings };
    const lines = String(text || '').split(/\r?\n/);
    lines.forEach((line, i) => {
      const ln = i + 1;
      const add = (id, msg) => findings.push({ check: id, sev: R[id].sev, msg, line: ln });
      const nums = numbers(line);
      const low = line.toLowerCase();
      const mahn = /mahn|kv[\s._-]*1100|1100[\s._-]*kv/i.test(line);
      const anwalt = /rvg|anwalt|lawyer|attorney|vv[\s._-]*33\d\d|33\d\d[\s._-]*vv/i.test(line);

      let m = tableRow(R['gkg-tabelle-2021'], nums, 'GKG Anlage 2');
      if (m) add('gkg-tabelle-2021', m);
      m = tableRow(R['rvg-tabelle-2021'], nums, 'RVG Anlage 2');
      if (m) add('rvg-tabelle-2021', m);

      const k = R['kv1100-mindestgebuehr-36'];
      if ((mahn || /mindestgeb|min(imum)?[_\s-]*fee/i.test(line)) && !anwalt && has(nums, k.old_min) && !has(nums, k.new_min))
        add(k.id, `Mahnbescheid-Mindestgebühr ${eur(k.old_min)} — seit 1.6.2025 gilt ${eur(k.new_min)} (Nr. 1100 KV GKG).`);

      const f = R['kv1100-faktor'];
      const fm = line.match(/(faktor|factor|satz|multiplier|rate)\w*["']?\s*[:=]\s*["']?(\d+(?:[.,]\d+)?)/i);
      if (fm && mahn && !anwalt) {
        const v = parseFloat(fm[2].replace(',', '.'));
        if (Math.abs(v - f.factor) > 1e-9)
          add(f.id, `Gerichtsgebühr für den Mahnbescheid mit Faktor ${v.toFixed(1).replace('.', ',')} — Nr. 1100 KV GKG erhebt 0,5.`);
      }

      const s = R['tabelle-stand-vor-2025'];
      if (/gkg|rvg|geb(ü|ue)hrentabelle|kostr(ä|ae)g|fee[\s_-]*table/i.test(low)) {
        const old = isoDates(line).find(d => d < s.cutoff);
        const law = line.match(/kostr(?:ä|ae)g[\s_-]*(20\d\d)/i);
        if (old) add(s.id, `Tabellen-Stand ${old} liegt vor dem 1.6.2025 (KostRÄG 2025) — Werte prüfen.`);
        else if (law && +law[1] < 2025) add(s.id, `Tabelle verweist auf KostRÄG ${law[1]} — seit 1.6.2025 gilt das KostRÄG 2025.`);
      }
    });
    return { findings };
  }

  // Mahnbescheid-Kosten für einen Streitwert bis 50.000 €: Gerichtsgebühr KV 1100 (0,5, min.) + Anwalt VV 3305 (1,0)
  function mahnKosten(streitwert) {
    const g = R['gkg-tabelle-2021'], r = R['rvg-tabelle-2021'], k = R['kv1100-mindestgebuehr-36'];
    const step = Object.keys(g.new).map(Number).sort((a, b) => a - b).find(t => streitwert <= t);
    if (!step) return null;
    const round = v => Math.round(v * 100) / 100;
    return {
      streitwert, stufe: step,
      gericht_neu: round(Math.max(g.new[step] * 0.5, k.new_min)), gericht_alt: round(Math.max(g.old[step] * 0.5, k.old_min)),
      anwalt_neu: r.new[step], anwalt_alt: r.old[step]
    };
  }

  const api = { engine: { check, mahnKosten }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.KTENGINE = api;
})();
