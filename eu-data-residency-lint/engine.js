// EU Data Residency Lint — one brain, two homes (Node extension + browser page).
(function (root, factory) {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.EDR_RULES;
  var api = factory(RULES);
  if (typeof module !== 'undefined') module.exports = api;
  root.EDRENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis, function (DOC) {

  var REGIONS = DOC.regions, MULTI = DOC.multiregions, ZONES = DOC.zones;
  var RULES = DOC.rules;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  var REGION_KEYS = /^(region|location|region_name|aws_region|default_region|replica_region|destination_region|source_region|primary_location|secondary_location)$/;
  var DEST_KEYS = /(^|_)(log|logs|logging|destination|copy|target|backup|report)(_|$)/;
  var STORE_TYPES = /(s3_bucket|rds_cluster|rds_instance|db_instance|dynamodb_table|storage_account|google_storage_bucket|ebs_volume|efs_file_system|redshift_cluster|elasticache)$/;
  var CMK_KEYS = /(kms_key|customer_managed_key|encryption_key|cmek|key_vault_key_id|default_kms_key_name|sse_algorithm)/;
  var EDGE_TYPES = /(aws_cloudfront_function|cloudflare_worker_script|cloudflare_workers_script|aws_lambda_function_event_invoke|azurerm_cdn_frontdoor_rule)/;
  var ARN = /arn:aws[a-z-]*:[a-z0-9-]*:([a-z]{2}-[a-z]+-\d):/g;

  function zoneOf(name) {
    var r = REGIONS[name];
    return r ? { cloud: r[0], country: r[1], zone: r[2] } : null;
  }
  function looksLikeRegion(v) {
    return /^[a-z]{2}-[a-z]+-\d$/.test(v) || /^(europe|us|asia|australia|northamerica|southamerica|me|africa)-[a-z]+\d?$/.test(v) ||
      /^(east|west|central|north|south)?[a-z]{2,}(us|europe|asia|india|japan|korea|brazil|canada|uk|france|germany|sweden|norway|poland|italy|spain|switzerland|australia|uae)[a-z0-9]*$/.test(v);
  }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var findings = [];
    var stack = [];
    var lower = String(text || '').toLowerCase();
    var hasBasis = DOC.basis_markers.some(function (m) { return lower.indexOf(m) !== -1; });
    var hasDpf = /\bdpf\b|data privacy framework/.test(lower);
    var firstNonEea = 0, firstUs = 0;

    function add(id, line, msg, extra) {
      var r = BY_ID[id] || { sev: 'warn' };
      var f = { check: id, sev: r.sev, msg: msg, line: line };
      if (extra) for (var k in extra) f[k] = extra[k];
      findings.push(f);
    }
    function path() { return stack.map(function (b) { return b.kw + (b.a ? ':' + b.a : ''); }).join('/'); }
    function cur() { return stack.length ? stack[stack.length - 1] : null; }
    function mark(line, info) {
      if (info.zone !== 'eea' && !firstNonEea) firstNonEea = line;
      if (info.zone === 'us' && !firstUs) firstUs = line;
      stack.forEach(function (b) { if (info.zone !== 'eea') b.nonEea = true; });
    }

    function regionFinding(line, key, name, info) {
      var p = path();
      var where = info.country + ' (' + info.cloud + ' "' + name + '")';
      var why = ZONES[info.zone];
      var id;
      if (/terraform|backend/.test(p)) id = 'backend-state';
      else if (/replication_configuration|destination/.test(p) || DEST_KEYS.test(key)) id = /replication/.test(p) ? 'replication-destination' : 'log-destination';
      else if (/replica/.test(p)) id = /dynamodb/.test(p) ? 'dynamodb-global-replica' : 'secret-replica';
      else if (/^provider/.test(p) && stack[0] && stack[0].alias) id = 'provider-alias';
      else id = info.zone === 'us' ? 'region-us' : (info.zone === 'third' ? 'region-third-country' : 'region-adequacy');
      add(id, line, BY_ID[id].title + ': ' + key + ' = "' + name + '" puts this data in ' + where + '. ' + why, { region: name, country: info.country, zone: info.zone });
    }

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i], ln = i + 1;
      var code = raw.replace(/(#|\/\/).*$/, '');
      var header = code.match(/^\s*([A-Za-z_][\w-]*)\s*(?:"([^"]*)")?\s*(?:"([^"]*)")?\s*\{/);
      var net = (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length;

      // values inside the current block
      var kv = code.match(/^\s*([A-Za-z_][\w.-]*)\s*=\s*(.+?)\s*$/);
      if (kv) {
        var key = kv[1], val = kv[2];
        var blk = cur();
        if (blk) blk.keys = (blk.keys || '') + ' ' + key;
        if (blk && /^alias$/.test(key)) blk.alias = val.replace(/"/g, '');
        var str = val.match(/^"([^"]*)"$/);
        if (REGION_KEYS.test(key) && str) {
          var v = str[1];
          if (MULTI[v.toUpperCase()] && !/^[a-z]/.test(v)) {
            var m = MULTI[v.toUpperCase()];
            if (v.toUpperCase() !== 'EU') {
              mark(ln, { zone: m[1] });
              add('multiregion-non-eu', ln, BY_ID['multiregion-non-eu'].title + ': ' + key + ' = "' + v + '" is ' + m[0] + '. ' + ZONES[m[1]], { region: v, zone: m[1] });
            }
          } else {
            var info = zoneOf(v);
            if (info) { mark(ln, info); if (info.zone !== 'eea') regionFinding(ln, key, v, info); }
            else if (looksLikeRegion(v)) add('region-unknown', ln, BY_ID['region-unknown'].title + ': "' + v + '" is not in the ' + Object.keys(REGIONS).length + '-region residency table — confirm the country by hand.', { region: v });
          }
        } else if (REGION_KEYS.test(key) && /^(var|local)\./.test(val)) {
          add('region-indirect', ln, BY_ID['region-indirect'].title + ': ' + key + ' = ' + val + '. A reviewer cannot tell which country this lands in from the code.', { region: val });
        }
        if (/^availability_zone[s]?$/.test(key) && str) {
          var az = str[1].replace(/[a-z]$/, '');
          var azi = zoneOf(az);
          if (azi && azi.zone !== 'eea') { mark(ln, azi); add('availability-zone', ln, BY_ID['availability-zone'].title + ': "' + str[1] + '" is in ' + azi.country + '. ' + ZONES[azi.zone], { region: az, country: azi.country, zone: azi.zone }); }
        }
        var am, seen = {};
        ARN.lastIndex = 0;
        while ((am = ARN.exec(code))) {
          var ai = zoneOf(am[1]);
          if (ai && ai.zone !== 'eea' && !seen[am[1]]) {
            seen[am[1]] = 1; mark(ln, ai);
            var aid = DEST_KEYS.test(key) ? 'log-destination' : (ai.zone === 'us' ? 'region-us' : (ai.zone === 'third' ? 'region-third-country' : 'region-adequacy'));
            add(aid, ln, BY_ID[aid].title + ': the ARN in ' + key + ' resolves to ' + ai.country + ' ("' + am[1] + '"). ' + ZONES[ai.zone], { region: am[1], country: ai.country, zone: ai.zone });
          }
        }
      }

      if (/lambda@edge/i.test(raw) || (header && EDGE_TYPES.test((header[2] || '') + (header[1] || '')))) {
        add('edge-global', ln, BY_ID['edge-global'].title + ': ' + (header ? header[2] || header[1] : 'Lambda@Edge') + ' runs at every edge location worldwide, including outside the EEA. ' + ZONES.third);
      }

      if (header && net > 0) {
        stack.push({ kw: header[1], a: header[2] || '', b: header[3] || '', line: ln, keys: '' });
        net--;
      }
      while (net > 0) { stack.push({ kw: '_', a: '', b: '', line: ln, keys: '' }); net--; }
      while (net < 0 && stack.length) {
        var done = stack.pop(); net++;
        if (done.kw === 'provider' && !/\b(region|location)\b/.test(done.keys)) {
          add('provider-region-unpinned', done.line, BY_ID['provider-region-unpinned'].title + ': provider "' + done.a + '" pins no region, so it falls back to the shell environment (for AWS, AWS_DEFAULT_REGION). The country this runs in is decided outside the repository.');
        }
        if (done.kw === 'resource' && done.nonEea && STORE_TYPES.test(done.a) && !CMK_KEYS.test(done.keys)) {
          add('cmk-absent', done.line, BY_ID['cmk-absent'].title + ': ' + done.a + ' "' + done.b + '" stores data outside the EEA with no customer-managed key. Encryption under a key you hold is the supplementary measure a transfer impact assessment asks for.');
        }
        if (stack.length && done.nonEea) stack[stack.length - 1].nonEea = true;
      }
    }

    if (firstNonEea && !hasBasis) {
      add('transfer-basis-undocumented', firstNonEea, BY_ID['transfer-basis-undocumented'].title + ': this file moves data outside the EEA and names no transfer basis. Add a comment naming the SCCs, BCRs, adequacy decision or Article 49 derogation you rely on.');
    }
    if (firstUs && !hasDpf) {
      add('dpf-unverified', firstUs, BY_ID['dpf-unverified'].title + ': a US region is used and the file does not name the EU-US Data Privacy Framework. ' + ZONES.us);
    }

    findings.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
    return { findings: findings };
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
});
