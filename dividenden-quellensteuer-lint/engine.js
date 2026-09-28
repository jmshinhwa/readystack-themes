/* Dividenden-Quellensteuer-Lint — one engine for VS Code and the free web page. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.DQ_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });

  function eur(n) {
    const s = Math.abs(n).toFixed(2).split('.');
    return (n < 0 ? '-' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1] + ' €';
  }
  function pct(x) { return (Math.round(x * 1000) / 10).toString().replace('.', ',') + ' %'; }
  function num(v) {
    let s = String(v == null ? '' : v).replace(/[€$\s"]|EUR|CHF|USD/gi, '');
    if (!s) return NaN;
    const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
    if (c >= 0 && d >= 0) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (c >= 0) s = s.replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return s === '' || isNaN(+s) ? NaN : +s;
  }
  function isoDate(v) {
    const s = String(v || '').trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return { y: +m[1], iso: m[0] };
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) return { y: +m[3], iso: m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') };
    return null;
  }
  function days(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
  function col(h, re) { return h.findIndex(x => re.test(x)); }

  function check(text, opts) {
    opts = opts || {};
    const today = String(opts.today || new Date().toISOString()).slice(0, 10);
    const lines = String(text || '').split(/\r?\n/);
    const findings = [];
    let hi = -1, sep = ';', H;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].toLowerCase();
      if (/land|country|staat/.test(l) && /brutto|gross/.test(l) && /quellen|withh|qst/.test(l)) {
        hi = i; sep = (lines[i].split(';').length >= lines[i].split(',').length) ? ';' : ',';
        H = lines[i].split(sep).map(x => x.trim().toLowerCase().replace(/"/g, '')); break;
      }
    }
    if (hi < 0) {
      if (lines.some(l => l.trim())) findings.push({ check: 'kopfzeile_fehlt', sev: R.kopfzeile_fehlt.sev, line: 1, msg: R.kopfzeile_fehlt.title + '. ' + R.kopfzeile_fehlt.fix });
      return { findings, total_excess: 0, lost: 0, rows: 0 };
    }
    const cD = col(H, /datum|date|zahltag|valuta|pay/), cL = col(H, /^(land|country|staat|quellenstaat)/),
      cN = col(H, /wertpapier|name|titel|security|aktie/),
      cQ = col(H, /quellen|withh|qst/), cB = col(H, /brutto|gross/);
    const rates = R.qst_ueber_dba.dba_rates, tol = R.qst_ueber_dba.toleranz, alias = R.land_unbekannt.aliases;
    let total = 0, lost = 0, rows = 0;
    for (let i = hi + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const f = lines[i].split(sep).map(x => x.trim().replace(/^"|"$/g, ''));
      rows++;
      const ln = i + 1, name = cN >= 0 ? f[cN] : '';
      const who = name ? name + ': ' : '';
      let land = String(f[cL] || '').toUpperCase();
      if (alias[land]) land = alias[land];
      const b = num(f[cB]), q = num(f[cQ]);
      if (isNaN(b) || isNaN(q) || b <= 0) {
        findings.push({ check: 'zeile_unlesbar', sev: R.zeile_unlesbar.sev, line: ln, msg: who + R.zeile_unlesbar.title + '. ' + R.zeile_unlesbar.fix });
        continue;
      }
      if (!(land in rates)) {
        findings.push({ check: 'land_unbekannt', sev: R.land_unbekannt.sev, line: ln, msg: who + R.land_unbekannt.title + ' (' + (land || 'leer') + ', ' + pct(q / b) + ' einbehalten). ' + R.land_unbekannt.fix });
        continue;
      }
      const rate = rates[land], quote = q / b;
      if (quote <= rate + tol) continue;
      const excess = Math.round((q - b * rate) * 100) / 100;
      total += excess;
      const base = who + pct(quote) + ' einbehalten, anrechenbar ' + pct(rate) + ' — ' + eur(excess) + ' nicht anrechenbar';
      const d = isoDate(cD >= 0 ? f[cD] : '');
      if (land === 'CH' && d) {
        const frist = (d.y + R.ch_frist_verfallen.frist_jahre) + '-12-31';
        const left = days(today, frist);
        if (left < 0) {
          lost += excess;
          findings.push({ check: 'ch_frist_verfallen', sev: R.ch_frist_verfallen.sev, line: ln, excess, msg: base + '. Erstattungsfrist endete am ' + frist + ' (Art. 32 VStG) — Betrag verloren.' });
          continue;
        }
        if (left <= R.ch_frist_bald.warn_tage) {
          findings.push({ check: 'ch_frist_bald', sev: R.ch_frist_bald.sev, line: ln, excess, msg: base + '. Formular 86 bis ' + frist + ' einreichen (noch ' + left + ' Tage).' });
          continue;
        }
        findings.push({ check: 'qst_ueber_dba', sev: R.qst_ueber_dba.sev, line: ln, excess, msg: base + '. Erstattung (Formular 86) möglich bis ' + frist + '.' });
        continue;
      }
      if (land === 'US' && quote >= R.us_ohne_w8ben.w8ben_rate - tol) {
        findings.push({ check: 'us_ohne_w8ben', sev: R.us_ohne_w8ben.sev, line: ln, excess, msg: base + '. ' + R.us_ohne_w8ben.fix });
        continue;
      }
      findings.push({ check: 'qst_ueber_dba', sev: R.qst_ueber_dba.sev, line: ln, excess, msg: base + '. ' + R.qst_ueber_dba.fix });
    }
    total = Math.round(total * 100) / 100; lost = Math.round(lost * 100) / 100;
    return { findings, total_excess: total, lost, rows, summary: rows + ' Dividenden geprüft · ' + eur(total) + ' Quellensteuer über DBA-Satz · davon ' + eur(lost) + ' verfallen' };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length, eur };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.DQENGINE = api;
})();
