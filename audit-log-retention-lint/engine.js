/* Audit Log Retention Lint engine — one file for the VS Code extension and the web page. */
(function (root) {
  var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : root.ALR_RULES;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  // Minimums in days. total = keep at least this long; hot = immediately available (not archive tier).
  var PROFILES = {
    'pci-dss': { label: 'PCI DSS v4.0.1 Req. 10.5.1', total: 365, hot: 90, clause: '10.5.1: audit log history at least 12 months, the most recent three months immediately available' },
    'cert-in': { label: 'CERT-In Directions of 28 April 2022, (iv)', total: 180, hot: 0, region: true, clause: '(iv): logs of all ICT systems kept for a rolling 180 days within Indian jurisdiction' },
    'm-21-31': { label: 'OMB M-21-31', total: 913, hot: 365, clause: 'M-21-31: 12 months active storage plus 18 months cold storage (30 months)' }
  };
  var INDIA = /^(ap-south-[12]|asia-south[12]|centralindia|southindia|westindia|jioindiacentral|jioindiawest)$/i;

  function toDays(v) {
    v = String(v).trim().replace(/^["']|["']$/g, '');
    if (/^\d+(\.\d+)?$/.test(v)) return parseFloat(v);
    var unit = { y: 365, w: 7, d: 1, h: 1 / 24, m: 1 / 1440, s: 1 / 86400, ms: 1 / 86400000 };
    var re = /(\d+(?:\.\d+)?)(ms|y|w|d|h|m|s)/g, m, total = 0, seen = '';
    while ((m = re.exec(v))) { total += parseFloat(m[1]) * unit[m[2]]; seen += m[0]; }
    return seen && seen === v ? total : null;
  }
  function fmt(d) { return d >= 1 ? String(Math.round(d * 10) / 10) + ' days' : String(Math.round(d * 24 * 10) / 10) + ' hours'; }

  function profilesOf(text, opts) {
    var names = (opts && opts.profiles) || null;
    var m = /^\s*#\s*log-retention\s*:\s*([a-z0-9 ,\-]+)$/im.exec(text);
    if (!names && m) names = m[1].split(',').map(function (s) { return s.trim().toLowerCase(); });
    names = (names || ['pci-dss']).filter(function (n) { return PROFILES[n]; });
    return names.length ? names : ['pci-dss'];
  }

  function check(text, opts) {
    var lines = String(text).split(/\r?\n/), findings = [];
    var profs = profilesOf(text, opts).map(function (n) { return PROFILES[n]; });
    var need = function (key) {
      var best = null;
      profs.forEach(function (p) { if (p[key] && (!best || p[key] > best[key])) best = p; });
      return best;
    };
    function add(id, line, value, days, key) {
      var p = need(key); if (!p || days === null || days === 0 || days >= p[key]) return;
      var r = BY_ID[id];
      findings.push({ check: id, sev: r.sev, line: line + 1,
        msg: r.title + ': ' + value + ' = ' + fmt(days) + ', ' + p.label + ' needs ' + p[key] + ' days (' + p.clause + '). Fix: ' + r.fix + '.' });
    }
    var inIlmDelete = -1, inStream = -1, ilmIndent = 0, streamIndent = 0;
    lines.forEach(function (raw, i) {
      var line = raw.replace(/\s+#.*$/, '');
      if (/^\s*#/.test(raw)) return;
      var ind = raw.search(/\S/);
      var m;
      if (/^\s*"?delete"?\s*:\s*\{?\s*$/.test(line)) { inIlmDelete = i; ilmIndent = ind; }
      else if (inIlmDelete >= 0 && ind <= ilmIndent && line.trim()) inIlmDelete = -1;
      if (/^\s*-?\s*retention_stream\s*:/.test(line)) { inStream = i; streamIndent = ind; }
      else if (inStream >= 0 && ind <= streamIndent && line.trim() && !/^\s*-/.test(line)) inStream = -1;

      if ((m = /^\s*retention_period\s*:\s*(\S+)/.exec(line))) add('loki-retention-period', i, m[1], toDays(m[1]), 'total');
      if (inStream >= 0 && (m = /^\s*-?\s*period\s*:\s*(\S+)/.exec(line))) add('loki-stream-period', i, m[1], toDays(m[1]), 'total');
      if ((m = /^\s*-?\s*"?(RetentionInDays|retentionInDays|logRetentionInDays|retention_in_days)"?\s*:\s*"?(\d+)/.exec(line))) add('log-group-retention-days', i, m[1] + ': ' + m[2], toDays(m[2]), 'total');
      if ((m = /^\s*-?\s*"?retentionDays"?\s*:\s*"?(\d+)/.exec(line))) add('gcp-bucket-retention-days', i, 'retentionDays: ' + m[1], toDays(m[1]), 'total');
      if (inIlmDelete >= 0 && (m = /^\s*"?min_age"?\s*:\s*"?([0-9a-z.]+)/.exec(line))) add('ilm-delete-min-age', i, 'min_age: ' + m[1], toDays(m[1]), 'total');
      if ((m = /audit-log-maxage["']?\s*[=:]\s*["']?(\d+)/.exec(line))) add('k8s-audit-log-maxage', i, 'audit-log-maxage ' + m[1], toDays(m[1]), 'total');
      if ((m = /^\s*-?\s*"?ExpirationInDays"?\s*:\s*"?(\d+)/.exec(line)) || (m = /^\s*"?Expiration"?\s*:\s*\{?\s*"?Days"?\s*:\s*(\d+)/.exec(line))) {
        var ctx = lines.slice(Math.max(0, i - 25), i + 1).join('\n');
        if (/log|audit|trail|siem/i.test(ctx)) add('s3-log-expiration', i, 'expiration ' + m[1] + ' days', toDays(m[1]), 'total');
      }
      if ((m = /^\s*-?\s*"?TransitionInDays"?\s*:\s*"?(\d+)/.exec(line))) {
        var near = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
        if (/StorageClass"?\s*:\s*"?(GLACIER|DEEP_ARCHIVE)\b/.test(near) && !/GLACIER_IR/.test(near)) add('s3-cold-transition', i, 'transition to archive after ' + m[1] + ' days', toDays(m[1]), 'hot');
      }
      if (need('region') && (m = /^\s*-?\s*"?(region|location|Region|Location)"?\s*:\s*"?([a-z]+[a-z0-9-]*\d?)"?\s*$/.exec(line)) && /\d|india/i.test(m[2]) && !INDIA.test(m[2])) {
        var r = BY_ID['cert-in-region'];
        findings.push({ check: 'cert-in-region', sev: r.sev, line: i + 1, msg: r.title + ': ' + m[1] + ': ' + m[2] + ' is outside India, CERT-In Directions of 28 April 2022, (iv) keep logs within Indian jurisdiction. Fix: ' + r.fix + '.' });
      }
    });
    return { findings: findings, profiles: profs.map(function (p) { return p.label; }) };
  }

  var api = { engine: { check: check, toDays: toDays }, RULES: RULES, RULE_COUNT: RULES.length, PROFILES: PROFILES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ALRENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
