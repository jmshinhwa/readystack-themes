// WP Plugin Review Gate — one engine, used by the VS Code extension and by the free web page.
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.WPRG_RULES;

var BY_ID = {};
for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

function lines(text) { return String(text == null ? '' : text).split(/\r\n|\r|\n/); }

function headerBlock(ls, isPhp) {
  // readme.txt: the lines between the === title === line and the first blank line after it.
  // plugin php: the lines of the first block comment that carries Plugin Name:.
  var out = [], started = false;
  for (var i = 0; i < ls.length && i < 80; i++) {
    var l = ls[i];
    if (isPhp) {
      if (/^\s*\/\*/.test(l)) started = true;
      if (started) out.push({ n: i + 1, t: l.replace(/^\s*\*+\s?/, '').replace(/^\s*\/\*+\s?/, '') });
      if (started && /\*\//.test(l)) break;
    } else {
      if (/^\s*===\s*.+?\s*===\s*$/.test(l)) { started = true; continue; }
      if (started) {
        if (/^\s*$/.test(l)) break;
        out.push({ n: i + 1, t: l });
      }
    }
  }
  return out;
}

function headerValue(block, key) {
  var re = new RegExp('^\\s*' + key.replace(/ /g, '\\s+') + '\\s*:\\s*(.*)$', 'i');
  for (var i = 0; i < block.length; i++) {
    var m = re.exec(block[i].t);
    if (m) return { value: m[1].trim(), line: block[i].n, raw: block[i].t.trim() };
  }
  return null;
}

function ver(v) {
  var m = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(v || '').trim());
  if (!m) return null;
  return { major: +m[1], minor: m[2] ? +m[2] : 0, patch: m[3] === undefined ? null : +m[3] };
}
function cmp(a, b) { return (a.major - b.major) || (a.minor - b.minor); }

function add(out, id, msg, line) {
  var r = BY_ID[id];
  out.push({ check: id, sev: r ? r.sev : 'warn', msg: msg, line: line || 1 });
}

function kindOf(text, ls) {
  var head = ls.slice(0, 80).join('\n');
  if (/^\s*===\s*.+?\s*===\s*$/m.test(head) || /^\s*Stable\s+tag\s*:/im.test(head)) return 'readme';
  if (/Plugin\s+Name\s*:/i.test(head) && (/<\?php/.test(head) || /^\s*\/\*/m.test(head))) return 'php';
  return 'unknown';
}

function checkReadme(text, ls, out) {
  var block = headerBlock(ls, false);
  var firstLine = 1;
  for (var i = 0; i < ls.length; i++) { if (ls[i].trim() !== '') { firstLine = i + 1; break; } }
  if (!/^\s*===\s*.+?\s*===\s*$/.test(ls[firstLine - 1] || '')) {
    add(out, 'readme_title_line', 'First line is "' + (ls[firstLine - 1] || '').trim().slice(0, 40) + '" — the directory reads the plugin name from === Your Plugin Name ===.', firstLine);
  }

  var stable = headerValue(block, 'Stable tag');
  if (!stable) add(out, 'stable_tag_missing', 'No "Stable tag:" line — the directory has no version to ship, so the update never reaches installs. Write Stable tag: <the version you tagged>.', firstLine);
  else if (/^trunk$/i.test(stable.value)) add(out, 'stable_tag_trunk', '"Stable tag: trunk" ships whatever sits in trunk to every install. Write the tagged version instead, e.g. Stable tag: 2.4.1.', stable.line);

  var reqWp = headerValue(block, 'Requires at least');
  if (!reqWp || !reqWp.value) add(out, 'requires_at_least_missing', 'No "Requires at least:" line — WordPress will offer your plugin to installs that cannot run it. Write Requires at least: 6.5.', firstLine);

  var reqPhp = headerValue(block, 'Requires PHP');
  if (!reqPhp || !reqPhp.value) add(out, 'requires_php_missing', 'No "Requires PHP:" line — every PHP version, including ones you never tested, is offered the plugin. Write Requires PHP: 7.4.', firstLine);

  var tested = headerValue(block, 'Tested up to');
  if (!tested || !tested.value) {
    add(out, 'tested_up_to_missing', 'No "Tested up to:" line — the directory shows your plugin as untested. Write Tested up to: <the WordPress major you tested>.', firstLine);
  } else {
    var tv = ver(tested.value);
    if (tv && tv.patch !== null) add(out, 'tested_up_to_patch', '"Tested up to: ' + tested.value + '" carries a patch number. The directory wants the major only: Tested up to: ' + tv.major + '.' + tv.minor + '.', tested.line);
    if (tv && reqWp && reqWp.value) {
      var rv = ver(reqWp.value);
      if (rv && cmp(tv, rv) < 0) add(out, 'tested_below_requires', 'Tested up to ' + tv.major + '.' + tv.minor + ' is older than Requires at least ' + rv.major + '.' + rv.minor + ' — the two lines contradict each other and no install matches both.', tested.line);
    }
  }

  var tags = headerValue(block, 'Tags');
  if (tags && tags.value) {
    var list = tags.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (list.length > 5) add(out, 'tags_over_five', list.length + ' tags listed; only the first five are used, so "' + list.slice(5).join(', ') + '" does nothing.', tags.line);
  }

  var lic = headerValue(block, 'License');
  var licUri = headerValue(block, 'License URI');
  if (!lic || !licUri) {
    var which = !lic && !licUri ? 'License and License URI are' : (!lic ? 'License is' : 'License URI is');
    add(out, 'license_line_missing', which + ' missing from the header block. Add License: GPLv2 or later and License URI: https://www.gnu.org/licenses/gpl-2.0.html.', firstLine);
  }

  // short description = first non-empty line after the header block
  var end = block.length ? block[block.length - 1].n : firstLine;
  for (var j = end; j < ls.length; j++) {
    var s = ls[j];
    if (s.trim() === '') continue;
    if (/^\s*==/.test(s)) break;
    if (s.trim().length > 150) add(out, 'short_description_long', 'Short description is ' + s.trim().length + ' characters; the directory cuts it at 150.', j + 1);
    break;
  }

  if (!/^\s*==\s*Changelog\s*==/im.test(text)) add(out, 'changelog_section_missing', 'No "== Changelog ==" section — reviewers and users read it to see what this version changed.', firstLine);
}

