// GPSR Listing Lint — engine. Same file runs in Node (extension) and in the browser (free web page).
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.GPSR_RULES;

var RULE_BY_ID = {};
RULES.forEach(function (r) { RULE_BY_ID[r.id] = r; });

// ---- column vocabulary -------------------------------------------------
var COLS = {
  mfr_name: ['manufacturer', 'manufacturername', 'manufacturerinfo', 'manufacturerinfoname', 'brand', 'productbrand', 'hersteller', 'fabricant', 'marque', 'fabricante'],
  mfr_post: ['manufactureraddress', 'manufacturerpostaladdress', 'manufacturerinfoaddress', 'manufacturerpostal', 'brandaddress', 'herstelleradresse', 'adressefabricant'],
  mfr_elec: ['manufactureremail', 'manufacturercontact', 'manufacturercontacturl', 'manufacturerurl', 'manufacturerinfoemail', 'herstelleremail', 'contactemail', 'emailfabricant'],
  rp_name: ['responsibleperson', 'responsiblepersonname', 'euresponsibleperson', 'rpname', 'authorisedrepresentative', 'authorizedrepresentative', 'eurepresentative', 'bevollmaechtigter', 'importer', 'importerinfo', 'importername', 'personneresponsable'],
  rp_post: ['responsiblepersonaddress', 'rpaddress', 'euresponsiblepersonaddress', 'importeraddress', 'importerinfoaddress', 'representativeaddress'],
  rp_elec: ['responsiblepersonemail', 'rpemail', 'importeremail', 'representativeemail', 'responsiblepersoncontact'],
  origin: ['countryoforigin', 'manufacturercountry', 'origin', 'madein', 'productioncountry', 'herkunftsland'],
  pic: ['imagelink', 'image', 'imageurl', 'images', 'imagelink1', 'mainimage', 'picture', 'pictureurl', 'bild'],
  ident: ['gtin', 'ean', 'upc', 'mpn', 'model', 'modelnumber', 'type', 'sku', 'productid', 'partnumber', 'itemnumber', 'artikelnummer'],
  warn: ['warning', 'warnings', 'warningtext', 'safetyinformation', 'safetyinfo', 'safetywarning', 'warnhinweise', 'agewarning', 'hazardwarning'],
  market: ['targetcountry', 'contentlanguage', 'language', 'market', 'locale', 'shippingcountry', 'sellingcountry', 'country'],
  title: ['title', 'name', 'productname', 'producttitle', 'itemtitle', 'description'],
  category: ['producttype', 'googleproductcategory', 'category', 'kategorie', 'categorie']
};

var EU = ('AT BE BG HR CY CZ DK EE FI FR DE GR EL HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO ' +
  'AUSTRIA BELGIUM BULGARIA CROATIA CYPRUS CZECHIA CZECHREPUBLIC DENMARK ESTONIA FINLAND FRANCE GERMANY DEUTSCHLAND GREECE HUNGARY IRELAND ITALY ITALIA LATVIA LITHUANIA LUXEMBOURG MALTA NETHERLANDS POLAND POLSKA PORTUGAL ROMANIA SLOVAKIA SLOVENIA SPAIN ESPANA SWEDEN ICELAND LIECHTENSTEIN NORWAY EU EEA').split(/\s+/);

var PLACEHOLDER = /^(n\/?a|na|tbd|tba|none|null|nil|-+|\.+|0|unknown|see packaging|on packaging|see box|see label|as above|same as above|refer to packaging|contact seller|not applicable|xxx+|todo)$/i;

var WARN_SIGNAL = /(\b\d\s*\+\s*(years|yrs)?|not suitable for children|choking|small parts|lithium|li-ion|battery|batteries|rechargeable|ce mark|ce-mark|\b(110|120|220|230|240)\s*v\b|mains|charger|power adapter|flammable|corrosive|toxic|irritant|aerosol|bleach|solvent|laser|toy\b|toys\b|plush|ride-on|scooter|helmet|cosmetic|candle)/i;

