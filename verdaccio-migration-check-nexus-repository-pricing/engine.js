// Nexus Repository Pricing: Verdaccio Migration Map — one engine for the extension and the web page.
// Source: Sonatype help "Community Edition onboarding" (help.sonatype.com/en/ce-onboarding.html):
// Community Edition supports up to 40,000 total components and 100,000 requests per day; above either,
// it pauses the addition of new components until usage returns below both. OSS becomes CE from 3.77.0.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.NXMAP_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.id] = r; });
  var CE_FROM = [3, 77, 0];

  var URL_RE = /https?:\/\/[^\s"'<>()`]+/gi;
  var PUBLIC = /(^|\.)(github\.com|gitlab\.com|npmjs\.org|npmjs\.com|maven\.apache\.org|pypi\.org|docker\.io|sonatype\.com)$/i;

  function parse(u) {                                       // regex only: no URL global in the browser path
    var m = /^([a-z]+:)\/\/([^\/?#]+)([^?#]*)/i.exec(u);
    return m ? { host: m[2].replace(/^[^@]*@/, '').toLowerCase(), path: m[3] } : null;
  }
  function isNexus(u) {
    var p = parse(u);
    if (!p || PUBLIC.test(p.host.split(':')[0])) return false;
    return /nexus/.test(p.host) || /\/repository\/[^\/]+/.test(p.path) || /\/nexus\/content\//.test(p.path) || /\/service\/rest\//.test(p.path);
  }
  function repoName(u) {
    var m = /\/repository\/([^\/\s]+)/.exec(u) || /\/nexus\/content\/(?:groups|repositories)\/([^\/\s]+)/.exec(u);
    return m ? m[1] : '';
  }
  function baseDomain(u) {
    var host = (parse(u) || { host: 'nexus.example' }).host.split(':')[0];
    var labels = host.split('.');
    if (labels.length >= 3 || /nexus/.test(labels[0])) labels.shift();
    return labels.join('.') || 'example';
  }
  function format(u, line, file) {
    var r = (repoName(u) + ' ' + file).toLowerCase();
    if (/npm|yarn/.test(r)) return 'npm';
    if (/pypi|python|pip/.test(r)) return 'pypi';
    if (/docker|oci/.test(r)) return 'docker';
    if (/maven|gradle|java|pom|settings\.xml|release|snapshot|public|central/.test(r)) return 'maven';
    if (/registry\s*=|npmRegistryServer/.test(line)) return 'npm';
    return 'maven';
  }
  function newUrl(u, fmt) {
    var d = baseDomain(u), repo = repoName(u) || 'pypi-proxy';
    if (fmt === 'npm') return 'http://verdaccio.' + d + ':4873/';
    if (fmt === 'pypi') return 'https://pulp.' + d + '/pypi/' + repo + '/simple/';
    return 'http://reposilite.' + d + ':8080/' + (/snapshot/i.test(repoName(u)) ? 'snapshots' : 'releases');
  }
  function cmpVer(tag) {
    var m = /^(\d+)\.(\d+)\.(\d+)/.exec(tag || '');
    if (!m) return null;
    for (var i = 0; i < 3; i++) { var a = +m[i + 1]; if (a !== CE_FROM[i]) return a > CE_FROM[i] ? 1 : -1; }
    return 0;
  }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    var file = opts.filename ? String(opts.filename).split(/[\\\/]/).pop() : 'pasted text';
    var start = 0, inDist = false, counts = { npm: 0, maven: 0, pypi: 0, docker: 0 }, files = {};

    function add(id, i, detail, fix, fmt) {
      var r = BY[id];
      if (fmt) { counts[fmt]++; files[file] = 1; }
      findings.push({ check: id, sev: r.sev, line: i + 1, file: file, fix: fix,
        msg: file + ':' + (i - start + 1) + ' ' + r.title + ' — ' + detail + (fix ? ' → ' + fix : '') });
    }

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i], t = l.trim();
      var hdr = /^==>\s*(.+?)\s*<==$/.exec(t);
      if (hdr) { file = hdr[1].split(/[\\\/]/).pop(); start = i + 1; inDist = false; continue; }
      if (/<distributionManagement>/.test(l)) inDist = true;
      if (/<\/distributionManagement>/.test(l)) inDist = false;
      if (/^\s*(#|;|\/\/\s)/.test(l) && !/^\s*\/\/[^\s\/]/.test(l)) continue;

      // Nexus server image (compose / Dockerfile / Helm values)
      var img = /(?:image:|FROM)\s*["']?(?:docker\.io\/)?sonatype\/nexus3(?::([\w.\-]+))?/i.exec(l);
      var helm = !img && /repository:\s*["']?(?:docker\.io\/)?sonatype\/nexus3["']?\s*$/i.test(l);
      if (img || helm) {
        var tag = img ? img[1] : '';
        if (helm) for (var k = i + 1; k < Math.min(lines.length, i + 6); k++) {
          var tm = /^\s*tag:\s*["']?([\w.\-]+)/.exec(lines[k]); if (tm) { tag = tm[1]; break; }
        }
        var c = cmpVer(tag);
        if (c === -1) add('NXR10', i, 'sonatype/nexus3:' + tag + ' is OSS; starting 3.77.0 or later brings the 40,000-component / 100,000-requests-a-day limits' + (/^3\.([0-6]\d|70)\./.test(tag) ? '; 3.70.x or earlier must first go to 3.71.0 (H2, Java 17)' : ''), BY.NXR10.fix);
        else add('NXR09', i, 'sonatype/nexus3:' + (tag || 'latest') + ' runs Community Edition: up to 40,000 components and 100,000 requests per day, then new components are paused', BY.NXR09.fix);
        continue;
      }
      // Image pulled through a Nexus Docker connector
      var ref = /(?:image:|FROM|docker\s+pull|podman\s+pull)\s*["']?([a-z0-9.\-]*nexus[a-z0-9.\-]*(?::\d+)?)\/([\w.\-\/]+(?::[\w.\-]+)?)/i.exec(l);
      if (ref) { add('NXR08', i, ref[1] + '/' + ref[2], 'docker.io/' + ref[2] + ' (Docker Hub proxy) or a Pulp container distribution (hosted image)', 'docker'); continue; }

      var urls = l.match(URL_RE) || [];
      // npm auth keyed by host: //host/path/:_authToken=
      var auth = /^\s*\/\/([^\s:]+[^\s]*?):(_authToken|_auth|_password|username)\s*=/.exec(l);
      if (auth && isNexus('https://' + auth[1])) {
        add('NXR03', i, auth[2] + ' for //' + auth[1], newUrl('https://' + auth[1], 'npm').replace(/^https?:/, '') + ':_authToken=${NPM_TOKEN}', 'npm');
        continue;
      }
      for (var j = 0; j < urls.length; j++) {
        var u = urls[j].replace(/[,;]+$/, '');
        if (!isNexus(u)) continue;
        if (/\/service\/rest\//.test(u)) { add('NXR11', i, u, BY.NXR11.fix); break; }
        var fmt = format(u, l, file), nu = newUrl(u, fmt), fixed = t.replace(u, nu);
        var id;
        if (/^\s*@[\w.\-]+:registry\s*=/.test(l)) id = 'NXR02';
        else if (/(^|\s)registry\s*=|registry\s+set|set\s+registry|npmRegistryServer|--registry/.test(l)) { id = 'NXR01'; fmt = 'npm'; nu = newUrl(u, 'npm'); fixed = t.replace(u, nu); }
        else if (/index-url|PIP_INDEX_URL|(^|\s)-i\s/.test(l) || fmt === 'pypi') { id = 'NXR07'; fmt = 'pypi'; nu = newUrl(u, 'pypi'); fixed = t.replace(u, nu); }
        else if (inDist || /altDeploymentRepository|publishing|deploy/i.test(l)) { id = 'NXR05'; fmt = 'maven'; }
        else if (/uri\(|\burl\s*[=(]?\s*["']/.test(l) && !/<url>/.test(l)) { id = 'NXR06'; fmt = 'maven'; }
        else if (fmt === 'npm') id = 'NXR01';
        else { id = 'NXR04'; fmt = 'maven'; }
        add(id, i, u, fixed, fmt);
        break;
      }
    }
    var total = counts.npm + counts.maven + counts.pypi + counts.docker;
    if (total) {
      var parts = [];
      if (counts.npm) parts.push(counts.npm + ' npm → Verdaccio');
      if (counts.maven) parts.push(counts.maven + ' Maven/Gradle → Reposilite');
      if (counts.pypi) parts.push(counts.pypi + ' PyPI → Pulp');
      if (counts.docker) parts.push(counts.docker + ' container image → registry');
      var nf = Object.keys(files).length;
      findings.push({ check: 'NXR12', sev: 'info', line: 1, file: '*',
        msg: 'Migration map: ' + total + ' Nexus URL' + (total > 1 ? 's' : '') + ' in ' + nf + ' file' + (nf > 1 ? 's' : '') + ' — ' + parts.join(' · ') });
    }
    return { findings: findings, today: opts.today || '' };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.NXMAP_ENGINE = api;
})();
