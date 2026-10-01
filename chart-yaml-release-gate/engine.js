/* Chart.yaml release gate: Helm chart spec checks + Helm 3 pin map. Same file runs in node and the browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.CHARTGATE_RULES;
  var BY = {}; RULES.forEach(function (r) { BY[r.id] = r; });
  var HELM3_SECURITY_END = '2026-11-11';
  // Kubernetes minor -> end of life (kubernetes.io/releases, via endoflife.date, read 2026-09-30)
  var KUBE_EOL = { 28: '2024-10-28', 29: '2025-02-28', 30: '2025-07-15', 31: '2025-11-11', 32: '2026-02-28',
    33: '2026-06-28', 34: '2026-10-27', 35: '2027-02-28', 36: '2027-06-28', 37: '2027-10-28' };
  var KNOWN = ['apiVersion', 'name', 'version', 'kubeVersion', 'description', 'type', 'keywords', 'home', 'sources',
    'dependencies', 'maintainers', 'icon', 'appVersion', 'deprecated', 'annotations'];

  function days(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
  function unq(v) { v = v.replace(/\s+#.*$/, '').trim(); var m = v.match(/^(["'])(.*)\1$/); return m ? m[2] : v; }
  function isoDay(t) { var m = String(t || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m && !isNaN(Date.parse(m[0])) ? m[0] : new Date().toISOString().slice(0, 10); }

  // --- minimal semver constraint check (Masterminds syntax subset used in Chart.yaml) ---
  function pv(s) {
    var m = String(s).trim().replace(/^v/, '').replace(/[-+].*$/, '').split('.');
    return m.map(function (x) { return /^[xX*]$/.test(x) ? null : parseInt(x, 10); });
  }
  function cmp(a, b) { for (var i = 0; i < 3; i++) { var d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; }
  function term(op, raw, v) {
    var p = pv(raw), n = p.filter(function (x) { return x !== null && !isNaN(x); }).length;
    var lo = [p[0] || 0, n > 1 ? p[1] : 0, n > 2 ? p[2] : 0], hi;
    if (n === 1) hi = [lo[0] + 1, 0, 0]; else if (n === 2) hi = [lo[0], lo[1] + 1, 0]; else hi = null;
    if (op === '~') return cmp(v, lo) >= 0 && cmp(v, n === 1 ? [lo[0] + 1, 0, 0] : [lo[0], lo[1] + 1, 0]) < 0;
    if (op === '^') return cmp(v, lo) >= 0 && cmp(v, lo[0] > 0 ? [lo[0] + 1, 0, 0] : [0, lo[1] + 1, 0]) < 0;
    if (op === '' || op === '=') return hi ? (cmp(v, lo) >= 0 && cmp(v, hi) < 0) : cmp(v, lo) === 0;
    if (op === '!=') return hi ? !(cmp(v, lo) >= 0 && cmp(v, hi) < 0) : cmp(v, lo) !== 0;
    if (op === '>=') return cmp(v, lo) >= 0;
    if (op === '>') return hi ? cmp(v, hi) >= 0 : cmp(v, lo) > 0;
    if (op === '<') return cmp(v, lo) < 0;
    if (op === '<=') return hi ? cmp(v, hi) < 0 : cmp(v, lo) <= 0;
    return true;
  }
  function satisfies(range, v) {
    return range.split('||').some(function (grp) {
      grp = grp.trim().replace(/(\S+)\s+-\s+(\S+)/g, '>=$1 <=$2').replace(/([<>=!~^]+)\s+/g, '$1');
      return grp.split(/[\s,]+/).filter(Boolean).every(function (t) {
        var m = t.match(/^(>=|<=|!=|>|<|=|~>?|\^)?(.+)$/);
        return term((m[1] || '').replace('~>', '~'), m[2], v);
      });
    });
  }

  function check(text, opts) {
    opts = opts || {};
    var today = isoDay(opts.today);
    var lines = String(text || '').replace(/\r\n?/g, '\n').replace(/\t/g, '  ').split('\n');
    var out = [];
    function add(id, line, detail, fix) {
      var r = BY[id];
      out.push({ check: id, sev: r.sev, line: line, msg: r.title + (detail ? ' - ' + detail : '') + '. Fix: ' + (fix || r.fix).replace(/\n\s*/g, ' / ') });
    }
    var top = {}, order = [];
    lines.forEach(function (l, i) {
      var m = l.match(/^([A-Za-z_][\w.-]*)\s*:\s*(.*)$/);
      if (m && !top[m[1]]) { top[m[1]] = { v: m[2], line: i + 1 }; order.push(m[1]); }
    });
    var isChart = !top.kind && !top.jobs && !top.on && !top.stages && (top.apiVersion || (top.name && top.version));

    if (isChart) {
      var api = top.apiVersion ? unq(top.apiVersion.v) : null;
      if (!top.apiVersion) add('api-missing', 1);
      else if (api === 'v1') add('api-v1', top.apiVersion.line, 'charts that require at least Helm 3 should say v2');
      else if (api !== 'v2') add('api-unknown', top.apiVersion.line, 'found "' + api + '"');
      if (!top.name || !unq(top.name.v)) add('name-missing', top.name ? top.name.line : 1);
      if (!top.version || !unq(top.version.v)) add('version-missing', top.version ? top.version.line : 1);
      else {
        var ver = unq(top.version.v);
        if (/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(ver)) { /* ok */ }
        else if (/^v?\d+(\.\d+){0,2}$/.test(ver)) {
          var p = ver.replace(/^v/, '').split('.'); while (p.length < 3) p.push('0');
          add('version-coerced', top.version.line, '"' + ver + '" becomes ' + p.join('.') + ', so the package is named <name>-' + p.join('.') + '.tgz', 'version: ' + p.join('.'));
        } else add('version-not-semver', top.version.line, 'found "' + ver + '"');
      }
      if (api === 'v1') ['dependencies', 'type'].forEach(function (k) {
        if (top[k]) add('v2-field-on-v1', top[k].line, k + ' was added in apiVersion v2 (v1 charts list dependencies in requirements.yaml)');
      });
      if (top.type && unq(top.type.v) && !/^(application|library)$/.test(unq(top.type.v))) add('type-invalid', top.type.line, 'found "' + unq(top.type.v) + '"');
      if (top.appVersion) {
        var av = top.appVersion.v.replace(/\s+#.*$/, '').trim();
        if (/^[0-9][0-9.eE+-]*$/.test(av) && /^(\d+\.\d+|\d+[eE]\d+|\d+)$/.test(av)) {
          add('appversion-unquoted', top.appVersion.line, av + ' is read as the number ' + String(Number(av)), 'appVersion: "' + av + '"');
        }
      }
      if (top.deprecated) { var dv = unq(top.deprecated.v); if (dv && !/^(true|false)$/.test(dv)) add('deprecated-not-bool', top.deprecated.line, 'found "' + dv + '"'); }
      order.forEach(function (k) { if (KNOWN.indexOf(k) < 0) add('unknown-field', top[k].line, '"' + k + '"', 'annotations: ' + k + ': "' + unq(top[k].v) + '"'); });
      if (top.dependencies) {
        var s = top.dependencies.line, items = [], cur = null;
        for (var i = s; i < lines.length; i++) {
          var l = lines[i]; if (/^\S/.test(l)) break;
          var dm = l.match(/^\s*-\s+(\w[\w-]*)\s*:\s*(.*)$/), km = l.match(/^\s+(\w[\w-]*)\s*:\s*(.*)$/);
          if (dm) { cur = { line: i + 1, f: {} }; items.push(cur); cur.f[dm[1]] = unq(dm[2]); }
          else if (km && cur) cur.f[km[1]] = unq(km[2]);
        }
        items.forEach(function (d) {
          var miss = ['name', 'version'].filter(function (k) { return !d.f[k]; });
          if (miss.length) add('dep-incomplete', d.line, 'missing ' + miss.join(' and ') + (d.f.name ? ' on "' + d.f.name + '"' : ''));
        });
      }
      if (top.kubeVersion && unq(top.kubeVersion.v)) {
        var kr = unq(top.kubeVersion.v), live = [], ok = [];
        Object.keys(KUBE_EOL).forEach(function (m) { if (KUBE_EOL[m] > today) live.push(+m); });
        live.forEach(function (m) { if (satisfies(kr, [1, m, 0]) || satisfies(kr, [1, m, 20])) ok.push(m); });
        if (!ok.length) add('kube-no-supported', top.kubeVersion.line, '"' + kr + '" matches none of ' + live.map(function (m) { return '1.' + m; }).join(', ') + ' (supported on ' + today + ')');
        else {
          var last = ok.map(function (m) { return KUBE_EOL[m]; }).sort().pop();
          if (days(today, last) <= 90) add('kube-eol-soon', top.kubeVersion.line, '"' + kr + '" installs only on ' + ok.map(function (m) { return '1.' + m; }).join(', ') + ', end of life ' + last + ' (' + days(today, last) + ' days after ' + today + ')');
        }
      }
    }
    // Helm 3 pins in CI, Dockerfiles, Makefiles (any file)
    var left = days(today, HELM3_SECURITY_END);
    var when = left >= 0 ? 'Helm 3 security fixes end ' + HELM3_SECURITY_END + ', ' + left + ' days after ' + today : 'Helm 3 security fixes ended ' + HELM3_SECURITY_END;
    lines.forEach(function (l, i) {
      var hit = null;
      if (/(alpine\/helm|dtzar\/helm-kubectl):v?3\.\d/.test(l)) hit = l.match(/(alpine\/helm|dtzar\/helm-kubectl):v?3[\d.]*/)[0];
      else if (/HELM_VERSION\s*[:=]\s*["']?v?3\.\d/.test(l)) hit = l.trim();
      else if (/get-helm-3\b/.test(l)) hit = 'get-helm-3 installer';
      else if (/^\s*(helm-)?version\s*:\s*["']?v3\.\d/.test(l)) {
        for (var j = i - 1; j >= Math.max(0, i - 6); j--) if (/setup-helm@/.test(lines[j])) { hit = 'azure/setup-helm ' + unq(l.split(':').slice(1).join(':')); break; }
      }
      if (hit) add('helm3-pin', i + 1, hit + ' - ' + when);
    });
    out.sort(function (a, b) { return a.line - b.line; });
    return { findings: out };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, satisfies: satisfies };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.CHARTGATE = api;
})();
