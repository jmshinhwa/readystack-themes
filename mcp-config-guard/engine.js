/* MCP Config Guard - engine. Same file runs in Node (extension) and in the browser (free web page). */
(function (root, factory) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.MCPGUARD_RULES;
  var api = factory(RULES);
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.MCPGUARD_ENGINE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (RULES) {
  'use strict';

  RULES = RULES || [];
  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) { BY_ID[RULES[i].id] = RULES[i]; }

  var SECRET_RE = /(ghp_[A-Za-z0-9]{16,}|gho_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{15,}|sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})/;
  var SECRET_KEY_RE = /(TOKEN|SECRET|PASSWORD|PASSWD|APIKEY|API_KEY|_KEY|CREDENTIAL|PAT|DSN)$/i;
  var PLACEHOLDER_RE = /^(<.*>|\.\.\.|x{3,}|changeme|change-me|todo|replace[_-]?me|your[_-].*|.*(_HERE|-here)|sk-xxx.*|paste.*)$/i;
  var ENV_REF_RE = /^\$\{[^}]+\}$|^\$[A-Z_][A-Z0-9_]*$|^%[A-Za-z_][A-Za-z0-9_]*%$/;
  var SERVICES = ['AWS', 'GITHUB', 'GITLAB', 'OPENAI', 'ANTHROPIC', 'SLACK', 'STRIPE', 'NOTION', 'JIRA', 'ATLASSIAN', 'SENTRY', 'LINEAR', 'FIGMA', 'SUPABASE', 'POSTGRES', 'MONGODB', 'AZURE', 'GOOGLE', 'TWILIO', 'SHOPIFY'];
  var REGISTRY_KEYS = /^(NPM_CONFIG_REGISTRY|npm_config_registry|PIP_INDEX_URL|PIP_EXTRA_INDEX_URL|UV_INDEX_URL|GOPROXY)$/;
  var AUTO_FLAGS = /^(--yolo|--dangerously-skip-permissions|--allow-all|--no-confirm|--auto-approve|--skip-permissions|--trust-all)$/;
  var FLAG_WITH_VALUE = /^(-e|--env|-v|--volume|--mount|--name|-p|--publish|--network|-w|--workdir|--user|-u)$/;
  var HOME_RE = /(?:\/Users\/|\/home\/|[A-Za-z]:\\Users\\)([^\/\\"']+)/;
  var BROAD_RE = /^(\/|~|~\/|\$HOME|\$\{HOME\}|%USERPROFILE%|[A-Za-z]:\\|[A-Za-z]:\\\\|\/Users|\/home|\/etc|\/var)$/;
  var BROAD_HOME_RE = /^(\/Users|\/home)\/[^\/]+\/?$|^[A-Za-z]:\\Users\\[^\\]+\\?$/;

  function lineOf(lines, needle, from) {
    if (needle === undefined || needle === null || needle === '') { return (from || 0) + 1; }
    var n = String(needle);
    for (var i = (from || 0); i < lines.length; i++) {
      if (lines[i].indexOf(n) >= 0) { return i + 1; }
    }
    for (var j = 0; j < (from || 0); j++) {
      if (lines[j].indexOf(n) >= 0) { return j + 1; }
    }
    return (from || 0) + 1;
  }

  function npmPinned(spec) {
    var base = spec.charAt(0) === '@' ? spec.slice(1) : spec;
    var at = base.indexOf('@');
    if (at < 0) { return false; }
    return /^\d+\.\d+\.\d+/.test(base.slice(at + 1));
  }

  function firstPackageArg(args) {
    for (var i = 0; i < args.length; i++) {
      var a = String(args[i]);
      if (a.charAt(0) === '-') { continue; }
      return a;
    }
    return null;
  }

  function dockerImage(args) {
    for (var i = 0; i < args.length; i++) {
      var a = String(args[i]);
      if (a === 'run' || a === 'container' || a === 'exec') { continue; }
      if (FLAG_WITH_VALUE.test(a)) { i++; continue; }
      if (a.charAt(0) === '-') { continue; }
      return a;
    }
    return null;
  }

  function dockerPinned(img) {
    if (img.indexOf('@sha256:') >= 0) { return true; }
    var slash = img.lastIndexOf('/');
    var tail = slash >= 0 ? img.slice(slash + 1) : img;
    var colon = tail.indexOf(':');
    if (colon < 0) { return false; }
    return tail.slice(colon + 1) !== 'latest';
  }

  function serviceOf(key) {
    var up = String(key).toUpperCase();
    for (var i = 0; i < SERVICES.length; i++) {
      if (up.indexOf(SERVICES[i]) === 0) { return SERVICES[i]; }
    }
    return null;
  }

  function hostOf(url) {
    var m = /^[a-zA-Z][\w+.-]*:\/\/([^\/?#]+)/.exec(String(url));
    if (!m) { return ''; }
    return m[1].replace(/^[^@]*@/, '').replace(/:\d+$/, '');
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text === undefined || text === null ? '' : text);
    var lines = src.split(/\r?\n/);
    var findings = [];

    function add(id, line, v, p) {
      var rule = BY_ID[id];
      if (!rule) { return; }
      var msg = String(rule.msg)
        .replace('{v}', v === undefined || v === null ? '' : String(v))
        .replace('{p}', p === undefined || p === null ? '' : String(p));
      findings.push({ check: id, sev: rule.sev, msg: msg, line: line > 0 ? line : 1, fix: rule.fix });
    }

    var data = null;
    try {
      data = JSON.parse(src);
    } catch (e) {
      var pos = /position (\d+)/.exec(e.message || '');
      var ln = 1;
      if (pos) { ln = src.slice(0, parseInt(pos[1], 10)).split(/\r?\n/).length; }
      add('json_invalid', ln, (e.message || 'syntax error').slice(0, 60));
      return { findings: findings, ruleCount: RULES.length };
    }

    var servers = null;
    if (data && typeof data === 'object') {
      servers = data.mcpServers || data.servers || (data.mcp && (data.mcp.servers || data.mcp.mcpServers)) || null;
    }
    if (!servers || typeof servers !== 'object') {
      add('not_mcp_config', 1);
      return { findings: findings, ruleCount: RULES.length };
    }

    /* duplicate keys survive only in the raw text - JSON.parse keeps the last one */
    var seen = {};
    var dupRe = /^[ \t]*"([^"]+)"[ \t]*:[ \t]*\{/;
    for (var li = 0; li < lines.length; li++) {
      var dm = dupRe.exec(lines[li]);
      if (!dm) { continue; }
      var dn = dm[1];
      if (!Object.prototype.hasOwnProperty.call(servers, dn)) { continue; }
      if (seen[dn]) { add('duplicate_server_name', li + 1, dn); } else { seen[dn] = true; }
    }

    var names = Object.keys(servers);
    for (var s = 0; s < names.length; s++) {
      var name = names[s];
      var cfg = servers[name] || {};
      var base = lineOf(lines, '"' + name + '"', 0) - 1;
      var cmd = cfg.command ? String(cfg.command) : '';
      var bin = cmd.split(/[\\\/]/).pop().replace(/\.(exe|cmd)$/i, '');
      var args = Array.isArray(cfg.args) ? cfg.args.map(String) : [];
      var env = (cfg.env && typeof cfg.env === 'object') ? cfg.env : {};
      var headers = (cfg.headers && typeof cfg.headers === 'object') ? cfg.headers : {};
      var url = cfg.url ? String(cfg.url) : '';
      var type = cfg.type ? String(cfg.type) : '';

      /* --- how the code gets here --- */
      if (bin === 'npx' || bin === 'bunx' || bin === 'pnpm' || bin === 'yarn') {
        var pkg = firstPackageArg(args);
        if (pkg && !npmPinned(pkg)) { add('unpinned_npx', lineOf(lines, pkg, base), name, pkg); }
      }
      if (bin === 'uvx' || bin === 'pipx' || bin === 'uv' || bin === 'pip' || bin === 'pip3') {
        var ppkg = firstPackageArg(args);
        if (ppkg && !/==\d/.test(ppkg) && !/==\d/.test(args.join(' '))) {
          add('unpinned_uvx', lineOf(lines, ppkg, base), name, ppkg);
        }
      }
      for (var g = 0; g < args.length; g++) {
        var ga = args[g];
        if (/^git\+|^github:|\.git($|#)/.test(ga) && !/#([0-9a-f]{40}|v?\d+\.\d+)/.test(ga)) {
          add('unpinned_git_ref', lineOf(lines, ga, base), name, ga);
        }
      }
      if (bin === 'docker' || bin === 'podman') {
        var img = dockerImage(args);
        if (img && !dockerPinned(img)) { add('docker_untagged', lineOf(lines, img, base), name, img); }
      }
      if (/^(sh|bash|zsh|dash|cmd|powershell|pwsh)$/.test(bin)) {
        var joined = args.join(' ');
        if (/(^|\s)(-c|-Command|\/c)(\s|$)/.test(joined) || /[|;&]/.test(joined)) {
          add('shell_wrapper', lineOf(lines, cmd, base), name);
        }
      }
      var allText = cmd + ' ' + args.join(' ');
      if (/(curl|wget|iwr|Invoke-WebRequest)[^|]*\|\s*(sudo\s+)?(sh|bash|zsh|python3?)/.test(allText)) {
        add('curl_pipe_shell', lineOf(lines, 'curl', base), name);
      }

      /* --- what it is handed --- */
      var svc = {};
      var envKeys = Object.keys(env);
      for (var k = 0; k < envKeys.length; k++) {
        var key = envKeys[k];
        var val = env[key] === null || env[key] === undefined ? '' : String(env[key]);
        var vline = lineOf(lines, '"' + key + '"', base);
        if (REGISTRY_KEYS.test(key)) { add('env_registry_override', vline, name, val); }
        if (SECRET_RE.test(val)) {
          add('secret_literal', vline, key);
        } else if (SECRET_KEY_RE.test(key) && val && !ENV_REF_RE.test(val)) {
          if (PLACEHOLDER_RE.test(val)) { add('secret_placeholder', vline, key); }
          else if (val.length >= 8) { add('secret_key_literal', vline, key); }
        }
        var sv = serviceOf(key);
        if (sv && (SECRET_KEY_RE.test(key) || SECRET_RE.test(val))) { svc[sv] = true; }
      }
      if (Object.keys(svc).length > 1) {
        add('credential_breadth', base + 1, name, Object.keys(svc).join(', '));
      }
      for (var a2 = 0; a2 < args.length; a2++) {
        if (SECRET_RE.test(args[a2]) || /^--(token|api-?key|password|secret)=.+/i.test(args[a2])) {
          add('secret_in_args', lineOf(lines, args[a2], base), name);
        }
      }
      var hk = Object.keys(headers);
      for (var h = 0; h < hk.length; h++) {
        var hv = String(headers[hk[h]] === undefined ? '' : headers[hk[h]]);
        if (SECRET_RE.test(hv.replace(/^Bearer\s+/i, ''))) {
          add('secret_literal', lineOf(lines, '"' + hk[h] + '"', base), hk[h]);
        }
      }

      /* --- how far it reaches --- */
      for (var p = 0; p < args.length; p++) {
        var ap = args[p];
        if (BROAD_RE.test(ap) || BROAD_HOME_RE.test(ap)) {
          add('broad_fs_root', lineOf(lines, ap, base), name, ap);
        } else {
          var hm = HOME_RE.exec(ap);
          if (hm) { add('home_absolute_path', lineOf(lines, ap, base), name, hm[1]); }
        }
        if (AUTO_FLAGS.test(ap)) { add('auto_approve', lineOf(lines, ap, base), name, ap); }
      }
      var autoList = cfg.autoApprove || cfg.alwaysAllow || cfg.autoApproveTools;
      if (autoList && (!Array.isArray(autoList) || autoList.length)) {
        var alist = Array.isArray(autoList) ? autoList : [String(autoList)];
        if (alist.indexOf('*') >= 0) { add('wildcard_tools', lineOf(lines, '*', base), name); }
        else { add('auto_approve', lineOf(lines, 'utoApprove', base), name, alist.join(', ')); }
      }
      var allowed = cfg.allowedTools || cfg.tools;
      if (Array.isArray(allowed) && allowed.indexOf('*') >= 0) {
        add('wildcard_tools', lineOf(lines, 'llowedTools', base), name);
      }

      /* --- how it is reached --- */
      if (url) {
        var host = hostOf(url);
        var local = /^(localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0)$/.test(host);
        if (/^http:\/\//i.test(url) && !local) { add('plaintext_http', lineOf(lines, url, base), name); }
        if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && !local) { add('raw_ip_url', lineOf(lines, url, base), name); }
        var hasAuth = false;
        for (var h2 = 0; h2 < hk.length; h2++) {
          if (/^(authorization|x-api-key|api-key|x-auth-token)$/i.test(hk[h2]) && String(headers[hk[h2]] || '').length) { hasAuth = true; }
        }
        if (cfg.oauth || cfg.auth || cfg.authorization_token) { hasAuth = true; }
        if (!hasAuth && !local) { add('remote_no_auth', lineOf(lines, url, base), name); }
      }
      if (type === 'sse') { add('sse_transport', lineOf(lines, '"sse"', base), name); }
    }

    findings.sort(function (x, y) { return x.line - y.line; });
    return { findings: findings, ruleCount: RULES.length };
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
});