function checkPhp(text, ls, out) {
  var block = headerBlock(ls, true);
  var firstLine = block.length ? block[0].n : 1;

  if (!headerValue(block, 'Version')) add(out, 'php_version_header_missing', 'The plugin header has no "Version:" line — WordPress cannot tell an update from the installed copy.', firstLine);
  if (!headerValue(block, 'Requires PHP')) add(out, 'php_requires_php_header_missing', 'The plugin header has no "Requires PHP:" line — add Requires PHP: 7.4 so old installs are not offered the update.', firstLine);
  if (!headerValue(block, 'License')) add(out, 'php_license_header_missing', 'The plugin header has no "License:" line — the directory only accepts GPL-compatible plugins. Add License: GPLv2 or later.', firstLine);
  if (!headerValue(block, 'Text Domain')) add(out, 'php_text_domain_missing', 'The plugin header has no "Text Domain:" line — translations will not load. It must equal your plugin slug.', firstLine);

  if (!/defined\s*\(\s*['"]ABSPATH['"]\s*\)/.test(text)) {
    add(out, 'php_direct_access_guard', 'No ABSPATH guard in this file — the file runs when it is requested directly. Add defined( \'ABSPATH\' ) || exit; under the header.', firstLine);
  }

  for (var i = 0; i < ls.length; i++) {
    var l = ls[i];
    if (/wp_enqueue_(script|style)\s*\(/.test(l) && /https?:\/\/(?!localhost)/.test(l)) {
      add(out, 'php_remote_asset', 'Line loads an asset from a remote URL: ' + l.trim().slice(0, 70) + ' — plugins in the directory must ship their own files.', i + 1);
    }
    var ob = /\b(eval|base64_decode|gzinflate|str_rot13)\s*\(/.exec(l);
    if (ob) add(out, 'php_obfuscated_code', ob[1] + '() on this line reads as obfuscated code to a reviewer; ship readable PHP.', i + 1);
    if (/['"][^'"]*wp-content\/plugins[^'"]*['"]/.test(l)) {
      add(out, 'php_hardcoded_plugin_path', 'Hard-coded wp-content/plugins path — it breaks on every install that moved the plugins folder. Use plugin_dir_path().', i + 1);
    }
  }
}

function check(text, opts) {
  opts = opts || {};
  var ls = lines(text);
  var out = [];
  var kind = kindOf(text, ls);
  if (kind === 'readme') checkReadme(text, ls, out);
  else if (kind === 'php') checkPhp(text, ls, out);
  else add(out, 'file_kind', 'This is neither a readme.txt (first line === Plugin Name ===) nor a main plugin file (header comment with Plugin Name:). Open one of those two files.', 1);
  out.sort(function (a, b) { return a.line - b.line; });
  return { findings: out, kind: kind, today: opts.today || '', rule_count: RULES.length };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.WPRGENGINE = API;
