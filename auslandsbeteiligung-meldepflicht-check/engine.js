/* Auslandsbeteiligung Meldepflicht-Check – § 138 Abs. 2 AO. Same file runs in VS Code (node) and in the browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.AM_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });
  const REQUIRED = ['gesellschaft', 'land', 'rechtsform', 'ereignis', 'datum'];
  const EU_EFTA = new Set(R.NR4_DRITTSTAAT_EINFLUSS.eu_efta);

  function fill(tpl, v) { return tpl.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m)); }
  function parseDate(s) {
    s = String(s || '').trim().slice(0, 10);
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/), y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) { y = +m[3]; mo = +m[2]; d = +m[1]; }
    else return null;
    const t = new Date(Date.UTC(y, mo - 1, d));
    if (isNaN(t) || t.getUTCMonth() !== mo - 1) return null;
    return t;
  }
  function de(t) { return String(t.getUTCDate()).padStart(2, '0') + '.' + String(t.getUTCMonth() + 1).padStart(2, '0') + '.' + t.getUTCFullYear(); }
  function num(s) {
    s = String(s || '').replace(/[€%\s]|eur/gi, '');
    if (!s) return null;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  function kind(rf, einordnung) {
    rf = String(rf || '').toLowerCase().trim();
    const e = String(einordnung || '').toLowerCase().trim();
    if (/betriebsst|^betrieb|branch|zweignieder/.test(rf)) return 'bst';
    if (/^llc\b|\bllc$/.test(rf)) return e === 'kapg' ? 'kapg' : e === 'persg' ? 'persg' : 'llc';
    if (/personenges|^persg$|^(lp|llp|kg|ohg|gbr|scs|snc|partnership|cv)$/.test(rf)) return 'persg';
    return 'kapg';
  }
  const DAY = 86400000;

  function check(text, opts) {
    opts = opts || {};
    let today = parseDate(opts.today) || new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
    const findings = [];
    const push = (id, line, v) => findings.push({ check: id, sev: R[id].sev, msg: fill(R[id].msg, v), line });
    const lines = String(text || '').split(/\r?\n/);
    let hi = lines.findIndex(l => l.trim() && !l.trim().startsWith('#'));
    if (hi < 0) return { findings };
    const delim = lines[hi].includes(';') ? ';' : ',';
    const head = lines[hi].split(delim).map(h => h.trim().toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue'));
    const miss = REQUIRED.filter(c => !head.includes(c));
    if (miss.length) { miss.forEach(c => push('SPALTE_FEHLT', hi + 1, { spalte: c })); return { findings }; }
    const rows = [];
    for (let i = hi + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l.trim() || l.trim().startsWith('#')) continue;
      const cells = l.split(delim), o = { _line: i + 1 };
      head.forEach((h, k) => { o[h] = (cells[k] || '').trim(); });
      rows.push(o);
    }
    // Nr. 3 b: acquisition costs summed per company
    const akSum = {};
    rows.forEach(o => { const a = num(o.anschaffungskosten); if (a) akSum[o.gesellschaft.toLowerCase()] = (akSum[o.gesellschaft.toLowerCase()] || 0) + a; });

    rows.forEach(o => {
      const g = o.gesellschaft || '(ohne Namen)', land = (o.land || '').toUpperCase(), line = o._line;
      if (land === 'DE') return;
      const iso = /^[A-Z]{2}$/.test(land);
      if (!iso) push('LAND_UNKLAR', line, { g, land: o.land });
      const dt = parseDate(o.datum);
      if (!dt) { push('DATUM_UNGUELTIG', line, { g, wert: o.datum, spalte: 'datum' }); return; }
      const k = kind(o.rechtsform, o.einordnung);
      const ev = String(o.ereignis || '').toLowerCase();
      const anteil = num(o.anteil), mittelbar = num(o.mittelbar), ak = akSum[g.toLowerCase()] || 0;
      const drittstaat = iso && !EU_EFTA.has(land);
      const beherrschend = /^(ja|j|yes|x|1|true)$/i.test(o.beherrschend || '');
      const nr = [];
      if (k === 'bst' && /gruend|erwerb|aufgabe/.test(ev)) nr.push('Nr. 1');
      if (k === 'persg' || k === 'llc') nr.push(k === 'llc' ? 'Nr. 2/3' : 'Nr. 2');
      if (k === 'kapg' && /gruend|erwerb|veraeu|veräu/.test(ev)) {
        if (anteil === null && mittelbar === null && !ak) push('ANGABE_FEHLT', line, { g, land });
        if ((anteil || 0) >= R.NR3A_ZEHN_PROZENT.pct || (mittelbar || 0) >= R.NR3A_ZEHN_PROZENT.pct) nr.push('Nr. 3a');
        if (ak > R.NR3B_150000_EURO.ak_eur) nr.push('Nr. 3b');
      }
      if (drittstaat && beherrschend) nr.push('Nr. 4');
      if (k === 'llc') push('LLC_EINORDNUNG', line, { g, land });
      if (!nr.length) return;
      const nrTxt = '§ 138 Abs. 2 ' + nr.join(' + ') + ' AO';
      // Due with the return for that year, at the latest 14 months after year end (last day of Feb, year + 2)
      let frist = new Date(Date.UTC(dt.getUTCFullYear() + 2, 2, 0)), grund = '14 Monate nach Jahresende ' + dt.getUTCFullYear();
      const erkl = parseDate(o.erklaerung_am);
      if (o.erklaerung_am && !erkl) push('DATUM_UNGUELTIG', line, { g, wert: o.erklaerung_am, spalte: 'erklaerung_am' });
      if (erkl && erkl < frist) { frist = erkl; grund = 'mit der Steuererklärung ' + dt.getUTCFullYear(); }
      const gem = parseDate(o.gemeldet_am);
      if (o.gemeldet_am && !gem) { push('DATUM_UNGUELTIG', line, { g, wert: o.gemeldet_am, spalte: 'gemeldet_am' }); return; }
      const v = { g, land, nr: nrTxt, frist: de(frist), grund };
      if (gem) {
        if (gem > frist) push('VERSPAETET_GEMELDET', line, Object.assign(v, { gemeldet: de(gem), tage: Math.round((gem - frist) / DAY) }));
      } else {
        if (today > frist) push('FRIST_VERPASST', line, Object.assign(v, { tage: Math.round((today - frist) / DAY) }));
        else push('FRIST_LAEUFT', line, Object.assign(v, { tage: Math.round((frist - today) / DAY) }));
        if (drittstaat && beherrschend) push('ANLAUFHEMMUNG_170_7', line, { g, land });
      }
    });
    return { findings };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.AMENGINE = api;
})();