var LANG_OF = { DE: 'de', AT: 'de', CH: 'de', FR: 'fr', BE: 'fr', LU: 'fr', ES: 'es', IT: 'it', PL: 'pl', NL: 'nl', PT: 'pt', SE: 'sv', DK: 'da', FI: 'fi', CZ: 'cs', RO: 'ro', HU: 'hu', GR: 'el', EL: 'el' };
var LANG_MARK = {
  de: /(achtung|warnung|warnhinweis|vorsicht|nicht geeignet|erstickungsgefahr)/i,
  fr: /(attention|avertissement|ne convient pas|danger d|risque)/i,
  es: /(advertencia|atenci|no apto|peligro)/i,
  it: /(avvertenz|attenzione|non adatto|pericolo)/i,
  pl: /(ostrze|uwaga|nie nadaje)/i,
  nl: /(waarschuwing|let op|niet geschikt)/i,
  pt: /(aviso|aten|n.o adequado|perigo)/i,
  sv: /(varning|observera|ej l.mplig)/i,
  da: /(advarsel|bem.rk|ikke egnet)/i,
  fi: /(varoitus|huomio|ei sovellu)/i,
  cs: /(varov.n|upozorn|nen. vhodn)/i,
  ro: /(avertisment|aten|nu este potrivit)/i,
  hu: /(figyelmeztet|vigy.zat|nem alkalmas)/i,
  el: /(προσοχ|προειδοπο)/i
};
var EN_MARK = /(warning|caution|not suitable|choking hazard|keep away from)/i;

var NOREPLY = /^(no-?reply|donotreply|do-not-reply|noreply)@/i;

// ---- parsing -----------------------------------------------------------
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function blank(v) { var s = String(v == null ? '' : v).trim(); return s === '' || PLACEHOLDER.test(s); }

function splitRow(line, d) {
  var out = [], cur = '', q = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === d) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(function (s) { return s.trim(); });
}

function delimOf(head) {
  var best = ',', n = -1;
  [',', ';', '\t', '|'].forEach(function (d) {
    var c = splitRow(head, d).length;
    if (c > n) { n = c; best = d; }
  });
  return best;
}

function parseCSV(text) {
  var lines = text.replace(/\r/g, '').split('\n');
  var hi = 0;
  while (hi < lines.length && lines[hi].trim() === '') hi++;
  if (hi >= lines.length) return null;
  var d = delimOf(lines[hi]);
  var header = splitRow(lines[hi], d).map(norm);
  var rows = [];
  for (var i = hi + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    var cells = splitRow(lines[i], d), rec = {};
    for (var j = 0; j < header.length; j++) rec[header[j]] = cells[j] === undefined ? '' : cells[j];
    rows.push({ line: i + 1, rec: rec });
  }
  return { header: header, rows: rows, headerLine: hi + 1 };
}

