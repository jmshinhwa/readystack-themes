// PCI DSS 6.4.3 Payment Page Script Lint — the whole brain. Same file runs in Node and in the browser.
'use strict';

var DATA = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.PCI_RULES;
var RULES = DATA.rules;
var BY_ID = {};
for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

var RX_SCRIPT = /<script\b[^>]*>/gi;
var RX_SRC = /\bsrc\s*=\s*["']([^"']+)["']/i;
var RX_TYPE = /\btype\s*=\s*["']([^"']+)["']/i;
var RX_META_CSP = /<meta[^>]*http-equiv\s*=\s*["']content-security-policy["'][^>]*>/i;
var RX_CONTENT = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i;
var RX_HDR_CSP = /["'`]?Content-Security-Policy["'`]?\s*[:,]\s*(["'`])([\s\S]*?)\1/i;
var RX_CARD = /autocomplete\s*=\s*["']cc-number["']|\b(?:name|id)\s*=\s*["'](?:cardnumber|card_number|card-number|cardNum|ccnumber|cc_number|cc-number|creditCardNumber)["']/i;
var RX_PATH_PAY = /(checkout|payment|billing|\bpay\b|cart|order-review|donate|subscribe)/i;

function idx2line(text, i) {
  var n = 1;
  for (var k = 0; k < i && k < text.length; k++) if (text.charCodeAt(k) === 10) n++;
  return n;
}
function has(hay, needles) {
  var low = String(hay).toLowerCase();
  for (var k = 0; k < needles.length; k++) if (low.indexOf(String(needles[k]).toLowerCase()) !== -1) return needles[k];
  return null;
}
function isoToday() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b) {
  var ms = Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z');
  return Math.round(ms / 86400000);
}
function mk(id, msg, line) {
  var r = BY_ID[id] || { sev: 'error', req: '' };
  return { check: id, sev: r.sev, req: r.req, msg: msg, fix: r.fix || '', line: line || 1 };
}

// Does this file take cardholder data? 6.4.3 and 11.6.1 only apply if it does.
function detectScope(text, path) {
  if (/pci:payment-page/i.test(text)) {
    return { hit: true, why: 'the file carries a pci:payment-page marker' };
  }
  var psp = has(text, DATA.psp_hosts);
  if (psp) return { hit: true, why: 'it loads the payment provider script ' + psp };
  if (RX_CARD.test(text)) return { hit: true, why: 'it declares a card-number input field' };
  var m = String(path || '').match(RX_PATH_PAY);
  if (m && /<script\b/i.test(text)) return { hit: true, why: 'the file path contains "' + m[1] + '" and it loads scripts' };
  return { hit: false, why: 'no payment provider script, no card-number field, no pci:payment-page marker and no checkout/payment/billing hint in the file name.' };
}

function readCsp(text) {
  var meta = text.match(RX_META_CSP);
  if (meta) {
    var c = meta[0].match(RX_CONTENT);
    if (c) return { policy: c[2], line: idx2line(text, meta.index), where: 'the <meta http-equiv="Content-Security-Policy"> tag' };
  }
  var hdr = text.match(RX_HDR_CSP);
  if (hdr) return { policy: hdr[2], line: idx2line(text, hdr.index), where: 'the Content-Security-Policy header declared in this file' };
  return null;
}

function scriptSrcOf(policy) {
  var parts = String(policy).split(';');
  var def = null;
  for (var k = 0; k < parts.length; k++) {
    var d = parts[k].trim();
    if (/^script-src(-elem)?\s/i.test(d)) return d;
    if (/^default-src\s/i.test(d)) def = d;
  }
  return def;
}

function check(text, opts) {
  text = String(text == null ? '' : text);
  opts = opts || {};
  var today = String(opts.today || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) today = isoToday();
  var path = String(opts.path || '');
  var F = [];

  var scope = detectScope(text, path);
  if (!scope.hit) {
    F.push(mk('payment_scope', 'Not checked as a payment page: ' + scope.why +
      ' PCI DSS v4.0.1 6.4.3 and 11.6.1 apply to pages that accept cardholder data.', 1));
    return { findings: F, scope: scope, today: today, rule_count: RULES.length };
  }

  // ---- Content-Security-Policy: the "script is authorized" method (6.4.3.1)
  var csp = readCsp(text);
  if (!csp) {
    F.push(mk('csp_missing', 'This page takes cardholder data (' + scope.why +
      ') and declares no Content-Security-Policy, so nothing here states which scripts are authorized to run.', 1));
  } else {
    var ss = scriptSrcOf(csp.policy);
    if (ss && /'unsafe-inline'|'unsafe-eval'/i.test(ss)) {
      var which = /'unsafe-eval'/i.test(ss) ? (/'unsafe-inline'/i.test(ss) ? "'unsafe-inline' and 'unsafe-eval'" : "'unsafe-eval'") : "'unsafe-inline'";
      F.push(mk('csp_unsafe_inline', which + ' in ' + ss.split(/\s+/)[0] + ' (' + csp.where +
        ') re-opens the page to any script that reaches the DOM, so the allowlist no longer authorizes anything.', csp.line));
    }
    if (ss && /(^|\s)\*(\s|$)|(^|\s)https:(\s|$)|(^|\s)http:(\s|$)|(^|\s)data:(\s|$)|\*\.[a-z]/i.test(ss)) {
      F.push(mk('csp_wildcard_host', 'A wildcard source in ' + ss.split(/\s+/)[0] + ' (' + csp.where +
        ') authorizes hosts you have never inventoried.', csp.line));
    }
  }

  // ---- every <script> tag (6.4.3.2 integrity, 6.4.3.3 inventory + justification)
  RX_SCRIPT.lastIndex = 0;
  var m, seenTag = false;
  while ((m = RX_SCRIPT.exec(text)) !== null) {
    var tag = m[0], at = m.index, line = idx2line(text, at);
    var t = tag.match(RX_TYPE);
    if (t && /json|text\/template/i.test(t[1])) continue;      // not executed
    var s = tag.match(RX_SRC);
    seenTag = true;

    if (!s) {                                                   // inline block
      if (!/\bnonce\s*=/i.test(tag)) {
        F.push(mk('inline_script_unauthorized', 'Inline <script> at line ' + line +
          ' carries no nonce, so a CSP allowlist cannot tell it apart from injected code.', line));
      }
      continue;
    }

    var url = s[1];
    var before = text.slice(Math.max(0, at - 300), at);
    var justified = /pci:justification/i.test(before) || /\bdata-pci-justification\s*=/i.test(tag);
    var external = /^https?:\/\//i.test(url) || /^\/\//.test(url);
    var tm = has(url, DATA.tag_managers);
    var unversioned = has(url, DATA.psp_unversioned);

    if (/^http:\/\//i.test(url)) {
      F.push(mk('script_over_http', url + ' is fetched over plain http://, so the bytes that reach the buyer are not the bytes you shipped.', line));
    }
    if (tm) {
      F.push(mk('tag_manager_on_payment_page', tm + ' loads a container that injects further scripts at run time, so no script on this page can be authorized in advance.', line));
    }
    if (external && !/\bintegrity\s*=/i.test(tag)) {
      if (unversioned) {
        F.push(mk('psp_script_needs_written_method', url + ' is published unversioned by the provider, so a subresource-integrity hash is not available for it. 6.4.3 still wants a stated authorization and integrity method for this script.', line));
      } else {
        F.push(mk('script_no_integrity', url + ' is loaded with no integrity attribute, so a changed file on that host runs without anything noticing.', line));
      }
    } else if (external && /\bintegrity\s*=/i.test(tag) && !/\bcrossorigin\s*=/i.test(tag)) {
      F.push(mk('integrity_no_crossorigin', url + ' has an integrity hash but no crossorigin attribute. The browser makes an opaque request and skips the hash check, so the tag only looks protected.', line));
    }
    if (external && !justified) {
      F.push(mk('script_no_justification', url + ' appears in no inventory: there is no written business or technical justification within 300 characters of the tag.', line));
    }
  }

  // ---- 11.6.1 tamper detection
  if (!/pci:tamper-detect/i.test(text) && !has(text, DATA.tamper_vendors)) {
    F.push(mk('tamper_detection_missing', 'Nothing in this file declares a change- and tamper-detection mechanism for the payment page or its HTTP headers as the buyer receives them.', 1));
  }

  // ---- scope creep: PAN typed into your own DOM
  if (RX_CARD.test(text) && !/<iframe\b/i.test(text)) {
    var cm = text.match(RX_CARD);
    F.push(mk('card_field_outside_psp_iframe', 'A card-number input is declared here and no <iframe> hosts it, so the PAN is typed into your own DOM alongside ' +
      (seenTag ? 'the scripts above' : 'your own scripts') + '.', idx2line(text, cm.index)));
  }

  if (F.length) {
    var d = daysBetween(today, DATA.effective_date);
    var when = d >= 0
      ? 'mandatory since ' + DATA.effective_date + ' — ' + d + ' days ago as of ' + today
      : 'mandatory from ' + DATA.effective_date + ' — ' + (-d) + ' days from ' + today;
    F.push(mk('assessment_exposure', F.length + ' finding' + (F.length === 1 ? '' : 's') + ' above sit under ' +
      DATA.cite + ', ' + when + '. An assessment dated on or after ' + DATA.effective_date + ' tests them.', 1));
  }

  F.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
  return { findings: F, scope: scope, today: today, rule_count: RULES.length };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, DATA: DATA };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.PCIENGINE = API;
