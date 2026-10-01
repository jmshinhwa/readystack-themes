// F-Droid Inclusion Gate engine: maps non-free Gradle dependencies, plugins and Maven repos
// to their line, with the FOSS replacement. Same file runs in Node (extension) and the browser (web page).
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FDG_RULES;
  // fdroidserver scanner.py allowed_repos (Maven Central, Google Maven, Sonatype, JFrog, JitPack, Clojars, Gradle plugins)
  var ALLOWED = ['repo1.maven.org/maven2', 'jitpack.io', 'www.jitpack.io', 'repo.maven.apache.org/maven2',
    'oss.jfrog.org/artifactory/oss-snapshot-local', 'central.sonatype.com/repository/maven-snapshots',
    'oss.sonatype.org/content/', 's01.oss.sonatype.org/content/', 'oss.sonatype.org/service/local/staging/deploy/maven2',
    's01.oss.sonatype.org/service/local/staging/deploy/maven2', 'clojars.org/repo', 'repo.clojars.org',
    's3.amazonaws.com/repo.commonsware.com', 'plugins.gradle.org/m2', 'maven.google.com'];
  var FOSS = /^(foss|fdroid|libre|free|floss|oss|nogms|nogoogle)/i;
  var NEUTRAL = /^(test|androidTest|debug|release|kapt|ksp|annotationProcessor|coreLibraryDesugaring|lint|testFixtures|detekt)$/i;
  var CFG = /^\s*([a-z][A-Za-z0-9]*?)(Implementation|Api|CompileOnly|RuntimeOnly)\b/;
  var REPO = /\bmaven\b[^"'\n]*["']((?:https?|file):\/\/[^"']+)["']/;
  var FOSS_FLAVOUR = /(?:create|register|maybeCreate)\s*\(\s*["'](foss|fdroid|libre|floss)["']|^\s*(foss|fdroid|libre|floss)\s*\{/im;
  var byId = {};
  RULES.forEach(function (r) { byId[r.id] = r; if (r.re) r._re = new RegExp(r.re); });

  function strip(lines) {
    var inBlock = false;
    return lines.map(function (l) {
      var out = l;
      if (inBlock) { var e = out.indexOf('*/'); if (e < 0) return ''; out = out.slice(e + 2); inBlock = false; }
      out = out.replace(/\/\*.*?\*\//g, '');
      var s = out.indexOf('/*'); if (s >= 0) { out = out.slice(0, s); inBlock = true; }
      out = out.replace(/(^|[^:"'])\/\/.*$/, '$1');
      if (/^\s*#/.test(out)) out = '';
      return out;
    });
  }
  function repoAllowed(url) {
    var u = url.replace(/^https?:\/\//, '');
    if (/^file:\/\/\/usr\/share\/maven-repo/.test(url)) return true;
    return ALLOWED.some(function (a) { return u.indexOf(a) === 0; });
  }
  function item(r, i, raw, extra) {
    var f = { check: r.id, sev: r.sev, line: i + 1, msg: (extra || r.msg) + ' → ' + r.fix, fix: r.fix,
      antiFeature: r.af || '', source: r.src, text: raw.trim().slice(0, 160) };
    return f;
  }
  function check(text, opts) {
    var raw = String(text || '').split(/\r?\n/);
    var code = strip(raw);
    var joined = code.join('\n');
    var hasFlavours = /productFlavors/.test(joined);
    var hasFoss = FOSS_FLAVOUR.test(joined);
    var findings = [], nonfree = 0, isolated = 0, firstDep = -1;
    code.forEach(function (l, i) {
      if (!l.trim()) return;
      if (firstDep < 0 && /^\s*dependencies\s*\{/.test(l)) firstDep = i;
      var m = REPO.exec(l);
      if (m && !repoAllowed(m[1])) {
        findings.push(item(byId['repo-unknown'], i, raw[i], byId['repo-unknown'].title + ': ' + m[1]));
        return;
      }
      for (var k = 0; k < RULES.length; k++) {
        var r = RULES[k];
        if (!r._re || !r._re.test(l)) continue;
        var c = CFG.exec(l);
        if (c && hasFlavours && !FOSS.test(c[1]) && !NEUTRAL.test(c[1])) {
          isolated++;
          findings.push(item(byId.isolated, i, raw[i], r.title + ' isolated in the "' + c[1] + '" flavour'));
        } else {
          if (r.sev === 'error') nonfree++;
          findings.push(item(r, i, raw[i]));
        }
        break;
      }
    });
    if (nonfree > 0 && !hasFoss) {
      var nf = byId['no-foss-flavour'];
      findings.push(item(nf, firstDep < 0 ? 0 : firstDep, raw[firstDep < 0 ? 0 : firstDep] || '',
        nf.title + ': ' + nonfree + ' non-free item' + (nonfree === 1 ? '' : 's') + ' and no build variant F-Droid can build'));
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, summary: { nonfree: nonfree, isolated: isolated, fossFlavour: hasFoss, today: (opts && opts.today) || '' } };
  }
  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.FDGENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
