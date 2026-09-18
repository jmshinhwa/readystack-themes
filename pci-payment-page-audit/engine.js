// PCI Payment Page Script Audit — one brain, used by the VS Code extension and by the free web page.
var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.PCI_RULES;

var BY_ID = {};
for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

// PCI DSS v4.0.1 future-dated requirements, 6.4.3 and 11.6.1 among them, became effective on this date.
var IN_FORCE = '2025-03-31';

function daysSince(today) {
  if (!today) return null;
  var a = Date.parse(IN_FORCE + 'T00:00:00Z'), b = Date.parse(today + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return null;
  return Math.floor((b - a) / 86400000);
}

function check(text, opts) {
  opts = opts || {};
  var src = String(text == null ? '' : text);
  var lines = src.split(/\r?\n/);
  var findings = [];
  var days = daysSince(opts.today);

  function add(id, line) {
    var r = BY_ID[id];
    if (!r) return;
    var msg = r.title + ' — ' + r.msg + ' Fix: ' + r.fix + ' [PCI DSS v4.0.1 ' + r.req + ']';
    if (r.sev === 'error' && days !== null && days >= 0) {
      msg += ' In force since ' + IN_FORCE + ' (' + days + ' days).';
    }
    findings.push({ check: id, sev: r.sev, msg: msg, line: line });
  }

  // --- whole-document checks ---
  if (!/content-security-policy/i.test(src)) add('csp_absent', 1);
  if (!/report-to|report-uri|reporting-endpoints/i.test(src)) add('tamper_report_absent', 1);

  // --- per-line checks ---
  for (var n = 0; n < lines.length; n++) {
    var L = lines[n], line = n + 1, m, re;

    re = /<script\b[^>]*>/gi;
    while ((m = re.exec(L))) {
      var tag = m[0];
      if (/\bsrc\s*=\s*["'](https?:)?\/\//i.test(tag)) {
        if (!/\bintegrity\s*=/i.test(tag)) add('sri_missing', line);
        else if (!/\bcrossorigin\s*=/i.test(tag)) add('sri_crossorigin_missing', line);
      } else if (!/\bsrc\s*=/i.test(tag) && !/\bnonce\s*=/i.test(tag)) {
        add('inline_script_no_nonce', line);
      }
    }

    re = /<link\b[^>]*>/gi;
    while ((m = re.exec(L))) {
      var lt = m[0];
      if (/rel\s*=\s*["']?stylesheet/i.test(lt) && /href\s*=\s*["'](https?:)?\/\//i.test(lt) && !/\bintegrity\s*=/i.test(lt)) {
        add('link_sri_missing', line);
      }
    }

    if (/content-security-policy/i.test(L) && /(unsafe-inline|unsafe-eval|script-src[^;"']*\*)/i.test(L)) add('csp_unsafe', line);
    if (/(hotjar|fullstory|clarity\.ms|mouseflow|logrocket|smartlook|inspectlet)/i.test(L)) add('session_replay', line);
    if (/(googletagmanager\.com|cdn\.segment\.com|optimizely\.com|assets\.adobedtm\.com|tags\.tiqcdn\.com|nexus\.ensighten\.com)/i.test(L)) add('tag_manager', line);

    re = /<input\b[^>]*>/gi;
    while ((m = re.exec(L))) {
      var it = m[0];
      if (/autocomplete\s*=\s*["']?cc-number/i.test(it) || /\b(name|id)\s*=\s*["'][^"']*(cardnumber|card_number|card-number|ccnum|pan)\b/i.test(it)) add('pan_field_in_page', line);
      if (/autocomplete\s*=\s*["']?cc-csc/i.test(it) || /\b(name|id)\s*=\s*["'][^"']*(cvv|cvc|csc|securitycode|security-code)/i.test(it)) add('cvv_field_in_page', line);
    }

    if (/\b(src|href|action)\s*=\s*["']http:\/\//i.test(L)) add('insecure_resource', line);
    if (/<form\b[^>]*\baction\s*=\s*["']http:\/\//i.test(L)) add('form_action_insecure', line);
    if (/document\.write\s*\([^)]*<script/i.test(L) || /createElement\s*\(\s*["']script["']\s*\)/i.test(L)) add('dynamic_script_injection', line);
    if (/(localStorage|sessionStorage)\.setItem\s*\(\s*["'][^"']*(card|pan|cvv|cvc|ccnum)/i.test(L)) add('card_data_in_storage', line);
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof window === 'undefined') { var window = {}; }
if (typeof module === 'undefined') { var module = { exports: {} }; }
module.exports = window.PCIENGINE = API;
