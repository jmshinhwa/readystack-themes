'use strict';
// Impressum-Check DE - prueft Impressum-Seiten gegen § 5 DDG, § 18 Abs. 2 MStV und § 36 Abs. 1 VSBG.
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.IMPRESSUM_RULES;
var RULE_COUNT = RULES.length;

var LEGALFORM = /\b(gmbh|mbh|ug\s*\(haftungsbeschr|aktiengesellschaft|\bag\b|kgaa|\bkg\b|\bohg\b|e\.\s?k\.|genossenschaft|\beg\b)/i;
var STREET = /[A-Za-zÄÖÜäöüß.\-]{3,}(stra(?:ss|ß)e|str\.|weg|allee|platz|gasse|ring|damm|chaussee|ufer|markt)\s*\d/i;
var PLZ_ORT = /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß.\- ]{2,}/;
var MAIL = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
var MAIL_FAKE = /\((?:at|ät)\)|\[(?:at|ät)\]|\s(?:at|ät)\s+[A-Za-z0-9\-]+\s+(?:dot|punkt)\s|&#0?64;|&#x40;/i;
var VERTRETER = /gesch(?:ä|ae)ftsf(?:ü|ue)hr|vorstand|vertreten durch|vertretungsberechtigt|komplement(?:ä|ae)r|inhaber/i;
var REGISTER = /handelsregister|registergericht|\bhrb\b|\bhra\b|vereinsregister|partnerschaftsregister|genossenschaftsregister/i;
var USTID = /\bDE\s?\d{9}\b/;
var USTID_WORT = /umsatzsteuer|ust-?\s?id|ust\.?-?idnr|vat\s?id|§\s?27a/i;
var STEUERNR = /steuernummer/i;
var FREIER_BERUF = /rechtsanw(?:a|ä)lt|steuerberater|wirtschaftspr(?:ü|ue)fer|zahnarzt|zahn(?:ä|ae)rzt|\b(?:arzt|(?:ä|ae)rztin|praxis)\b|apotheke|architekt|notar|psychotherapeut|beratende(?:r|n)? ingenieur|ingenieurb(?:ü|ue)ro/i;
var ERLAUBNIS = /§\s?34\s?[cdfhi]\b|gewo\b|versicherungs(?:makler|vermittler|berater)|finanzanlagenvermittler|immobilienmakler|bewachungsgewerbe|heilpraktiker|inkassodienstleist|spielhalle|g(?:ü|ue)terkraftverkehr/i;
var AUFSICHT = /aufsichtsbeh(?:ö|oe)rde|erlaubnisbeh(?:ö|oe)rde|zust(?:ä|ae)ndige beh(?:ö|oe)rde|gewerbeamt|bafin|landesamt f(?:ü|ue)r/i;
var VSBG = /verbraucherschlichtungsstelle|verbraucherstreitbeilegung|streitbeilegungsverfahren|schlichtungsstelle|universalschlichtungsstelle/i;
var PLATZHALTER = /musterstra(?:ss|ß)e|musterstr\.|mustermann|musterfrau|musterfirma|musterstadt|lorem ipsum|\bto\s?do\b|\btbd\b|x{5,}|\[ihr |\[dein |\{\{|<hier /i;
var TMG = /\btmg\b|telemediengesetz/i;
var RSTV = /\brstv\b|rundfunkstaatsvertrag/i;

function stripTags(s) {
  return String(s).replace(/<[^>]*>/g, ' ');
}

function lineOf(lines, re) {
  for (var i = 0; i < lines.length; i++) {
    if (re.test(stripTags(lines[i]))) return i + 1;
  }
  return 1;
}

function byId(id) {
  for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i];
  return {id: id, sev: 'med', msg: id, law: '', fix: ''};
}

function check(text, opts) {
  opts = opts || {};
  var raw = String(text == null ? '' : text);
  var lines = raw.split(/\r?\n/);
  var plain = stripTags(raw);
  var findings = [];

  function hit(id, re) {
    var r = byId(id);
    findings.push({check: id, sev: r.sev, msg: r.law ? (r.law + ' - ' + r.msg + ' ' + r.fix) : r.msg, line: re ? lineOf(lines, re) : 1});
  }

  if (TMG.test(plain)) hit('ddg_veraltete_grundlage', TMG);
  if (RSTV.test(plain)) hit('rstv_veraltet', RSTV);
  if (!PLZ_ORT.test(plain)) hit('anschrift_fehlt', null);
  if (/postfach/i.test(plain) && !STREET.test(plain)) hit('postfach_als_anschrift', /postfach/i);

  var hasMail = MAIL.test(plain);
  var fakeMail = MAIL_FAKE.test(plain);
  if (!hasMail && !fakeMail) hit('email_fehlt', null);
  if (!hasMail && fakeMail) hit('email_verschleiert', MAIL_FAKE);

  var firma = LEGALFORM.test(plain);
  if (firma && !VERTRETER.test(plain)) hit('vertretungsberechtigter_fehlt', LEGALFORM);
  if (firma && !REGISTER.test(plain)) hit('handelsregister_fehlt', LEGALFORM);

  var reg = plain.match(/\bhr[ab]\b[^\n]{0,30}/i);
  if (reg && !/\d/.test(reg[0])) hit('registernummer_fehlt', /\bhr[ab]\b/i);

  if ((USTID_WORT.test(plain) || STEUERNR.test(plain)) && !USTID.test(plain)) {
    hit('ustid_fehlerhaft', USTID_WORT.test(plain) ? USTID_WORT : STEUERNR);
  }

  if (FREIER_BERUF.test(plain) && !(/kammer/i.test(plain) && /berufsbezeichnung/i.test(plain) && /berufsrechtlich/i.test(plain))) {
    hit('kammerangaben_fehlen', FREIER_BERUF);
  }
  if (ERLAUBNIS.test(plain) && !AUFSICHT.test(plain)) hit('aufsichtsbehoerde_fehlt', ERLAUBNIS);
  if (!VSBG.test(plain)) hit('vsbg_hinweis_fehlt', null);
  if (PLATZHALTER.test(plain)) hit('platzhalter_live', PLATZHALTER);

  findings.sort(function (a, b) { return a.line - b.line; });
  return {findings: findings, today: opts.today || ''};
}

var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULE_COUNT};
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.IMPRESSUMENGINE = API;
