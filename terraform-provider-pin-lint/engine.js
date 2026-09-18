/* Terraform Provider Pin Lint — engine.
 * Reads one .tf file as text and reports every place where a clean
 * `terraform init` is still free to choose a different artifact than last time.
 * Same file runs in Node (extension) and in the browser (free web page). */
(function () {
  'use strict';

  var DOC = (typeof module !== 'undefined') ? require('./rules.json') : window.TFPIN_RULES;
  var RULES = DOC.rules || DOC;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  var BRANCHY = ['main', 'master', 'develop', 'dev', 'trunk', 'HEAD'];

  function stripComment(line) {
    var out = '', inStr = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"' && line[i - 1] !== '\\') { inStr = !inStr; out += c; continue; }
      if (!inStr && (c === '#' || (c === '/' && line[i + 1] === '/'))) break;
      out += c;
    }
    return out;
  }

  function count(s, ch) { var n = 0; for (var i = 0; i < s.length; i++) if (s[i] === ch) n++; return n; }

  function unquote(v) {
    v = String(v == null ? '' : v).trim().replace(/,$/, '').trim();
    var m = /^"([\s\S]*)"$/.exec(v);
    return m ? m[1] : v;
  }

  /* --- version constraint shape --------------------------------------- */
  function isWildcard(v) {
    if (!v) return false;
    if (/(^|[\s,])\*\s*$/.test(v) || v.trim() === '*') return true;
    return /^>=\s*0(\.0)*(\.0)*\s*$/.test(v.trim());
  }
  function hasUpperBound(v) {
    // ~> and = and a bare "1.2.3" and any "< x" all cap the range; ">=" alone does not.
    return /(~>|<|(^|[\s,])=)/.test(v) || /^\s*v?\d/.test(v);
  }
  function tracksZeroMajor(v) {
    var m = /(?:~>|>=|=|<=|<|>)?\s*v?(\d+)\./.exec(v);
    return !!m && m[1] === '0';
  }

  /* --- module source shape -------------------------------------------- */
  function sourceKind(src) {
    if (!src) return 'none';
    if (/^\.{1,2}\//.test(src)) return 'local';
    if (/^git(::|@)/.test(src) || /^(github\.com|bitbucket\.org)\//.test(src) || /\.git(\?|$)/.test(src)) return 'git';
    if (/^https?:\/\//.test(src)) return 'http';
    if (/^(s3|gcs|hg)::/.test(src)) return 'blob';
    var parts = src.split('/');
    if (parts.length === 3 && parts[0].indexOf('.') === -1) return 'registry';
    if (parts.length === 4 && parts[0].indexOf('.') !== -1) return 'registry';
    return 'other';
  }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var findings = [];
    var stack = [];          // open blocks, innermost last
    var depth = 0;
    var declared = {};       // provider name -> true (seen in required_providers)
    var sawRequiredProviders = false;
    var providerBlocks = []; // {name, line}
    var terraformBlocks = [];

    function add(id, line, vars) {
      var r = BY_ID[id];
      if (!r) return;
      var msg = r.msg.replace(/\{(\w+)\}/g, function (_, k) {
        return (vars && vars[k] != null) ? String(vars[k]) : '';
      });
      findings.push({ check: id, sev: r.sev, msg: msg, line: line, fix: r.fix, title: r.title });
    }

    function inside(kind) {
      for (var i = stack.length - 1; i >= 0; i--) if (stack[i].kind === kind) return stack[i];
      return null;
    }

    /* --- what a finished block means ---------------------------------- */
    function closeFrame(f) {
      if (f.kind === 'rp_entry') {
        declared[f.name] = true;
        var src = f.attrs.source, ver = f.attrs.version;
        if (!src) add('missing_source', f.line, { name: f.name });
        if (!ver) {
          add('missing_version', f.line, { name: f.name });
        } else if (isWildcard(ver)) {
          add('wildcard_version', f.line, { name: f.name, value: ver });
        } else {
          if (!hasUpperBound(ver)) add('unbounded_version', f.line, { name: f.name, value: ver });
          else if (tracksZeroMajor(ver)) add('zerover_pin', f.line, { name: f.name, value: ver });
        }
      } else if (f.kind === 'module') {
        var s = f.attrs.source || '';
        var kind = sourceKind(s);
        if (kind === 'registry' && !f.attrs.version) {
          add('module_registry_no_version', f.line, { name: f.name, value: s });
        }
        if (kind === 'git') {
          var ref = /[?&]ref=([^&"]+)/.exec(s);
          if (!ref) add('module_git_no_ref', f.line, { name: f.name });
          else if (BRANCHY.indexOf(ref[1]) !== -1) add('module_ref_branch', f.line, { name: f.name, value: ref[1] });
        }
        if (/^http:\/\//.test(s)) add('insecure_module_source', f.line, { name: f.name });
      } else if (f.kind === 'backend' && f.name === 's3') {
        if (f.attrs.dynamodb_table) add('s3_dynamodb_lock', f.line, {});
      } else if (f.kind === 'terraform') {
        var rv = f.attrs.required_version;
        if (!rv) add('no_required_version', f.line, {});
        else if (!isWildcard(rv) && !hasUpperBound(rv)) add('unbounded_required_version', f.line, { value: rv });
      }
    }

    var BLOCK = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*((?:"[^"]*"\s*)*)\{\s*$/;
    var ENTRY = /^\s*"?([A-Za-z_][A-Za-z0-9_.-]*)"?\s*=\s*\{\s*$/;
    var INLINE = /^\s*"?([A-Za-z_][A-Za-z0-9_.-]*)"?\s*=\s*\{(.*)\}\s*,?\s*$/;
    var ATTR = /^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(.+?)\s*,?\s*$/;

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i], no = i + 1;
      var s = stripComment(raw);
      if (!s.trim()) { depth += count(s, '{') - count(s, '}'); continue; }

      var opens = count(s, '{'), closes = count(s, '}');
      var handled = false;

      var mInline = INLINE.exec(s);
      if (mInline && inside('required_providers') && stack.length && stack[stack.length - 1].kind === 'required_providers') {
        var frame = { kind: 'rp_entry', name: mInline[1], line: no, attrs: {} };
        mInline[2].split(',').forEach(function (piece) {
          var a = ATTR.exec(piece);
          if (a) frame.attrs[a[1]] = unquote(a[2]);
        });
        closeFrame(frame);
        handled = true;
      }

      if (!handled) {
        var mB = BLOCK.exec(s);
        var mE = ENTRY.exec(s);
        var top = stack.length ? stack[stack.length - 1] : null;
        if (mB) {
          var labels = (mB[2].match(/"[^"]*"/g) || []).map(function (x) { return x.slice(1, -1); });
          var kind = mB[1];
          if (kind === 'required_providers') sawRequiredProviders = true;
          if (kind === 'provider' && labels.length) providerBlocks.push({ name: labels[0], line: no });
          if (kind === 'terraform') terraformBlocks.push(no);
          stack.push({ kind: kind, name: labels[0] || '', line: no, attrs: {} });
          handled = true;
        } else if (mE && top && top.kind === 'required_providers') {
          stack.push({ kind: 'rp_entry', name: mE[1], line: no, attrs: {} });
          handled = true;
        } else if (top) {
          var mA = ATTR.exec(s);
          if (mA && opens === closes) top.attrs[mA[1]] = unquote(mA[2]);
        }
      }

      depth += opens - closes;
      while (stack.length > depth) closeFrame(stack.pop());
    }
    while (stack.length) closeFrame(stack.pop());

    // provider blocks: declared, or implied?
    providerBlocks.forEach(function (p) {
      if (declared[p.name]) return;
      if (!sawRequiredProviders) add('no_required_providers', p.line, { name: p.name });
      else add('provider_not_declared', p.line, { name: p.name });
    });

    findings.sort(function (a, b) { return a.line - b.line || a.check.localeCompare(b.check); });
    return {
      findings: findings,
      checkedOn: opts.today || '',
      rulesRun: RULES.length
    };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = API;
  if (typeof window !== 'undefined') window.TFPINENGINE = API;
})();
