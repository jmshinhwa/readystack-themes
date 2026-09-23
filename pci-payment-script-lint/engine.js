// PCI DSS 6.4.3 Payment Script Lint — the brain. Same file runs in Node (extension) and in the browser (free web page).
'use strict';
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PCI_RULES;
var STANDARD = 'PCI DSS v4.0.1';
var MANDATORY_FROM = '2025-03-31';
var BY = {};
RULES.forEach(function (r) { BY[r.id] = r; });

function lineAt(text, idx) { return text.slice(0, idx).split('\n').length; }
function daysSince(from, today) {
  var a = Date.parse(from + 'T00:00:00Z'), b = Date.parse(today + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}
function attr(attrs, name) {
  var m = attrs.match(new RegExp('\\s' + name + '\\s*=\\s*("|\')((?:(?!\\1)[\\s\\S])*)\\1', 'i'));
  return m ? m[2] : (new RegExp('\\s' + name + '(\\s|$|=)', 'i').test(attrs) ? '' : null);
}
function hostOf(src) {
  var m = String(src).match(/^(https?:)?\/\/([^\/?#]+)/i);
  return m ? m[2].toLowerCase() : null;
}

function check(text, opts) {
  opts = opts || {};
  text = String(text == null ? '' : text);
  var today = opts.today || new Date().toISOString().slice(0, 10);
  var findings = [];
  function add(id, line, extra) {
    var r = BY[id];
    var ref = r.req ? STANDARD + ' ' + r.req : STANDARD;
    findings.push({ check: id, sev: r.sev, line: line || 1, msg: r.msg + (extra ? ' ' + extra : '') + ' [' + ref + ']' });
  }

  // --- collect script tags -------------------------------------------------
  var externals = [], inlines = [], m, tagRe = /<script\b([^>]*)>/gi;
  while ((m = tagRe.exec(text)) !== null) {
    var attrs = m[1] || '', line = lineAt(text, m.index), src = attr(attrs, 'src');
    if (src) externals.push({ src: src, attrs: attrs, line: line, host: hostOf(src) });
    else inlines.push({ attrs: attrs, line: line, end: m.index + m[0].length });
  }
  var thirdParty = externals.filter(function (s) { return s.host; });

  // --- script inventory (6.4.3) -------------------------------------------
  var inv = text.match(/<!--\s*pci-script-inventory\b([\s\S]*?)-->/i);
  var invHosts = [], invBlockLine = inv ? lineAt(text, inv.index) : 0;
  if (inv) {
    var body = inv[1].split('\n');
    body.forEach(function (raw, i) {
      var t = raw.trim();
      if (!t || /^(pci|host|script)\b.*:?$/i.test(t) && !/[\/.]/.test(t)) return;
      var hm = t.match(/((?:https?:)?\/\/[^\s"']+|[a-z0-9.-]+\.[a-z]{2,})/i);
      if (!hm) return;
      var h = hostOf(hm[1]) || hm[1].toLowerCase();
      invHosts.push(h);
      var just = t.replace(hm[1], '');
      var ok = /justification\s*:\s*\S+/i.test(just) && !/\b(TODO|TBD|FIXME|N\/A|pending|unknown|\?\?\?)\b/i.test(just);
      if (!ok) add('inventory-no-justification', invBlockLine + i + 1, 'Entry: ' + h + '.');
    });
  } else if (thirdParty.length) {
    add('inventory-missing', thirdParty[0].line, thirdParty.length + ' third-party script tag(s) on this page are unaccounted for.');
  }

  // --- per-script checks ---------------------------------------------------
  externals.forEach(function (s) {
    if (/^http:\/\//i.test(s.src)) add('script-over-http', s.line, 'src=' + s.src);
    if (!s.host) return;                                   // first-party relative path: integrity not required
    if (inv && invHosts.indexOf(s.host) === -1) add('script-not-inventoried', s.line, 'Host: ' + s.host + '.');
    var integrity = attr(s.attrs, 'integrity');
    if (!integrity) add('script-no-integrity', s.line, 'Host: ' + s.host + '.');
    else if (attr(s.attrs, 'crossorigin') === null) add('script-integrity-no-crossorigin', s.line, 'Host: ' + s.host + '.');
    if (/@latest|\/latest\/|\/next\/|@next\b|[?&]v(ersion)?=latest/i.test(s.src)) add('script-unpinned-version', s.line, 'src=' + s.src);
    if (/googletagmanager\.com|gtm\.js|tagmanager|segment\.(com|io)|optimizely|hotjar|fullstory|clarity\.ms/i.test(s.src)) add('tag-manager-on-payment-page', s.line, 'Host: ' + s.host + '.');
  });

  // --- content security policy (6.4.3) ------------------------------------
  var enforced = [], reportOnly = [], metaRe = /<meta\b[^>]*>/gi;
  while ((m = metaRe.exec(text)) !== null) {
    var tag = m[0];
    if (!/http-equiv\s*=\s*["']content-security-policy/i.test(tag)) continue;
    var rec = { content: attr(tag, 'content') || '', line: lineAt(text, m.index) };
    (/content-security-policy-report-only/i.test(tag) ? reportOnly : enforced).push(rec);
  }
  var hdrRe = /Content-Security-Policy(-Report-Only)?\s*:\s*([^\n"'`]+)/gi;
  while ((m = hdrRe.exec(text)) !== null) {
    var rec2 = { content: m[2], line: lineAt(text, m.index) };
    (m[1] ? reportOnly : enforced).push(rec2);
  }
  var allCsp = enforced.concat(reportOnly).map(function (c) { return c.content; }).join(' ');
  if (!enforced.length && !reportOnly.length) add('csp-missing', 1, thirdParty.length ? thirdParty.length + ' third-party script tag(s) run unrestricted.' : '');
  else if (!enforced.length) add('csp-report-only', reportOnly[0].line, '');
  enforced.forEach(function (c) {
    var dm = c.content.match(/script-src[^;]*/i) || c.content.match(/default-src[^;]*/i);
    if (!dm) return;
    if (/'unsafe-inline'/i.test(dm[0])) add('csp-unsafe-inline', c.line, "Directive: " + dm[0].trim() + '.');
    else if (/(^|\s)\*(\s|$)/.test(dm[0])) add('csp-unsafe-inline', c.line, 'Directive: ' + dm[0].trim() + '.');
  });
  var nonceInPolicy = /'nonce-/i.test(allCsp);
  inlines.forEach(function (s) {
    var type = attr(s.attrs, 'type') || '';
    if (/json/i.test(type)) return;
    var body = text.slice(s.end, text.indexOf('<\/script>', s.end) === -1 ? s.end : text.indexOf('<\/script>', s.end));
    if (body.trim().length < 8) return;
    if (attr(s.attrs, 'nonce') === null && !/\bintegrity\s*=/i.test(s.attrs)) add('inline-script-no-nonce', s.line, nonceInPolicy ? "The policy carries a nonce, but this tag does not." : '');
  });

  // --- tamper detection (11.6.1) ------------------------------------------
  var tam = text.match(/<!--\s*pci-tamper-detection\s*:\s*([\s\S]*?)-->/i);
  var reportEndpoint = /report-(uri|to)\s+\S/i.test(allCsp);
  if (!tam && !reportEndpoint) add('tamper-detection-missing', 1, '');
  if (tam) {
    var iv = tam[1].match(/every\s+(\d+)\s*(hour|day|week|month)/i);
    var days = null;
    if (iv) {
      var n = parseInt(iv[1], 10), unit = iv[2].toLowerCase();
      days = unit === 'hour' ? n / 24 : unit === 'day' ? n : unit === 'week' ? n * 7 : n * 30;
    }
    if (days === null) add('tamper-interval-too-long', lineAt(text, tam.index), 'No evaluation interval is declared in the mechanism.');
    else if (days > 7) add('tamper-interval-too-long', lineAt(text, tam.index), 'Declared interval: every ' + iv[1] + ' ' + iv[2] + '(s) = ' + Math.round(days) + ' days.');
  }

  // --- the part chatbots get wrong: dates and versions ---------------------
  var fdRe = /(future[- ]dated|best practice until|not (?:yet )?required|becomes? mandatory|optional until|effective from)[^\n]{0,90}/gi;
  var since = daysSince(MANDATORY_FROM, today);
  while ((m = fdRe.exec(text)) !== null) {
    add('future-dated-claim-expired', lineAt(text, m.index),
      'As of ' + today + ' that date ' + (since === null ? 'has passed' : since >= 0 ? 'passed ' + since + ' days ago' : 'is ' + (-since) + ' days away') + '. Quoted: "' + m[0].trim().slice(0, 70) + '".');
  }
  var svRe = /PCI[\s-]?DSS[\s,]*v?\.?\s*(3\.2\.1|3\.2|3\.1|4\.0)(?!\.\d)/gi;
  while ((m = svRe.exec(text)) !== null) add('stale-standard-version', lineAt(text, m.index), 'Found "' + m[0].trim() + '".');

  findings.sort(function (a, b) { return (a.line - b.line) || a.check.localeCompare(b.check); });
  return { findings: findings, standard: STANDARD, mandatory_from: MANDATORY_FROM, today: today, rule_count: RULES.length };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.PCIENGINE = API;
