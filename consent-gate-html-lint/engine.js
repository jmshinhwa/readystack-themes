// Consent Gate HTML Lint — one brain, used by the VS Code extension and by the free web page.
'use strict';
var DATA = (typeof module !== 'undefined') ? require('./rules.json') : window.CG_RULES;
var RULES = DATA.rules;
var GATE = new RegExp(DATA.gate_markers, 'i');
var CMP = new RegExp(DATA.cmp_loaders, 'i');
var TAG = /<(script|link|iframe|img)\b[^>]*>/gi;
var TRACKER_IDS = ['analytics-before-consent', 'ad-pixel-before-consent', 'google-fonts-hotlinked',
  'youtube-embed-not-nocookie', 'recaptcha-before-consent', 'session-replay-before-consent',
  'maps-iframe-before-consent'];

function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }

function msgOf(r) { return r.title + ' — ' + r.why + ' Fix: ' + r.fix; }

function check(text, opts) {
  text = String(text || '');
  opts = opts || {};
  var findings = [], trackerLines = [], m, i, r;
  var lines = text.split('\n');

  // 1. every <script>/<link>/<iframe> tag, gated or not
  var parked = {};
  TAG.lastIndex = 0;
  while ((m = TAG.exec(text)) !== null) {
    var tag = m[0], ln = lineOf(text, m.index), gated = GATE.test(tag);
    if (gated && /^<script/i.test(tag)) {
      var endIdx = text.toLowerCase().indexOf('<\/script>', m.index);
      var endLn = endIdx < 0 ? lineOf(text, m.index + tag.length) : lineOf(text, endIdx);
      for (var k = ln; k <= endLn; k++) parked[k] = true;
    }
    for (i = 0; i < RULES.length; i++) {
      r = RULES[i];
      if (r.kind !== 'tag') continue;
      if (gated !== !!r.on_gated) continue;
      if (r.id === 'youtube-embed-not-nocookie' && /youtube-nocookie\.com/i.test(tag)) continue;
      if (new RegExp(r.pattern, 'i').test(tag)) {
        findings.push({ check: r.id, sev: r.sev, msg: msgOf(r), line: ln });
        if (TRACKER_IDS.indexOf(r.id) >= 0) trackerLines.push(ln);
      }
    }
  }

  // 2. inline JS, skipped while inside a parked (text/plain) script block
  for (i = 0; i < lines.length; i++) {
    if (parked[i + 1]) continue;
    for (var j = 0; j < RULES.length; j++) {
      r = RULES[j];
      if (r.kind !== 'line') continue;
      if (new RegExp(r.pattern, 'i').test(lines[i])) {
        findings.push({ check: r.id, sev: r.sev, msg: msgOf(r), line: i + 1 });
        if (r.id === 'ad-pixel-inline-snippet') trackerLines.push(i + 1);
      }
    }
  }

  // 3. page-level rules
  var cmpLine = 0;
  for (i = 0; i < lines.length; i++) { if (CMP.test(lines[i])) { cmpLine = i + 1; break; } }
  var byId = {};
  for (i = 0; i < RULES.length; i++) byId[RULES[i].id] = RULES[i];

  if (trackerLines.length && !cmpLine) {
    findings.push({ check: 'no-cmp-present', sev: 'error', msg: msgOf(byId['no-cmp-present']), line: trackerLines[0] });
  }
  var early = trackerLines.filter(function (l) { return cmpLine && l < cmpLine; });
  if (early.length) {
    findings.push({ check: 'cmp-after-tracker', sev: 'error', msg: msgOf(byId['cmp-after-tracker']), line: cmpLine });
  }
  var hasGoogleTag = /googletagmanager\.com|google-analytics\.com|gtag\s*\(/i.test(text);
  var hasDefault = /gtag\s*\(\s*['"]consent['"]\s*,\s*['"]default['"]/i.test(text);
  if (hasGoogleTag && !hasDefault) {
    var gl = 1;
    for (i = 0; i < lines.length; i++) { if (/googletagmanager\.com|google-analytics\.com|gtag\s*\(/i.test(lines[i])) { gl = i + 1; break; } }
    findings.push({ check: 'gtag-consent-default-missing', sev: 'error', msg: msgOf(byId['gtag-consent-default-missing']), line: gl });
  }

  findings.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
  return { findings: findings, checked: RULES.length, today: opts.today || '' };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.CGENGINE = API;
