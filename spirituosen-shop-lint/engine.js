// Spirituosen-Lint engine — checks a spirits shop product CSV (one product per row).
// Same file runs in the VS Code extension (node) and in the free web page (browser).
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SPIRIT_RULES;

  const CATS = RULES.filter(r => r.kind === 'min_abv');
  const BY_KIND = k => RULES.filter(r => r.kind === k);
  const ONE = k => RULES.find(r => r.kind === k);

  function eur(n) {
    return n.toFixed(2).replace('.', ',') + ' €';
  }
  function num(v) {
    return String(v).replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  }
  function fmt(n) {
    return String(n).replace('.', ',');
  }

  function splitRow(line, d) {
    const out = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === d) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.replace(/\s+/g, ' ').trim());
  }

  function mapHeader(cells) {
    const m = {};
    cells.forEach((raw, i) => {
      const h = raw.toLowerCase().replace(/[^a-zäöüß]/g, '');
      const set = k => { if (m[k] === undefined) m[k] = i; };
      if (/steuer|duty/.test(h)) set('tax');
      else if (/zucker|sugar/.test(h)) set('sugar');
      else if (/alkohol|alcohol|abv|^vol$|volprozent/.test(h)) set('abv');
      else if (/inhalt|volum|füllmenge|fuellmenge|fullmenge|size|flasche/.test(h)) set('volume');
      else if (/kategor|categor|sorte|^typ|type|warengruppe/.test(h)) set('category');
      else if (/name|titel|title|bezeichnung|artikel/.test(h) && !/nummer|nr$|sku|id$/.test(h)) set('name');
    });
    return m;
  }

  function parseAbv(raw) {
    const m = /(\d+(?:[.,]\d+)?)/.exec(raw || '');
    if (!m) return null;
    const dec = /[.,](\d+)/.exec(m[1]);
    return { v: parseFloat(num(m[1])), decimals: dec ? dec[1].length : 0 };
  }

  function parseVolumeMl(raw) {
    const m = /(\d+(?:[.,]\d+)?)\s*(ml|cl|l|liter|litre)?\b/i.exec(raw || '');
    if (!m) return null;
    const v = parseFloat(num(m[1]));
    const u = (m[2] || '').toLowerCase();
    if (u === 'ml') return v;
    if (u === 'cl') return v * 10;
    if (u) return v * 1000;
    return v <= 5 ? v * 1000 : v;
  }

  function parseMoney(raw) {
    const m = /(\d[\d.]*(?:,\d+)?|\d+(?:\.\d+)?)/.exec(raw || '');
    return m ? parseFloat(num(m[1])) : null;
  }

  function hasWord(text, w) {
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-zäöüß])' + esc + '($|[^a-zäöüß])', 'i').test(text);
  }

  function findCat(text) {
    const t = text.toLowerCase();
    return CATS.find(c => c.parts.some(p => t.includes(p)) || c.words.some(w => hasWord(t, w))) || null;
  }

  function check(text, opts) {
    opts = opts || {};
    const findings = [];
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const hi = lines.findIndex(l => l.trim());
    if (hi < 0) return { findings };
    const head = lines[hi];
    const d = [';', '\t', ','].sort((a, b) => head.split(b).length - head.split(a).length)[0];
    const col = mapHeader(splitRow(head, d));
    const get = (cells, k) => (col[k] === undefined ? '' : (cells[col[k]] || ''));
    const add = (r, line, msg) => findings.push({ check: r.id, sev: r.sev, msg: msg + ' [' + r.ref + ']', line });

    for (let i = hi + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const line = i + 1;
      const cells = splitRow(lines[i], d);
      const name = get(cells, 'name');
      const who = name || ('Zeile ' + line);
      const abvRaw = get(cells, 'abv');
      const abv = parseAbv(abvRaw);
      const ml = parseVolumeMl(get(cells, 'volume'));
      const sugarRaw = get(cells, 'sugar');
      const sugar = sugarRaw ? parseFloat(num(sugarRaw)) : null;
      const taxRaw = get(cells, 'tax');
      const cat = findCat(get(cells, 'category') + ' ' + name);

      if (abv && abv.v <= 1.2) continue;

      const alk = ONE('alkopop');
      const isPop = alk && abv && abv.v > 1.2 && abv.v < 10 &&
        alk.base_words.some(w => hasWord((get(cells, 'category') + ' ' + name).toLowerCase(), w));

      if (!abv) {
        if (cat) add(ONE('abv_missing'), line, who + ': ' + ONE('abv_missing').msg);
        continue;
      }
      if (!cat && !isPop) continue;

      const dec = ONE('abv_decimals');
      if (abv.decimals > 1) add(dec, line, who + ': "' + abvRaw + '" — ' + dec.msg);
      const unit = ONE('abv_unit');
      if (/abv|proof/i.test(abvRaw) || (/%/.test(abvRaw) && !/%\s*vol/i.test(abvRaw)))
        add(unit, line, who + ': "' + abvRaw + '" — ' + unit.msg);

      if (isPop) {
        const la = ml ? ml / 1000 * abv.v / 100 : null;
        add(alk, line, who + ': ' + fmt(abv.v) + ' % vol trinkfertig mit Spirituose = Alkopop. ' +
          (la ? 'Alkopopsteuer ' + eur(la * alk.eur_per_l_a) + ' je Gebinde (5.550 € je hl reiner Alkohol) zusätzlich zur Alkoholsteuer; ' : '') +
          'Hinweis "Abgabe an Personen unter 18 Jahren verboten, § 9 Jugendschutzgesetz" auf der Packung.');
      } else {
        if (abv.v < cat.min)
          add(cat, line, who + ': ' + fmt(abv.v) + ' % vol liegt unter dem Mindestalkohol ' + fmt(cat.min) + ' % vol für "' + cat.label + '" — Verkehrsbezeichnung nicht zulässig.');

        if (sugar !== null && !isNaN(sugar)) {
          RULES.filter(r => (r.kind === 'min_sugar' || r.kind === 'max_sugar') && r.cat === cat.cat).forEach(r => {
            const n = name.toLowerCase();
            if (r.name_has && !n.includes(r.name_has)) return;
            if (r.name_skip && new RegExp(r.name_skip).test(n)) return;
            if (r.kind === 'min_sugar' && sugar < r.limit)
              add(r, line, who + ': ' + fmt(sugar) + ' g/l Zucker, "' + cat.label + '" verlangt mindestens ' + fmt(r.limit) + ' g/l.');
            if (r.kind === 'max_sugar' && sugar > r.limit)
              add(r, line, who + ': ' + fmt(sugar) + ' g/l Zucker, ' + (r.limit === 0
                ? '"' + cat.label + '" darf nicht gesüßt werden.'
                : '"' + cat.label + (r.name_has ? '" mit "' + r.name_has : '') + '" erlaubt höchstens ' + fmt(r.limit) + ' g/l.'));
          });
        }

        const bs = ONE('bottle_size');
        if (ml && ml > 100 && ml < 2000 && !bs.allowed_ml.includes(Math.round(ml)))
          add(bs, line, who + ': ' + fmt(Math.round(ml)) + ' ml ist keine zulässige Nennfüllmenge für Spirituosen — erlaubt: ' + bs.allowed_ml.join(', ') + ' ml.');
      }

      const tx = ONE('tax_amount');
      const declared = parseMoney(taxRaw);
      if (declared !== null && ml) {
        const due = Math.round(ml / 1000 * abv.v / 100 * tx.eur_per_l_a * 100) / 100;
        if (Math.abs(due - declared) > 0.01)
          add(tx, line, who + ': Alkoholsteuer ' + eur(declared) + ' angegeben, fällig sind ' + eur(due) +
            ' (' + fmt(Math.round(ml)) + ' ml × ' + fmt(abv.v) + ' % vol × 1.303 € je hl reiner Alkohol).');
      }
    }
    return { findings };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SPIRITENGINE = api;
})();
