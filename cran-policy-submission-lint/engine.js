// CRAN Policy Submission Lint - one engine, two homes (Node and the browser).
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.CRAN_RULES;

var FILE_SEP = /^\s*#{2,}\s*FILE:\s*(.+?)\s*#*\s*$/;
var TITLE_LOWER = ['a','an','and','as','at','but','by','for','from','in','into','nor','of','off','on','or','per','the','to','via','vs','with','over','under'];

function stripComment(line) {
  var out = '', q = null;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (q) { if (c === '\\') { out += c + (line[i + 1] || ''); i++; continue; } if (c === q) q = null; out += c; continue; }
    if (c === '"' || c === "'") { q = c; out += c; continue; }
    if (c === '#') break;
    out += c;
  }
  return out;
}

function detectScope(text, name) {
  var n = String(name || '');
  if (/(^|[\\/])DESCRIPTION$/.test(n)) return 'description';
  if (/(^|[\\/])NAMESPACE$/.test(n)) return 'namespace';
  if (/\.[Rr]$/.test(n)) return 'r';
  if (/^Package:[ \t]*\S/m.test(text) && /^(Version|License|Title):[ \t]*\S/m.test(text)) return 'description';
  if (/^\s*(?:export|exportPattern|exportClasses|importFrom|import|S3method|useDynLib)\s*\(/m.test(text) && !/<-\s*function\s*\(/.test(text)) return 'namespace';
  return 'r';
}

// --- DESCRIPTION is a DCF file: "Field: value" with continuation lines indented.
function dcf(lines, offset) {
  var fields = {}, cur = null;
  for (var i = 0; i < lines.length; i++) {
    var m = /^([A-Za-z][A-Za-z0-9@._-]*):[ \t]*(.*)$/.exec(lines[i]);
    if (m) { cur = m[1]; fields[cur] = { value: m[2], line: offset + i + 1 }; }
    else if (cur && /^[ \t]+\S/.test(lines[i])) fields[cur].value += ' ' + lines[i].trim();
    else if (!/\S/.test(lines[i])) cur = null;
  }
  return fields;
}

function days(a, b) { return Math.round((Date.parse(a) - Date.parse(b)) / 86400000); }

var CRAN_LICENSES = [
  'GPL', 'GPL-2', 'GPL-3', 'LGPL', 'LGPL-2', 'LGPL-2.1', 'LGPL-3', 'AGPL-3', 'Artistic-2.0',
  'MPL-2.0', 'CC0', 'Unlimited', 'file LICENSE'
];
var LICENSE_OK = /^(?:GPL|LGPL|AGPL)\s*\(\s*>=\s*[0-9.]+\s*\)$|^Apache License(?:\s*\(\s*>=\s*2\s*\)|\s*2\.0|\s*Version\s*2\.0)$|^CC BY(?:-SA|-NC)?\s*[0-9.]+$|^(?:MIT|BSD_2_clause|BSD_3_clause|BSL-1\.0|EUPL-1\.[12])\s*\+\s*file LICENSE$|^file LICEN[CS]E$/;

var FN = {
  titlePeriod: function (ctx, rule) {
    var f = ctx.fields.Title; if (!f) return [];
    return /\.\s*$/.test(f.value) && !/\b[A-Z]\.\s*$/.test(f.value) ? [{ line: f.line, extra: 'Title: ' + f.value }] : [];
  },
  titleCase: function (ctx) {
    var f = ctx.fields.Title; if (!f) return [];
    var words = f.value.split(/\s+/), bad = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i].replace(/^[('"]+|[)'",.:]+$/g, '');
      if (!w || !/^[a-z]/.test(w)) continue;
      if (i > 0 && TITLE_LOWER.indexOf(w.toLowerCase()) >= 0) continue;
      if (/^[a-z]+[A-Z]/.test(w) || /^[a-z]$/.test(w)) continue;   // camelCase object names, single letters
      bad.push(w);
    }
    return bad.length ? [{ line: f.line, extra: 'lower-case: ' + bad.join(', ') }] : [];
  },
  descriptionStart: function (ctx) {
    var f = ctx.fields.Description; if (!f) return [];
    var pkg = (ctx.fields.Package || { value: '' }).value.trim();
    var v = f.value.trim();
    var re = new RegExp('^(?:this package|the package|a package|an r package|package\\b' + (pkg ? '|' + pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b' : '') + ')', 'i');
    return re.test(v) ? [{ line: f.line, extra: 'starts: "' + v.slice(0, 40) + '"' }] : [];
  },
  descriptionThin: function (ctx) {
    var f = ctx.fields.Description;
    if (!f) return [{ line: 1, extra: 'no Description field' }];
    var v = f.value.trim();
    var wordCount = v ? v.split(/\s+/).length : 0;
    return (wordCount < 10 || !/[.!?]\s*$/.test(v)) ? [{ line: f.line, extra: wordCount + ' words' + (/[.!?]\s*$/.test(v) ? '' : ', no closing full stop') }] : [];
  },
  licenseSpec: function (ctx) {
    var f = ctx.fields.License;
    if (!f) return [{ line: 1, extra: 'no License field' }];
    var v = f.value.trim();
    if (CRAN_LICENSES.indexOf(v) >= 0 || LICENSE_OK.test(v)) return [];
    return [{ line: f.line, extra: 'License: ' + v }];
  },
  creRole: function (ctx) {
    var a = ctx.fields['Authors@R'];
    if (!a) {
      var m = ctx.fields.Maintainer;
      if (m && /<[^>@\s]+@[^>\s]+>/.test(m.value)) return [];
      return [{ line: (m || { line: 1 }).line, extra: 'neither Authors@R nor a Maintainer: with an address' }];
    }
    var cre = (a.value.match(/["']cre["']/g) || []).length;
    if (cre === 1) return [];
    return [{ line: a.line, extra: cre + ' person() entries carry role "cre"' }];
  },
  versionDev: function (ctx) {
    var f = ctx.fields.Version; if (!f) return [{ line: 1, extra: 'no Version field' }];
    var v = f.value.trim(), parts = v.split(/[.-]/);
    if (parts.length > 3 || parts.indexOf('9000') >= 0 || /9\d{3}$/.test(parts[parts.length - 1])) return [{ line: f.line, extra: 'Version: ' + v }];
    return [];
  },
  placeholderEmail: function (ctx) {
    var out = [];
    ['Authors@R', 'Maintainer'].forEach(function (k) {
      var f = ctx.fields[k]; if (!f) return;
      var m = /(?:[\w.+-]+@[\w.-]*(?:example\.(?:com|org|net)|test\.com|domain\.com|email\.com)|your(?:\.?name)?@[\w.-]+|first\.?last@[\w.-]+|you@[\w.-]+)/i.exec(f.value);
      if (m) out.push({ line: f.line, extra: m[0] });
    });
    return out;
  },
  dateField: function (ctx, rule, opts) {
    var f = ctx.fields.Date; if (!f) return [];
    var m = /(\d{4}-\d{2}-\d{2})/.exec(f.value); if (!m) return [{ line: f.line, extra: 'unparseable Date: ' + f.value }];
    var today = (opts && opts.today) || new Date().toISOString().slice(0, 10);
    var d = days(m[1], today);
    if (d > 0) return [{ line: f.line, extra: 'Date is ' + d + ' day(s) in the future (today ' + today + ')' }];
    if (d < -31) return [{ line: f.line, extra: 'Date is ' + (-d) + ' days old (today ' + today + ')' }];
    return [];
  },
  dependsPackages: function (ctx) {
    var f = ctx.fields.Depends; if (!f) return [];
    var extras = f.value.split(',').map(function (s) { return s.trim(); })
      .filter(function (s) { return s && !/^R\s*(\(|$)/.test(s) && !/^methods$/.test(s); });
    return extras.length ? [{ line: f.line, extra: extras.join(', ') }] : [];
  },
  optionsParRestore: function (ctx) {
    if (/\bon\.exit\s*\(/.test(ctx.text)) return [];
    var out = [];
    for (var i = 0; i < ctx.code.length; i++) {
      var m = /(^|[^.\w$])(options|par|Sys\.setenv|Sys\.setlocale)\s*\(\s*[^)\s]/.exec(ctx.code[i]);
      if (m) out.push({ line: ctx.offset + i + 1, extra: m[2] + '() with no on.exit() anywhere in the file' });
    }
    return out;
  },
  nonAscii: function (ctx) {
    var out = [];
    for (var i = 0; i < ctx.lines.length; i++) {
      var m = /[^\x00-\x7F]/.exec(ctx.lines[i]);
      if (m) out.push({ line: ctx.offset + i + 1, extra: 'U+' + m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') + ' "' + m[0] + '"' });
    }
    return out;
  }
};

function runBlock(text, name, offset, opts, findings) {
  var scope = detectScope(text, name);
  var lines = text.split(/\r?\n/);
  var ctx = { text: text, lines: lines, offset: offset, name: name, scope: scope,
    code: lines.map(stripComment), fields: scope === 'description' ? dcf(lines, offset) : {} };
  for (var r = 0; r < RULES.length; r++) {
    var rule = RULES[r];
    if (rule.scope !== scope && rule.scope !== 'any') continue;
    var hits = [];
    if (rule.fn && FN[rule.fn]) hits = FN[rule.fn](ctx, rule, opts) || [];
    else if (rule.re) {
      var re = new RegExp(rule.re, rule.flags || '');
      var src = rule.raw ? lines : ctx.code;
      for (var i = 0; i < src.length; i++) if (re.test(src[i])) hits.push({ line: offset + i + 1, extra: src[i].trim().slice(0, 60) });
    }
    for (var h = 0; h < hits.length; h++) {
      findings.push({ check: rule.check, sev: rule.sev || 'error', line: hits[h].line,
        msg: rule.msg + (hits[h].extra ? '  [' + (name ? name + ' - ' : '') + hits[h].extra + ']' : (name ? '  [' + name + ']' : '')) });
    }
  }
}

function check(text, opts) {
  opts = opts || {};
  text = String(text == null ? '' : text);
  var lines = text.split(/\r?\n/), findings = [];
  var blocks = [], cur = { name: opts.path || '', start: 0, lines: [] };
  for (var i = 0; i < lines.length; i++) {
    var m = FILE_SEP.exec(lines[i]);
    if (m) { if (cur.lines.length) blocks.push(cur); cur = { name: m[1], start: i + 1, lines: [] }; }
    else cur.lines.push(lines[i]);
  }
  if (cur.lines.length || !blocks.length) blocks.push(cur);
  for (var b = 0; b < blocks.length; b++) {
    runBlock(blocks[b].lines.join('\n'), blocks[b].name, blocks[b].start, opts, findings);
  }
  findings.sort(function (a, c) { return (a.line || 0) - (c.line || 0); });
  return { findings: findings, rules: RULES.length, scopes: blocks.map(function (x) { return detectScope(x.lines.join('\n'), x.name); }) };
}

var CRANLINT = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, detectScope: detectScope };
if (typeof module !== 'undefined' && module.exports) module.exports = CRANLINT;
else window.CRANLINT = CRANLINT;
