// Codeberg / GitLab.com Anonymous Fetch Lint — one engine for the extension and the web page.
// Source: GitLab blog "Rate limits on GitLab.com are changing" (2026-09-17): from 2026-10-19 a request
// that arrives with no credentials gets 60 requests per hour per IP address; over it you get HTTP 429.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.GLANON_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.id] = r; });
  var CAP_DATE = '2026-10-19';
  var TOKEN_URL = 'https://oauth2:${GITLAB_TOKEN}@gitlab.com/';

  var ANON_URL = /https?:\/\/gitlab\.com\/([^\s"'#)]+)/i;          // no userinfo before the host
  var LINE_AUTH = /PRIVATE-TOKEN|JOB-TOKEN|Authorization:|private_token=|access_token=|job_token=|--netrc\b/i;
  var HOSTED = /runs-on:\s*\[?\s*["']?(ubuntu|windows|macos)-/i;

  function projectOf(path) {                                         // "acme/cli/-/archive/..." -> {proj, rest}
    var p = path.replace(/\.git(?=$|[@#\/])/, '');
    var i = p.indexOf('/-/');
    var proj = i >= 0 ? p.slice(0, i) : p.split(/[@#?]/)[0];
    var segs = proj.split('/').filter(Boolean);
    return { proj: proj, rest: i >= 0 ? p.slice(i + 3) : '', owner: segs[0] || 'OWNER', repo: segs[segs.length - 1] || 'REPO' };
  }

  function tokenLine(l) { return l.replace(/https?:\/\/gitlab\.com\//i, TOKEN_URL); }
  function codebergLine(l) { return l.replace(/https?:\/\/gitlab\.com\//i, 'https://codeberg.org/'); }

  function downloadFix(l, path) {
    var pr = projectOf(path), enc = pr.proj.replace(/\//g, '%2F');
    var m = pr.rest.match(/^archive\/([^\/]+)\/[^\s"']*?\.(tar\.gz|zip|tar\.bz2|tar)\b/);
    if (m) return {
      tok: 'curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" -L -o ARCHIVE https://gitlab.com/api/v4/projects/' + enc + '/repository/archive.' + m[2] + '?sha=' + m[1],
      cb: 'https://codeberg.org/' + pr.owner + '/' + pr.repo + '/archive/' + m[1] + '.' + m[2] };
    m = pr.rest.match(/^raw\/([^\/]+)\/([^\s"'?]+)/);
    if (m) return {
      tok: 'curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" https://gitlab.com/api/v4/projects/' + enc + '/repository/files/' + m[2].replace(/\//g, '%2F') + '/raw?ref=' + m[1],
      cb: 'https://codeberg.org/' + pr.owner + '/' + pr.repo + '/raw/branch/' + m[1] + '/' + m[2] + ' (use /raw/tag/ for a tag)' };
    return { tok: 'download it through /api/v4 with --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}"', cb: codebergLine(l.trim()) };
  }

  function apiFix(l, path) {
    var tok = /\bcurl\b/.test(l) ? l.trim().replace(/\bcurl\b/, 'curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}"')
      : 'send the header PRIVATE-TOKEN: ${GITLAB_TOKEN} (or JOB-TOKEN: $CI_JOB_TOKEN inside GitLab CI)';
    var m = path.match(/^api\/v4\/projects\/([^\/\s]+)%2F([^\/\s]+)\/releases/i);
    var cb = m ? 'https://codeberg.org/api/v1/repos/' + m[1] + '/' + m[2] + '/releases' : 'the Forgejo API at https://codeberg.org/api/v1/';
    return { tok: tok, cb: cb };
  }

  function check(text, opts) {
    opts = opts || {};
    var when = (opts.today && opts.today >= CAP_DATE) ? 'since ' + CAP_DATE : 'from ' + CAP_DATE;
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    var gitAuth = 0, hostedLine = 0, npmAuth = /gitlab\.com\/api\/v4\/[^\s]*:_authToken=/i.test(text);
    lines.forEach(function (l, i) {
      if (!gitAuth && ((/insteadOf/i.test(l) && /:\/\/[^\s\/"']+@gitlab\.com/i.test(l)) || /machine\s+gitlab\.com/i.test(l))) gitAuth = i + 1;
      if (!hostedLine && HOSTED.test(l)) hostedLine = i + 1;
    });

    function add(id, line, extra, fixes) {
      var r = BY[id];
      var sev = r.sev;
      var msg = r.title + '. ' + r.why;
      if (sev !== 'info') msg += ' GitLab caps requests with no credentials at 60 per hour per IP ' + when + ' (HTTP 429 after that).';
      if (extra) msg += ' ' + extra;
      msg += ' Fix: ' + (fixes && fixes.tok ? fixes.tok : r.fix);
      if (fixes && fixes.cb) msg += ' · Codeberg: ' + fixes.cb;
      findings.push({ check: id, sev: sev, msg: msg, line: line });
    }

    lines.forEach(function (l, i) {
      var n = i + 1;
      if (/^\s*(#|\/\/)/.test(l)) return;
      var t = l.trim();

      if (/\bGOPROXY\s*[:=]\s*["']?direct\b/.test(l) || /\bGO(PRIVATE|NOPROXY)\s*[:=]\s*["']?[^\s"']*gitlab\.com/.test(l)) {
        if (!gitAuth) add('GLA04', n, '', { tok: 'GOPROXY=https://proxy.golang.org,direct for public modules; for private ones: echo "machine gitlab.com login oauth2 password ${GITLAB_TOKEN}" >> ~/.netrc' });
        return;
      }
      var gm = l.match(/^\s*(?:require\s+|replace\s+)?(gitlab\.com\/[\w.\-\/]+)\s+v\d/) || l.match(/\bgo\s+(?:get|install)\s+(?:-\S+\s+)*(gitlab\.com\/[\w.\-\/]+)/);
      if (gm) {
        var gp = gm[1].split('/');
        add('GLA05', n, '', { tok: 'nothing to change while GOPROXY stays at proxy.golang.org', cb: 'replace ' + gp.slice(0, 3).join('/') + ' => codeberg.org/' + gp[1] + '/' + gp[gp.length - 1] + ' vX.Y.Z (a fork that keeps the module line)' });
        return;
      }
      var sm = l.match(/(?:^|["'\s])gitlab:([\w.\-]+)\/([\w.\-]+)(#[^\s"']+)?/);
      if (sm) {
        var ref = sm[3] || '';
        add('GLA03', n, '', { tok: 'git+ssh://git@gitlab.com/' + sm[1] + '/' + sm[2] + '.git' + ref, cb: 'git+https://codeberg.org/' + sm[1] + '/' + sm[2] + '.git' + ref });
        return;
      }
      var m = l.match(ANON_URL);
      if (!m || LINE_AUTH.test(l)) return;
      var path = m[1];

      if (/^api\/v4\/(projects|groups)\/[^\s"']*\/packages\//i.test(path)) {
        if (npmAuth) return;
        var npm = /registry\s*=/.test(l);
        var proj = (path.match(/^api\/v4\/(?:projects|groups)\/([^\/]+)/) || [])[1];
        add('GLA09', n, '', npm
          ? { tok: '//gitlab.com/api/v4/projects/' + proj + '/packages/npm/:_authToken=${GITLAB_TOKEN}', cb: 'https://codeberg.org/api/packages/OWNER/npm/' }
          : { tok: t.replace(/https?:\/\/gitlab\.com\//i, 'https://${GITLAB_TOKEN_NAME}:${GITLAB_TOKEN}@gitlab.com/'), cb: 'https://codeberg.org/api/packages/OWNER/pypi/simple' });
        return;
      }
      if (/^api\/v4\//i.test(path)) { add('GLA06', n, '', apiFix(l, path)); return; }
      if (/\burl\s*=\s*https?:\/\/gitlab\.com\//i.test(l)) {
        if (gitAuth) return;
        var sp = projectOf(path);
        add('GLA08', n, '', { tok: 'url = git@gitlab.com:' + sp.proj + '.git', cb: 'url = https://codeberg.org/' + sp.owner + '/' + sp.repo + '.git' });
        return;
      }
      if (/\/-\/(archive|raw|releases|jobs|package_files)\//.test(path)) { add('GLA07', n, '', downloadFix(l, path)); return; }
      if (/git\+https?:\/\/gitlab\.com\//i.test(l)) {
        if (gitAuth) return;
        if (/^\s*"[^"]+"\s*:\s*"git\+https/.test(l)) {
          var np = projectOf(path), nref = (path.match(/#[^\s"']+/) || [''])[0];
          add('GLA03', n, '', { tok: 'git+ssh://git@gitlab.com/' + np.proj + '.git' + nref, cb: 'git+https://codeberg.org/' + np.owner + '/' + np.repo + '.git' + nref });
        } else {
          add('GLA02', n, '', { tok: tokenLine(t), cb: codebergLine(t) });
        }
        return;
      }
      if (/\bgit\s+(clone|fetch|pull|ls-remote|submodule\s+add)\b/.test(l)) {
        if (gitAuth) return;
        add('GLA01', n, '', { tok: tokenLine(t), cb: codebergLine(t) });
        return;
      }
      if (/\b(curl|wget|Invoke-WebRequest|iwr)\b|^\s*ADD\s/.test(l)) { add('GLA07', n, '', downloadFix(l, path)); return; }
    });

    var hot = findings.filter(function (f) { return f.sev !== 'info'; }).length;
    if (hostedLine && hot) {
      add('GLA10', hostedLine, 'This job makes ' + hot + ' token-less gitlab.com request' + (hot === 1 ? '' : 's') + ' per run.', null);
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, CAP_DATE: CAP_DATE };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.GLANON_ENGINE = api;
})();
