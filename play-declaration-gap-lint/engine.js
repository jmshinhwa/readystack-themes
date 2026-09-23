// Play Declaration Gap Lint — the brain. Same file runs in Node (extension) and in the browser (free web check).
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.PLAYDECL_RULES;

// foregroundServiceType -> the FOREGROUND_SERVICE_* permission Android 14 (API 34) demands for it.
var FGS_PERM = {
  camera: 'FOREGROUND_SERVICE_CAMERA',
  connectedDevice: 'FOREGROUND_SERVICE_CONNECTED_DEVICE',
  dataSync: 'FOREGROUND_SERVICE_DATA_SYNC',
  health: 'FOREGROUND_SERVICE_HEALTH',
  location: 'FOREGROUND_SERVICE_LOCATION',
  mediaPlayback: 'FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  mediaProcessing: 'FOREGROUND_SERVICE_MEDIA_PROCESSING',
  mediaProjection: 'FOREGROUND_SERVICE_MEDIA_PROJECTION',
  microphone: 'FOREGROUND_SERVICE_MICROPHONE',
  phoneCall: 'FOREGROUND_SERVICE_PHONE_CALL',
  remoteMessaging: 'FOREGROUND_SERVICE_REMOTE_MESSAGING',
  specialUse: 'FOREGROUND_SERVICE_SPECIAL_USE',
  systemExempted: 'FOREGROUND_SERVICE_SYSTEM_EXEMPTED'
};

function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }
function flat(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }       // attributes wrap over lines in real manifests
function attr(tag, name) {
  var m = new RegExp('android:' + name + '\\s*=\\s*"([^"]*)"').exec(tag);
  return m ? m[1] : '';
}
// Commented-out permissions must not count. Keep the line count intact.
function stripComments(text) {
  return String(text).replace(/<!--[\s\S]*?-->/g, function (c) { return c.replace(/[^\n]/g, ' '); });
}

function permissions(text) {
  var out = [], re = /<uses-permission(?:-sdk-\d+)?\b([^>]*)>/g, m;
  while ((m = re.exec(text))) {
    var a = flat(m[1]), n = attr(a, 'name');
    if (n) out.push({ name: n, line: lineOf(text, m.index) });
  }
  return out;
}

function services(text) {
  var out = [], re = /<service\b([^>]*)>/g, m;
  while ((m = re.exec(text))) {
    var open = flat(m[1]);
    var body = '';
    if (!/\/$/.test(open)) {
      var end = text.indexOf('</service>', re.lastIndex);
      body = flat(text.slice(re.lastIndex, end === -1 ? text.length : end));
    }
    out.push({
      line: lineOf(text, m.index),
      name: attr(open, 'name'),
      perm: attr(open, 'permission'),
      fgs: attr(open, 'foregroundServiceType'),
      body: body
    });
  }
  return out;
}

function check(text, opts) {
  opts = opts || {};
  var src = stripComments(String(text || ''));
  var perms = permissions(src), svcs = services(src);
  var have = {};
  perms.forEach(function (p) { have[p.name] = p.line; });
  var findings = [];
  function push(rule, line, extra) {
    findings.push({
      check: rule.id, sev: rule.sev, line: line,
      msg: (extra ? extra + ' ' : '') + rule.msg + ' [Play surface: ' + rule.form + ']'
    });
  }

  (RULES || []).forEach(function (rule) {
    if (rule.kind === 'perm') {
      if (have[rule.perm] !== undefined) push(rule, have[rule.perm], rule.perm.split('.').pop() + ' is declared.');
    } else if (rule.kind === 'perm_any') {
      (rule.perms || []).forEach(function (p) {
        if (have[p] !== undefined) push(rule, have[p], p.split('.').pop() + ' is declared.');
      });
    } else if (rule.kind === 'perm_prefix') {
      var hit = perms.filter(function (p) { return p.name.indexOf(rule.prefix) === 0; });
      if (hit.length) push(rule, hit[0].line, hit.length + ' Health Connect permission' + (hit.length === 1 ? '' : 's') + ' declared (' + hit[0].name + (hit.length > 1 ? ', ...' : '') + ').');
    } else if (rule.kind === 'service_perm') {
      svcs.forEach(function (s) { if (s.perm === rule.perm) push(rule, s.line, (s.name || 'a service') + ':'); });
    } else if (rule.kind === 'fgs_any') {
      var types = {};
      svcs.forEach(function (s) { if (s.fgs) s.fgs.split('|').forEach(function (t) { if (t) types[t.trim()] = s.line; }); });
      var names = Object.keys(types);
      if (names.length) push(rule, types[names[0]], names.length + ' foreground service type' + (names.length === 1 ? '' : 's') + ' in this manifest (' + names.join(', ') + ').');
    } else if (rule.kind === 'fgs_permission') {
      svcs.forEach(function (s) {
        if (!s.fgs) return;
        s.fgs.split('|').forEach(function (t) {
          t = t.trim(); if (!t) return;
          var need = FGS_PERM[t];
          if (need && have['android.permission.' + need] === undefined) {
            push(rule, s.line, 'foregroundServiceType="' + t + '" without android.permission.' + need + '.');
          }
        });
      });
    } else if (rule.kind === 'special_use') {
      svcs.forEach(function (s) {
        if (s.fgs && s.fgs.split('|').map(function (t) { return t.trim(); }).indexOf('specialUse') !== -1
            && s.body.indexOf('android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE') === -1) {
          push(rule, s.line, (s.name || 'this service') + ':');
        }
      });
    }
  });

  findings.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
  return { findings: findings, permissions: perms.length, services: svcs.length };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: (RULES || []).length, FGS_PERM: FGS_PERM };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else window.PLAYDECLENGINE = API;
