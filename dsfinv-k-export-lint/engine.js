/*
 * DSFinV-K Export Lint - Prüfmaschine
 * Der Spalten- und Formatbestand stammt aus der amtlichen index.xml der
 * DSFinV-K 2.4 (BZSt, Stand Januar 2024): 20 Tabellen, 219 Spalten.
 * Dieselbe Datei läuft in VS Code (Node) und im Browser (Webfassung).
 */
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.DSFINVRULES;

var SCHEMA = {"cashpointclosing.csv":{"n":"Stamm_Abschluss","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["Z_BUCHUNGSTAG","a",25,-1],["TAXONOMIE_VERSION","a",10,-1],["Z_START_ID","a",40,-1],["Z_ENDE_ID","a",40,-1],["NAME","a",60,-1],["STRASSE","a",60,-1],["PLZ","a",10,-1],["ORT","a",62,-1],["LAND","a",3,-1],["STNR","a",20,-1],["USTID","a",15,-1],["Z_SE_ZAHLUNGEN","n",0,2],["Z_SE_BARZAHLUNGEN","n",0,2]]},"location.csv":{"n":"Stamm_Orte","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["LOC_NAME","a",60,-1],["LOC_STRASSE","a",60,-1],["LOC_PLZ","a",10,-1],["LOC_ORT","a",62,-1],["LOC_LAND","a",3,-1],["LOC_USTID","a",15,-1]]},"cashregister.csv":{"n":"Stamm_Kassen","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["KASSE_BRAND","a",50,-1],["KASSE_MODELL","a",50,-1],["KASSE_SERIENNR","a",70,-1],["KASSE_SW_BRAND","a",50,-1],["KASSE_SW_VERSION","a",50,-1],["KASSE_BASISWAEH_CODE","a",3,-1],["KEINE_UST_ZUORDNUNG","a",1,-1]]},"slaves.csv":{"n":"Stamm_Terminals","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["TERMINAL_ID","a",50,-1],["TERMINAL_BRAND","a",50,-1],["TERMINAL_MODELL","a",50,-1],["TERMINAL_SERIENNR","a",70,-1],["TERMINAL_SW_BRAND","a",50,-1],["TERMINAL_SW_VERSION","a",50,-1]]},"pa.csv":{"n":"Stamm_Agenturen","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["AGENTUR_ID","n",0,0],["AGENTUR_NAME","a",60,-1],["AGENTUR_STRASSE","a",60,-1],["AGENTUR_PLZ","a",10,-1],["AGENTUR_ORT","a",62,-1],["AGENTUR_LAND","a",3,-1],["AGENTUR_STNR","a",20,-1],["AGENTUR_USTID","a",15,-1]]},"tse.csv":{"n":"Stamm_TSE","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["TSE_ID","n",0,0],["TSE_SERIAL","a",68,-1],["TSE_SIG_ALGO","a",21,-1],["TSE_ZEITFORMAT","a",31,-1],["TSE_PD_ENCODING","a",5,-1],["TSE_PUBLIC_KEY","a",512,-1],["TSE_ZERTIFIKAT_I","a",1000,-1],["TSE_ZERTIFIKAT_II","a",1000,-1]]},"vat.csv":{"n":"Stamm_USt","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["UST_SCHLUESSEL","n",0,0],["UST_SATZ","n",0,2],["UST_BESCHR","a",55,-1]]},"businesscases.csv":{"n":"Z_GV_Typ","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["GV_TYP","a",30,-1],["GV_NAME","a",40,-1],["AGENTUR_ID","n",0,0],["UST_SCHLUESSEL","n",0,0],["Z_UMS_BRUTTO","n",0,5],["Z_UMS_NETTO","n",0,5],["Z_UST","n",0,5]]},"payment.csv":{"n":"Z_Zahlart","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["ZAHLART_TYP","a",25,-1],["ZAHLART_NAME","a",60,-1],["Z_ZAHLART_BETRAG","n",0,2]]},"cash_per_currency.csv":{"n":"Z_Waehrungen","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["ZAHLART_WAEH","a",3,-1],["ZAHLART_BETRAG_WAEH","n",0,2]]},"transactions.csv":{"n":"Bonkopf","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["BON_ID","a",40,-1],["BON_NR","n",0,0],["BON_TYP","a",30,-1],["BON_NAME","a",60,-1],["TERMINAL_ID","a",50,-1],["BON_STORNO","a",1,-1],["BON_START","a",30,-1],["BON_ENDE","a",30,-1],["BEDIENER_ID","a",50,-1],["BEDIENER_NAME","a",50,-1],["UMS_BRUTTO","n",0,2],["KUNDE_NAME","a",50,-1],["KUNDE_ID","a",50,-1],["KUNDE_TYP","a",50,-1],["KUNDE_STRASSE","a",60,-1],["KUNDE_PLZ","a",10,-1],["KUNDE_ORT","a",62,-1],["KUNDE_LAND","a",3,-1],["KUNDE_USTID","a",15,-1],["BON_NOTIZ","a",255,-1]]},"datapayment.csv":{"n":"Bonkopf_Zahlarten","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["BON_ID","a",40,-1],["ZAHLART_TYP","a",25,-1],["ZAHLART_NAME","a",60,-1],["ZAHLWAEH_CODE","a",3,-1],["ZAHLWAEH_BETRAG","n",0,2],["BASISWAEH_BETRAG","n",0,2]]},"lines.csv":{"n":"Bonpos","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["BON_ID","a",40,-1],["POS_ZEILE","a",50,-1],["GUTSCHEIN_NR","a",50,-1],["ARTIKELTEXT","a",255,-1],["POS_TERMINAL_ID","a",50,-1],["GV_TYP","a",30,-1],["GV_NAME","a",40,-1],["INHAUS","a",1,-1],["P_STORNO","a",1,-1],["AGENTUR_ID","n",0,0],["ART_NR","a",50,-1],["GTIN","a",50,-1],["WARENGR_ID","a",40,-1],["WARENGR","a",50,-1],["MENGE","n",0,3],["FAKTOR","n",0,3],["EINHEIT","a",50,-1],["STK_BR","n",0,5]]},"itemamounts.csv":{"n":"Bonpos_Preisfindung","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["BON_ID","a",40,-1],["POS_ZEILE","a",50,-1],["TYP","a",20,-1],["UST_SCHLUESSEL","n",0,0],["PF_BRUTTO","n",0,5],["PF_NETTO","n",0,5],["PF_UST","n",0,5]]},"subitems.csv":{"n":"Bonpos_Zusatzinfo","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["BON_ID","a",40,-1],["POS_ZEILE","a",50,-1],["ZI_ART_NR","a",50,-1],["ZI_GTIN","a",50,-1],["ZI_NAME","a",60,-1],["ZI_WARENGR_ID","a",40,-1],["ZI_WARENGR","a",50,-1],["ZI_MENGE","n",0,3],["ZI_FAKTOR","n",0,3],["ZI_EINHEIT","a",50,-1],["ZI_UST_SCHLUESSEL","n",0,0],["ZI_BASISPREIS_BRUTTO","n",0,5],["ZI_BASISPREIS_NETTO","n",0,5],["ZI_BASISPREIS_UST","n",0,5]]},"transactions_tse.csv":{"n":"TSE_Transaktionen","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["BON_ID","a",40,-1],["TSE_ID","n",0,0],["TSE_TANR","n",0,0],["TSE_TA_START","a",30,-1],["TSE_TA_ENDE","a",30,-1],["TSE_TA_VORGANGSART","a",30,-1],["TSE_TA_SIGZ","n",0,0],["TSE_TA_SIG","a",512,-1],["TSE_TA_FEHLER","a",200,-1],["TSE_VORGANGSDATEN","a",1000,-1]]},"transactions_vat.csv":{"n":"Bonkopf_USt","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["BON_ID","a",40,-1],["UST_SCHLUESSEL","n",0,0],["BON_BRUTTO","n",0,5],["BON_NETTO","n",0,5],["BON_UST","n",0,5]]},"lines_vat.csv":{"n":"Bonpos_USt","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["BON_ID","a",40,-1],["POS_ZEILE","a",50,-1],["UST_SCHLUESSEL","n",0,0],["POS_BRUTTO","n",0,5],["POS_NETTO","n",0,5],["POS_UST","n",0,5]]},"allocation_groups.csv":{"n":"Bonkopf_AbrKreis","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["BON_ID","a",40,-1],["ABRECHNUNGSKREIS","a",50,-1]]},"references.csv":{"n":"Bon_Referenzen","c":[["Z_KASSE_ID","a",50,-1],["Z_ERSTELLUNG","a",30,-1],["Z_NR","n",0,0],["BON_ID","a",40,-1],["POS_ZEILE","a",50,-1],["REF_TYP","a",20,-1],["REF_NAME","a",40,-1],["REF_DATUM","a",30,-1],["REF_Z_KASSE_ID","a",50,-1],["REF_Z_NR","n",0,0],["REF_BON_ID","a",40,-1]]}};

var BON_TYP = ['Beleg','AVRechnung','AVTransfer','AVBestellung','AVTraining','AVBelegstorno','AVBelegabbruch','AVSachbezug','AVSonstige'];
var GV_TYP = ['Umsatz','Pfand','PfandRueckzahlung','Rabatt','Aufschlag','ZuschussEcht','ZuschussUnecht','TrinkgeldAG','TrinkgeldAN','EinzweckgutscheinKauf','EinzweckgutscheinEinloesung','MehrzweckgutscheinKauf','MehrzweckgutscheinEinloesung','Forderungsentstehung','Forderungsaufloesung','Anzahlungseinstellung','Anzahlungsaufloesung','Anfangsbestand','Privatentnahme','Privateinlage','Geldtransit','Lohnzahlung','Einzahlung','Auszahlung','DifferenzSollIst'];
var ZAHLART_TYP = ['Bar','Unbar','Keine','ECKarte','Kreditkarte','ElZahlungsdienstleister','Guthabenkarte'];
var TAXO_MIN = 2.3;
var ZEITSTEMPEL = ['Z_ERSTELLUNG','BON_START','BON_ENDE','TSE_TA_START','TSE_TA_ENDE'];
var DATUM = ['Z_BUCHUNGSTAG','REF_DATUM'];
var PFLICHT = ['Z_KASSE_ID','Z_ERSTELLUNG','Z_NR','BON_ID'];
var RE_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
var RE_DATUM = /^\d{4}-\d{2}-\d{2}$/;

function entferneBom(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }

function zerlege(zeile, trenner) {
  var felder = [], akt = '', inText = false, i;
  for (i = 0; i < zeile.length; i++) {
    var z = zeile.charAt(i);
    if (z === '"') {
      if (inText && zeile.charAt(i + 1) === '"') { akt += '"'; i++; }
      else { inText = !inText; }
    } else if (z === trenner && !inText) { felder.push(akt); akt = ''; }
    else { akt += z; }
  }
  felder.push(akt);
  return felder;
}

function trennerRaten(kopf) {
  var kandidaten = [';', ',', '\t', '|'], beste = ';', max = -1;
  for (var i = 0; i < kandidaten.length; i++) {
    var n = zerlege(kopf, kandidaten[i]).length;
    if (n > max) { max = n; beste = kandidaten[i]; }
  }
  return beste;
}

function tabelleFinden(spalten) {
  var beste = null, bestWert = 0;
  for (var url in SCHEMA) {
    if (!Object.prototype.hasOwnProperty.call(SCHEMA, url)) continue;
    var amt = SCHEMA[url].c, treffer = 0;
    for (var i = 0; i < amt.length; i++) {
      if (spalten.indexOf(amt[i][0]) !== -1) treffer++;
    }
    var wert = (treffer / amt.length) * 0.5 + (treffer / Math.max(spalten.length, 1)) * 0.5;
    if (wert > bestWert) { bestWert = wert; beste = url; }
  }
  return bestWert >= 0.6 ? beste : null;
}

function check(text, opts) {
  opts = opts || {};
  var findings = [];
  function f(id, msg, line) {
    var r = null;
    for (var i = 0; i < RULES.length; i++) { if (RULES[i].id === id) { r = RULES[i]; break; } }
    if (findings.length < 400) {
      findings.push({ check: id, sev: r ? r.sev : 'error', msg: msg, line: line || 1 });
    }
  }
  if (!text) return { findings: findings };
  var roh = entferneBom(String(text));
  var zeilen = roh.split(/\r?\n/);
  var kopfZeile = null, kopfNr = 0, i;
  for (i = 0; i < zeilen.length; i++) {
    if (zeilen[i].trim() !== '') { kopfZeile = zeilen[i]; kopfNr = i + 1; break; }
  }
  if (kopfZeile === null || kopfZeile.indexOf('Z_KASSE_ID') === -1) return { findings: findings };

  var trenner = trennerRaten(kopfZeile);
  if (trenner !== ';') {
    f('trennzeichen', 'Spalten sind mit "' + (trenner === '\t' ? 'TAB' : trenner) + '" getrennt; die DSFinV-K verlangt das Semikolon.', kopfNr);
  }
  var spalten = zerlege(kopfZeile, trenner).map(function (s) { return s.trim(); });

  if (roh.indexOf('\n') !== -1 && roh.indexOf('\r\n') === -1) {
    f('zeilenende_crlf', 'Die Datei verwendet LF; die index.xml legt CRLF als RecordDelimiter fest.', kopfNr);
  }

  var url = tabelleFinden(spalten);
  if (!url) {
    f('tabelle_unbekannt', 'Kein Spaltenbild der 20 amtlichen DSFinV-K-Tabellen passt zu diesem Kopf (' + spalten.length + ' Spalten).', kopfNr);
    return { findings: findings };
  }
  var tab = SCHEMA[url], amt = tab.c, amtNamen = amt.map(function (c) { return c[0]; });

  for (i = 0; i < amtNamen.length; i++) {
    if (spalten.indexOf(amtNamen[i]) === -1) {
      f('spalte_fehlt', tab.n + ' (' + url + '): Pflichtspalte "' + amtNamen[i] + '" fehlt (Position ' + (i + 1) + ' von ' + amtNamen.length + ').', kopfNr);
    }
  }
  for (i = 0; i < spalten.length; i++) {
    if (spalten[i] !== '' && amtNamen.indexOf(spalten[i]) === -1) {
      f('spalte_unbekannt', tab.n + ' (' + url + '): Spalte "' + spalten[i] + '" steht nicht in der amtlichen index.xml.', kopfNr);
    }
  }
  var gemeinsam = spalten.filter(function (s) { return amtNamen.indexOf(s) !== -1; });
  var soll = amtNamen.filter(function (s) { return gemeinsam.indexOf(s) !== -1; });
  for (i = 0; i < soll.length; i++) {
    if (gemeinsam[i] !== soll[i]) {
      f('spalte_reihenfolge', tab.n + ' (' + url + '): an Position ' + (i + 1) + ' steht "' + gemeinsam[i] + '", amtlich ist dort "' + soll[i] + '".', kopfNr);
      break;
    }
  }

  var idx = {};
  for (i = 0; i < spalten.length; i++) idx[spalten[i]] = i;

  for (var z = kopfNr; z < zeilen.length; z++) {
    var zeile = zeilen[z];
    if (zeile.trim() === '') continue;
    var nr = z + 1;
    var werte = zerlege(zeile, trenner);
    if (werte.length !== spalten.length) {
      f('spaltenzahl', 'Zeile hat ' + werte.length + ' Felder, der Spaltenkopf ' + spalten.length + '.', nr);
      continue;
    }
    for (i = 0; i < amt.length; i++) {
      var name = amt[i][0], typ = amt[i][1], maxLen = amt[i][2], nk = amt[i][3];
      if (!(name in idx)) continue;
      var wert = String(werte[idx[name]] === undefined ? '' : werte[idx[name]]).trim();

      if (wert === '') {
        if (PFLICHT.indexOf(name) !== -1) {
          f('pflichtfeld_leer', 'Pflichtfeld "' + name + '" ist leer.', nr);
        }
        continue;
      }
      if (maxLen > 0 && wert.length > maxLen) {
        f('feldlaenge', '"' + name + '" ist ' + wert.length + ' Zeichen lang, erlaubt sind ' + maxLen + '.', nr);
      }
      if (typ === 'n' && nk > 0) {
        if (/^-?\d+\.\d+$/.test(wert)) {
          f('dezimaltrennzeichen', '"' + name + '" = ' + wert + ' - Punkt als Dezimaltrennzeichen; amtlich ist ' + wert.replace('.', ',') + '.', nr);
        } else if (!new RegExp('^-?\\d+(,\\d{1,' + nk + '})?$').test(wert)) {
          f('betrag_ungueltig', '"' + name + '" = ' + wert + ' ist kein Betrag mit bis zu ' + nk + ' Nachkommastellen.', nr);
        }
      } else if (typ === 'n' && nk === 0) {
        if (!/^-?\d+$/.test(wert)) {
          f('ganzzahl_ungueltig', '"' + name + '" = ' + wert + ' ist keine Ganzzahl.', nr);
        }
      }
      if (ZEITSTEMPEL.indexOf(name) !== -1 && !RE_TS.test(wert)) {
        f('zeitstempel_iso', '"' + name + '" = ' + wert + ' entspricht nicht ISO 8601 / RFC 3339 (z. B. 2026-09-22T17:00:01+02:00).', nr);
      }
      if (DATUM.indexOf(name) !== -1 && !RE_DATUM.test(wert)) {
        f('datum_iso', '"' + name + '" = ' + wert + ' sollte JJJJ-MM-TT lauten.', nr);
      }
      if (name === 'BON_TYP' && BON_TYP.indexOf(wert) === -1) {
        f('bon_typ_wert', 'BON_TYP "' + wert + '" ist keiner der 9 Vorgangstypen aus Anhang B.', nr);
      }
      if (name === 'GV_TYP' && GV_TYP.indexOf(wert) === -1) {
        f('gv_typ_wert', 'GV_TYP "' + wert + '" ist keiner der 25 Geschäftsvorfalltypen aus Anhang C.', nr);
      }
      if (name === 'ZAHLART_TYP' && ZAHLART_TYP.indexOf(wert) === -1) {
        f('zahlart_typ_wert', 'ZAHLART_TYP "' + wert + '" ist keine der 7 Zahlarten aus Anhang D.', nr);
      }
      if (name === 'TAXONOMIE_VERSION') {
        if (!/^\d+\.\d+$/.test(wert)) {
          f('taxonomie_version', 'TAXONOMIE_VERSION "' + wert + '" ist nicht im Format X.Y.', nr);
        } else if (parseFloat(wert) < TAXO_MIN) {
          f('taxonomie_veraltet', 'TAXONOMIE_VERSION ' + wert + ' liegt unter 2.3; das BZSt veröffentlicht die DSFinV-K 2.4.', nr);
        }
      }
    }
    if ('TAXONOMIE_VERSION' in idx && String(werte[idx.TAXONOMIE_VERSION]).trim() === '') {
      f('taxonomie_version', 'TAXONOMIE_VERSION ist leer; der Kassenabschluss muss die verwendete Version nennen.', nr);
    }
  }
  return { findings: findings };
}

var AUSGANG = {
  engine: { check: check },
  RULES: RULES,
  RULE_COUNT: RULES.length,
  SCHEMA: SCHEMA,
  TABELLEN: Object.keys(SCHEMA).length
};
if (typeof module !== 'undefined') { module.exports = AUSGANG; }
if (typeof window !== 'undefined') { window.DSFINVENGINE = AUSGANG; }
