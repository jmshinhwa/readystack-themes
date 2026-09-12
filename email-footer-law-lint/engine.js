// Email Footer Law Lint — the whole brain. Same file runs in Node (VS Code) and in the browser.
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.EFL_RULES;

var UNSUB = /(unsubscrib|un-?subscribe|opt[\s-]?out|opting[\s-]?out|abmelde|abbestell|austragen|désabonn)/i;
var DE_MARK = /(GmbH|UG \(haftungsbeschr|Abmelden|Datenschutz|Impressum|Anbieter|Geschäftsführer|Handelsregister|Umsatzsteuer|USt-IdNr|Newsletter abbestellen)/g;
var IMPRESSUM = /(impressum|anbieterkennzeichnung|legal-?notice)/i;
var REGISTER = /(handelsregister|\bHRB\b|\bHRA\b|USt-?IdNr|VAT ID|Umsatzsteuer-Identifikationsnummer)/i;
var ENTITY = /\b(Inc\.?|LLC|L\.L\.C\.|Ltd\.?|Limited|Corp\.?|Corporation|GmbH|AG|KGaA|KG|UG|e\.K\.|B\.V\.|N\.V\.|S\.A\.|S\.A\.S|SARL|S\.r\.l\.|Oy|AB|A\/S|ApS|Pty|PLC|plc)\b/;
var CONSENT = /(because you (signed up|subscribed|opted|asked|created)|you (signed up|subscribed|opted in)|opted[- ]in|consent|einwillig|you are receiving this)/i;

function blankOut(s, re) { return s.replace(re, function (m) { return m.replace(/[^\n]/g, ' '); }); }
function lineAt(text, i) { var n = 1, k; for (k = 0; k < i && k < text.length; k++) { if (text.charCodeAt(k) === 10) n++; } return n; }

// tags out, character positions kept so every finding can name a real line
function stripTags(s) {
  var out = '', map = [], inTag = false, k, c;
  for (k = 0; k < s.length; k++) {
    c = s.charAt(k);
    if (c === '<') { inTag = true; continue; }
    if (c === '>') { if (inTag) { inTag = false; out += ' '; map.push(k); continue; } }
    if (!inTag) { out += c; map.push(k); }
  }
  return { text: out, map: map };
}

function anchors(masked, raw) {
  var list = [], re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi, m, h;
  while ((m = re.exec(masked))) {
    h = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[1] || '');
    list.push({
      href: h ? (h[1] || h[2] || h[3] || '') : '',
      text: (m[2] || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      line: lineAt(raw, m.index),
      i: m.index
    });
  }
  return list;
}

function check(text, opts) {
  text = String(text == null ? '' : text);
  opts = opts || {};
  var today = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today || '')) ? String(opts.today) : new Date().toISOString().slice(0, 10);
  var thisYear = parseInt(today.slice(0, 4), 10);

  var masked = blankOut(blankOut(text, /<!--[\s\S]*?-->/g), /<style\b[\s\S]*?<\/style\s*>/gi);
  var P = stripTags(masked);
  var plain = P.text;
  var flat = plain.replace(/\s+/g, ' ');
  var findings = [];
  var seen = {};

  function add(id, line, detail) {
    if (seen[id]) { return; }
    seen[id] = 1;
    var r = null, k;
    for (k = 0; k < RULES.length; k++) { if (RULES[k].id === id) { r = RULES[k]; break; } }
    if (!r) { return; }
    findings.push({
      check: id,
      sev: r.sev,
      line: Math.max(1, line || 1),
      msg: (detail ? detail + ' ' : '') + r.msg + ' ' + r.fix + ' [' + r.cite + ']'
    });
  }
  function lineOfPlain(pi) { return lineAt(text, P.map[Math.min(pi, P.map.length - 1)] || 0); }
  function bodyLine() {
    var m = /<\/body\s*>/i.exec(text);
    return m ? lineAt(text, m.index) : Math.max(1, text.split(/\r?\n/).length);
  }

  var A = anchors(masked, text);
  var unsubs = A.filter(function (a) { return UNSUB.test(a.text) || UNSUB.test(a.href); });

  // 1 · is there an opt-out at all
  if (!unsubs.length) { add('unsub_missing', bodyLine()); }

  unsubs.forEach(function (a) {
    var h = a.href.trim();
    // 2 · does it go anywhere
    if (!h || h === '#' || /^javascript:/i.test(h) || /^about:blank$/i.test(h)) { add('unsub_dead_href', a.line, 'href="' + h + '".'); }
    // 3 · does it demand an account
    if (/(\/|[?&=])(log-?in|sign-?in|sign-?on|account|my-?account|dashboard)\b/i.test(h)) { add('unsub_behind_login', a.line, h.slice(0, 70) + ' .'); }
  });

  // 4..6 · what the footer promises, read near the opt-out words
  var ure = new RegExp(UNSUB.source, 'gi'), um;
  while ((um = ure.exec(flat))) {
    var win = flat.slice(Math.max(0, um.index - 90), um.index + 220);
    var pi = flat.indexOf(win.slice(0, 24));
    var ln = lineOfPlain(pi < 0 ? 0 : pi);
    var gate = /(account number|customer number|member(ship)? number|order number|credit card|processing fee|a fee of|\$\d+(\.\d+)?\s*(fee|charge)|postal code and)/i.exec(win);
    if (gate) { add('unsub_fee_or_data', ln, '"' + gate[0] + '".'); }
    var slow = /(please allow|may take|allow up to|takes? up to|within|processing time of|removal in)[^.]{0,40}?(\d{1,3})\s*(business days|working days|days|weeks|months)/i.exec(win);
    if (slow) {
      var n = parseInt(slow[2], 10), unit = slow[3].toLowerCase(), over = false;
      if (/business|working/.test(unit)) { over = n > 10; }
      else if (unit === 'days') { over = n > 14; }
      else if (unit === 'weeks') { over = n > 2; }
      else { over = n >= 1; }
      if (over) { add('unsub_deadline_too_long', ln, '"' + slow[0].trim() + '".'); }
    }
    var win2 = /(valid|active|work|works|available|good|expires?|live)[^.]{0,40}?(\d{1,3})\s*(days|months)/i.exec(win);
    if (win2) {
      var d = parseInt(win2[2], 10) * (/month/i.test(win2[3]) ? 30 : 1);
      if (d < 60) { add('unsub_window_under_60d', ln, '"' + win2[0].trim() + '" = ' + d + ' days.'); }
    }
  }

  // 7 · conspicuous, or buried
  var sre = /(font-size\s*:\s*(\d+(?:\.\d+)?)\s*px|display\s*:\s*none|visibility\s*:\s*hidden)/gi, sm;
  while ((sm = sre.exec(text))) {
    var near = text.slice(Math.max(0, sm.index - 260), sm.index + 420);
    if (!UNSUB.test(near)) { continue; }
    if (sm[2] === undefined) { add('unsub_too_small', lineAt(text, sm.index), 'The opt-out block carries ' + sm[1].replace(/\s+/g, '') + '.'); }
    else if (parseFloat(sm[2]) < 10) { add('unsub_too_small', lineAt(text, sm.index), 'The opt-out is set at ' + sm[2] + 'px.'); }
  }

  // 8..9 · the postal address
  var STREET = /(\b\d{1,6}\s+[A-Z][\w.'-]*(?:\s+[\w.'-]+){0,4}\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Pkwy|Parkway|Ct|Court|Plaza|Sq|Square|Terrace|Circle)\b|\bP\.?\s?O\.?\s*Box\s*\d+|[A-ZÄÖÜ][\wäöüß.-]*(?:straße|strasse|str\.|weg|allee|platz|gasse|ring|damm|ufer)\s+\d+|\b\d{1,4}\s+(rue|avenue|boulevard)\s+[A-Z])/i;
  var PLACEHOLDER = /(\[[^\]]*(address|street|company|city)[^\]]*\]|123 Main (St|Street)|1234 Street|Your Company (Name|Address)|123 Anywhere|Musterstraße|Musterstrasse|Lorem ipsum|ADDRESS_LINE|YOUR[_ ]ADDRESS|Street Address Here)/i;
  var ph = PLACEHOLDER.exec(flat);
  if (ph) { add('postal_address_placeholder', lineOfPlain(flat.indexOf(ph[0])), '"' + ph[0] + '".'); }
  if (!STREET.test(flat)) { add('postal_address_missing', bodyLine()); }

  // 10 · the German provider line
  var tmg = /(§\s*5\s*(Abs\.?\s*\d\s*)?TMG|\bTMG\b|Telemediengesetz)/.exec(text);
  if (tmg) { add('tmg_5_outdated', lineAt(text, tmg.index), '"' + tmg[0] + '" as of ' + today + '.'); }

  // 11 · German-facing, but the imprint is not reachable
  var marks = flat.match(DE_MARK) || [];
  var distinct = {}, dn = 0;
  marks.forEach(function (x) { var key = x.toLowerCase(); if (!distinct[key]) { distinct[key] = 1; dn++; } });
  var hasImpressumLink = A.some(function (a) { return IMPRESSUM.test(a.text) || IMPRESSUM.test(a.href); });
  if (dn >= 2 && !hasImpressumLink && !REGISTER.test(flat)) { add('de_imprint_incomplete', bodyLine(), dn + ' German provider markers, no Impressum link, no register or VAT number.'); }

  // 12 · who is actually sending this
  if (!ENTITY.test(flat) && !/(©|&copy;|Copyright)\s*\d{0,4}\s*[A-Z]/.test(flat)) { add('sender_identity_missing', bodyLine()); }

  // 13 · the open-tracking pixel
  var ire = /<img\b[^>]*>/gi, im2, pixel = null;
  while ((im2 = ire.exec(masked))) {
    var tag = im2[0];
    var w = /\bwidth\s*=\s*["']?(\d+)/i.exec(tag), hh = /\bheight\s*=\s*["']?(\d+)/i.exec(tag);
    var styled = /width\s*:\s*1px/i.test(tag) && /height\s*:\s*1px/i.test(tag);
    if ((w && hh && +w[1] <= 1 && +hh[1] <= 1) || styled) { pixel = im2; break; }
  }
  if (pixel && !CONSENT.test(flat)) { add('tracking_pixel_unconsented', lineAt(text, pixel.index)); }

  // 14 · the year in the footer, read against today
  var yre = /(©|&copy;|Copyright)[^0-9]{0,20}(\d{4})(\s*[-–]\s*(\d{4}))?/gi, ym, newest = 0, yline = 1;
  while ((ym = yre.exec(text))) {
    var y = parseInt(ym[4] || ym[2], 10);
    if (y > newest) { newest = y; yline = lineAt(text, ym.index); }
  }
  if (newest && newest < thisYear) { add('copyright_year_stale', yline, 'Footer says ' + newest + '; today is ' + today + '.'); }

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings };
}

var EFLENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) { module.exports = EFLENGINE; } else { window.EFLENGINE = EFLENGINE; }
