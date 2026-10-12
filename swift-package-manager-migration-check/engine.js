// Swift Package Manager migration check: finds Podfile / .podspec dependencies that still
// resolve from CocoaPods trunk (read-only from 2026-12-02) and writes the SPM line for each.
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined')
    ? require('./rules.json') : window.SPM_RULES;

  var READ_ONLY = Date.UTC(2026, 11, 2);   // 2026-12-02, trunk stops accepting podspecs
  var TEST_RUN = Date.UTC(2026, 10, 1);    // 2026-11-01..07, announced test run
  var DAY = 86400000;

  function rule(id) { for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i]; return null; }

  function dateTail(today) {
    var m = String(today || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(t)) return '';
    var toRo = Math.round((READ_ONLY - t) / DAY);
    if (toRo <= 0) return ' On ' + m[0] + ' trunk has been read-only for ' + (-toRo) + ' days: no new pod version can arrive.';
    if (t < TEST_RUN) return ' On ' + m[0] + ': ' + Math.round((TEST_RUN - t) / DAY) + ' days to the trunk test run (2026-11-01 to 11-07), ' + toRo + ' days to read-only.';
    return ' On ' + m[0] + ': ' + toRo + ' days until trunk turns read-only on 2026-12-02.';
  }

  // Drop Ruby comments outside quotes.
  function stripComment(line) {
    var q = null;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) { if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === '#') return line.slice(0, i);
    }
    return line;
  }

  // Join statements continued with a trailing comma; keep the first line number.
  function statements(text) {
    var raw = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var s = stripComment(raw[i]), start = i + 1;
      while (/,\s*$/.test(s) && i + 1 < raw.length) { i++; s = s.replace(/\s+$/, '') + ' ' + stripComment(raw[i]).trim(); }
      out.push({ line: start, text: s.replace(/\s+/g, ' ').trim() });
    }
    return out;
  }

  function norm(v) { var p = v.split('.'); while (p.length < 3) p.push('0'); return p.slice(0, 3).join('.'); }

  // CocoaPods requirement -> SPM requirement.
  function spmReq(req) {
    var r = String(req || '').trim(), m;
    if (!r) return 'from: "<version in Podfile.lock>"';
    if ((m = r.match(/^~>\s*(\d+(?:\.\d+){0,2})/))) {
      var n = m[1].split('.').length;
      return n === 3 ? '.upToNextMinor(from: "' + m[1] + '")' : 'from: "' + norm(m[1]) + '"';
    }
    if ((m = r.match(/^>=?\s*(\d+(?:\.\d+){0,2})/))) return 'from: "' + norm(m[1]) + '"';
    if ((m = r.match(/^=?\s*(\d+(?:\.\d+){0,2})$/))) return 'exact: "' + norm(m[1]) + '"';
    return 'from: "<version in Podfile.lock>"';
  }

  function mapPod(name) {
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];
      if (r.kind === 'map') {
        var p = r.pods[name] || r.pods[name.split('/')[0]];
        if (p) return { rule: r, product: p };
      } else if (r.kind === 'map_firebase' && /^Firebase/.test(name)) {
        var prod = name === 'Firebase' ? 'FirebaseCore' : name.replace(/^Firebase\//, 'Firebase');
        if (r.products.indexOf(prod) >= 0) return { rule: r, product: prod };
      }
    }
    return null;
  }

  function podFinding(name, req, line, where) {
    var hit = mapPod(name);
    var pin = req ? " '" + req + "'" : ' (no version)';
    if (hit) {
      return { check: hit.rule.id, sev: hit.rule.sev, line: line,
        msg: where + " '" + name + "'" + pin + ' resolves from CocoaPods trunk. Swift Package Manager: .package(url: "' +
          hit.rule.url + '", ' + spmReq(req) + ') + .product(name: "' + hit.product + '", package: "' + hit.rule.package + '")' };
    }
    var u = rule('pod-unmapped');
    return { check: u.id, sev: u.sev, line: line, msg: where + " '" + name + "'" + pin + ' ' + u.msg };
  }

  function check(text, opts) {
    opts = opts || {};
    var tail = dateTail(opts.today);
    var st = statements(text), findings = [];
    var isSpec = st.some(function (s) { return /Pod::Spec\.new/.test(s.text); });

    if (isSpec) {
      var ver = '', git = '', specLine = 1;
      st.forEach(function (s) {
        var m;
        if (/Pod::Spec\.new/.test(s.text)) specLine = s.line;
        if ((m = s.text.match(/^\w+\.version\s*=\s*['"]([^'"]+)['"]/))) ver = m[1];
        if (/^\w+\.source\s*=/.test(s.text) && (m = s.text.match(/:git\s*=>\s*['"]([^'"]+)['"]/))) git = m[1];
      });
      var pr = rule('podspec-trunk-push');
      findings.push({ check: pr.id, sev: pr.sev, line: specLine,
        msg: pr.msg + (git ? ' Users then write .package(url: "' + git + '", from: "' + norm(ver || '1.0.0') + '").' : '') + tail });
      st.forEach(function (s) {
        var m;
        if (/^\w+\.prepare_command\s*=/.test(s.text)) {
          var pc = rule('podspec-prepare-command');
          findings.push({ check: pc.id, sev: pc.sev, line: s.line, msg: pc.msg });
        }
        if ((m = s.text.match(/^\w+\.dependency\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/)))
          findings.push(podFinding(m[1], m[2] || '', s.line, 'dependency'));
      });
      return { findings: findings };
    }

    var pods = [], sources = [];
    st.forEach(function (s) {
      var m;
      if ((m = s.text.match(/^source\s+['"]([^'"]+)['"]/))) sources.push({ url: m[1], line: s.line });
      if ((m = s.text.match(/^pod\s+['"]([^'"]+)['"]\s*(.*)$/))) {
        var rest = m[2];
        if (/:(git|path|podspec)\s*=>|\b(git|path|podspec):/.test(rest)) return;   // not from trunk
        var v = rest.match(/^,\s*['"]([^'"]+)['"]/);
        pods.push({ name: m[1], req: v ? v[1] : '', line: s.line });
      }
    });
    if (!pods.length) return { findings: findings };

    var trunk = false;
    if (!sources.length) {
      var im = rule('trunk-source-implicit');
      findings.push({ check: im.id, sev: im.sev, line: 1, msg: im.msg + tail });
      trunk = true;
    } else {
      sources.forEach(function (src) {
        ['trunk-source-cdn', 'trunk-source-git'].forEach(function (id) {
          var r = rule(id);
          if (new RegExp(r.match, 'i').test(src.url)) {
            findings.push({ check: r.id, sev: r.sev, line: src.line, msg: r.msg + tail });
            trunk = true;
          }
        });
      });
    }
    if (trunk) pods.forEach(function (p) { findings.push(podFinding(p.name, p.req, p.line, 'pod')); });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.SPMENGINE = API;
})();
