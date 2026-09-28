/* Energielabel Feed Check — prüft Produkt-Feeds (CSV) gegen das EU-Energielabel. Läuft in Node und im Browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.EL_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });
  const SCOPE = R.EL01.scope.map(s => Object.assign({}, s, { rx: new RegExp(s.re, 'i') }));
  const COLS = {
    id: /^(id|sku|artikelnummer|artikelnr|item_id)$/,
    title: /^(title|titel|name|produktname|bezeichnung)$/,
    category: /^(category|kategorie|product_type|google_product_category|warengruppe)$/,
    cls: /^(energy_efficiency_class|energieeffizienzklasse|effizienzklasse|energy_class|energieklasse)$/,
    label: /^(energy_label_url|energielabel|energielabel_url|label_url|energy_label)$/,
    sheet: /^(datasheet_url|produktdatenblatt|datenblatt|datasheet|product_information_sheet|product_fiche)$/
  };
  const AG = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const PLUS = ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D'];

  function splitRow(line, d) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === d) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); return out.map(s => s.trim());
  }
  function empty(v) { return !v || /^(-|n\/a|na|null|none|leer)$/i.test(v); }
  function isUrl(v) { return /^(https?:\/\/|\/)\S+$/i.test(v || ''); }
  function normClass(v) { return (v || '').toUpperCase().replace(/\s+/g, '').replace(/^KLASSE/, '').replace(/^CLASS/, ''); }

  function check(text, opts) {
    opts = opts || {};
    const today = String(opts.today || new Date().toISOString()).slice(0, 10);
    const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
    const findings = [];
    const hi = lines.findIndex(l => l.trim() !== '');
    if (hi < 0) return { findings, rows: 0 };
    const head = lines[hi];
    const d = head.includes('\t') ? '\t' : ((head.split(';').length > head.split(',').length) ? ';' : ',');
    const hdr = splitRow(head, d).map(h => h.toLowerCase().replace(/^"|"$/g, ''));
    const col = {}; Object.keys(COLS).forEach(k => { col[k] = hdr.findIndex(h => COLS[k].test(h)); });
    let rows = 0;
    const add = (id, line, extra) => findings.push({ check: id, sev: R[id].sev, line, msg: R[id].title + ' — ' + extra + ' · Fix: ' + R[id].fix });
    for (let i = hi + 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      rows++;
      const c = splitRow(lines[i], d); const g = k => (col[k] >= 0 ? (c[col[k]] || '') : '');
      const name = g('title') || g('id') || ('Zeile ' + (i + 1));
      const hay = (g('category') + ' ' + g('title'));
      const s = SCOPE.find(x => x.rx.test(hay));
      if (!s) continue;
      const live = today >= s.since;
      const cls = normClass(g('cls'));
      const who = '"' + name + '" (' + s.label + ')';
      if (empty(cls)) {
        if (s.id === 'phone') { if (today >= R.EL06.since) add('EL06', i + 1, who + ' hat keine Klasse, Pflicht seit ' + R.EL06.since); else continue; }
        else add('EL01', i + 1, who + ' hat keine Klasse');
      } else if (s.scale === 'AG') {
        if (/^A\++$/.test(cls)) { if (live) add('EL02', i + 1, who + ' steht auf "' + cls + '", Skala A bis G gilt seit ' + s.since); }
        else if (!AG.includes(cls)) add('EL03', i + 1, who + ': "' + g('cls') + '"');
      } else {
        if (!PLUS.includes(cls)) {
          if (AG.includes(cls)) add('EL07', i + 1, who + ' steht auf "' + cls + '"');
          else add('EL03', i + 1, who + ': "' + g('cls') + '"');
        }
      }
      if (s.id === 'phone' && !live) continue;
      if (!isUrl(g('label'))) add('EL04', i + 1, who + ' ohne Link zum Label-Bild');
      if (!isUrl(g('sheet'))) add('EL05', i + 1, who + ' ohne Link zum Produktdatenblatt');
    }
    return { findings, rows };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.ELENGINE = api;
})();