function parseXML(text) {
  var lines = text.replace(/\r/g, '').split('\n');
  var rows = [], header = {}, cur = null, start = 0;
  for (var i = 0; i < lines.length; i++) {
    var L = lines[i];
    if (/<(item|entry|product)[\s>]/i.test(L)) { cur = {}; start = i + 1; continue; }
    if (/<\/(item|entry|product)>/i.test(L)) { if (cur) rows.push({ line: start, rec: cur }); cur = null; continue; }
    if (cur) {
      var m = L.match(/<([A-Za-z0-9_:-]+)[^>]*>([\s\S]*?)<\/\1>/);
      if (m) {
        var k = norm(m[1].replace(/^.*:/, ''));
        var v = m[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
        cur[k] = v; header[k] = 1;
      }
    }
  }
  return { header: Object.keys(header), rows: rows, headerLine: 1 };
}

// ---- helpers -----------------------------------------------------------
function colFor(header, group) {
  for (var i = 0; i < COLS[group].length; i++) if (header.indexOf(COLS[group][i]) >= 0) return COLS[group][i];
  return null;
}
function val(rec, header, group) {
  var syn = COLS[group], first = null;
  for (var i = 0; i < syn.length; i++) {
    if (header.indexOf(syn[i]) >= 0) {
      var v = String(rec[syn[i]] == null ? '' : rec[syn[i]]);
      if (first === null) first = v;
      if (!blank(v)) return v;   // any filled synonym column satisfies the field
    }
  }
  return first === null ? '' : first;
}
function anyVal(rec, header, groups) {
  for (var i = 0; i < groups.length; i++) { var v = val(rec, header, groups[i]); if (!blank(v)) return v; }
  return '';
}
function isEU(s) {
  var t = String(s || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!t) return null;
  if (EU.indexOf(t) >= 0) return true;
  for (var i = 0; i < EU.length; i++) if (EU[i].length > 2 && t.indexOf(EU[i]) >= 0) return true;
  var codes = String(s).toUpperCase().match(/\b[A-Z]{2}\b/g) || [];
  for (var j = 0; j < codes.length; j++) if (EU.indexOf(codes[j]) >= 0) return true;
  return false;
}
function label(rec, header) {
  var t = val(rec, header, 'title') || anyVal(rec, header, ['ident']);
  t = t.replace(/\s+/g, ' ').trim();
  return t ? ' — "' + (t.length > 46 ? t.slice(0, 46) + '…' : t) + '"' : '';
}

// ---- check -------------------------------------------------------------
function check(text, opts) {
  opts = opts || {};
  var findings = [];
  var src = String(text || '');
  var doc = /^\s*</.test(src) ? parseXML(src) : parseCSV(src);
  if (!doc || !doc.rows.length) return { findings: findings };
  var H = doc.header, rows = doc.rows, HL = doc.headerLine;

  function add(id, line, extra) {
    var r = RULE_BY_ID[id];
    findings.push({ check: id, sev: r.sev, msg: r.msg + (extra || ''), line: line });
  }

  // file-level: a required column is not in the feed at all
  [['mfr_name', 'A19a-NAME'], ['mfr_post', 'A19a-POST'], ['mfr_elec', 'A19a-ELEC'],
   ['pic', 'A19c-PIC'], ['ident', 'A19c-ID']].forEach(function (p) {
    if (!colFor(H, p[0])) add(p[1], HL, ' No such column in this feed — all ' + rows.length + ' rows fail.');
  });

  var nonEU = rows.filter(function (r) { return isEU(val(r.rec, H, 'origin')) === false; });
  var rpCol = colFor(H, 'rp_name');
  if (nonEU.length && !rpCol) add('A19b-RP', HL, ' No Responsible Person column in this feed — ' + nonEU.length + ' non-EU row(s) fail.');

  var warnCol = colFor(H, 'warn');
  var warnRows = rows.filter(function (r) {
    var hay = val(r.rec, H, 'title') + ' ' + val(r.rec, H, 'category');
    return WARN_SIGNAL.test(hay);
  });
  if (warnRows.length && !warnCol) add('A19d-WARN', HL, ' No warning/safety column in this feed — ' + warnRows.length + ' warning-bearing row(s) fail.');

  rows.forEach(function (row) {
    var rec = row.rec, ln = row.line, tag = label(rec, H);

    if (colFor(H, 'mfr_name')) {
      var mn = val(rec, H, 'mfr_name');
      if (blank(mn)) add('A19a-NAME', ln, tag);
      else if (/^(generic|unbranded|no ?brand|oem|noname|no name|assorted|various|own brand)$/i.test(mn.trim())) add('A19a-NOBRAND', ln, ' Found "' + mn.trim() + '".' + tag);
    }
    if (colFor(H, 'mfr_post') && blank(val(rec, H, 'mfr_post'))) add('A19a-POST', ln, tag);
    if (colFor(H, 'mfr_elec')) {
      var me = val(rec, H, 'mfr_elec');
      if (blank(me)) add('A19a-ELEC', ln, tag);
      else if (NOREPLY.test(me.trim())) add('A19a-NOREPLY', ln, ' Found "' + me.trim() + '".' + tag);
    }
    if (colFor(H, 'pic') && blank(val(rec, H, 'pic'))) add('A19c-PIC', ln, tag);
    if (colFor(H, 'ident') && blank(anyVal(rec, H, ['ident']))) add('A19c-ID', ln, tag);

    var eu = isEU(val(rec, H, 'origin'));
    if (eu === false) {
      var rp = rpCol ? val(rec, H, 'rp_name') : '';
      if (blank(rp)) { if (rpCol) add('A19b-RP', ln, ' Origin "' + val(rec, H, 'origin') + '".' + tag); }
      else {
        var rpAddr = val(rec, H, 'rp_post');
        if (!blank(rpAddr) && isEU(rpAddr) === false) add('A19b-RP-EU', ln, ' Responsible Person address "' + rpAddr + '".' + tag);
        if (colFor(H, 'rp_elec') && blank(val(rec, H, 'rp_elec'))) add('A19b-RP-ELEC', ln, tag);
      }
    }

    var hay = val(rec, H, 'title') + ' ' + val(rec, H, 'category');
    if (WARN_SIGNAL.test(hay) && warnCol) {
      var w = val(rec, H, 'warn');
      if (blank(w)) add('A19d-WARN', ln, tag);
      else {
        var mk = val(rec, H, 'market').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
        var want = LANG_OF[mk];
        if (want && LANG_MARK[want] && !LANG_MARK[want].test(w) && EN_MARK.test(w)) {
          add('A19d-LANG', ln, ' Market ' + mk + ' expects ' + want + ', warning reads English.' + tag);
        }
      }
    }
  });

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.GPSRENGINE = API;
