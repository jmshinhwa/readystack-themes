/* GKE Extended channel fee lint: one engine for VS Code and the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.GX_RULES;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  // GKE release schedule (cloud.google.com/kubernetes-engine/docs/release-schedule, read 2026-09-28):
  // minor: [end of standard support, end of extended support]
  var CAL = {
    '1.30': ['2025-09-30', '2026-07-30'],
    '1.31': ['2026-01-16', '2026-10-22'],
    '1.32': ['2026-04-27', '2027-02-11'],
    '1.33': ['2026-08-12', '2027-06-12'],
    '1.34': ['2027-01-25', '2027-11-25'],
    '1.35': ['2027-04-11', '2028-02-11'],
    '1.36': ['2027-08-09', '2028-06-09']
  };
  var FEE_PER_HOUR = 0.5, SOON_DAYS = 120, FORCED_DAYS = 90;

  function day(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }
  function between(a, b) { return Math.round((day(b) - day(a)) / 86400000); }
  function usd(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function nextStandard(today) {
    var ks = Object.keys(CAL).sort(function (a, b) { return +a.split('.')[1] - +b.split('.')[1]; });
    for (var i = 0; i < ks.length; i++) if (between(today, CAL[ks[i]][0]) > SOON_DAYS) return ks[i];
    return ks[ks.length - 1];
  }

  // Top-level blocks with their start line and body text.
  function blocks(lines) {
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var m = /^\s*(resource|data|variable)\s+"([^"]+)"(?:\s+"([^"]+)")?\s*\{/.exec(lines[i]);
      if (!m) continue;
      var depth = 0, j = i, body = [];
      for (; j < lines.length; j++) {
        var l = lines[j].replace(/#.*$|\/\/.*$/, '');
        body.push(l);
        depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
        if (depth <= 0) break;
      }
      out.push({ kind: m[1], type: m[2], name: m[3] || m[2], line: i, body: body });
      i = j;
    }
    return out;
  }
  function find(b, re) {
    for (var k = 0; k < b.body.length; k++) { var m = re.exec(b.body[k]); if (m) return { v: m[1], line: b.line + k }; }
    return null;
  }
  function minorOf(v) { var m = /^v?(1\.\d+)(?:\.|-|$)/.exec(v || ''); return m ? m[1] : null; }

  function check(text, opts) {
    var today = (opts && opts.today) || new Date().toISOString().slice(0, 10);
    var lines = String(text || '').split(/\r?\n/);
    var bl = blocks(lines), vars = {}, prefixes = {}, clusters = {};
    var findings = [];
    bl.forEach(function (b) {
      if (b.kind === 'variable') { var d = find(b, /^\s*default\s*=\s*"([^"]*)"/); if (d) vars[b.name] = d.v; }
      if (b.kind === 'data' && b.type === 'google_container_engine_versions') {
        var p = find(b, /^\s*version_prefix\s*=\s*"([^"]*)"/); if (p) prefixes[b.name] = p.v;
      }
    });
    function resolve(raw) {
      if (!raw) return null;
      var m = /^"([^"]*)"/.exec(raw); if (m) return m[1];
      m = /^var\.([\w-]+)/.exec(raw); if (m) return vars[m[1]] || null;
      m = /^data\.google_container_engine_versions\.([\w-]+)\./.exec(raw); if (m) return prefixes[m[1]] || null;
      return null;
    }
    var next = nextStandard(today);
    function emit(id, line, ctx) {
      var r = BY_ID[id];
      var fill = function (s) { return s.replace(/\{(\w+)\}/g, function (_, k) { return ctx[k] != null ? ctx[k] : ''; }); };
      findings.push({ check: id, sev: r.sev, msg: fill(r.msg) + ' Fix: ' + fill(r.fix), line: line + 1 });
    }
    function calCtx(ctx, minor) {
      var c = CAL[minor]; if (!c) return ctx;
      ctx.minor = minor; ctx.eos = c[0]; ctx.eoe = c[1]; ctx.today = today; ctx.next = next;
      ctx.pdays = between(c[0], c[1]);
      ctx.pfee = usd(ctx.pdays * 24 * FEE_PER_HOUR);
      ctx.rfee = usd(Math.max(0, between(today, c[1])) * 24 * FEE_PER_HOUR);
      return ctx;
    }

    bl.forEach(function (b) {
      if (b.kind !== 'resource' || b.type !== 'google_container_cluster') return;
      var ch = find(b, /^\s*channel\s*=\s*"([A-Z_]+)"/);
      var channel = ch ? ch.v : 'REGULAR';
      clusters[b.name] = channel;
      var ext = channel === 'EXTENDED';
      var mv = find(b, /^\s*min_master_version\s*=\s*(.+?)\s*$/);
      var ver = mv ? resolve(mv.v) : null, minor = minorOf(ver);
      var at = mv ? mv.line : b.line, ctx = calCtx({ name: b.name, channel: channel }, minor);
      if (channel === 'UNSPECIFIED') emit('gke-no-channel-deprecated', ch.line, ctx);
      if (minor && CAL[minor]) {
        var toEos = between(today, ctx.eos), toEoe = between(today, ctx.eoe);
        if (toEoe < 0) emit('gke-version-past-extended', at, ctx);
        else {
          if (ext && toEos < 0) emit('gke-extended-fee-active', at, ctx);
          if (ext && toEos >= 0 && toEos <= SOON_DAYS) { ctx.days = toEos; emit('gke-extended-fee-soon', at, ctx); }
          if (!ext && toEos < 0) emit('gke-past-standard-not-extended', at, ctx);
          if (toEoe <= FORCED_DAYS && (ext || toEos >= 0)) { ctx.days = toEoe; emit('gke-forced-upgrade-near', at, ctx); }
        }
        var ex = find(b, /^\s*end_time\s*=\s*"(\d{4}-\d{2}-\d{2})/);
        if (ext && ex && ex.v > ctx.eoe) { ctx.end = ex.v; emit('gke-exclusion-past-extended', ex.line, ctx); }
      } else if (minor && +minor.split('.')[1] < 30) {
        ctx.minor = minor; ctx.eoe = 'before ' + CAL['1.30'][1]; ctx.next = next;
        emit('gke-version-past-extended', at, ctx);
      } else if (ext && !minor) emit('gke-extended-unpinned', b.line, ctx);
      if (!ext) return;
      var ap = find(b, /^\s*enable_autopilot\s*=\s*(true)/); if (ap) emit('gke-extended-autopilot', ap.line, ctx);
      var al = find(b, /^\s*enable_kubernetes_alpha\s*=\s*(true)/); if (al) emit('gke-extended-alpha', al.line, ctx);
      var be = find(b, /^\s*(enable_k8s_beta_apis)\s*\{/); if (be) emit('gke-extended-beta-apis', be.line, ctx);
      var cc = find(b, /^\s*(config_connector_config)\s*\{/);
      if (cc && /enabled\s*=\s*true/.test(lines.slice(cc.line, cc.line + 3).join(' '))) emit('gke-extended-config-connector', cc.line, ctx);
    });

    bl.forEach(function (b) {
      if (b.kind !== 'resource' || b.type !== 'google_container_node_pool') return;
      var cl = find(b, /^\s*cluster\s*=\s*google_container_cluster\.([\w-]+)\./);
      var img = find(b, /^\s*image_type\s*=\s*"(WINDOWS_[A-Z_]+)"/);
      if (img && cl && clusters[cl.v] === 'EXTENDED') emit('gke-extended-windows-pool', img.line, { name: b.name, image: img.v, cluster: cl.v });
      var vv = find(b, /^\s*version\s*=\s*(.+?)\s*$/);
      var minor = vv ? minorOf(resolve(vv.v)) : null;
      if (minor && CAL[minor] && between(today, CAL[minor][0]) < 0 && between(today, CAL[minor][1]) >= 0)
        emit('gke-nodepool-past-standard', vv.line, calCtx({ name: b.name }, minor));
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, CAL: CAL };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.GXENGINE = api;
})();
