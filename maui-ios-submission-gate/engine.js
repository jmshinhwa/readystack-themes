/* MAUI iOS Submission Gate — engine
 * Reads an Apple property list (Info.plist / Entitlements.plist) as text and
 * reports what App Review or App Store Connect will stop on upload.
 */
'use strict';

var RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : window.MIG_RULES;

var BY_ID = {};
for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

var PLACEHOLDERS = [
  /\$\(PRODUCT_NAME\)/i,
  /\b(TODO|FIXME|XXX)\b/i,
  /lorem ipsum/i,
  /description here/i,
  /your (reason|description|text)/i,
  /(needs?|requires?|would like|wants) access/i,
  /change this/i
];

var REASON = /\b(to|so that|in order to|for|when|while|because)\b/i;

function lineOf(text, index) {
  var n = 1;
  for (var i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function decode(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&').trim();
}

/* Every <key>…</key> plus the raw markup that follows it, up to the next key. */
function pairs(text) {
  var out = [];
  var re = /<key>([\s\S]*?)<\/key>/g, m;
  var hits = [];
  while ((m = re.exec(text)) !== null) hits.push({ key: decode(m[1]), at: m.index, end: re.lastIndex });
  for (var i = 0; i < hits.length; i++) {
    var stop = (i + 1 < hits.length) ? hits[i + 1].at : text.length;
    out.push({ key: hits[i].key, line: lineOf(text, hits[i].at), raw: text.slice(hits[i].end, stop) });
  }
  return out;
}

function stringValue(raw) {
  var m = /<string>([\s\S]*?)<\/string>/.exec(raw);
  return m ? decode(m[1]) : null;
}

function arrayValues(raw) {
  var out = [], re = /<string>([\s\S]*?)<\/string>/g, m;
  while ((m = re.exec(raw)) !== null) out.push(decode(m[1]));
  return out;
}

function boolValue(raw) {
  if (/<true\s*\/>/.test(raw)) return true;
  if (/<false\s*\/>/.test(raw)) return false;
  return null;
}

function nextFeb1(today) {
  var d = String(today || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var y = d ? parseInt(d[1], 10) : new Date().getUTCFullYear();
  var past = d ? (d[2] > '02' || (d[2] === '02' && d[3] > '01')) : true;
  return (past ? y + 1 : y) + '-02-01';
}

function fill(tpl, vars) {
  return String(tpl).replace(/\{(\w+)\}/g, function (all, k) {
    return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : all;
  });
}

function check(text, opts) {
  text = String(text == null ? '' : text);
  opts = opts || {};
  var findings = [];
  var seen = pairs(text);
  var keys = {};
  for (var i = 0; i < seen.length; i++) if (!(seen[i].key in keys)) keys[seen[i].key] = seen[i];

  function has(k) { return Object.prototype.hasOwnProperty.call(keys, k); }

  function add(id, line, vars) {
    var rule = BY_ID[id];
    if (!rule) return;
    findings.push({ check: id, sev: rule.sev, msg: fill(rule.msg, vars || {}), line: line, fix: fill(rule.fix, vars || {}), title: rule.title });
  }

  /* An entitlements file has no CFBundle dictionary; an Info.plist does. */
  var isInfo = /<key>\s*CFBundle(Identifier|Version|ShortVersionString|Name|Executable)\s*<\/key>/.test(text)
    || /UsageDescription/.test(text) || /UIBackgroundModes/.test(text) || /ITSAppUsesNonExemptEncryption/.test(text);
  var isEntitlements = has('aps-environment') || /<key>\s*com\.apple\.developer\./.test(text) || has('application-identifier');

  /* 1–4 — every purpose string, one verdict each. */
  for (var j = 0; j < seen.length; j++) {
    var p = seen[j];
    if (!/UsageDescription$/.test(p.key)) continue;
    var v = stringValue(p.raw);
    if (v === null || v === '') { add('purpose_empty', p.line, { key: p.key }); continue; }
    var hit = null;
    for (var k = 0; k < PLACEHOLDERS.length; k++) {
      var m = PLACEHOLDERS[k].exec(v);
      if (m) { hit = m[0]; break; }
    }
    if (hit) { add('purpose_placeholder', p.line, { key: p.key, hit: '"' + hit + '"' }); continue; }
    if (v.length < 15) { add('purpose_too_short', p.line, { key: p.key, n: v.length }); continue; }
    if (!REASON.test(v)) add('purpose_no_reason', p.line, { key: p.key });
  }

  /* 5–6 — superseded permission keys left on their own. */
  if (has('NSBluetoothPeripheralUsageDescription') && !has('NSBluetoothAlwaysUsageDescription'))
    add('bluetooth_deprecated', keys['NSBluetoothPeripheralUsageDescription'].line);
  if (has('NSLocationAlwaysUsageDescription') && !has('NSLocationAlwaysAndWhenInUseUsageDescription'))
    add('location_always_deprecated', keys['NSLocationAlwaysUsageDescription'].line);

  /* 7–8 — background modes the strings do not back. */
  if (has('UIBackgroundModes')) {
    var modes = arrayValues(keys['UIBackgroundModes'].raw).map(function (s) { return s.toLowerCase(); });
    if (modes.indexOf('location') !== -1 && !has('NSLocationAlwaysAndWhenInUseUsageDescription'))
      add('bg_location_no_string', keys['UIBackgroundModes'].line);
    if (modes.indexOf('audio') !== -1 && !has('NSMicrophoneUsageDescription'))
      add('bg_audio_no_mic', keys['UIBackgroundModes'].line);
  }

  /* 9 — attribution without the tracking prompt. */
  if (has('SKAdNetworkItems') && !has('NSUserTrackingUsageDescription'))
    add('skad_no_att', keys['SKAdNetworkItems'].line);

  /* 10–12 — the export-compliance trio. */
  if (isInfo) {
    if (!has('ITSAppUsesNonExemptEncryption')) {
      add('export_key_missing', 1);
    } else {
      var ec = keys['ITSAppUsesNonExemptEncryption'];
      var b = boolValue(ec.raw);
      if (b === null && stringValue(ec.raw) !== null) add('export_bool_as_string', ec.line);
      if (b === true && !has('ITSEncryptionExportComplianceCode'))
        add('export_true_no_code', ec.line, { next_deadline: nextFeb1(opts.today) });
    }
  }

  /* 13 — the blanket ATS hole. */
  if (has('NSAppTransportSecurity') && /<key>\s*NSAllowsArbitraryLoads\s*<\/key>\s*<true\s*\/>/.test(text))
    add('ats_arbitrary_loads', keys['NSAppTransportSecurity'].line);

  /* 14 — push signed for the wrong environment. */
  if (isEntitlements && has('aps-environment') && stringValue(keys['aps-environment'].raw) === 'development')
    add('aps_env_development', keys['aps-environment'].line);

  /* 15 — half a HealthKit declaration. */
  if (has('NSHealthShareUsageDescription') && !has('NSHealthUpdateUsageDescription'))
    add('healthkit_partial_strings', keys['NSHealthShareUsageDescription'].line);

  /* 16 — a key iOS 10 removed. */
  if (has('UIApplicationExitsOnSuspend'))
    add('exits_on_suspend', keys['UIApplicationExitsOnSuspend'].line);

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.MIGENGINE = API;
