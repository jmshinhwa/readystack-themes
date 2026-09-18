'use strict';
// OpenAPI Security Contract Lint - one brain, used by the extension and by the free web page.
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.OAS_RULES;

var BY_ID = {};
for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

function indentOf(line) { var m = line.match(/^(\s*)/); return m[1].replace(/\t/g, '  ').length; }
function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Collect the body lines of a block whose header sits at `line` (0-based) with indent `ind`.
function blockRange(lines, start, ind) {
  var end = start + 1;
  while (end < lines.length) {
    var l = lines[end];
    if (l.trim() !== '' && !/^\s*#/.test(l) && indentOf(l) <= ind) break;
    end++;
  }
  return end;
}

function check(text, opts) {
  opts = opts || {};
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var findings = [];
  function add(id, line, extra) {
    var r = BY_ID[id];
    if (!r) return;
    findings.push({ check: id, sev: r.sev, msg: (extra ? extra + ' ' : '') + r.msg, line: line });
  }

  var hasPaths = false, pathsIndent = -1, pathsLine = 0;
  var hasGlobalSecurity = false;
  var serversSeen = false, httpsServerSeen = false;
  var schemesStart = -1, schemesEnd = -1, schemesIndent = -1;
  var deprecatedLines = [];
  var sunsetSeen = /(^|[\s"'_-])sunset/i.test(text);

  // ---- pass 1: structure ----
  for (var n = 0; n < lines.length; n++) {
    var raw = lines[n], t = raw.trim(), ind = indentOf(raw);
    if (t === '' || t.charAt(0) === '#') continue;
    if (ind === 0 && /^"?paths"?\s*:/.test(t)) { hasPaths = true; pathsIndent = ind; pathsLine = n + 1; }
    if (ind === 0 && /^"?security"?\s*:/.test(t)) {
      hasGlobalSecurity = true;
      if (/^"?security"?\s*:\s*\[\s*\]\s*,?$/.test(t)) add('security_empty_global', n + 1);
    }
    if (ind === 0 && /^"?servers"?\s*:/.test(t)) serversSeen = true;
    if (/^"?securitySchemes"?\s*:/.test(t) && schemesStart < 0) {
      schemesStart = n; schemesIndent = ind; schemesEnd = blockRange(lines, n, ind);
    }
  }

  // ---- pass 2: line rules ----
  var flowsIndent = -1, flowName = null, flowNameIndent = -1;
  for (var n2 = 0; n2 < lines.length; n2++) {
    var line = lines[n2], s = line.trim(), ind2 = indentOf(line), ln = n2 + 1;
    if (s === '' || s.charAt(0) === '#') continue;

    if (/^-?\s*"?url"?\s*:\s*["']?https:\/\//i.test(s)) httpsServerSeen = true;
    if (/^-?\s*"?url"?\s*:\s*["']?http:\/\//i.test(s) && !/http:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(s)) {
      add('server_plaintext_http', ln);
    }
    if (/^"?(authorizationUrl|tokenUrl|refreshUrl)"?\s*:\s*["']?http:\/\//i.test(s) && !/http:\/\/(localhost|127\.0\.0\.1)/i.test(s)) {
      add('oauth_url_plaintext', ln);
    }
    if (ind2 > 0 && /^"?security"?\s*:\s*\[\s*\]\s*,?$/.test(s)) add('security_empty_operation', ln);
    if (/^"?in"?\s*:\s*["']?query["']?\s*,?$/.test(s) && schemesStart >= 0 && n2 > schemesStart && n2 < schemesEnd) {
      add('apikey_in_query', ln);
    }
    if (/^"?scheme"?\s*:\s*["']?basic["']?\s*,?$/i.test(s) && schemesStart >= 0 && n2 > schemesStart && n2 < schemesEnd) {
      add('basic_auth_scheme', ln);
    }
    if (/^"?flows"?\s*:/.test(s)) { flowsIndent = ind2; continue; }
    if (flowsIndent >= 0) {
      if (ind2 <= flowsIndent) { flowsIndent = -1; flowName = null; flowNameIndent = -1; }
      else if (ind2 === flowsIndent + 2 || (flowNameIndent < 0 && ind2 > flowsIndent)) {
        var fm = s.match(/^"?(implicit|password|clientCredentials|authorizationCode)"?\s*:/);
        if (fm) {
          flowName = fm[1]; flowNameIndent = ind2;
          if (flowName === 'implicit') add('oauth_implicit_flow', ln);
          if (flowName === 'password') add('oauth_password_flow', ln);
        }
      }
    }
    if (/^"?scopes"?\s*:\s*(\{\s*\}|)\s*,?$/.test(s)) {
      var nx = lines[n2 + 1];
      var emptyInline = /^"?scopes"?\s*:\s*\{\s*\}\s*,?$/.test(s);
      var nothingUnder = !nx || nx.trim() === '' || indentOf(nx) <= ind2;
      if (emptyInline || nothingUnder) add('oauth_scopes_empty', ln);
    }
    if (/^['"]?(\*|all|admin:\*|\*:\*|full_access)['"]?\s*:/.test(s) && schemesStart >= 0 && n2 > schemesStart && n2 < schemesEnd) {
      add('scope_wildcard', ln);
    }
    if (/^"?additionalProperties"?\s*:\s*true\s*,?$/.test(s)) add('additional_properties_open', ln);
    if (/^"?deprecated"?\s*:\s*true\s*,?$/.test(s)) deprecatedLines.push(ln);
    if (/^"?\/[^\s:"']*"?\s*:\s*\{?\s*,?$/.test(s) && /\/(debug|trace|actuator|internal|_dump|_debug|env)(\/|"|:|$)/i.test(s)) {
      add('internal_path_published', ln);
    }
    if (/^-?\s*"?(example|default)"?\s*:/.test(s) &&
        /(sk_live_[A-Za-z0-9]{6,}|ghp_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{12,}|xox[baprs]-[A-Za-z0-9-]{8,}|eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}|BEGIN [A-Z ]*PRIVATE KEY)/.test(s)) {
      add('secret_in_example', ln);
    }
  }

  // ---- document-level ----
  if (hasPaths && !hasGlobalSecurity) add('no_global_security', pathsLine);
  if (serversSeen && !httpsServerSeen) add('no_https_server', 1);
  for (var d = 0; d < deprecatedLines.length; d++) {
    if (!sunsetSeen) add('deprecated_without_sunset', deprecatedLines[d]);
  }

  // ---- unused security schemes ----
  if (schemesStart >= 0) {
    var names = [];
    for (var k = schemesStart + 1; k < schemesEnd; k++) {
      var kl = lines[k];
      if (kl.trim() === '' || /^\s*#/.test(kl)) continue;
      if (indentOf(kl) === schemesIndent + 2) {
        var nm = kl.trim().match(/^"?([A-Za-z0-9_.-]+)"?\s*:/);
        if (nm) names.push({ name: nm[1], line: k + 1 });
      }
    }
    for (var q = 0; q < names.length; q++) {
      var re = new RegExp('^-?\\s*"?' + esc(names[q].name) + '"?\\s*:');
      var used = false;
      for (var z = 0; z < lines.length; z++) {
        if (z > schemesStart && z < schemesEnd) continue;
        if (re.test(lines[z].trim())) { used = true; break; }
      }
      if (!used) add('scheme_defined_unused', names[q].line, 'Scheme "' + names[q].name + '":');
    }
  }

  // ---- per-operation: missing 429 ----
  if (hasPaths) {
    for (var p = 0; p < lines.length; p++) {
      var pl = lines[p], ps = pl.trim();
      if (ps === '' || ps.charAt(0) === '#') continue;
      var om = ps.match(/^"?(get|post|put|patch|delete|head|options)"?\s*:\s*\{?\s*$/i);
      if (!om || indentOf(pl) <= pathsIndent) continue;
      var oEnd = blockRange(lines, p, indentOf(pl));
      var body = lines.slice(p, oEnd).join('\n');
      if (!/^\s*"?'?429'?"?\s*:/m.test(body)) add('missing_429', p + 1, 'Operation "' + om[1].toLowerCase() + '":');
    }
  }

  findings.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.OASENGINE = API;
