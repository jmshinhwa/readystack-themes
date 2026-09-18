/* Terraform State Secret Leak Lint — engine
 * Same file runs in Node (VS Code extension) and in the browser (free web tool).
 */
(function (root, factory) {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.TFSTATE_RULES;
  var api = factory(RULES);
  if (typeof module !== 'undefined') module.exports = api;
  root.TFSTATE_ENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis, function (RULES) {
  'use strict';

  var byCheck = {};
  RULES.forEach(function (r) { byCheck[r.check] = r; });

  function codeOnly(line) {
    return String(line)
      .replace(/"(\\.|[^"\\])*"/g, '""')
      .replace(/#.*$/, '')
      .replace(/\/\/.*$/, '');
  }
  function braces(line) {
    var c = codeOnly(line), o = 0, k = 0, i;
    for (i = 0; i < c.length; i++) { if (c[i] === '{') o++; else if (c[i] === '}') k++; }
    return o - k;
  }
  function labels(seg) {
    return (String(seg).match(/"[^"]*"/g) || []).map(function (s) { return s.slice(1, -1); });
  }
  function fill(tpl, vals) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(vals, k) ? vals[k] : m;
    });
  }

  /* Split a Terraform file into top-level blocks, keeping line numbers. */
  function parseBlocks(lines) {
    var out = [], cur = null, depth = 0, i;
    var head = /^\s*(resource|data|output|variable|locals|module|provider|terraform)\b([^{]*)\{/;
    for (i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (!cur) {
        if (/^\s*(#|\/\/)/.test(raw)) continue;
        var m = raw.match(head);
        if (!m) continue;
        cur = { kind: m[1], labels: labels(m[2]), start: i, body: [] };
        depth = braces(raw);
        if (depth <= 0) { cur.end = i; out.push(cur); cur = null; }
      } else {
        cur.body.push({ i: i, raw: raw });
        depth += braces(raw);
        if (depth <= 0) { cur.end = i; out.push(cur); cur = null; }
      }
    }
    if (cur) { cur.end = lines.length - 1; out.push(cur); }
    return out;
  }

  /* `name = value` assignment on one line, ignoring `==` and comments. */
  function assignment(raw) {
    var m = String(raw).match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*=(?!=)\s*(.*)$/);
    if (!m) return null;
    return { name: m[1], value: m[2].replace(/\s+$/, '') };
  }

  function blockName(b) {
    if (b.kind === 'resource' || b.kind === 'data') {
      return (b.kind === 'data' ? 'data.' : '') + (b.labels[0] || '?') + '.' + (b.labels[1] || '?');
    }
    return b.kind + (b.labels[0] ? ' "' + b.labels[0] + '"' : '');
  }

  function hasAttr(body, names) {
    for (var i = 0; i < body.length; i++) {
      var a = assignment(body[i].raw);
      if (a && names.indexOf(a.name) !== -1) return body[i];
      // nested sub-block, e.g. `encryption { ... }`
      var h = codeOnly(body[i].raw).match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*\{/);
      if (h && names.indexOf(h[1]) !== -1) return body[i];
    }
    return null;
  }

  function truthy(v) { return /^\s*true\b/.test(String(v)); }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var blocks = parseBlocks(lines);
    var findings = [];
    var seen = {};

    function add(rule, line, vals) {
      var key = rule.check + '@' + line;
      if (seen[key]) return;
      seen[key] = 1;
      findings.push({
        check: rule.check,
        sev: rule.sev,
        msg: fill(rule.msg, vals || {}),
        line: line
      });
    }

    var rAttr = byCheck.state_plaintext_attr;
    var rRand = byCheck.random_password_state;
    var rTls = byCheck.tls_private_key_state;
    var rData = byCheck.secret_data_source_state;
    var rS3 = byCheck.backend_s3_unencrypted;
    var rEnc = byCheck.state_encryption_block_missing;
    var rLocal = byCheck.backend_local_state;
    var rOut = byCheck.output_missing_sensitive;
    var rVar = byCheck.variable_missing_sensitive;
    var rLit = byCheck.hardcoded_secret_literal;

    blocks.forEach(function (b) {
      var type = b.labels[0] || '';
      var label = b.labels[1] || b.labels[0] || '';

      /* 1 — attributes whose value Terraform writes back into state */
      if (b.kind === 'resource' || b.kind === 'provider' || b.kind === 'module') {
        b.body.forEach(function (ln) {
          var a = assignment(ln.raw);
          if (!a) return;
          if (rAttr.attrs.indexOf(a.name) === -1) return;
          if (/^\s*(null|"")\s*$/.test(a.value)) return;
          add(rAttr, ln.i + 1, { name: a.name, block: blockName(b) });
        });
      }

      /* 2, 3 — providers that mint a secret and keep it in state */
      if (b.kind === 'resource' && rRand.types.indexOf(type) !== -1) {
        add(rRand, b.start + 1, { label: label, type: type });
      }
      if (b.kind === 'resource' && rTls.types.indexOf(type) !== -1) {
        add(rTls, b.start + 1, { label: label, type: type });
      }

      /* 4 — secret data sources */
      if (b.kind === 'data' && rData.types.indexOf(type) !== -1) {
        add(rData, b.start + 1, { label: label, type: type });
      }

      /* 5, 6, 7 — the terraform block: backend + state encryption */
      if (b.kind === 'terraform') {
        var sawBackend = false, inner = null, innerDepth = 0;
        b.body.forEach(function (ln) {
          var bm = codeOnly(ln.raw).match(/^\s*backend\s*$/) || String(ln.raw).match(/backend\s+"([^"]+)"\s*\{/);
          if (bm && bm[1]) {
            sawBackend = true;
            inner = { type: bm[1], start: ln.i, body: [] };
            innerDepth = braces(ln.raw);
            if (innerDepth <= 0) { finishBackend(inner); inner = null; }
            return;
          }
          if (inner) {
            innerDepth += braces(ln.raw);
            inner.body.push(ln);
            if (innerDepth <= 0) { finishBackend(inner); inner = null; }
          }
        });
        if (inner) finishBackend(inner);
        if (!hasAttr(b.body, rEnc.requires_any)) {
          add(rEnc, b.start + 1, { today: opts.today || '' });
        }
        if (!sawBackend) {
          add(rLocal, b.start + 1, { type: 'local' });
        }
        function finishBackend(bk) {
          if (rLocal.types.indexOf(bk.type) !== -1) {
            add(rLocal, bk.start + 1, { type: bk.type });
            return;
          }
          if (rS3.types.indexOf(bk.type) === -1) return;
          var hit = null;
          bk.body.forEach(function (ln) {
            var a = assignment(ln.raw);
            if (!a) return;
            if (rS3.requires_any.indexOf(a.name) === -1) return;
            if (a.name === 'encrypt' && !truthy(a.value)) return;
            hit = ln;
          });
          if (!hit) add(rS3, bk.start + 1, { type: bk.type });
        }
      }

      /* 8, 9 — outputs and variables that carry a secret */
      if (b.kind === 'output' || b.kind === 'variable') {
        var rule = b.kind === 'output' ? rOut : rVar;
        var sensitive = false, valueLine = b.start;
        b.body.forEach(function (ln) {
          var a = assignment(ln.raw);
          if (a && a.name === 'sensitive' && truthy(a.value)) sensitive = true;
        });
        var hay = (b.labels[0] || '') + ' ';
        if (b.kind === 'output') {
          b.body.forEach(function (ln) {
            var a = assignment(ln.raw);
            if (a && a.name === 'value') { hay += a.value + ' '; valueLine = ln.i; }
          });
        }
        hay = hay.toLowerCase();
        var smells = rule.hints.some(function (h) { return hay.indexOf(h) !== -1; });
        if (smells && !sensitive) {
          add(rule, (b.kind === 'output' ? valueLine : b.start) + 1, { label: b.labels[0] || '' });
        }
      }
    });

    /* 10 — credential literals, scanned over the whole file */
    lines.forEach(function (raw, idx) {
      if (/^\s*(#|\/\/)/.test(raw)) return;
      for (var i = 0; i < rLit.patterns.length; i++) {
        var p = rLit.patterns[i];
        if (new RegExp(p.re).test(raw)) {
          add(rLit, idx + 1, { kind: p.kind });
          break;
        }
      }
    });

    findings.sort(function (a, b) { return a.line - b.line || a.check.localeCompare(b.check); });
    return { findings: findings };
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
});
