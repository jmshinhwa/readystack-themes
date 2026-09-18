// targetSdk 36 Deadline Gate — the brain. Same file runs in Node (extension) and in the browser (free web page).
'use strict';
var RULES_DOC = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.TSDK_RULES;
var META = RULES_DOC.meta, RULES = RULES_DOC.rules;
var BY_ID = {};
RULES.forEach(function (r) { BY_ID[r.id] = r; });

function lineOf(text, idx) { return text.slice(0, idx < 0 ? 0 : idx).split('\n').length; }
function fill(s, vars) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? String(vars[k]) : m; }); }

// Google Play's target API deadline is a date, so the message changes as the date moves.
function daysPhrase(today, deadline) {
  var a = Date.parse(today + 'T00:00:00Z'), b = Date.parse(deadline + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return 'deadline ' + deadline;
  var d = Math.round((b - a) / 86400000);
  if (d > 0) return d + ' day' + (d === 1 ? '' : 's') + ' from ' + today;
  if (d === 0) return 'that is today';
  return 'that was ' + (-d) + ' day' + (d === -1 ? '' : 's') + ' ago — uploads are already being refused';
}

function strip(text) {                       // blank out comments so a commented-out line is not a finding
  return text.replace(/<!--[\s\S]*?-->/g, function (m) { return m.replace(/[^\n]/g, ' '); })
             .replace(/\/\*[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, ' '); })
             .replace(/(^|[^:])\/\/[^\n]*/g, function (m, p) { return p + m.slice(p.length).replace(/./g, ' '); });
}

function num(s) { return parseInt(String(s).replace(/[^0-9]/g, ''), 10); }

function check(rawText, opts) {
  var text = strip(String(rawText == null ? '' : rawText));
  var o = opts || {};
  var today = /^\d{4}-\d{2}-\d{2}$/.test(o.today || '') ? o.today : new Date().toISOString().slice(0, 10);
  var findings = [];
  var isManifest = /<manifest[\s>]/.test(text);
  var isGradle = /(^|\n)\s*android\s*\{|defaultConfig|compileSdk|targetSdk|com\.android\.tools\.build/.test(text);

  function add(id, vars, idx) {
    var r = BY_ID[id];
    if (!r) return;
    findings.push({ check: id, sev: r.sev, msg: fill(r.msg, vars) + ' → ' + fill(r.fix, vars), line: lineOf(text, idx == null ? 0 : idx) });
  }

  // ---------- gradle ----------
  if (isGradle) {
    var mTarget = /\btargetSdk(?:Version)?\s*(?:=|\s)\s*["']?(\d{2})["']?/.exec(text);
    if (mTarget) {
      var tv = num(mTarget[1]);
      if (tv < META.target_api) add('target-sdk-below-36', { found: tv, days: daysPhrase(today, META.deadline) }, mTarget.index);
    } else if (/defaultConfig/.test(text)) {
      add('target-sdk-missing', {}, text.indexOf('defaultConfig'));
    }
    var mCompile = /\bcompileSdk(?:Version)?\s*(?:=|\s)\s*["']?(\d{2})["']?/.exec(text);
    if (mCompile && num(mCompile[1]) < META.min_compile_sdk) add('compile-sdk-below-36', { found: num(mCompile[1]) }, mCompile.index);

    var mAgp = /com\.android\.tools\.build[:'"\s]+gradle[:'"\s]+(\d+)\.(\d+)[\d.\-\w]*/.exec(text) ||
               /\bagp\s*=\s*["'](\d+)\.(\d+)/.exec(text);
    if (mAgp && num(mAgp[1]) < META.min_agp_major) add('agp-too-old', { found: mAgp[1] + '.' + mAgp[2] }, mAgp.index);

    var mBill = /com\.android\.billingclient[:'"\s]+billing(?:-ktx)?[:'"\s]+(\d+)\.(\d+)/.exec(text);
    if (mBill && num(mBill[1]) < META.min_billing_major) add('billing-library-too-old', { found: mBill[1] + '.' + mBill[2] }, mBill.index);

    var mNdk = /\bndkVersion\s*(?:=|\s)\s*["'](\d+)\./.exec(text);
    if (mNdk && num(mNdk[1]) < META.min_ndk_major) add('ndk-16kb-page-size', { found: mNdk[1] }, mNdk.index);

    var mLegacy = /useLegacyPackaging\s*(?:=|\s)\s*true/.exec(text);
    if (mLegacy) add('legacy-jni-packaging', {}, mLegacy.index);
  }

  // ---------- manifest ----------
  if (isManifest) {
    var mOptOut = /windowOptOutEdgeToEdgeEnforcement|PROPERTY_COMPAT_ALLOW_OPT_OUT_EDGE_TO_EDGE/.exec(text);
    if (mOptOut) add('edge-to-edge-optout-ignored', {}, mOptOut.index);

    var reOrient = /android:screenOrientation\s*=\s*"([^"]+)"/g, mo;
    while ((mo = reOrient.exec(text))) {
      if (RULES_DOC.locked_orientations.indexOf(mo[1]) >= 0) add('orientation-locked-large-screen', { found: mo[1] }, mo.index);
    }
    var mResize = /android:resizeableActivity\s*=\s*"false"/.exec(text);
    if (mResize) add('resizeable-false', {}, mResize.index);

    // components that carry an intent-filter must say android:exported since API 31
    var reComp = /<(activity|activity-alias|service|receiver)\b([\s\S]*?)(\/>|<\/\1\s*>)/g, mc;
    while ((mc = reComp.exec(text))) {
      var body = mc[0];
      if (/<intent-filter/.test(body) && !/android:exported\s*=/.test(body)) add('exported-missing', { tag: mc[1] }, mc.index);
    }

    var wantsFgs = /android\.permission\.FOREGROUND_SERVICE"/.test(text) || /android\.permission\.FOREGROUND_SERVICE_/.test(text);
    var reFgsType = /android:foregroundServiceType\s*=\s*"([^"]+)"/g, mf, sawType = false;
    while ((mf = reFgsType.exec(text))) {
      sawType = true;
      mf[1].split('|').forEach(function (t) {
        var perm = RULES_DOC.fgs_permissions[t.trim()];
        if (perm && text.indexOf('android.permission.' + perm) < 0) add('fgs-permission-missing', { found: t.trim(), perm: perm }, mf.index);
      });
    }
    if (wantsFgs && !sawType) add('fgs-type-missing', {}, text.indexOf('FOREGROUND_SERVICE'));

    Object.keys(RULES_DOC.play_declared_permissions).forEach(function (perm) {
      var i = text.indexOf('android.permission.' + perm);
      if (i >= 0) add(RULES_DOC.play_declared_permissions[perm], {}, i);
    });

    var mClear = /android:usesCleartextTraffic\s*=\s*"true"/.exec(text);
    if (mClear) add('cleartext-traffic', {}, mClear.index);
  }

  findings.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
  return { findings: findings, checked: { manifest: isManifest, gradle: isGradle, today: today, deadline: META.deadline } };
}

var TSDKENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, META: META };
if (typeof module !== 'undefined' && module.exports) module.exports = TSDKENGINE; else window.TSDKENGINE = TSDKENGINE;
