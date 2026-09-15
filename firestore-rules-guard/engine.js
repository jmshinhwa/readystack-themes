// Firestore Rules Guard — one engine, used by the VS Code extension and by the free web page.
(function () {
  var isNode = (typeof module !== 'undefined' && module.exports);
  var RULES = isNode ? require('./rules.json') : window.FRG_RULES;
  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  function days(a, b) { return Math.round((a - b) / 86400000); }

  function parseToday(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (!m) return new Date();
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }

  function check(text, opts) {
    opts = opts || {};
    var today = parseToday(opts.today);
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var src = lines.join('\n');
    var findings = [];
    var isStorage = /service\s+firebase\.storage/.test(src);

    function add(id, line, extra, sev) {
      var r = BY_ID[id];
      if (!r) return;
      findings.push({ check: id, sev: sev || r.sev, msg: extra ? r.msg + ' ' + extra : r.msg, line: line });
    }

    if (/service\s+(cloud\.firestore|firebase\.storage)/.test(src) &&
        !/rules_version\s*=\s*['"]2['"]/.test(src)) add('rules_version_missing', 1);

    var stack = [];      // { path, depth }
    var depth = 0;

    // a condition may be wrapped over several lines — join until the statement closes
    var units = [], buf = '', start = 0;
    for (var u = 0; u < lines.length; u++) {
      var t = lines[u].replace(/\/\/.*$/, '').trim();
      if (!buf) { if (!t) continue; start = u + 1; buf = t; }
      else { buf += ' ' + t; }
      if (/[;{}]$/.test(buf) || !t) { units.push({ text: buf, line: start }); buf = ''; }
    }
    if (buf) units.push({ text: buf, line: start });

    for (var n = 0; n < units.length; n++) {
      var line = units[n].text;
      var lineNo = units[n].line;

      var mm = /match\s+(\S+)\s*\{/.exec(line);
      var scrub = line.replace(/\{\s*\w+\s*(=\s*\*\*)?\s*\}/g, 'VAR');
      var opens = (scrub.match(/\{/g) || []).length;
      var closes = (scrub.match(/\}/g) || []).length;
      if (mm) stack.push({ path: mm[1], depth: depth + 1 });
      depth += opens - closes;
      while (stack.length && stack[stack.length - 1].depth > depth) stack.pop();

      var am = /allow\s+([a-z,\s]+?)\s*:\s*if\s+([^;]*);?/.exec(line);
      if (!am) continue;

      var verbs = am[1].split(',').map(function (v) { return v.trim(); }).filter(Boolean);
      var cond = am[2].trim();
      var path = stack.map(function (s) { return s.path; }).join('');
      var writes = verbs.some(function (v) { return v === 'write' || v === 'create' || v === 'update'; });
      var reads = verbs.some(function (v) { return v === 'read' || v === 'list'; });
      var deletes = verbs.indexOf('delete') >= 0 || verbs.indexOf('write') >= 0;
      var recursive = /\{\w+=\*\*\}/.test(path);
      var where = 'Path: ' + (path || '(root)') + '.';

      if (/^true$/.test(cond)) {
        add('public_access', lineNo, where, writes ? 'error' : 'warn');
        continue;
      }

      var tm = /request\.time\s*<\s*timestamp\.date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*\)/.exec(cond);
      if (tm) {
        var when = new Date(Date.UTC(+tm[1], +tm[2] - 1, +tm[3]));
        var iso = tm[1] + '-' + ('0' + tm[2]).slice(-2) + '-' + ('0' + tm[3]).slice(-2);
        var d = days(when, today);
        if (d >= 0) add('testmode_open', lineNo, 'Open until ' + iso + ' (' + d + ' days from today). ' + where);
        else add('testmode_expired', lineNo, 'Denied since ' + iso + ' (' + (-d) + ' days ago). ' + where);
        continue;
      }
      if (/^false$/.test(cond)) continue;

      var signedIn = /request\.auth\s*!=\s*null|request\.auth\s*\.\s*uid\s*!=\s*null|request\.auth\s*!=\s*(null)/.test(cond);
      var ownerCheck = /request\.auth\.uid\s*==|==\s*request\.auth\.uid/.test(cond);
      var literalUid = /request\.auth\.uid\s*==\s*['"][^'"]+['"]|['"][^'"]+['"]\s*==\s*request\.auth\.uid/.test(cond);
      var ownerSeg = /\{(user|owner|member|account|uid|profile)\w*\}/i.test(path);

      if (writes && recursive) add('recursive_wildcard_write', lineNo, where);
      if (recursive && signedIn && !ownerCheck) add('auth_any_user_wildcard', lineNo, where);
      if (ownerSeg && writes && !ownerCheck && !recursive) add('owner_check_missing', lineNo, where);
      if (literalUid) add('hardcoded_uid', lineNo, where);
      if (deletes && signedIn && !ownerCheck && !recursive) add('delete_unrestricted', lineNo, where);
      if (verbs.indexOf('read') >= 0 && /\{\w+(=\*\*)?\}\s*$/.test(path) && !recursive)
        add('list_exposure', lineNo, where);
      if (writes && !recursive && !/request\.resource\.data/.test(cond) && !isStorage)
        add('write_no_validation', lineNo, where);
      if (isStorage && writes && !/request\.resource\.size/.test(cond))
        add('storage_size_unbounded', lineNo, where);
      if (isStorage && writes && !/request\.resource\.contentType/.test(cond))
        add('storage_content_type', lineNo, where);
      if (!reads && !writes && !deletes) continue;
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, rule_count: RULES.length };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (isNode) module.exports = API;
  if (typeof window !== 'undefined') window.FRGENGINE = API;
})();
