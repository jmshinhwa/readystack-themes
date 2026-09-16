/* MCP Server Config Audit - engine
   The same file runs in Node (the extension) and in the browser (the free web tool). */
(function (root, factory) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.MCP_AUDIT_RULES;
  var api = factory(RULES);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MCP_AUDIT_ENGINE = api;
})(typeof self !== 'undefined' ? self : this, function (RULES_DOC) {

  var AS_OF = '2026-09-14';
  var RULES = Array.isArray(RULES_DOC) ? RULES_DOC : ((RULES_DOC && RULES_DOC.rules) || []);
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  /* ---- strict JSON parser that remembers where every value came from -------
     mcp.json is strict JSON: no comments, no trailing commas. Parsing it here
     rather than with JSON.parse is what lets a finding carry a line number. */
  function parse(text) {
    var s = String(text == null ? '' : text);
    var i = 0, line = 1;

    function fail(msg) { throw { __json: true, msg: msg, line: line }; }
    function ws() {
      while (i < s.length) {
        var c = s[i];
        if (c === '\n') { line++; i++; }
        else if (c === ' ' || c === '\t' || c === '\r') { i++; }
        else if (c === '/' && (s[i + 1] === '/' || s[i + 1] === '*')) { fail('Comments are not allowed in JSON'); }
        else break;
      }
    }
    function readString() {
      i++; /* opening quote */
      var out = '';
      while (i < s.length) {
        var c = s[i];
        if (c === '"') { i++; return out; }
        if (c === '\n') fail('Unterminated string');
        if (c === '\\') {
          var e = s[i + 1];
          if (e === 'u') { out += String.fromCharCode(parseInt(s.substr(i + 2, 4), 16) || 0); i += 6; continue; }
          var map = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' };
          out += (map[e] !== undefined ? map[e] : e); i += 2; continue;
        }
        out += c; i++;
      }
      fail('Unterminated string');
    }
    function readNumber() {
      var m = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(s.slice(i));
      if (!m) fail('Malformed number');
      i += m[0].length;
      return { k: 'number', line: line, v: Number(m[0]) };
    }
    function readObject() {
      var startLine = line; i++;
      var entries = [], seen = {}, dups = [];
      ws();
      if (s[i] === '}') { i++; return { k: 'object', line: startLine, entries: entries, dups: dups }; }
      for (;;) {
        ws();
        if (s[i] !== '"') fail('Expected a quoted property name');
        var kl = line, key = readString();
        ws();
        if (s[i] !== ':') fail('Expected ":" after property ' + JSON.stringify(key));
        i++;
        var node = readValue();
        if (Object.prototype.hasOwnProperty.call(seen, '#' + key)) dups.push({ key: key, line: kl });
        seen['#' + key] = 1;
        entries.push({ key: key, keyLine: kl, node: node });
        ws();
        if (s[i] === ',') { i++; ws(); if (s[i] === '}') fail('Trailing comma before "}"'); continue; }
        if (s[i] === '}') { i++; return { k: 'object', line: startLine, entries: entries, dups: dups }; }
        fail('Expected "," or "}"');
      }
    }
    function readArray() {
      var startLine = line; i++;
      var list = [];
      ws();
      if (s[i] === ']') { i++; return { k: 'array', line: startLine, items: list }; }
      for (;;) {
        list.push(readValue());
        ws();
        if (s[i] === ',') { i++; ws(); if (s[i] === ']') fail('Trailing comma before "]"'); continue; }
        if (s[i] === ']') { i++; return { k: 'array', line: startLine, items: list }; }
        fail('Expected "," or "]"');
      }
    }
    function readValue() {
      ws();
      var c = s[i];
      if (c === undefined) fail('Unexpected end of file');
      if (c === '{') return readObject();
      if (c === '[') return readArray();
      if (c === '"') { var ln = line; return { k: 'string', line: ln, v: readString() }; }
      if (c === '-' || (c >= '0' && c <= '9')) return readNumber();
      if (s.substr(i, 4) === 'true') { i += 4; return { k: 'bool', line: line, v: true }; }
      if (s.substr(i, 5) === 'false') { i += 5; return { k: 'bool', line: line, v: false }; }
      if (s.substr(i, 4) === 'null') { i += 4; return { k: 'null', line: line, v: null }; }
      fail('Unexpected character ' + JSON.stringify(c));
    }

    try {
      var node = readValue();
      ws();
      if (i < s.length) fail('Unexpected content after the end of the object');
      return { ok: true, node: node };
    } catch (e) {
      if (e && e.__json) return { ok: false, line: e.line, message: e.msg };
      throw e;
    }
  }

  /* ---- accessors ---------------------------------------------------------- */
  function ent(node, key) {
    if (!node || node.k !== 'object') return null;
    for (var i = 0; i < node.entries.length; i++) if (node.entries[i].key === key) return node.entries[i];
    return null;
  }
  function sub(node, key) { var e = ent(node, key); return e ? e.node : null; }
  function str(node, key) { var n = sub(node, key); return n && n.k === 'string' ? n.v : null; }
  function items(node) { return (node && node.k === 'array') ? node.items : []; }
  function strItems(node) {
    return items(node).filter(function (n) { return n.k === 'string'; });
  }
  function base(cmd) {
    return String(cmd || '').replace(/\\/g, '/').split('/').pop().toLowerCase().replace(/\.(exe|cmd|bat)$/, '');
  }

  /* ---- credential shapes -------------------------------------------------- */
  var TOKEN_SHAPES = [
    [/^gh[pousr]_[A-Za-z0-9]{16,}$/, 'a GitHub token (gh*_)'],
    [/^github_pat_[A-Za-z0-9_]{20,}$/, 'a GitHub fine-grained token (github_pat_)'],
    [/^sk-ant-[A-Za-z0-9\-_]{10,}$/, 'an Anthropic API key (sk-ant-)'],
    [/^sk-[A-Za-z0-9\-_]{12,}$/, 'an API key (sk-)'],
    [/^AKIA[0-9A-Z]{16}$/, 'an AWS access key id (AKIA)'],
    [/^xox[baprse]-[A-Za-z0-9-]{10,}$/, 'a Slack token (xox*-)'],
    [/^glpat-[A-Za-z0-9\-_]{10,}$/, 'a GitLab token (glpat-)'],
    [/^npm_[A-Za-z0-9]{20,}$/, 'an npm token (npm_)'],
    [/^AIza[0-9A-Za-z\-_]{30,}$/, 'a Google API key (AIza)'],
    [/^ey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./, 'a JSON Web Token'],
    [/^Bearer\s+\S{12,}$/i, 'a bearer token']
  ];
  var SECRET_KEY = /token|secret|password|passwd|api[-_ ]?key|apikey|credential|authorization|private[-_ ]?key/i;

  function secretHit(key, val) {
    if (typeof val !== 'string' || val.indexOf('${') !== -1 || !val) return null;
    for (var i = 0; i < TOKEN_SHAPES.length; i++) {
      if (TOKEN_SHAPES[i][0].test(val)) return TOKEN_SHAPES[i][1];
    }
    if (key && SECRET_KEY.test(key) && val.length >= 16 && !/\s/.test(val)
      && !/^https?:\/\//i.test(val) && /[0-9]/.test(val) && /[A-Za-z]/.test(val)) {
      return 'a literal value under a key named "' + key + '"';
    }
    return null;
  }

  var DSN_CREDS = /^(postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|mssql|sqlserver|amqps?|clickhouse):\/\/([^:/?#@\s]+):([^/?#@\s]+)@/i;
  var DB_HINT = /postgres|mysql|mariadb|mongo|sqlite|mssql|sqlserver|clickhouse|redis|bigquery|snowflake/i;
  var READONLY_HINT = /read[-_ ]?only|readonly|--ro\b|access[-_ ]?mode=?restricted|allow[-_]?write=?false/i;
  var BROAD_ROOTS = ['/', '~', '~/', '$HOME', '${HOME}', '%USERPROFILE%', '$USERPROFILE',
    '/Users', '/Users/', '/home', '/home/', '/root', '/root/', '/etc', '/var'];
  var LOCAL_ABS = /(^|[\s"'=])(\/(?:Users|home)\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\)/;
  var SHELLS = ['bash', 'sh', 'zsh', 'dash', 'ksh', 'cmd', 'powershell', 'pwsh'];
  var SHELL_FLAG = /^(-c|-lc|-ic|--command|-Command|\/c|\/C|-EncodedCommand)$/;
  var LOOPBACK = /^(localhost|127(?:\.\d+){3}|\[::1\]|::1|0\.0\.0\.0|host\.docker\.internal)$/i;
  /* docker flags that swallow the next argument, so the image is not confused with them */
  var DOCKER_VALUE_FLAGS = ['-e', '--env', '--env-file', '-v', '--volume', '--mount', '--name',
    '-w', '--workdir', '-u', '--user', '--network', '--net', '-p', '--publish', '--entrypoint',
    '--label', '-l', '--platform', '--add-host', '--cap-add', '--cap-drop'];

  function finding(id, line, extra) {
    var r = BY_ID[id] || { sev: 'warn', title: id, msg: id, fix: '' };
    return {
      check: id,
      sev: r.sev,
      title: r.title,
      std: r.std || '',
      msg: extra ? r.msg + ' ' + extra : r.msg,
      fix: r.fix,
      line: line
    };
  }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    var parsed = parse(text);

    if (!parsed.ok) {
      findings.push(finding('json_invalid', parsed.line || 1, 'Parser stopped at line ' + (parsed.line || 1) + ': ' + parsed.message + '.'));
      return wrap(findings, opts);
    }
    var root = parsed.node;
    if (root.k !== 'object') {
      findings.push(finding('json_invalid', 1, 'The top level of an MCP config is an object, not ' + root.k + '.'));
      return wrap(findings, opts);
    }

    /* root key */
    var serversEnt = ent(root, 'servers');
    var legacyEnt = ent(root, 'mcpServers');
    if (legacyEnt && !serversEnt) {
      findings.push(finding('legacy_root_key', legacyEnt.keyLine, 'Found "mcpServers" at line ' + legacyEnt.keyLine + '.'));
    }
    var vscodeStyle = !!serversEnt;
    var servers = serversEnt ? serversEnt.node : (legacyEnt ? legacyEnt.node : null);

    /* inputs: a secret prompted without password:true is stored in the clear */
    var inputs = sub(root, 'inputs');
    items(inputs).forEach(function (inp) {
      if (inp.k !== 'object') return;
      if (str(inp, 'type') !== 'promptString') return;
      var label = (str(inp, 'id') || '') + ' ' + (str(inp, 'description') || '');
      var pw = sub(inp, 'password');
      if (SECRET_KEY.test(label) && !(pw && pw.v === true)) {
        findings.push(finding('input_not_password', (ent(inp, 'id') || { keyLine: inp.line }).keyLine,
          'Input "' + (str(inp, 'id') || '(no id)') + '".'));
      }
    });

    if (servers && servers.k === 'object') {
      servers.dups.forEach(function (d) {
        findings.push(finding('duplicate_server_key', d.line, 'Server name "' + d.key + '" appears twice; the later entry wins.'));
      });
      servers.entries.forEach(function (se) {
        auditServer(se.key, se.keyLine, se.node, vscodeStyle, findings);
      });
    }

    findings.sort(function (a, b) { return (a.line - b.line) || a.check.localeCompare(b.check); });
    return wrap(findings, opts);
  }

  function auditServer(name, nameLine, srv, vscodeStyle, findings) {
    if (!srv || srv.k !== 'object') return;
    var here = function (node) { return (node && node.line) || nameLine; };

    var cmdEnt = ent(srv, 'command');
    var urlEnt = ent(srv, 'url');
    var typeEnt = ent(srv, 'type');
    var type = str(srv, 'type');
    var command = str(srv, 'command');
    var argNodes = strItems(sub(srv, 'args'));
    var args = argNodes.map(function (n) { return n.v; });

    /* transport */
    if ((cmdEnt && urlEnt) || (!cmdEnt && !urlEnt)) {
      findings.push(finding('transport_ambiguous', nameLine,
        'Server "' + name + '" declares ' + (cmdEnt && urlEnt ? 'both "command" and "url"' : 'neither "command" nor "url"') + '.'));
    }
    if (vscodeStyle && !typeEnt) {
      findings.push(finding('type_missing', nameLine, 'Server "' + name + '".'));
    }
    if (type === 'sse') {
      findings.push(finding('sse_deprecated', here(typeEnt && typeEnt.node), 'Server "' + name + '".'));
    }

    /* remote endpoint */
    if (urlEnt && urlEnt.node.k === 'string') {
      var u = urlEnt.node.v;
      var m = /^http:\/\/([^/:?#\s]+)/i.exec(u);
      if (m && !LOOPBACK.test(m[1])) {
        findings.push(finding('remote_plaintext_http', urlEnt.node.line, 'Server "' + name + '" points at ' + u + '.'));
      }
    }

    /* auto-approval lists */
    ['alwaysAllow', 'autoApprove'].forEach(function (k) {
      var e = ent(srv, k);
      if (e && e.node.k === 'array' && e.node.items.length) {
        findings.push(finding('auto_approve', e.keyLine,
          'Server "' + name + '" auto-approves ' + e.node.items.length + ' tool' + (e.node.items.length === 1 ? '' : 's') +
          ': ' + strItems(e.node).map(function (n) { return n.v; }).join(', ') + '.'));
      }
    });

    /* env and headers: literal credentials */
    ['env', 'headers'].forEach(function (k) {
      var o = sub(srv, k);
      if (!o || o.k !== 'object') return;
      o.entries.forEach(function (e) {
        if (e.node.k !== 'string') return;
        var what = secretHit(e.key, e.node.v);
        if (what) {
          findings.push(finding('secret_inline', e.keyLine,
            'Server "' + name + '", ' + k + '.' + e.key + ' holds ' + what + '.'));
        }
        if (DSN_CREDS.test(e.node.v)) {
          findings.push(finding('db_url_credentials', e.keyLine, 'Server "' + name + '", ' + k + '.' + e.key + '.'));
        }
      });
    });

    /* args: credentials, DSNs, roots, machine-local paths */
    argNodes.forEach(function (n) {
      var what = secretHit('', n.v);
      if (what) findings.push(finding('secret_inline', n.line, 'Server "' + name + '" passes ' + what + ' as a command-line argument.'));
      if (DSN_CREDS.test(n.v)) {
        var dm = DSN_CREDS.exec(n.v);
        findings.push(finding('db_url_credentials', n.line,
          'Server "' + name + '" passes ' + dm[1] + '://' + dm[2] + ':<password>@... on the command line.'));
      }
      if (BROAD_ROOTS.indexOf(n.v) !== -1) {
        findings.push(finding('fs_root_broad', n.line, 'Server "' + name + '" is given the root "' + n.v + '".'));
      }
      if (LOCAL_ABS.test(n.v)) {
        findings.push(finding('absolute_local_path', n.line, 'Server "' + name + '": ' + n.v));
      }
    });
    if (command && LOCAL_ABS.test(command)) {
      findings.push(finding('absolute_local_path', cmdEnt.node.line, 'Server "' + name + '" command: ' + command));
    }

    /* launcher-specific checks */
    var exe = base(command);
    if (exe === 'npx' || exe === 'bunx') {
      var spec = firstPositional(args, ['-y', '--yes', '-q', '--quiet', '--silent', '--']);
      if (spec !== null && spec.value.indexOf('${') === -1 && spec.value.indexOf('@', 1) < 1) {
        findings.push(finding('npx_unpinned', argNodes[spec.index].line,
          'Server "' + name + '" runs "' + spec.value + '" with no version.'));
      }
    }
    if (exe === 'uvx' || exe === 'uv') {
      var pinned = args.some(function (a) { return a.indexOf('==') !== -1 || /@\d/.test(a); });
      var uspec = firstPositional(args, ['--from', 'tool', 'run', '-q', '--quiet']);
      if (!pinned && uspec !== null && uspec.value.indexOf('${') === -1) {
        findings.push(finding('uvx_unpinned', argNodes[uspec.index].line,
          'Server "' + name + '" runs "' + uspec.value + '" with no version.'));
      }
    }
    if (exe === 'docker' || exe === 'podman') {
      var img = dockerImage(args);
      if (img !== null) {
        var tail = img.value.split('/').pop();
        var tagged = tail.indexOf(':') !== -1;
        if (!tagged || /:latest$/.test(tail)) {
          findings.push(finding('docker_mutable_tag', argNodes[img.index].line,
            'Server "' + name + '" runs image "' + img.value + '".'));
        }
      }
    }
    if (SHELLS.indexOf(exe) !== -1 && args.some(function (a) { return SHELL_FLAG.test(a); })) {
      findings.push(finding('shell_wrapper', cmdEnt.node.line,
        'Server "' + name + '" is launched as ' + exe + ' ' + args.filter(function (a) { return SHELL_FLAG.test(a); })[0] + ' "...".'));
    }

    /* database servers without a read-only switch */
    var envNode = sub(srv, 'env');
    var envText = envNode && envNode.k === 'object'
      ? envNode.entries.map(function (e) { return e.key + '=' + (e.node.k === 'string' ? e.node.v : ''); }).join(' ')
      : '';
    var blob = [name, command || '', args.join(' '), envText].join(' ');
    if (DB_HINT.test(blob) && !READONLY_HINT.test(blob)) {
      findings.push(finding('no_readonly_db', nameLine, 'Server "' + name + '" exposes a database with no read-only flag in its arguments or environment.'));
    }
  }

  function firstPositional(args, flags) {
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (a.charAt(0) === '-' || flags.indexOf(a) !== -1) continue;
      return { index: i, value: a };
    }
    return null;
  }

  function dockerImage(args) {
    var i = 0;
    while (i < args.length && args[i] !== 'run') i++;
    if (i >= args.length) return null;
    i++;
    while (i < args.length) {
      var a = args[i];
      if (DOCKER_VALUE_FLAGS.indexOf(a) !== -1) { i += 2; continue; }
      if (a.charAt(0) === '-') { i++; continue; }
      return { index: i, value: a };
    }
    return null;
  }

  function wrap(findings, opts) {
    var errors = findings.filter(function (f) { return f.sev === 'error'; }).length;
    return {
      findings: findings,
      summary: {
        rules_run: RULES.length,
        findings: findings.length,
        blocking: errors,
        as_of: opts.today || AS_OF
      }
    };
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
});
