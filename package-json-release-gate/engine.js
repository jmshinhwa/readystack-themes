/* package.json release gate: one brain for the VS Code extension and the web page. */
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.PKG_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.id] = r; });

  // Node release schedule end-of-life dates (github.com/nodejs/Release schedule.json)
  var NODE_EOL = { 14: '2023-04-30', 16: '2023-09-11', 18: '2025-04-30', 20: '2026-04-30', 22: '2027-04-30', 24: '2028-04-30', 26: '2029-04-30' };
  var SPDX = ('0BSD AFL-3.0 AGPL-3.0-only AGPL-3.0-or-later Apache-1.1 Apache-2.0 Artistic-2.0 BlueOak-1.0.0 BSD-2-Clause BSD-3-Clause ' +
    'BSD-3-Clause-Clear BSL-1.0 CC-BY-4.0 CC-BY-SA-4.0 CC0-1.0 CDDL-1.0 CECILL-2.1 EPL-1.0 EPL-2.0 EUPL-1.2 GPL-2.0-only GPL-2.0-or-later ' +
    'GPL-3.0-only GPL-3.0-or-later ISC LGPL-2.1-only LGPL-2.1-or-later LGPL-3.0-only LGPL-3.0-or-later MIT MIT-0 MPL-2.0 MS-PL MS-RL ' +
    'NCSA OFL-1.1 PostgreSQL Python-2.0 Unicode-3.0 Unlicense UPL-1.0 W3C WTFPL Zlib ' +
    'Classpath-exception-2.0 LLVM-exception GCC-exception-3.1').split(' ');
  var SPDX_DEPRECATED = { 'GPL-2.0': 'GPL-2.0-only', 'GPL-2.0+': 'GPL-2.0-or-later', 'GPL-3.0': 'GPL-3.0-only', 'GPL-3.0+': 'GPL-3.0-or-later',
    'LGPL-2.1': 'LGPL-2.1-only', 'LGPL-2.1+': 'LGPL-2.1-or-later', 'LGPL-3.0': 'LGPL-3.0-only', 'LGPL-3.0+': 'LGPL-3.0-or-later',
    'AGPL-3.0': 'AGPL-3.0-only', 'AGPL-1.0': 'AGPL-1.0-only' };
  var LOWER = {};
  SPDX.forEach(function (s) { LOWER[s.toLowerCase()] = s; });

  function parseDay(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function days(a, b) { return Math.round((b - a) / 86400000); }

  // Lowest major a semver range admits (">=18", "^20.11", "18 || 20", "20.x", "*").
  function floorMajor(range) {
    var s = String(range).trim();
    if (s === '' || s === '*' || s === 'x' || s === 'latest') return 0;
    var low = null;
    s.split('||').forEach(function (part) {
      var m = part.match(/(?:^|[\s>=^~v])(\d+)(?:\.[\dx*]+)*/) || part.match(/(\d+)/);
      if (/^\s*<\s*=?/.test(part) && !/>/.test(part)) m = ['', '0'];
      if (m) { var n = +m[1]; if (low === null || n < low) low = n; }
    });
    return low === null ? 0 : low;
  }
  function eolLines(floor, now) {
    var out = [];
    Object.keys(NODE_EOL).forEach(function (k) {
      var d = parseDay(NODE_EOL[k]);
      if (+k >= floor && now !== null && d <= now) out.push('Node ' + k + ' (EOL ' + NODE_EOL[k] + ')');
    });
    if (floor < 14 && now !== null) out.unshift('Node ' + floor + ' and older');
    return out;
  }

  function spdxCheck(expr) {
    var toks = String(expr).replace(/[()]/g, ' ').trim().split(/\s+/);
    if (!toks[0]) return { bad: 'empty' };
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (/^(AND|OR|WITH)$/.test(t)) continue;
      if (/^(and|or|with)$/i.test(t)) return { bad: t };
      if (SPDX_DEPRECATED[t]) return { deprecated: t, to: SPDX_DEPRECATED[t] };
      if (/^LicenseRef-[A-Za-z0-9.-]+$/.test(t)) continue;
      if (SPDX.indexOf(t) >= 0 || SPDX.indexOf(t.replace(/\+$/, '')) >= 0) continue;
      return { bad: t, hint: LOWER[t.toLowerCase()] };
    }
    return {};
  }

  // Line of a (possibly nested) key, found in order on the original text.
  function lineOf(lines, path) {
    var keys = path.split('.'), at = 0;
    if (path.indexOf('@types/node') >= 0) keys = ['devDependencies', '@types/node'];
    for (var k = 0; k < keys.length; k++) {
      var re = new RegExp('"' + keys[k].replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '"\\s*:');
      var found = -1;
      for (var i = at; i < lines.length; i++) if (re.test(lines[i])) { found = i; break; }
      if (found < 0) return at + 1;
      at = found;
    }
    return at + 1;
  }
  function repoKey(u) {
    var m = String(u || '').match(/(?:github\.com|gitlab\.com|bitbucket\.org)[\/:]([^\/#?\s]+)\/([^\/#?\s]+)/i);
    if (!m) { m = String(u || '').match(/^(?:github:|gitlab:|bitbucket:)?([\w.-]+)\/([\w.-]+)$/); }
    return m ? (m[1] + '/' + m[2].replace(/\.git$/, '')) : null;
  }

  function check(text, opts) {
    opts = opts || {};
    var findings = [], lines = String(text || '').split(/\r?\n/);
    var now = parseDay(opts.today);
    var pkg;
    try { pkg = JSON.parse(String(text || '').replace(/^﻿/, '')); } catch (e) {
      return { findings: [{ check: 'json-parse', sev: 'error', msg: 'package.json is not valid JSON: ' + e.message + ' — npm publish stops here.', line: 1 }] };
    }
    if (!pkg || typeof pkg !== 'object') return { findings: [] };
    var eolTail = '';
    if (now !== null) {
      var d20 = days(parseDay(NODE_EOL[20]), now);
      eolTail = d20 >= 0 ? ' As of ' + opts.today + ', Node 20 has been end-of-life for ' + d20 + ' days.'
                         : ' As of ' + opts.today + ', Node 20 reaches end of life in ' + (-d20) + ' days (2026-04-30).';
    }
    function add(id, field, extra) {
      var r = BY[id];
      findings.push({ check: id, sev: r.sev, msg: r.msg + (extra || '') + ' Fix: ' + r.fix, line: lineOf(lines, field || r.field) });
    }

    // Node line pins: the migration map
    var eng = pkg.engines && typeof pkg.engines === 'object' ? pkg.engines : null;
    if (!eng || eng.node === undefined) add('engines-node-missing', 'name', eolTail);
    else {
      var fl = floorMajor(eng.node), dead = eolLines(fl, now);
      if (dead.length) add('engines-node-eol-floor', 'engines.node', ' "' + eng.node + '" admits ' + dead.join(', ') + '.' + eolTail);
      else if (now !== null && NODE_EOL[fl]) {
        var left = days(now, parseDay(NODE_EOL[fl]));
        if (left >= 0 && left <= 180) add('engines-node-floor-expiring', 'engines.node', ' Node ' + fl + ' ends ' + NODE_EOL[fl] + ', ' + left + ' days after ' + opts.today + '.');
      }
    }
    if (pkg.volta && pkg.volta.node) {
      var vm = floorMajor(pkg.volta.node), vd = eolLines(vm, now);
      if (vd.length && +vm === +(String(pkg.volta.node).match(/\d+/) || [0])[0]) add('volta-node-eol', 'volta.node', ' Pinned "' + pkg.volta.node + '" = ' + vd[0] + '.');
    }
    var tn = (pkg.devDependencies || {})['@types/node'] || (pkg.dependencies || {})['@types/node'];
    if (tn) {
      var tm = floorMajor(tn);
      if (tm >= 14 && eolLines(tm, now).length && NODE_EOL[tm] && parseDay(NODE_EOL[tm]) <= now) add('types-node-eol', '@types/node', ' "' + tn + '" = Node ' + tm + ' (EOL ' + NODE_EOL[tm] + ').');
    }

    // Licence
    var prov = !!(pkg.publishConfig && (pkg.publishConfig.provenance === true || pkg.publishConfig.provenance === 'true'));
    if (pkg.licenses || (pkg.license && typeof pkg.license === 'object')) add('license-object', pkg.licenses ? 'licenses' : 'license');
    else if (pkg.license === undefined || pkg.license === '') add('license-missing', 'name');
    else if (typeof pkg.license === 'string') {
      var L = pkg.license.trim();
      if (L === 'UNLICENSED') { if (pkg.private !== true) add('unlicensed-not-private', 'license'); }
      else if (!/^SEE LICENSE IN /.test(L)) {
        var sc = spdxCheck(L);
        if (sc.deprecated) add('license-deprecated-id', 'license', ' "' + sc.deprecated + '" → "' + sc.to + '".');
        else if (sc.bad) add('license-not-spdx', 'license', ' "' + L + '" is not valid' + (sc.hint ? ' (did you mean "' + sc.hint + '"?)' : '') + '.');
      }
    }

    // Repository and provenance
    var repo = pkg.repository, url = repo && typeof repo === 'object' ? repo.url : repo;
    if (!repo) add(prov ? 'provenance-without-repository' : 'repository-missing', prov ? 'publishConfig' : 'name');
    else {
      if (typeof repo === 'string' && !/^(git\+)?(https?|ssh|git):\/\//.test(repo)) add('repository-shorthand', 'repository', ' "' + repo + '".');
      else if (url && (/^http:\/\//.test(url) || /\/(tree|blob)\/|#readme/.test(url))) add('repository-html-url', 'repository.url', ' "' + url + '".');
      var rk = repoKey(url), others = [pkg.homepage, pkg.bugs && (pkg.bugs.url || pkg.bugs)];
      for (var o = 0; o < others.length; o++) {
        var ok = repoKey(others[o]);
        if (rk && ok && rk !== ok && rk.toLowerCase() === ok.toLowerCase()) {
          add('repository-case-mismatch', typeof repo === 'object' ? 'repository.url' : 'repository', ' "' + rk + '" vs "' + ok + '".');
          break;
        }
      }
    }
    if (prov && typeof pkg.packageManager === 'string') {
      var pm = pkg.packageManager.match(/^npm@(\d+)\.(\d+)/);
      if (pm && (+pm[1] < 9 || (+pm[1] === 9 && +pm[2] < 5))) add('package-manager-no-provenance', 'packageManager', ' "' + pkg.packageManager + '".');
    }
    if (prov && /^@/.test(pkg.name || '') && (pkg.publishConfig.access !== 'public')) add('scoped-provenance-no-access', 'publishConfig', ' "' + pkg.name + '" is scoped.');

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, NODE_EOL: NODE_EOL };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PKGENGINE = API;
})();
