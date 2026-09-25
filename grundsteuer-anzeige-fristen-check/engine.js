// Grundsteuer Fristen-Check — gleicher Kern für VS Code und Web.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.GST_RULES;
  const R = {};
  RULES.forEach(r => { R[r.id] = r; });

  const STATES = {
    'baden-württemberg': 'BW', 'baden-wuerttemberg': 'BW', 'bayern': 'BY', 'berlin': 'BE', 'brandenburg': 'BB',
    'bremen': 'HB', 'hamburg': 'HH', 'hessen': 'HE', 'mecklenburg-vorpommern': 'MV', 'niedersachsen': 'NI',
    'nordrhein-westfalen': 'NW', 'nrw': 'NW', 'rheinland-pfalz': 'RP', 'saarland': 'SL', 'sachsen': 'SN',
    'sachsen-anhalt': 'ST', 'schleswig-holstein': 'SH', 'thüringen': 'TH', 'thueringen': 'TH'
  };
  const OWNER = /(verkauf|kauf|eigentümerwechsel|eigentuemerwechsel|erbfall|erbschaft|schenkung|übertragung|uebertragung)/i;
  const CHANGE = /(anbau|ausbau|umbau|neubau|abriss|abbruch|nutzungsänderung|nutzungsaenderung|teilung|vereinigung|wohnfläche|wohnflaeche|fertigstell|aufstockung|umwandlung|bebauung)/i;
  const NEW_BUILD = /(neubau|fertigstell|bebauung)/i;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(d) { return pad(d.getUTCDate()) + '.' + pad(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear(); }
  function fmtEur(n) { return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €'; }

  function parseDate(s) {
    s = String(s || '').trim().slice(0, 10);
    let m, y, mo, d;
    if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else return null;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (isNaN(dt) || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return dt;
  }
  function parseEur(s) {
    s = String(s || '').replace(/[€\s]|EUR/gi, '');
    if (!s) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/\./g, '');
    const n = Number(s);
    return isFinite(n) ? n : null;
  }
  function splitRow(line, sep) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === sep && !q) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(x => x.trim());
  }
  function stateCode(s) {
    s = String(s || '').trim();
    if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
    return STATES[s.toLowerCase()] || '';
  }

  function check(text, opts) {
    opts = opts || {};
    let today = parseDate(String(opts.today || '').slice(0, 10));
    if (!today) { const n = new Date(); today = new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); }
    const findings = [];
    const add = (id, line, msg) => findings.push({ check: id, sev: R[id].sev, msg: msg, line: line });
    const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
    let h = 0;
    while (h < lines.length && !lines[h].trim()) h++;
    if (h >= lines.length) return { findings };
    const sep = (lines[h].split(';').length >= lines[h].split(',').length) ? ';' : ',';
    const head = splitRow(lines[h], sep).map(x => x.toLowerCase().replace(/\s+/g, '_'));
    const alias = { land: 'bundesland', angezeigt: 'angezeigt_am', anzeige_am: 'angezeigt_am', datum_änderung: 'datum' };
    const col = {};
    head.forEach((c, i) => { col[alias[c] || c] = i; });
    const missing = R.SPALTE_FEHLT.required.filter(c => !(c in col));
    if (missing.length) {
      add('SPALTE_FEHLT', h + 1, 'Pflichtspalte fehlt: ' + missing.join(', ') + '. Erwartet: ' + R.SPALTE_FEHLT.required.join(sep) + ';wert_alt;wert_neu');
      return { findings };
    }
    const TH = R.WERTFORTSCHREIBUNG.threshold_eur, RD = R.WERTFORTSCHREIBUNG.round_down_to;
    const cap = fmtEur(R.ANZEIGE_VERSAEUMT.late_fee_cap_eur);

    for (let i = h + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cells = splitRow(lines[i], sep);
      const get = k => (col[k] !== undefined ? (cells[col[k]] || '') : '');
      const ln = i + 1, obj = get('objekt') || 'Objekt ohne Namen', ev = get('ereignis');
      const when = parseDate(get('datum'));
      if (!when) { add('DATUM_UNGUELTIG', ln, obj + ': Änderungsdatum „' + get('datum') + '“ gibt es nicht — ohne Datum lässt sich die Anzeigefrist nicht berechnen.'); continue; }
      const y = when.getUTCFullYear();
      const code = stateCode(get('bundesland'));
      if (R.LANDESMODELL.states[code]) {
        add('LANDESMODELL', ln, obj + ': ' + R.LANDESMODELL.states[code] + ' hat ein eigenes Grundsteuermodell — Anzeigefrist und Fortschreibungsgrenzen nach Landesrecht prüfen, nicht nach §§ 222, 228 BewG.');
        continue;
      }
      if (OWNER.test(ev) && !CHANGE.test(ev)) {
        add('EIGENTUEMERWECHSEL', ln, obj + ': Eigentümerwechsel am ' + fmtDate(when) + ' — Zurechnungsfortschreibung zum 01.01.' + (y + 1) + '. Die Grundsteuer ' + y + ' schuldet, wem das Objekt am 01.01.' + y + ' zugerechnet war (§ 9 Abs. 1, § 10 GrStG); Ausgleich nur über den Kaufvertrag.');
        continue;
      }
      if (!CHANGE.test(ev)) { add('EREIGNIS_UNKLAR', ln, obj + ': Ereignis „' + ev + '“ keiner Anzeigeart zuordenbar — prüfen, ob es Wert, Vermögensart oder Grundstücksart ändert.'); continue; }

      const due = new Date(Date.UTC(y + 1, 2, 31));
      const kind = NEW_BUILD.test(ev) ? ' (Nachfeststellung, § 223 BewG)' : '';
      const filedRaw = get('angezeigt_am');
      const filed = parseDate(filedRaw);
      if (filedRaw && !filed) add('DATUM_UNGUELTIG', ln, obj + ': Anzeigedatum „' + filedRaw + '“ gibt es nicht.');
      else if (filed && filed > due) add('ANZEIGE_VERSPAETET', ln, obj + ': Anzeige am ' + fmtDate(filed) + ' abgegeben, Frist war ' + fmtDate(due) + kind + ' (§ 228 Abs. 2 BewG) — Verspätungszuschlag möglich (§ 152 AO, höchstens ' + cap + ').');
      else if (!filed && today > due) add('ANZEIGE_VERSAEUMT', ln, obj + ': ' + ev + ' vom ' + fmtDate(when) + ' war bis ' + fmtDate(due) + ' anzuzeigen' + kind + ' (§ 228 Abs. 2 BewG) — keine Anzeige eingetragen. Nachholen; Verspätungszuschlag möglich (§ 152 AO, höchstens ' + cap + ').');
      else if (!filed) add('ANZEIGE_OFFEN', ln, obj + ': ' + ev + ' vom ' + fmtDate(when) + ' — Anzeige fällig bis ' + fmtDate(due) + kind + ' (§ 228 Abs. 2 BewG).');

      const alt = parseEur(get('wert_alt')), neu = parseEur(get('wert_neu'));
      if (alt !== null && neu !== null) {
        const diff = Math.floor(neu / RD) * RD - alt;
        if (Math.abs(diff) > TH) add('WERTFORTSCHREIBUNG', ln, obj + ': Grundsteuerwert ' + (diff > 0 ? 'steigt' : 'sinkt') + ' um ' + fmtEur(diff) + ' (' + fmtEur(alt) + ' → ' + fmtEur(Math.floor(neu / RD) * RD) + ') — mehr als ' + fmtEur(TH) + ': Wertfortschreibung zum 01.01.' + (y + 1) + ' (§ 222 Abs. 1 BewG). Neuen Bescheid und Messbetrag prüfen.');
      }
    }
    return { findings };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.GSTENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
