/* MV3 Manifest Preflight - engine. Same file runs in Node (extension) and in the browser (free web page). */
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.MV3_RULES;

function lineOf(text, key) {
  var lines = String(text).split(/\r?\n/), needle = '"' + key + '"';
  for (var i = 0; i < lines.length; i++) { if (lines[i].indexOf(needle) !== -1) return i + 1; }
  return 1;
}
function isHostPattern(p) { return /^(\*|https?|file|ftp|urn):\/\//.test(String(p)) || String(p) === '<all_urls>'; }
function ruleOf(id) { for (var i = 0; i < RULES.length; i++) { if (RULES[i].id === id) return RULES[i]; } return {id: id, sev: 'error', msg: id}; }

function check(text, opts) {
  opts = opts || {};
  var findings = [], m;
  try { m = JSON.parse(String(text)); }
  catch (e) {
    return {findings: [{check: 'json_parse_error', sev: 'error', line: 1,
      msg: 'manifest.json is not valid JSON (' + e.message + '). Chrome will not load or upload it - trailing commas and comments are the usual cause.'}]};
  }
  if (!m || typeof m !== 'object' || Array.isArray(m)) {
    return {findings: [{check: 'json_parse_error', sev: 'error', line: 1, msg: 'manifest.json must be a JSON object at the top level.'}]};
  }
  function add(id, line, extra) {
    var r = ruleOf(id);
    findings.push({check: id, sev: r.sev, line: line || 1, msg: r.msg + (extra ? ' ' + extra : '')});
  }

  if (m.manifest_version !== 3) add('manifest_version_not_3', lineOf(text, 'manifest_version'), 'Found: ' + JSON.stringify(m.manifest_version) + '.');
  if (m.browser_action) add('browser_action_or_page_action', lineOf(text, 'browser_action'), 'Found "browser_action".');
  if (m.page_action) add('browser_action_or_page_action', lineOf(text, 'page_action'), 'Found "page_action".');

  var bg = m.background;
  if (bg && typeof bg === 'object') {
    if (bg.scripts) add('background_not_service_worker', lineOf(text, 'scripts'), 'Found "background.scripts".');
    if (bg.page) add('background_not_service_worker', lineOf(text, 'page'), 'Found "background.page".');
    if (!bg.scripts && !bg.page && !bg.service_worker) add('background_not_service_worker', lineOf(text, 'background'), 'The "background" block declares no "service_worker".');
    if (typeof bg.persistent !== 'undefined') add('background_persistent_key', lineOf(text, 'persistent'));
    if (typeof bg.service_worker === 'string' && /^(https?:)?\/\//.test(bg.service_worker)) add('remote_code_reference', lineOf(text, 'service_worker'), 'background.service_worker points at ' + bg.service_worker + '.');
  }

  var csp = m.content_security_policy;
  if (typeof csp === 'string') add('csp_string_form', lineOf(text, 'content_security_policy'), 'Found a string value.');
  else if (csp && typeof csp === 'object') {
    Object.keys(csp).forEach(function (k) {
      var v = String(csp[k] || '');
      if (/unsafe-eval/.test(v)) add('csp_unsafe_eval', lineOf(text, 'content_security_policy'), 'In "' + k + '".');
      var hit = v.match(/https?:\/\/[^\s'";]+/);
      if (hit) add('csp_remote_script_src', lineOf(text, 'content_security_policy'), 'In "' + k + '": ' + hit[0] + '.');
    });
  }

  var war = m.web_accessible_resources;
  if (Array.isArray(war)) {
    var flat = war.filter(function (x) { return typeof x === 'string'; });
    if (flat.length) add('web_accessible_resources_flat', lineOf(text, 'web_accessible_resources'), 'Found ' + flat.length + ' bare path' + (flat.length === 1 ? '' : 's') + '.');
  }

  var perms = Array.isArray(m.permissions) ? m.permissions : [];
  var hostsInPerms = perms.filter(isHostPattern);
  if (hostsInPerms.length) add('host_pattern_in_permissions', lineOf(text, 'permissions'), 'Found: ' + hostsInPerms.join(', ') + '.');
  if (perms.indexOf('webRequestBlocking') !== -1) add('webrequest_blocking', lineOf(text, 'permissions'));
  var optPerms = Array.isArray(m.optional_permissions) ? m.optional_permissions : [];
  var hostsInOpt = optPerms.filter(isHostPattern);
  if (hostsInOpt.length) add('host_pattern_in_optional_permissions', lineOf(text, 'optional_permissions'), 'Found: ' + hostsInOpt.join(', ') + '.');
  var allHosts = (Array.isArray(m.host_permissions) ? m.host_permissions : []).concat(hostsInPerms);
  var broad = allHosts.filter(function (h) { return h === '<all_urls>' || /^\*:\/\/\*\//.test(h) || /^https?:\/\/\*\/\*/.test(h); });
  if (broad.length) add('broad_host_permissions', lineOf(text, m.host_permissions ? 'host_permissions' : 'permissions'), 'Found: ' + broad.join(', ') + '.');

  var cs = Array.isArray(m.content_scripts) ? m.content_scripts : [];
  cs.forEach(function (c, i) {
    if (!c || typeof c !== 'object') return;
    if (!Array.isArray(c.matches) || !c.matches.length) add('content_script_without_matches', lineOf(text, 'content_scripts'), 'Entry #' + (i + 1) + '.');
    [].concat(c.js || [], c.css || []).forEach(function (f) {
      if (/^(https?:)?\/\//.test(String(f))) add('remote_code_reference', lineOf(text, 'content_scripts'), 'Content script #' + (i + 1) + ' loads ' + f + '.');
    });
  });

  if (m.update_url) add('update_url_in_upload', lineOf(text, 'update_url'));
  if (m.key) add('key_field_present', lineOf(text, 'key'));

  var v = m.version;
  var partsOk = typeof v === 'string' && /^\d{1,5}(\.\d{1,5}){0,3}$/.test(v) && v.split('.').every(function (p) {
    return (p === '0' || p.charAt(0) !== '0') && Number(p) <= 65535;
  });
  if (!partsOk) add('version_invalid', lineOf(text, 'version'), 'Found: ' + JSON.stringify(v) + '.');

  if (typeof m.name !== 'string' || !m.name.trim() || m.name.length > 75)
    add('name_missing_or_over_75', lineOf(text, 'name'), typeof m.name === 'string' ? 'Found ' + m.name.length + ' characters.' : 'No "name".');
  if (typeof m.short_name === 'string' && m.short_name.length > 12)
    add('short_name_over_12', lineOf(text, 'short_name'), 'Found ' + m.short_name.length + ' characters.');
  if (typeof m.description !== 'string' || !m.description.trim() || m.description.length > 132)
    add('description_missing_or_over_132', lineOf(text, 'description'), typeof m.description === 'string' ? 'Found ' + m.description.length + ' characters.' : 'No "description".');

  var icons = (m.icons && typeof m.icons === 'object') ? m.icons : null;
  if (!icons || !icons['128']) add('icon_128_missing', lineOf(text, 'icons'), icons ? 'Sizes present: ' + Object.keys(icons).join(', ') + '.' : 'No "icons" block.');

  var usesMsg = /__MSG_[A-Za-z0-9_@]+__/.test(String(m.name || '') + String(m.description || ''));
  if (usesMsg && !m.default_locale) add('default_locale_missing', lineOf(text, 'name'));
  if (!usesMsg && m.default_locale) add('default_locale_without_msg', lineOf(text, 'default_locale'));

  var dnr = m.declarative_net_request;
  if (dnr && Array.isArray(dnr.rule_resources)) {
    dnr.rule_resources.forEach(function (r, i) {
      if (!r || typeof r !== 'object' || !r.id || typeof r.enabled !== 'boolean' || !r.path)
        add('dnr_rule_resource_incomplete', lineOf(text, 'rule_resources'), 'Entry #' + (i + 1) + '.');
    });
  }

  var ec = m.externally_connectable;
  if (ec && Array.isArray(ec.matches)) {
    var badEc = ec.matches.filter(function (x) { return /:\/\/\*\//.test(String(x)) || /\*\.\*/.test(String(x)) || String(x) === '<all_urls>'; });
    if (badEc.length) add('externally_connectable_wildcard', lineOf(text, 'externally_connectable'), 'Found: ' + badEc.join(', ') + '.');
  }

  findings.sort(function (a, b) { return a.line - b.line || (a.check < b.check ? -1 : 1); });
  return {findings: findings};
}

var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};
if (typeof window !== 'undefined') window.MV3ENGINE = API;
if (typeof module !== 'undefined') module.exports = API;
