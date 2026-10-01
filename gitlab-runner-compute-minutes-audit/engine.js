// gitlab-runner compute minutes audit — maps .gitlab-ci.yml jobs to GitLab.com cost factors.
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.GRC_RULES;
  var BY_ID = {}; RULES.forEach(function (r) { BY_ID[r.id] = r; });
  // Cost factors of hosted runners for GitLab.com (docs.gitlab.com/ci/pipelines/compute_minutes/)
  var FACTOR = {
    'saas-linux-small-amd64': 1, 'saas-linux-medium-amd64': 2, 'saas-linux-large-amd64': 3,
    'saas-linux-xlarge-amd64': 6, 'saas-linux-2xlarge-amd64': 12, 'saas-linux-medium-amd64-gpu-standard': 7,
    'saas-linux-small-arm64': 1, 'saas-linux-medium-arm64': 2, 'saas-linux-large-arm64': 3,
    'saas-macos-medium-m1': 6, 'saas-macos-large-m2pro': 12, 'saas-windows-medium-amd64': 1
  };
  var PREMIUM_ONLY = ['saas-linux-large-amd64', 'saas-linux-xlarge-amd64', 'saas-linux-2xlarge-amd64', 'saas-linux-medium-arm64', 'saas-linux-large-arm64'];
  var RESERVED = ['stages', 'variables', 'default', 'include', 'workflow', 'image', 'services', 'before_script', 'after_script', 'cache', 'spec'];
  var FREE_QUOTA = 400, DEFAULT_TIMEOUT = 60;

  function stripComment(s) { return s.replace(/(^|\s)#.*$/, ''); }
  function unq(s) { return String(s).trim().replace(/^["']|["']$/g, '').trim(); }
  function inlineList(v) {
    v = v.trim();
    if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(unq).filter(Boolean);
    return v ? [unq(v)] : [];
  }

  function parseBlocks(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n'), blocks = [], cur = null;
    lines.forEach(function (raw, i) {
      var l = stripComment(raw);
      if (!l.trim()) return;
      var top = /^([^\s#][^:]*):\s*(.*)$/.exec(l);
      if (top && !/^\s/.test(l) && !/^-/.test(l)) { cur = { name: unq(top[1]), line: i + 1, lines: [] }; blocks.push(cur); return; }
      if (cur) cur.lines.push({ t: l, n: i + 1, ind: l.match(/^\s*/)[0].length });
    });
    blocks.forEach(function (b) { b.props = readProps(b); });
    return blocks;
  }

  function readProps(b) {
    var p = {}, L = b.lines; if (!L.length) return p;
    var base = L[0].ind;
    for (var i = 0; i < L.length; i++) {
      if (L[i].ind !== base) continue;
      var m = /^\s*([A-Za-z_]+):\s*(.*)$/.exec(L[i].t); if (!m) continue;
      var key = m[1], val = m[2].trim(), kids = [];
      for (var j = i + 1; j < L.length && L[j].ind > base; j++) kids.push(L[j]);
      p[key] = { line: L[i].n, val: val, kids: kids };
    }
    return p;
  }

  function listOf(prop) {
    if (!prop) return null;
    if (prop.val) return inlineList(prop.val);
    return prop.kids.map(function (k) { var m = /^\s*-\s*(.+)$/.exec(k.t); return m ? unq(m[1]) : null; }).filter(Boolean);
  }
  function minutes(v) {
    var s = String(v || '').toLowerCase(), total = 0, hit = false, re = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?|m|min|mins|minutes?|s|sec|secs|seconds?)\b/g, m;
    while ((m = re.exec(s))) { hit = true; var n = parseFloat(m[1]); total += /^h/.test(m[2]) ? n * 60 : /^s/.test(m[2]) ? n / 60 : n; }
    if (!hit && /^\d+$/.test(s.trim())) return parseInt(s, 10) / 60; // bare number = seconds
    return hit ? total : null;
  }
  function intOf(prop, child) {
    if (!prop) return null;
    if (/^\d+$/.test(prop.val)) return parseInt(prop.val, 10);
    for (var i = 0; i < prop.kids.length; i++) { var m = new RegExp('^\\s*' + child + ':\\s*(\\d+)').exec(prop.kids[i].t); if (m) return parseInt(m[1], 10); }
    return null;
  }

  function resolve(job, byName, dflt) {
    var out = {}, seen = {};
    function apply(b, own) { ['tags', 'timeout', 'parallel', 'retry', 'interruptible', 'trigger'].forEach(function (k) { if (b.props[k]) out[k] = { p: b.props[k], own: own }; }); }
    function walk(b, depth) {
      if (!b || seen[b.name] || depth > 4) return; seen[b.name] = 1;
      var ex = listOf(b.props['extends']) || [];
      ex.forEach(function (n) { walk(byName[n], depth + 1); });
      if (b !== job) apply(b, false);
    }
    if (dflt) apply(dflt, false);
    walk(job, 0); apply(job, true);
    return out;
  }

  function daysToReset(today) {
    var m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(today || '')); if (!m) return null;
    var d = Date.UTC(+m[1], +m[2] - 1, +m[3]); if (isNaN(d)) return null;
    var next = Date.UTC(+m[1], +m[2], 1);
    return Math.round((next - d) / 86400000);
  }

  function check(text, opts) {
    opts = opts || {};
    var blocks = parseBlocks(text), byName = {}, dflt = null, findings = [];
    blocks.forEach(function (b) { byName[b.name] = b; if (b.name === 'default') dflt = b; });
    var reset = daysToReset(opts.today);
    function add(id, line, msg) { var r = BY_ID[id]; findings.push({ check: id, sev: r ? r.sev : 'warning', msg: msg + (r ? ' Fix: ' + r.fix : ''), line: line }); }
    blocks.forEach(function (job) {
      if (RESERVED.indexOf(job.name) >= 0 || job.name.charAt(0) === '.') return;
      var r = resolve(job, byName, dflt);
      if (r.trigger) return; // trigger jobs run on no runner
      var at = function (k) { return r[k] && r[k].own ? r[k].p.line : job.line; };
      var tags = r.tags ? (listOf(r.tags.p) || []) : [];
      var saas = tags.filter(function (t) { return /^saas-/.test(t); });
      var tag, factor;
      if (!tags.length) { tag = 'saas-linux-small-amd64'; factor = 1; }
      else if (!saas.length) return; // own gitlab-runner: not an instance runner
      else {
        tag = saas[0]; factor = FACTOR[tag];
        if (factor == null) { add('unknown-saas-tag', at('tags'), 'Job "' + job.name + '" asks for ' + tag + ', which no GitLab.com hosted runner carries, so it stays pending.'); return; }
      }
      var tmo = r.timeout ? minutes(r.timeout.p.val) : null, noTmo = tmo == null;
      if (noTmo) tmo = DEFAULT_TIMEOUT;
      var par = Math.max(1, intOf(r.parallel && r.parallel.p, 'parallel') || 1);
      var retry = Math.min(2, Math.max(0, intOf(r.retry && r.retry.p, 'max') || 0));
      var worst = Math.round(tmo * factor * par * (1 + retry));
      var head = 'Job "' + job.name + '" on ' + tag + ' (cost factor ' + factor + '): worst case ' + worst + ' compute minutes per run';
      if (!tags.length) add('untagged-instance-job', job.line, head + ' (no tags: means the default small runner).');
      if (factor >= 6) add('high-cost-factor', at('tags'), head + ' = ' + Math.round(tmo) + ' min x ' + factor + '.');
      if (PREMIUM_ONLY.indexOf(tag) >= 0) add('premium-only-size', at('tags'), 'Job "' + job.name + '": GitLab lists ' + tag + ' as Premium and Ultimate only.');
      if (/^saas-(macos|windows)-/.test(tag)) add('beta-runner', at('tags'), head + '; GitLab marks the ' + tag + ' cost factor as Beta.');
      if (noTmo && factor >= 2) add('default-timeout', job.line, head + ': no timeout:, so a hung job bills 60 min x ' + factor + '.');
      if (par >= 2) add('parallel-multiplier', at('parallel'), head + ' = ' + Math.round(tmo) + ' min x ' + factor + ' x parallel ' + par + '.');
      if (retry >= 1 && factor >= 2) add('retry-multiplier', at('retry'), head + ' = ' + Math.round(tmo) + ' min x ' + factor + ' x ' + (1 + retry) + ' attempts (retry: ' + retry + ').');
      if (worst >= FREE_QUOTA) add('quota-in-one-run', at('tags'), head + ', over the 400-minute Free monthly quota in one run' + (reset != null ? ' (quota resets in ' + reset + (reset === 1 ? ' day' : ' days') + ', on the 1st).' : '.'));
      var intr = r.interruptible && /^true$/i.test(r.interruptible.p.val);
      if (factor >= 2 && !intr) add('not-interruptible', job.line, head + '; without interruptible: true a newer pipeline cannot cancel it.');
    });
    findings.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, FACTOR: FACTOR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GRCENGINE = api;
})();
