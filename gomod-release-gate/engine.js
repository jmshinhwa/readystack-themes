/* go.mod Release Gate engine. Same file runs in VS Code (Node) and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.GOMOD_RULES;
  var BY = {}; RULES.forEach(function (r) { BY[r.id] = r; });
  // Go major releases and their release dates (go.dev/doc/devel/release).
  // Policy: each major release is supported until there are two newer major releases.
  var GO_RELEASES = [['1.24', '2025-02-11'], ['1.25', '2025-08-12'], ['1.26', '2026-02-10'], ['1.27', '2026-08-19']];

  function minor(v) { var m = /^1\.(\d+)/.exec(v || ''); return m ? +m[1] : null; }
  function major(ver) { var m = /^v(\d+)\./.exec(ver || ''); return m ? +m[1] : null; }
  function suffix(path) {
    if (/^gopkg\.in\//.test(path)) return { gopkg: true };
    var m = /\/v(\d+)$/.exec(path); return m ? { n: +m[1] } : { n: null };
  }
  function stripSuffix(path) { return path.replace(/\/v\d+$/, ''); }
  function released(today) { return GO_RELEASES.filter(function (r) { return r[1] <= today; }); }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var tag = (opts.tag || '').trim();
    var out = [];
    function add(id, line, msg) { var r = BY[id]; out.push({ check: id, sev: r.sev, msg: r.title + ' - ' + msg + ' (' + r.src + ')', line: line }); }

    var lines = String(text || '').split(/\r?\n/);
    var mod = null, modLine = 0, goV = null, goLine = 0, tc = null, tcLine = 0, block = null, maxRetract = 0, retractLine = 0;
    var reqs = [], reps = [];
    lines.forEach(function (raw, i) {
      var n = i + 1, l = raw.replace(/\/\/.*$/, '').trim();
      if (!l) return;
      if (block) { if (l === ')') { block = null; return; } l = block + ' ' + l; }
      var b = /^(require|replace|retract|exclude)\s*\($/.exec(l);
      if (b) { block = b[1]; return; }
      var m;
      if ((m = /^module\s+"?([^\s"]+)"?/.exec(l))) { mod = m[1]; modLine = n; }
      else if ((m = /^go\s+(\S+)/.exec(l))) { goV = m[1]; goLine = n; }
      else if ((m = /^toolchain\s+go(\S+)/.exec(l))) { tc = m[1]; tcLine = n; }
      else if ((m = /^require\s+(\S+)\s+(\S+)/.exec(l))) reqs.push({ path: m[1], ver: m[2], line: n });
      else if ((m = /^replace\s+(.+?)\s*=>\s*(\S+)/.exec(l))) reps.push({ from: m[1], to: m[2], line: n });
      else if ((m = /^retract\s+\[?\s*(v[\d.]+)/.exec(l))) {
        var vs = l.match(/v\d+\.\d+\.\d+/g) || [];
        vs.forEach(function (v) { if (major(v) > maxRetract) { maxRetract = major(v); retractLine = n; } });
      }
    });

    // Own module path vs major version
    if (!mod) add('GM001', 1, 'add a first line: module <repository path>');
    else {
      var s = suffix(mod), tagMaj = major(tag);
      if (s.n === 0 || s.n === 1) add('GM003', modLine, 'suffixes are not allowed at v0 or v1. Fix: module ' + stripSuffix(mod));
      var want = tagMaj != null ? tagMaj : (maxRetract >= 2 && s.n == null ? maxRetract : null);
      if (!s.gopkg && want != null && want >= 2 && s.n == null) {
        var why = tagMaj != null ? 'tag ' + tag : 'retract lists v' + maxRetract + '.x';
        add('GM002', tagMaj != null ? modLine : retractLine || modLine, why + ' on a module that has a go.mod: go get rejects it (without a go.mod it would resolve as +incompatible). Fix: module ' + mod + '/v' + want + ' and update every internal import');
      } else if (!s.gopkg && tagMaj != null && s.n != null && s.n >= 2 && s.n !== tagMaj) {
        add('GM004', modLine, 'path ends /v' + s.n + ' but the tag is ' + tag + '. Fix: tag v' + s.n + '.x.y or module ' + stripSuffix(mod) + (tagMaj >= 2 ? '/v' + tagMaj : ''));
      }
    }

    // go directive vs Go release policy on `today`
    var rel = released(today), sup = rel.slice(-2).map(function (r) { return r[0]; });
    var latest = rel.length ? rel[rel.length - 1][0] : null;
    if (!goV) add('GM005', modLine || 1, 'Fix: go ' + sup[0] + '.0');
    else if (minor(goV) != null && latest) {
      if (minor(goV) > minor(latest)) add('GM007', goLine, 'go ' + goV + ' but the newest release on ' + today + ' is Go ' + latest + '; users with GOTOOLCHAIN=local cannot build. Fix: go ' + sup[0] + '.0');
      else if (minor(goV) < minor(sup[0])) add('GM006', goLine, 'go ' + goV + ' on ' + today + ': supported releases are Go ' + sup.join(' and ') + '. Fix: go ' + sup[0] + '.0');
    }
    if (tc && goV && cmpVer(tc, goV) < 0) add('GM008', tcLine, 'toolchain go' + tc + ' < go ' + goV + '. Fix: toolchain go' + goV + (goV.split('.').length < 3 ? '.0' : '') + ' or delete the toolchain line');

    reps.forEach(function (r) {
      if (/^(\.\.?\/|\/)/.test(r.to)) add('GM009', r.line, r.from.split(/\s+/)[0] + ' => ' + r.to + ' only applies in this repo; anyone who runs go get gets the unreplaced module. Fix: publish ' + r.to + ' as a module and require it, or delete this line before tagging');
    });
    reqs.forEach(function (q) {
      var s = suffix(q.path), vm = major(q.ver), inc = /\+incompatible$/.test(q.ver);
      if (s.gopkg || vm == null) return;
      if (inc) add('GM012', q.line, q.path + ' ' + q.ver + ' is a pre-modules tag; the go command may upgrade it across a breaking major. Check whether ' + q.path + '/v' + vm + ' exists');
      else if (s.n == null && vm >= 2) add('GM010', q.line, q.path + ' ' + q.ver + ' is rejected by the go command (should be v0 or v1). Fix: require ' + q.path + '/v' + vm + ' ' + q.ver);
      else if (s.n != null && s.n >= 2 && vm !== s.n) add('GM011', q.line, q.path + ' ' + q.ver + ': path says v' + s.n + ', version says v' + vm + '. Fix: require ' + (vm >= 2 ? stripSuffix(q.path) + '/v' + vm : stripSuffix(q.path)) + ' ' + q.ver);
    });
    out.sort(function (a, b) { return a.line - b.line; });
    return { findings: out, supported: sup, latest: latest };
  }
  function cmpVer(a, b) {
    var x = a.split('.').map(Number), y = b.split('.').map(Number);
    for (var i = 0; i < 3; i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
    return 0;
  }
  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, GO_RELEASES: GO_RELEASES };
  if (typeof window !== 'undefined') window.GOMODENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
