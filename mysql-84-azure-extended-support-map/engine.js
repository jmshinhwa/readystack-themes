// mysql 8.4 Azure Extended Support map — one brain for the extension and the web page.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.MYSQLAZ_RULES;
  var BY = {}; RULES.forEach(function (r) { BY[r.id] = r; });

  // Dates from the Azure version policy page (last updated 2026-09-11).
  var ES = {
    '5.7': { std_end: '2026-09-30', es_start: '2026-10-01', es_end: '2029-03-31' },
    '8.0': { std_end: '2027-01-31', es_start: '2027-02-01', es_end: '2029-05-31' }
  };
  // Azure retail price API, meter "Extended Support vCore", East US, effective 2025-11-01.
  var RATE = { usd: 0.07, per: 'vCore-hour', region: 'East US', since: '2025-11-01', hours: 8760 };
  var GONE_80 = { query_cache_type: 1, query_cache_size: 1, tx_isolation: 1 };
  var GONE_84 = { default_authentication_plugin: 'authentication_policy', expire_logs_days: 'binlog_expire_logs_seconds' };

  function major(v) {
    v = String(v || '').trim();
    if (/^5\.7/.test(v)) return '5.7';
    if (/^8\.0/.test(v) || v === '8') return '8.0';
    if (/^8\.4/.test(v)) return '8.4';
    return '';
  }
  function parseDay(s) {
    var m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  }
  function billing(maj, today) {
    var e = ES[maj], t = parseDay(today), d = parseDay(e.es_start);
    var days = isNaN(t) ? null : Math.round((d - t) / 86400000);
    if (days === null) return 'Extended Support billing per vCore-hour from ' + e.es_start;
    if (days <= 0) return 'billed per vCore-hour as Extended Support since ' + e.es_start + ' (' + (1 - days) + ' days so far)';
    return 'billed per vCore-hour as Extended Support from ' + e.es_start + ' (' + days + ' days left)';
  }
  function money(x) { return x.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function vcores(sku) { var m = /Standard_[A-Za-z](\d+)/.exec(String(sku || '')); return m ? +m[1] : 0; }
  function cost(b) {
    var n = vcores(b.sku); if (!n) return '';
    var billed = b.ha ? n * 2 : n;
    return ' · ' + billed + ' vCores' + (b.ha ? ' (HA standby billed too)' : '') + ' × ' + RATE.usd + ' USD × ' + RATE.hours + ' h = ' + money(billed * RATE.usd * RATE.hours) + ' USD a year at the ' + RATE.region + ' list price';
  }
  function pinMsg(maj, where, today, style, b) {
    var fix = style === 'bicep' ? (maj === '5.7' ? "version: '8.0.21' (deploy), then version: '8.4'" : "version: '8.4'")
            : style === 'json' ? (maj === '5.7' ? '"version": "8.0.21" (deploy), then "version": "8.4"' : '"version": "8.4"')
            : BY[maj === '5.7' ? 'flex-57' : 'flex-80'].fix;
    return where + ' runs MySQL ' + maj + ': ' + billing(maj, today) + (b ? cost(b) : '') + '. Write: ' + fix;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || '';
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var findings = [];
    function add(id, line, msg) { findings.push({ check: id, sev: BY[id].sev, msg: msg, line: line }); }
    var isArmJson = /"type"\s*:\s*"Microsoft\.DBforMySQL\/flexibleServers"/i.test(text);

    // Terraform variable defaults, so version = var.x resolves to its pin.
    var vars = {}, cur = null;
    lines.forEach(function (l, i) {
      var m = /^\s*variable\s+"([^"]+)"/.exec(l);
      if (m) cur = m[1];
      var d = /^\s*default\s*=\s*"([^"]*)"/.exec(l);
      if (cur && d) { vars[cur] = { v: d[1], line: i + 1 }; cur = null; }
    });

    // Block walker for HCL and Bicep resources.
    var blk = null, depth = 0;
    function open(kind, label, i) { blk = { kind: kind, label: label, line: i + 1, version: null, vline: 0, replica: false, sku: null, ha: false, name: null, nline: 0, cfgTarget: false }; depth = 0; }
    function close() {
      var b = blk; blk = null;
      if (b.kind === 'single') { add('single-server', b.line, b.label + ': Single Server is retired; nothing to upgrade in place. Write: ' + BY['single-server'].fix); return; }
      if (b.kind === 'flex' || b.kind === 'bflex') {
        var style = b.kind === 'bflex' ? 'bicep' : 'tf';
        if (!b.version) { if (b.kind === 'flex' && !b.replica) add('no-version-pin', b.line, b.label + ': no version, so plan never shows the major version. Write: version = "8.4"'); return; }
        var maj = major(b.version.v);
        if (maj === '5.7' || maj === '8.0') {
          var where = b.label + (b.version.via ? ' (via ' + b.version.via + ')' : '');
          add(maj === '5.7' ? 'flex-57' : 'flex-80', b.vline, pinMsg(maj, where, today, style, b));
          if (b.replica) add('replica-first', b.line, b.label + ' is a read replica: upgrade it before its primary or the primary Upgrade stays disabled.');
        }
        return;
      }
      if (b.kind === 'cfg' && b.name) {
        var n = b.name.toLowerCase();
        if (GONE_80[n]) add('param-gone-80', b.nline, n + ' was removed in MySQL 8.0: the Azure upgrade validation can fail while a removed setting is configured. Delete this block before the 5.7 to 8.0 upgrade.');
        if (GONE_84[n]) add('param-gone-84', b.nline, n + ' was removed in MySQL 8.4. Delete it; use ' + GONE_84[n] + ' instead.');
      }
    }
    lines.forEach(function (l, i) {
      var s = l.replace(/#.*$|\/\/.*$/, '');
      if (!blk) {
        var m;
        if ((m = /^\s*resource\s+"azurerm_mysql_flexible_server"\s+"([^"]+)"/.exec(s))) open('flex', 'azurerm_mysql_flexible_server.' + m[1], i);
        else if ((m = /^\s*resource\s+"azurerm_mysql_server"\s+"([^"]+)"/.exec(s))) open('single', 'azurerm_mysql_server.' + m[1], i);
        else if ((m = /^\s*resource\s+"azurerm_mysql_flexible_server_configuration"\s+"([^"]+)"/.exec(s))) open('cfg', m[1], i);
        else if ((m = /^\s*resource\s+"azapi_resource"\s+"([^"]+)"/.exec(s))) open('azapi', 'azapi_resource.' + m[1], i);
        else if ((m = /^\s*resource\s+(\w+)\s+'Microsoft\.DBforMySQL\/flexibleServers@/i.exec(s))) open('bflex', m[1], i);
        else if ((m = /^\s*resource\s+(\w+)\s+'Microsoft\.DBforMySQL\/flexibleServers\/configurations@/i.exec(s))) open('cfg', m[1], i);
        else if ((m = /^\s*resource\s+(\w+)\s+'Microsoft\.DBforMySQL\/servers@/i.exec(s))) open('single', m[1], i);
        else return;
      } else {
        var v;
        if (blk.kind === 'azapi' && /type\s*=\s*"Microsoft\.DBforMySQL\/flexibleServers@/i.test(s)) blk.kind = 'flex';
        else if (blk.kind === 'azapi' && /type\s*=\s*"Microsoft\.DBforMySQL\/servers@/i.test(s)) blk.kind = 'single';
        else if (blk.kind === 'azapi' && /type\s*=\s*"Microsoft\.DBforMySQL\/flexibleServers\/configurations@/i.test(s)) blk.kind = 'cfg';
        if (!blk.version && (v = /^\s*version\s*[=:]\s*["']([^"']+)["']/.exec(s))) { blk.version = { v: v[1] }; blk.vline = i + 1; }
        else if (!blk.version && (v = /^\s*version\s*=\s*var\.([\w-]+)/.exec(s)) && vars[v[1]]) { blk.version = { v: vars[v[1]].v, via: 'var.' + v[1] + ' default "' + vars[v[1]].v + '"' }; blk.vline = i + 1; }
        if (!blk.sku && (v = /^\s*(?:sku_name\s*=|name\s*:)\s*["'](\w*Standard_\w+)["']/.exec(s))) blk.sku = v[1];
        if (/^\s*high_availability\s*[{=]|^\s*highAvailability\s*:/.test(s)) blk.ha = true;
        if (/create_mode\s*[=:]\s*["']Replica["']|createMode\s*:\s*'Replica'/i.test(s)) blk.replica = true;
        if (!blk.name && blk.kind === 'cfg' && (v = /^\s*name\s*[=:]\s*["']([^"']+)["']/.exec(s))) { blk.name = v[1].split('/').pop(); blk.nline = i + 1; }
      }
      depth += (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
      if (blk && depth <= 0 && /\}/.test(s)) close();
    });

    // ARM JSON: the version property of a flexibleServers resource.
    if (isArmJson) lines.forEach(function (l, i) {
      var m = /"version"\s*:\s*"(5\.7|8\.0\.21)"/.exec(l);
      if (m) { var maj = major(m[1]); add(maj === '5.7' ? 'flex-57' : 'flex-80', i + 1, pinMsg(maj, 'ARM flexibleServers resource', today, 'json')); }
    });

    // az CLI, with backslash / backtick continuations joined.
    for (var i = 0; i < lines.length; i++) {
      if (!/\baz\s+mysql\s+flexible-server\s+(create|upgrade)\b/.test(lines[i])) continue;
      var start = i, cmd = lines[i];
      while (/[\\`]\s*$/.test(lines[i]) && i + 1 < lines.length) { i++; cmd = cmd.replace(/[\\`]\s*$/, ' ') + lines[i]; }
      var m = /--version\s+["']?([\d.]+)/.exec(cmd);
      if (!m) continue;
      var maj = major(m[1]);
      if (maj === '5.7' || maj === '8.0') {
        var verb = /flexible-server\s+upgrade/.test(cmd) ? 'upgrade lands on' : 'create builds';
        add('cli-pin', start + 1, 'az mysql flexible-server ' + verb + ' MySQL ' + maj + ': ' + billing(maj, today) + '. Write: --version 8.4');
      }
    }

    lines.forEach(function (l, i) {
      if (/mysql_native_password/.test(l) && !/^\s*(#|\/\/)/.test(l)) add('native-password', i + 1, 'mysql_native_password: Azure keeps it enabled, but 8.4 creates new accounts with caching_sha2_password. Move this account before or after the upgrade.');
    });

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, ES: ES, RATE: RATE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.MYSQLAZ_ENGINE = api;
})();
