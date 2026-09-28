// Dienstanweisung Bewachung engine: one file, used by the VS Code extension (node) and the web page (browser).
(function () {
  const RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.DAB_RULES;
  const BY = {};
  RULES.forEach(r => { BY[r.check] = r; });
  const BEWACHV_2019 = Date.UTC(2019, 5, 1);

  // Lowercase and fold umlauts so "Stoßwaffen" and "Stosswaffen" match the same rule.
  function norm(s) {
    return String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  }

  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '').trim());
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(t) ? null : t;
  }

  const ACT = {
    oeffentlich: /oeffentlichen?\s+verkehrsraum|tatsaechlich\s+oeffentlichem\s+verkehr|citystreife|city-streife|quartiersstreife|bahnhofsstreife|fussgaengerzone/,
    laden: /ladendieb|ladendetektiv|kaufhausdetektiv|warenhausdetektiv/,
    disko: /diskothek|tuersteher|clubeinlass/,
    unterkunft: /fluechtlingsunterkunft|asylunterkunft|aufnahmeeinrichtung|gemeinschaftsunterkunft|asylsuchende/,
    gross: /grossveranstaltung|festivalgelaende|stadion/
  };
  const ACT_NAME = {
    oeffentlich: 'Kontrollgänge im öffentlichen Verkehrsraum', laden: 'Schutz vor Ladendieben', disko: 'Einlass Diskothek',
    unterkunft: 'Bewachung einer Flüchtlingsunterkunft', gross: 'zugangsgeschützte Großveranstaltung'
  };
  const LEAD = /schichtleit|einsatzleit|teamleit|leitende[rn]?\s+funktion/;
  const COMPANY = /gewerbetreibend|unternehmen|arbeitgeber|geschaeftsfuehrung|geschaeftsleitung/;

  function check(text, opts) {
    opts = opts || {};
    const src = String(text || '');
    const lines = src.split(/\r?\n/).map(norm);
    // Flatten whitespace so hard-wrapped sentences are read as one.
    const flat = norm(src).replace(/\s+/g, ' ');
    const sentences = flat.split(/(?<=[.!?;])\s+|\s+(?=#+\s)/);
    const findings = [];
    const lineOf = (re, dflt) => { const i = lines.findIndex(l => re.test(l)); return i >= 0 ? i + 1 : (dflt || 1); };
    const add = (check, line, what) => {
      const r = BY[check];
      findings.push({ check, sev: r.sev, line: line || 1, msg: `${r.id} ${r.title} (${r.ref}): ${what}. Fix: ${r.fix}` });
    };
    if (!flat.trim()) return { findings: [], error: 'Leere Datei' };

    // BW01 police-status hint
    const hasHint = sentences.some(s => /polizei/.test(s) && /befugnis|eigenschaft/.test(s) && /\bnicht\b|\bkeine?[nrs]?\b/.test(s));
    if (!hasHint) add('polizei-hinweis', lineOf(/rechtsstellung|befugnis/), 'kein Satz, dass die Wachperson keine Polizeibefugnisse hat');

    // BW02 outdated wording
    if (/hilfspolizei/.test(flat)) add('hilfspolizei-altformel', lineOf(/hilfspolizei/), '"Hilfspolizeibeamter" steht nicht im geltenden Wortlaut');

    // BW03 weapons only with the operator's consent
    const miss3 = [];
    if (!/(zustimmung|genehmigung|einwilligung)\s+(des|der)\s+(gewerbetreibenden|unternehmens|arbeitgebers|geschaeftsfuehrung|geschaeftsleitung|firma)/.test(flat)) miss3.push('Zustimmung des Gewerbetreibenden');
    if (!/schusswaffe/.test(flat)) miss3.push('Schusswaffen');
    if (!/hieb-?\s*und\s*stosswaffe|hiebwaffe|stosswaffe|schlagstock/.test(flat)) miss3.push('Hieb- und Stoßwaffen');
    if (!/reizstoff|pfefferspray|reizgas/.test(flat)) miss3.push('Reizstoffsprühgeräte');
    if (miss3.length) add('waffen-zustimmung', lineOf(/waffe|reizstoff|pfefferspray|ausruestung/), 'es fehlt: ' + miss3.join(', '));

    // BW04 report every use to police and operator
    let best = null;
    sentences.forEach((s, i) => {
      if (!/gebrauch/.test(s)) return;
      const w = s + ' ' + (sentences[i + 1] || '');
      const miss = [];
      if (!/unverzueglich|sofort/.test(w)) miss.push('unverzüglich');
      if (!/polizei/.test(w)) miss.push('zuständige Polizeidienststelle');
      if (!COMPANY.test(w)) miss.push('Gewerbetreibender');
      if (!best || miss.length < best.length) best = miss;
    });
    if (!best) add('waffengebrauch-anzeige', lineOf(/waffe|reizstoff/), 'keine Regel zur Anzeige nach Waffengebrauch');
    else if (best.length) add('waffengebrauch-anzeige', lineOf(/gebrauch/), 'Anzeige ohne ' + best.join(', '));

    // BW05 handed over against receipt
    if (!/empfangsbescheinigung|empfangsbestaetigung|empfang\s+(schriftlich\s+)?(bestaetigt|quittiert)/.test(flat)) add('empfangsbescheinigung', lineOf(/aushaendig|abdruck|abschrift|aushang/), 'keine Empfangsbescheinigung vor der ersten Tätigkeit');

    // BW06 confidentiality after leaving
    const secret = /(geschaefts|betriebs)geheimnis|betriebs-\s*und\s*geschaeftsgeheimnis|geschaefts-\s*und\s*betriebsgeheimnis/.test(flat);
    if (!secret || !/ausscheiden|beendigung\s+des\s+(arbeits|beschaeftigungs)/.test(flat)) add('verschwiegenheit', lineOf(/verschwiegen|geheim/), secret ? 'Geheimhaltung ohne "auch nach dem Ausscheiden"' : 'keine Verpflichtung zu Geschäfts- und Betriebsgeheimnissen Dritter');

    // BW07 carry and show the ID
    const miss7 = [];
    if (!/ausweis/.test(flat)) miss7.push('Ausweis');
    if (!/mitzufuehren|mitfuehren|mitgefuehrt|bei sich zu tragen/.test(flat)) miss7.push('mitführen');
    if (!/vorzuzeigen|vorzeigen|vorgezeigt/.test(flat)) miss7.push('auf Verlangen vorzeigen');
    if (miss7.length) add('ausweis-mitfuehren', lineOf(/ausweis/), 'es fehlt: ' + miss7.join(', '));

    // BW08 register IDs on the pass
    if (!/bewacherregister|bewacher-?id|identifikationsnummer/.test(flat)) add('bewacher-id', lineOf(/ausweis/), 'keine Bewacherregister-ID von Wachperson und Unternehmen');

    // BW09 / BW10 activities under § 34a Abs. 1a Satz 2 GewO
    const acts = Object.keys(ACT).filter(k => ACT[k].test(flat));
    const lineAct = k => lineOf(ACT[k]);
    const tagged = acts.filter(k => k !== 'laden');
    if (tagged.length && !/namensschild|kennnummer|schild mit (ihrem |dem )?namen/.test(flat)) {
      add('namensschild', lineAct(tagged[0]), tagged.map(k => ACT_NAME[k]).join(', ') + ' ohne sichtbares Schild');
    }
    const lead = LEAD.test(flat);
    const needSk = acts.filter(k => ['oeffentlich', 'laden', 'disko'].indexOf(k) !== -1 || lead);
    if (needSk.length && !/sachkunde(pruefung|nachweis)|fachkraft fuer schutz|servicekraft fuer schutz|meister fuer schutz/.test(flat)) {
      add('sachkunde', lineAct(needSk[0]), needSk.map(k => ACT_NAME[k]).join(', ') + ' ohne Sachkundeprüfung');
    }

    // BW11 return of weapons and ammunition
    if (/munition|dienstwaffe|waffenschrank|bewaffnet/.test(flat) && !/rueckgabe|zurueckzugeben|zurueckgegeben|abzugeben|abgegeben/.test(flat)) {
      add('waffen-rueckgabe', lineOf(/munition|dienstwaffe|waffenschrank|bewaffnet/), 'Waffen oder Munition werden ausgegeben, die Rückgabe ist nicht geregelt');
    }

    // BW12 template dated before the 2019 BewachV
    const li = lines.findIndex(l => /(stand|fassung|gueltig ab|version)\b/.test(l) && /\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2}/.test(l));
    if (li >= 0) {
      const l = lines[li];
      let m = /(\d{4})-(\d{2})-(\d{2})/.exec(l), t = null;
      if (m) t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
      else { m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(l); t = Date.UTC(+m[3], +m[2] - 1, +m[1]); }
      if (!isNaN(t) && t < BEWACHV_2019) {
        const today = parseDay(opts.today);
        const age = today === null ? '' : `, ${Math.round((today - t) / 86400000)} Tage alt`;
        add('stand-vor-2019', li + 1, `Stand ${new Date(t).toISOString().slice(0, 10)}${age}`);
      }
    }

    findings.sort((a, b) => a.line - b.line);
    return { findings };
  }

  const API = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.DAB_ENGINE = API;
})();
