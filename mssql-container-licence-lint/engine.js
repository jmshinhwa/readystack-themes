// SQL Server container licence lint - same file runs in VS Code (node) and in the browser.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.MSQL_RULES;
  var BY = {}; RULES.forEach(function (r) { BY[r.id] = r; });
  // SQL Server 2022 open no-level list price (USD) per 2-core pack, microsoft.com/sql-server/sql-server-2022-pricing
  var PACK = { Enterprise: 15123, Standard: 3945 };
  var MIN_CORES = 4;
  var IMAGE = /(?:mcr\.microsoft\.com\/)?mssql\/server(?::([\w.-]+))?/i;
  var KEY = /\b[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}\b/;
  var PROD = /\b(prod|production|live)\b/i;

  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function cost(edition, cores) { return PACK[edition] * Math.ceil(Math.max(MIN_CORES, cores) / 2); }
  function indent(s) { return s.match(/^\s*/)[0].length; }
  function cpuVal(v) {
    v = String(v).replace(/["']/g, '').trim();
    if (/m$/.test(v)) return parseFloat(v) / 1000;
    return parseFloat(v);
  }

  // A block = the compose service / k8s container / Dockerfile that holds the mssql image.
  function blocks(lines) {
    var out = [];
    var isDockerfile = lines.some(function (l) { return /^\s*FROM\s+\S*mssql\/server/i.test(l); });
    if (isDockerfile) return [{ start: 0, end: lines.length - 1, img: lines.findIndex(function (l) { return /^\s*FROM\s/i.test(l) && IMAGE.test(l); }) }];
    lines.forEach(function (l, i) {
      if (!/^\s*-?\s*image\s*:/.test(l) || !IMAGE.test(l)) return;
      var k = indent(l.replace('-', ' ')), s = i;
      for (var j = i - 1; j >= 0; j--) {
        if (!lines[j].trim() || /^\s*#/.test(lines[j])) continue;
        var dj = indent(lines[j]);
        if (/^\s*-\s/.test(lines[j]) && dj < k) { s = j; break; }
        if (dj < k) { s = j; break; }
      }
      var base = indent(lines[s]), e = lines.length - 1;
      for (var m = i + 1; m < lines.length; m++) {
        if (!lines[m].trim() || /^\s*#/.test(lines[m])) continue;
        if (/^---/.test(lines[m]) || indent(lines[m]) <= base) { e = m - 1; break; }
      }
      out.push({ start: s, end: e, img: i });
    });
    return out;
  }

  function scan(lines, b) {
    var r = { pid: null, pidLine: -1, eula: false, cpus: null, cpuLine: -1, tag: null, prod: false };
    var m = lines[b.img].match(IMAGE); r.tag = m && m[1] ? m[1] : null;
    var inLimits = false, limInd = -1;
    for (var i = b.start; i <= b.end; i++) {
      var l = lines[i];
      if (/^\s*#/.test(l)) continue;
      if (PROD.test(l)) r.prod = true;
      if (/ACCEPT_EULA/.test(l)) r.eula = true;
      var p = l.match(/MSSQL_PID\s*[=:]\s*["']?([\w-]+)/);
      if (p) { r.pid = p[1]; r.pidLine = i; }
      if (/name\s*:\s*["']?MSSQL_PID\b/.test(l)) {
        for (var n = i + 1; n <= Math.min(i + 3, b.end); n++) {
          var v = lines[n].match(/^\s*value\s*:\s*["']?([\w-]+)/);
          if (v) { r.pid = v[1]; r.pidLine = n; break; }
          if (/valueFrom/.test(lines[n])) { r.pid = '(secret)'; r.pidLine = n; break; }
        }
      }
      if (/^\s*limits\s*:/.test(l)) { inLimits = true; limInd = indent(l); continue; }
      if (inLimits && l.trim() && indent(l) <= limInd) inLimits = false;
      var c = l.match(/^\s*cpus?\s*:\s*(["']?[\d.]+m?["']?)/);
      if (c && (inLimits || r.cpus === null)) { r.cpus = cpuVal(c[1]); r.cpuLine = i; }
      var dc = l.match(/--cpus[= ]["']?([\d.]+)/);
      if (dc) { r.cpus = parseFloat(dc[1]); r.cpuLine = i; }
    }
    return r;
  }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text).replace(/\r/g, '').split('\n');
    var findings = [];
    function add(id, line, msg) { findings.push({ check: id, sev: BY[id].sev, msg: BY[id].title + ': ' + msg + ' [' + BY[id].source + ']', line: line + 1 }); }
    var fileProd = PROD.test(opts.filename || '');

    lines.forEach(function (l, i) {
      if (/^\s*#/.test(l)) return;
      if (/MSSQL_PID|product.?key|PID\s*[=:]/i.test(l) && KEY.test(l)) add('product_key_committed', i, 'a licence key in source control is readable by anyone with clone access - move it to a secret and rotate it with your Microsoft reseller.');
    });

    blocks(lines).forEach(function (b) {
      var s = scan(lines, b), prod = s.prod || fileProd;
      var pid = s.pid, cores = s.cpus, ver = s.tag && /^(\d{4})/.test(s.tag) ? +s.tag.slice(0, 4) : null;
      var coreTxt = cores === null ? 'at least ' + MIN_CORES + ' cores' : Math.max(MIN_CORES, Math.ceil(cores)) + ' cores';
      var ce = cores === null ? MIN_CORES : Math.ceil(cores);
      var exposure = ' List-price exposure for ' + coreTxt + ': Standard ' + money(cost('Standard', ce)) + ' or Enterprise ' + money(cost('Enterprise', ce)) + ' (SQL Server 2022 2-core packs).';
      if (!s.eula) add('eula_missing', b.img, 'add ACCEPT_EULA=Y - without it the container exits on start.');
      if (!s.tag || s.tag === 'latest') add('tag_unpinned', b.img, 'pin a version tag such as 2022-latest or 2025-latest so the edition limits you licensed for do not change under you.');
      if (!pid) {
        add('pid_unset', b.img, (prod ? 'this production container' : 'this container') + ' starts as Developer edition, which is licensed for development and test only.' + (prod ? exposure : ' Set MSSQL_PID explicitly.'));
        return;
      }
      if (pid === '(secret)') return;
      var P = pid.toLowerCase(), L = s.pidLine;
      if (/developer$/.test(P)) {
        if (prod) add('pid_developer_prod', L, pid + ' may not serve production workloads.' + exposure);
        if (P !== 'developer' && ver && ver < 2025) add('pid_2025_only', L, pid + ' on image tag ' + s.tag + ' - use Developer before SQL Server 2025.');
        return;
      }
      if (P === 'evaluation') { add('pid_evaluation', L, 'the evaluation period ends 180 days after install.' + (prod ? exposure : '')); return; }
      if (P === 'web') { add('pid_web', L, 'Web edition is sold only through a hosting (SPLA) partner; outside a hosting agreement choose Standard or EnterpriseCore.'); return; }
      if (P === 'express') {
        if (cores !== null && cores > 4) add('express_core_cap', s.cpuLine, cores + ' CPUs allocated, Express uses at most 4 cores and 1,410 MB of buffer pool.');
        return;
      }
      var ed = P === 'standard' ? 'Standard' : (P === 'enterprisecore' || P === 'enterprise') ? 'Enterprise' : null;
      if (!ed) return;
      if (P === 'enterprise') add('pid_enterprise_legacy', L, 'use EnterpriseCore for core-based licensing' + (cores !== null && cores > 20 ? '; ' + cores + ' CPUs exceed the 20-core cap of this PID.' : '.'));
      if (cores === null) add('no_cpu_limit', b.img, ed + ' with no CPU limit sees every host core, and every virtual core must be licensed. Set deploy.resources.limits.cpus (compose) or resources.limits.cpu (Kubernetes).');
      else if (cores < MIN_CORES) add('core_minimum', s.cpuLine, cores + ' CPUs allocated, ' + MIN_CORES + ' core licences billed: ' + money(cost(ed, cores)) + ' at ' + ed + ' list price.');
      if (ed === 'Standard' && cores !== null) {
        var cap = ver && ver >= 2025 ? 32 : 24;
        if (cores > cap) add('standard_core_cap', s.cpuLine, cores + ' CPUs allocated, Standard ' + (ver || '2022') + ' uses ' + cap + '; the extra ' + (Math.ceil(cores) - cap) + ' cores cost ' + money(cost('Standard', Math.ceil(cores)) - cost('Standard', cap)) + ' in licences that do no work.');
      }
    });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, cost: cost };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.MSQLENGINE = api;
})();
