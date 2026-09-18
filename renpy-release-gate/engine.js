// Ren'Py Release Gate - one brain, used by the VS Code extension and by the free web page.
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.RENPY_RULES;

  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  var ASSET_EXT = /\.(png|jpg|jpeg|webp|webm|avi|ogg|opus|mp3|wav|ttf|otf|rpy|json|txt)$/i;

  // Pull every string literal out of one line, keeping its 1-based column.
  function strings(line) {
    var out = [], i = 0, n = line.length;
    while (i < n) {
      var q = line[i];
      if (q === '"' || q === "'") {
        var j = i + 1, buf = '';
        while (j < n) {
          if (line[j] === '\\') { buf += line[j] + (line[j + 1] || ''); j += 2; continue; }
          if (line[j] === q) break;
          buf += line[j]; j++;
        }
        if (j >= n) break;           // unterminated - leave it to Ren'Py
        out.push(buf);
        i = j + 1;
      } else { i++; }
    }
    return out;
  }

  // Depth of an opener/closer pair, ignoring backslash-escaped ones.
  function balance(s, open, close) {
    var depth = 0, spaced = false;
    for (var i = 0; i < s.length; i++) {
      if (s[i] === '\\') { i++; continue; }
      if (s[i] === open) {
        depth++;
        if (i + 1 >= s.length || s[i + 1] === ' ' || s[i + 1] === close) spaced = true;
      } else if (s[i] === close) { depth--; }
    }
    return { depth: depth, spaced: spaced };
  }

  // Text tags that must be closed. {w} {p} {nw} {fast} and friends stand alone.
  var PAIRED = ['a','alpha','alt','art','b','color','cps','font','i','k','noalt','outlinecolor','plain','rb','rt','s','size','u'];

  // Name of the first text tag left open in this string, or '' if the string is sound.
  function openTag(s) {
    var stack = [], m, re = /\{([^{}]*)\}/g, clean = s.replace(/\\./g, '');
    if ((clean.match(/\{/g) || []).length !== (clean.match(/\}/g) || []).length) return 'unclosed brace';
    while ((m = re.exec(clean)) !== null) {
      var body = m[1];
      if (body.charAt(0) === '/') {
        var want = body.slice(1);
        if (stack.length && stack[stack.length - 1] === want) stack.pop();
        else return '/' + want;
      } else {
        var name = body.split('=')[0].trim().toLowerCase();
        if (PAIRED.indexOf(name) !== -1) stack.push(name);
      }
    }
    return stack.length ? stack[stack.length - 1] : '';
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text);
    var lines = src.split(/\r?\n/);
    var findings = [];
    var seen = {};

    function add(id, line, detail) {
      var r = BY_ID[id];
      findings.push({
        check: id,
        sev: r.sev,
        msg: r.title + (detail ? ': ' + detail : '') + '. ' + r.fix,
        line: line
      });
    }

    var defines = {};        // bare name -> line of its define
    var persistentDefault = {};
    var persistentRead = {};
    var buildLine = 0, hasBuild = false, excludesRpy = false;
    var nameLine = 0, hasSaveDir = false;
    var inInit = false;

    lines.forEach(function (raw, idx) {
      var ln = idx + 1;
      var line = raw;
      var code = line.replace(/#.*$/, '');

      // init-block tracking: an init statement at column 0 opens a block.
      if (/^\s*init\b[^:]*:\s*$/.test(code)) { inInit = true; }
      else if (code.trim() && !/^\s/.test(code)) { inInit = false; }

      if (/^[ ]*\t/.test(line)) add('tab_indent', ln);

      if (/\bconfig\.developer\s*=\s*True\b/.test(code)) add('developer_mode_shipped', ln);
      if (/\bconfig\.console\s*=\s*True\b/.test(code)) add('console_enabled', ln);
      if (/\bconfig\.autoreload\s*=\s*True\b/.test(code)) add('autoreload_enabled', ln);
      if (/\bconfig\.image_cache_size(?!_mb)\s*=/.test(code)) add('removed_image_cache_size', ln);
      if (/\bconfig\.version\s*=\s*["']1\.0["']/.test(code)) add('placeholder_version', ln);

      if (/\bconfig\.name\s*=/.test(code) && !nameLine) nameLine = ln;
      if (/\bconfig\.save_directory\s*=/.test(code)) hasSaveDir = true;

      if (/\bbuild\.[A-Za-z_]/.test(code)) { if (!hasBuild) { hasBuild = true; buildLine = ln; } }
      if (/build\.classify\(\s*["'][^"']*\.rpy["']\s*,\s*None\s*\)/.test(code)) excludesRpy = true;

      var im = code.match(/\bim\.(Scale|FactorScale|MatrixColor|Sepia|Grayscale|Composite|Crop|Flip|Tile|Alpha)\b/);
      if (im) add('deprecated_im_api', ln, 'im.' + im[1]);

      var def = code.match(/^\s*define\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      if (def && !defines[def[1]]) defines[def[1]] = ln;

      var pd = code.match(/^\s*default\s+persistent\.([A-Za-z_][A-Za-z0-9_]*)/);
      if (pd) persistentDefault[pd[1]] = true;

      var pw = code.match(/\bpersistent\.([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/);
      if (pw) { if (inInit) persistentDefault[pw[1]] = true; }
      else {
        var pr = code.match(/\bpersistent\.([A-Za-z_][A-Za-z0-9_]*)/);
        if (pr && !/^\s*default\b/.test(code) && !persistentRead[pr[1]]) persistentRead[pr[1]] = ln;
      }

      strings(code).forEach(function (s) {
        var sq = balance(s, '[', ']');
        if (sq.depth !== 0 || sq.spaced) add('unescaped_substitution', ln, JSON.stringify(s.slice(0, 48)));
        var tag = openTag(s);
        if (tag) add('unbalanced_text_tag', ln, '{' + tag + '} in ' + JSON.stringify(s.slice(0, 40)));
        if (ASSET_EXT.test(s) && (/\\/.test(s) || /^[A-Za-z]:/.test(s) || s.charAt(0) === '/' || s.indexOf('..') === 0)) {
          add('nonportable_asset_path', ln, JSON.stringify(s.slice(0, 48)));
        }
      });
    });

    // define used for something that is reassigned later
    Object.keys(defines).forEach(function (name) {
      var re = new RegExp('^\\s*(?:\\$\\s*)?' + name + '\\s*(?:=(?!=)|\\+=|-=|\\*=|/=)');
      for (var i = 0; i < lines.length; i++) {
        if (i + 1 === defines[name]) continue;
        if (re.test(lines[i].replace(/#.*$/, ''))) { add('define_not_default', defines[name], name); return; }
      }
    });

    Object.keys(persistentRead).forEach(function (name) {
      if (!persistentDefault[name]) add('persistent_no_default', persistentRead[name], 'persistent.' + name);
    });

    if (nameLine && !hasSaveDir) add('missing_save_directory', nameLine);
    if (hasBuild && !excludesRpy) add('source_rpy_in_build', buildLine);

    findings.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
    findings = findings.filter(function (f) {
      var k = f.check + '@' + f.line + '@' + f.msg;
      if (seen[k]) return false; seen[k] = true; return true;
    });

    return { findings: findings, rule_count: RULES.length, today: opts.today || '' };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RENPYENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
