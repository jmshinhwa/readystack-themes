// CSAF Advisory Check - conformance engine.
// The 32 mandatory tests of CSAF 2.0 section 6.1 plus the 11 profile tests of 6.1.27 (43 checks).
// Spec: OASIS Common Security Advisory Framework Version 2.0, OASIS Standard, 18 November 2022.
// Pure JavaScript, no network, no dependencies. Loaded unchanged by extension.js and by the web page.
(function (root, factory) {
  var cwe = (typeof module === 'object' && module.exports) ? require('./cwe.js') : (root.CSAF_CWE || {});
  var m = factory(cwe);
  if (typeof module === 'object' && module.exports) { module.exports = m; } else { root.CSAF = m; }
}(typeof self !== 'undefined' ? self : this, function (CWE) {
  'use strict';

  // ── JSON reader that remembers the line of every value ──────────────────────
  // Findings must land on a line in the editor, so we cannot use JSON.parse alone.
  function parseWithLines(text) {
    var i = 0, line = 1, lines = Object.create(null), n = text.length;
    function fail(msg) { var e = new Error(msg + ' (line ' + line + ')'); e.line = line; throw e; }
    function ws() {
      while (i < n) {
        var c = text.charAt(i);
        if (c === '\n') { line++; i++; } else if (c === ' ' || c === '\t' || c === '\r') { i++; } else { break; }
      }
    }
    function str() {
      if (text.charAt(i) !== '"') fail('expected a string');
      i++; var buf = '';
      while (i < n) {
        var c = text.charAt(i);
        if (c === '"') { i++; return buf; }
        if (c === '\\') {
          var e = text.charAt(i + 1); i += 2;
          if (e === 'n') buf += '\n'; else if (e === 't') buf += '\t'; else if (e === 'r') buf += '\r';
          else if (e === 'b') buf += '\b'; else if (e === 'f') buf += '\f';
          else if (e === 'u') { buf += String.fromCharCode(parseInt(text.substr(i, 4), 16) || 0); i += 4; }
          else buf += e;
          continue;
        }
        if (c === '\n') fail('a raw newline inside a string');
        buf += c; i++;
      }
      fail('a string never closes');
    }
    function num() {
      var s = i;
      if (text.charAt(i) === '-') i++;
      while (i < n && /[0-9]/.test(text.charAt(i))) i++;
      if (text.charAt(i) === '.') { i++; while (i < n && /[0-9]/.test(text.charAt(i))) i++; }
      if (text.charAt(i) === 'e' || text.charAt(i) === 'E') {
        i++; if (text.charAt(i) === '+' || text.charAt(i) === '-') i++;
        while (i < n && /[0-9]/.test(text.charAt(i))) i++;
      }
      var v = Number(text.slice(s, i));
      if (isNaN(v)) fail('a number that is not a number');
      return v;
    }
    function value(ptr) {
      ws();
      lines[ptr] = line;
      var c = text.charAt(i);
      if (c === '{') return obj(ptr);
      if (c === '[') return arr(ptr);
      if (c === '"') return str();
      if (c === '-' || (c >= '0' && c <= '9')) return num();
      if (text.substr(i, 4) === 'true') { i += 4; return true; }
      if (text.substr(i, 5) === 'false') { i += 5; return false; }
      if (text.substr(i, 4) === 'null') { i += 4; return null; }
      fail('unexpected character ' + JSON.stringify(c || '<end of file>'));
    }
    function obj(ptr) {
      i++; var o = {}; ws();
      if (text.charAt(i) === '}') { i++; return o; }
      for (;;) {
        ws();
        var k = str();
        ws();
        if (text.charAt(i) !== ':') fail('expected ":" after a key');
        i++;
        o[k] = value(ptr + '/' + String(k).replace(/~/g, '~0').replace(/\//g, '~1'));
        ws();
        var c = text.charAt(i);
        if (c === ',') { i++; continue; }
        if (c === '}') { i++; return o; }
        fail('expected "," or "}"');
      }
    }
    function arr(ptr) {
      i++; var a = []; ws();
      if (text.charAt(i) === ']') { i++; return a; }
      for (;;) {
        a.push(value(ptr + '/' + a.length));
        ws();
        var c = text.charAt(i);
        if (c === ',') { i++; continue; }
        if (c === ']') { i++; return a; }
        fail('expected "," or "]"');
      }
    }
    var v = value('');
    ws();
    if (i < n) fail('trailing content after the document');
    return { value: v, lines: lines };
  }

  function lineOf(lines, ptr) {
    var p = String(ptr || '');
    for (;;) {
      if (lines[p] !== undefined) return lines[p];
      var k = p.lastIndexOf('/');
      if (k < 0) return 1;
      p = p.slice(0, k);
    }
  }

  // ── small helpers ───────────────────────────────────────────────────────────
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function arrOf(x) { return Array.isArray(x) ? x : []; }
  function isStr(x) { return typeof x === 'string'; }

  var INT_RE = /^(0|[1-9][0-9]*)$/;
  var SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  function ver(v) {
    // returns {kind:'int'|'semver'|'bad', major, minor, patch, pre, build}
    var s = String(v === undefined || v === null ? '' : v);
    if (INT_RE.test(s)) return { kind: 'int', major: Number(s), minor: 0, patch: 0, pre: '', build: '', raw: s };
    var m = SEMVER_RE.exec(s);
    if (m) {
      return { kind: 'semver', major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]),
        pre: m[4] || '', build: m[5] || '', raw: s };
    }
    return { kind: 'bad', major: 0, minor: 0, patch: 0, pre: '', build: '', raw: s };
  }
  function preParts(p) { return p ? p.split('.') : []; }
  function cmpPre(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;          // no pre-release outranks a pre-release
    if (!b) return -1;
    var A = preParts(a), B = preParts(b), i;
    for (i = 0; i < Math.max(A.length, B.length); i++) {
      var x = A[i], y = B[i];
      if (x === undefined) return -1;
      if (y === undefined) return 1;
      var xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
      if (xn && yn) { if (Number(x) !== Number(y)) return Number(x) < Number(y) ? -1 : 1; continue; }
      if (xn !== yn) return xn ? -1 : 1;
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }
  function cmpVer(a, b) {
    var x = ver(a), y = ver(b);
    if (x.major !== y.major) return x.major < y.major ? -1 : 1;
    if (x.minor !== y.minor) return x.minor < y.minor ? -1 : 1;
    if (x.patch !== y.patch) return x.patch < y.patch ? -1 : 1;
    return cmpPre(x.pre, y.pre);
  }
  function sameVersion(a, b) {   // build metadata is ignored, per 6.1.16
    var x = ver(a), y = ver(b);
    if (x.kind === 'bad' || y.kind === 'bad') return String(a) === String(b);
    return x.major === y.major && x.minor === y.minor && x.patch === y.patch && x.pre === y.pre;
  }
  function dateVal(d) { var t = Date.parse(String(d || '')); return isNaN(t) ? null : t; }

  // ── CVSS v3.0 / v3.1 ────────────────────────────────────────────────────────
  var V3W = {
    AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
    AC: { L: 0.77, H: 0.44 },
    PR_U: { N: 0.85, L: 0.62, H: 0.27 },
    PR_C: { N: 0.85, L: 0.68, H: 0.5 },
    UI: { N: 0.85, R: 0.62 },
    CIA: { H: 0.56, L: 0.22, N: 0 },
    E: { X: 1, U: 0.91, P: 0.94, F: 0.97, H: 1 },
    RL: { X: 1, O: 0.95, T: 0.96, W: 0.97, U: 1 },
    RC: { X: 1, U: 0.92, R: 0.96, C: 1 },
    CIAR: { X: 1, L: 0.5, M: 1, H: 1.5 }
  };
  var V3_ORDER = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];
  var V3_ENUM = {
    AV: 'NALP', AC: 'LH', PR: 'NLH', UI: 'NR', S: 'UC', C: 'HLN', I: 'HLN', A: 'HLN',
    E: 'XUPFH', RL: 'XOTWU', RC: 'XURC',
    CR: 'XLMH', IR: 'XLMH', AR: 'XLMH',
    MAV: 'XNALP', MAC: 'XLH', MPR: 'XNLH', MUI: 'XNR', MS: 'XUC', MC: 'XHLN', MI: 'XHLN', MA: 'XHLN'
  };
  function parseVector3(vs) {
    var out = { ok: true, m: {}, bad: [] };
    var parts = String(vs || '').split('/');
    if (!parts.length || !/^CVSS:3\.[01]$/.test(parts[0])) { out.ok = false; out.bad.push('prefix'); return out; }
    out.version = parts[0].slice(5);
    var seen = {};
    for (var i = 1; i < parts.length; i++) {
      var kv = parts[i].split(':');
      if (kv.length !== 2 || !V3_ENUM[kv[0]] || V3_ENUM[kv[0]].indexOf(kv[1]) < 0 || kv[1].length !== 1) {
        out.ok = false; out.bad.push(parts[i]); continue;
      }
      if (seen[kv[0]]) { out.ok = false; out.bad.push(kv[0] + ' twice'); }
      seen[kv[0]] = true;
      out.m[kv[0]] = kv[1];
    }
    for (var k = 0; k < V3_ORDER.length; k++) {
      if (out.m[V3_ORDER[k]] === undefined) { out.ok = false; out.bad.push('missing ' + V3_ORDER[k]); }
    }
    return out;
  }
  function roundUp3(x) {                       // CVSS 3.1 Appendix A Roundup
    var i = Math.round(x * 100000);
    return (i % 10000 === 0) ? i / 100000 : (Math.floor(i / 10000) + 1) / 10;
  }
  function round1(x) { return Math.round(x * 10) / 10; }
  function sev3(score) {
    if (score <= 0) return 'NONE';
    if (score < 4) return 'LOW';
    if (score < 7) return 'MEDIUM';
    if (score < 9) return 'HIGH';
    return 'CRITICAL';
  }
  function score3(m, version) {
    var up = version === '3.0' ? function (x) { return Math.ceil(x * 10) / 10; } : roundUp3;
    var scopeC = m.S === 'C';
    var pr = (scopeC ? V3W.PR_C : V3W.PR_U)[m.PR];
    var iss = 1 - ((1 - V3W.CIA[m.C]) * (1 - V3W.CIA[m.I]) * (1 - V3W.CIA[m.A]));
    var impact = scopeC ? (7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)) : (6.42 * iss);
    var expl = 8.22 * V3W.AV[m.AV] * V3W.AC[m.AC] * pr * V3W.UI[m.UI];
    var base = impact <= 0 ? 0 : up(Math.min((scopeC ? 1.08 : 1) * (impact + expl), 10));

    var e = V3W.E[m.E || 'X'], rl = V3W.RL[m.RL || 'X'], rc = V3W.RC[m.RC || 'X'];
    var temporal = up(base * e * rl * rc);

    var g = function (mod, plain) { var v = m[mod]; return (v === undefined || v === 'X') ? m[plain] : v; };
    var mav = g('MAV', 'AV'), mac = g('MAC', 'AC'), mpr = g('MPR', 'PR'), mui = g('MUI', 'UI');
    var ms = g('MS', 'S'), mc = g('MC', 'C'), mi = g('MI', 'I'), ma = g('MA', 'A');
    var mScopeC = ms === 'C';
    var cr = V3W.CIAR[m.CR || 'X'], ir = V3W.CIAR[m.IR || 'X'], ar = V3W.CIAR[m.AR || 'X'];
    var miss = Math.min(1 - ((1 - V3W.CIA[mc] * cr) * (1 - V3W.CIA[mi] * ir) * (1 - V3W.CIA[ma] * ar)), 0.915);
    var mImpact = mScopeC
      ? (version === '3.0'
          ? (7.52 * (miss - 0.029) - 3.25 * Math.pow(miss - 0.02, 15))
          : (7.52 * (miss - 0.029) - 3.25 * Math.pow(miss * 0.9731 - 0.02, 13)))
      : (6.42 * miss);
    var mExpl = 8.22 * V3W.AV[mav] * V3W.AC[mac] * (mScopeC ? V3W.PR_C : V3W.PR_U)[mpr] * V3W.UI[mui];
    var env = mImpact <= 0 ? 0
      : up(up(Math.min((mScopeC ? 1.08 : 1) * (mImpact + mExpl), 10)) * e * rl * rc);
    return { base: base, temporal: temporal, environmental: env };
  }

  // ── CVSS v2 ─────────────────────────────────────────────────────────────────
  var V2W = {
    AV: { L: 0.395, A: 0.646, N: 1.0 }, AC: { H: 0.35, M: 0.61, L: 0.71 },
    Au: { M: 0.45, S: 0.56, N: 0.704 }, CIA: { N: 0.0, P: 0.275, C: 0.660 },
    E: { U: 0.85, POC: 0.9, F: 0.95, H: 1.0, ND: 1.0 },
    RL: { OF: 0.87, TF: 0.90, W: 0.95, U: 1.0, ND: 1.0 },
    RC: { UC: 0.9, UR: 0.95, C: 1.0, ND: 1.0 },
    CDP: { N: 0, L: 0.1, LM: 0.3, MH: 0.4, H: 0.5, ND: 0 },
    TD: { N: 0, L: 0.25, M: 0.75, H: 1.0, ND: 1.0 },
    CIAR: { L: 0.5, M: 1.0, H: 1.51, ND: 1.0 }
  };
  var V2_ENUM = {
    AV: ['L', 'A', 'N'], AC: ['H', 'M', 'L'], Au: ['M', 'S', 'N'],
    C: ['N', 'P', 'C'], I: ['N', 'P', 'C'], A: ['N', 'P', 'C'],
    E: ['U', 'POC', 'F', 'H', 'ND'], RL: ['OF', 'TF', 'W', 'U', 'ND'], RC: ['UC', 'UR', 'C', 'ND'],
    CDP: ['N', 'L', 'LM', 'MH', 'H', 'ND'], TD: ['N', 'L', 'M', 'H', 'ND'],
    CR: ['L', 'M', 'H', 'ND'], IR: ['L', 'M', 'H', 'ND'], AR: ['L', 'M', 'H', 'ND']
  };
  function parseVector2(vs) {
    var out = { ok: true, m: {}, bad: [] }, seen = {};
    var parts = String(vs || '').split('/');
    if (parts.length < 6) { out.ok = false; out.bad.push('too few metrics'); }
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var kv = parts[i].split(':');
      if (kv.length !== 2 || !V2_ENUM[kv[0]] || V2_ENUM[kv[0]].indexOf(kv[1]) < 0) {
        out.ok = false; out.bad.push(parts[i]); continue;
      }
      if (seen[kv[0]]) { out.ok = false; out.bad.push(kv[0] + ' twice'); }
      seen[kv[0]] = true;
      out.m[kv[0]] = kv[1];
    }
    ['AV', 'AC', 'Au', 'C', 'I', 'A'].forEach(function (k) {
      if (out.m[k] === undefined) { out.ok = false; out.bad.push('missing ' + k); }
    });
    return out;
  }
  function score2(m) {
    var impact = 10.41 * (1 - (1 - V2W.CIA[m.C]) * (1 - V2W.CIA[m.I]) * (1 - V2W.CIA[m.A]));
    var expl = 20 * V2W.AV[m.AV] * V2W.AC[m.AC] * V2W.Au[m.Au];
    var f = impact === 0 ? 0 : 1.176;
    var base = round1(((0.6 * impact) + (0.4 * expl) - 1.5) * f);
    var e = V2W.E[m.E || 'ND'], rl = V2W.RL[m.RL || 'ND'], rc = V2W.RC[m.RC || 'ND'];
    var temporal = round1(base * e * rl * rc);
    var cr = V2W.CIAR[m.CR || 'ND'], ir = V2W.CIAR[m.IR || 'ND'], ar = V2W.CIAR[m.AR || 'ND'];
    var adjImpact = Math.min(10, 10.41 * (1 - (1 - V2W.CIA[m.C] * cr) * (1 - V2W.CIA[m.I] * ir) * (1 - V2W.CIA[m.A] * ar)));
    var fA = adjImpact === 0 ? 0 : 1.176;
    var adjBase = round1(((0.6 * adjImpact) + (0.4 * expl) - 1.5) * fA);
    var adjTemporal = round1(adjBase * e * rl * rc);
    var env = round1((adjTemporal + (10 - adjTemporal) * V2W.CDP[m.CDP || 'ND']) * V2W.TD[m.TD || 'ND']);
    return { base: base, temporal: temporal, environmental: env };
  }

  // ── language: language_t syntax (CSAF 2.0 schema pattern) + a real primary subtag ──
  var LANG_RE = /^(([A-Za-z]{2,3}(-[A-Za-z]{3}(-[A-Za-z]{3}){0,2})?|[A-Za-z]{4,8})(-[A-Za-z]{4})?(-([A-Za-z]{2}|[0-9]{3}))?(-([A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-[A-WY-Za-wy-z0-9](-[A-Za-z0-9]{2,8})+)*(-[Xx](-[A-Za-z0-9]{1,8})+)?|[Xx](-[A-Za-z0-9]{1,8})+|[Ii]-[Dd][Ee][Ff][Aa][Uu][Ll][Tt]|[Ii]-[Mm][Ii][Nn][Gg][Oo])$/;
  var ISO639_1 = ('aa ab ae af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu').split(' ');
  function langBad(v) {
    var s = String(v || '');
    if (!LANG_RE.test(s)) return 'not a valid language tag';
    var primary = s.split('-')[0].toLowerCase();
    if (primary.length === 2 && ISO639_1.indexOf(primary) < 0) return 'the primary subtag "' + primary + '" is not an ISO 639-1 language';
    return null;
  }
  var PURL_RE = /^pkg:[A-Za-z][A-Za-z0-9.+-]*\/[^@#?\s]+(@[^#?\s]+)?(\?[^#\s]*)?(#\S*)?$/;

  // ── document walkers ────────────────────────────────────────────────────────
  function eachFPN(doc, cb) {                       // every full_product_name-shaped object
    var pt = isObj(doc.product_tree) ? doc.product_tree : null;
    if (!pt) return;
    arrOf(pt.full_product_names).forEach(function (f, ix) {
      if (isObj(f)) cb(f, '/product_tree/full_product_names/' + ix);
    });
    arrOf(pt.relationships).forEach(function (r, ix) {
      if (isObj(r) && isObj(r.full_product_name)) cb(r.full_product_name, '/product_tree/relationships/' + ix + '/full_product_name');
    });
    eachBranch(doc, function (b, ptr) {
      if (isObj(b.product)) cb(b.product, ptr + '/product');
    });
  }
  function eachBranch(doc, cb) {                    // every branch, at any depth
    var pt = isObj(doc.product_tree) ? doc.product_tree : null;
    if (!pt) return;
    (function walk(list, base) {
      arrOf(list).forEach(function (b, ix) {
        if (!isObj(b)) return;
        var p = base + '/' + ix;
        cb(b, p);
        if (Array.isArray(b.branches)) walk(b.branches, p + '/branches');
      });
    }(pt.branches, '/product_tree/branches'));
  }
  function definedProductIds(doc) {
    var map = Object.create(null);
    eachFPN(doc, function (f, ptr) {
      if (!isStr(f.product_id)) return;
      (map[f.product_id] = map[f.product_id] || []).push(ptr + '/product_id');
    });
    return map;
  }
  var STATUS_KEYS = ['first_affected', 'first_fixed', 'fixed', 'known_affected', 'known_not_affected',
    'last_affected', 'recommended', 'under_investigation'];
  function productRefs(doc) {                       // every place a product_id is *used*
    var out = [];
    var pt = isObj(doc.product_tree) ? doc.product_tree : {};
    arrOf(pt.product_groups).forEach(function (g, gi) {
      if (!isObj(g)) return;
      arrOf(g.product_ids).forEach(function (id, ii) {
        out.push({ id: id, ptr: '/product_tree/product_groups/' + gi + '/product_ids/' + ii });
      });
    });
    arrOf(pt.relationships).forEach(function (r, ri) {
      if (!isObj(r)) return;
      if (isStr(r.product_reference)) out.push({ id: r.product_reference, ptr: '/product_tree/relationships/' + ri + '/product_reference' });
      if (isStr(r.relates_to_product_reference)) out.push({ id: r.relates_to_product_reference, ptr: '/product_tree/relationships/' + ri + '/relates_to_product_reference' });
    });
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      var base = '/vulnerabilities/' + vi;
      if (isObj(v.product_status)) {
        STATUS_KEYS.forEach(function (k) {
          arrOf(v.product_status[k]).forEach(function (id, ii) {
            out.push({ id: id, ptr: base + '/product_status/' + k + '/' + ii });
          });
        });
      }
      ['remediations', 'threats'].forEach(function (sec) {
        arrOf(v[sec]).forEach(function (it, ii) {
          if (!isObj(it)) return;
          arrOf(it.product_ids).forEach(function (id, k) {
            out.push({ id: id, ptr: base + '/' + sec + '/' + ii + '/product_ids/' + k });
          });
        });
      });
      arrOf(v.scores).forEach(function (s, si) {
        if (!isObj(s)) return;
        arrOf(s.products).forEach(function (id, k) {
          out.push({ id: id, ptr: base + '/scores/' + si + '/products/' + k });
        });
      });
      arrOf(v.flags).forEach(function (f, fi) {
        if (!isObj(f)) return;
        arrOf(f.product_ids).forEach(function (id, k) {
          out.push({ id: id, ptr: base + '/flags/' + fi + '/product_ids/' + k });
        });
      });
    });
    return out;
  }
  function groupMap(doc) {
    var m = Object.create(null);
    var pt = isObj(doc.product_tree) ? doc.product_tree : {};
    arrOf(pt.product_groups).forEach(function (g) {
      if (isObj(g) && isStr(g.group_id)) m[g.group_id] = arrOf(g.product_ids).filter(isStr);
    });
    return m;
  }
  function expand(item, groups) {                   // product_ids + everything behind group_ids
    var set = Object.create(null);
    arrOf(item.product_ids).forEach(function (p) { if (isStr(p)) set[p] = 1; });
    arrOf(item.group_ids).forEach(function (g) {
      (groups[g] || []).forEach(function (p) { set[p] = 1; });
    });
    return Object.keys(set);
  }
  function revisions(doc) {
    var t = isObj(doc.document) && isObj(doc.document.tracking) ? doc.document.tracking : null;
    if (!t) return [];
    return arrOf(t.revision_history).map(function (r, ix) {
      return { r: isObj(r) ? r : {}, ptr: '/document/tracking/revision_history/' + ix, ix: ix };
    });
  }
  function sortedByDate(list) {
    return list.slice().sort(function (a, b) {
      var x = dateVal(a.r.date), y = dateVal(b.r.date);
      if (x === null && y === null) return a.ix - b.ix;
      if (x === null) return 1;
      if (y === null) return -1;
      if (x !== y) return x < y ? -1 : 1;
      return a.ix - b.ix;
    });
  }
  function docCategory(doc) {
    return (isObj(doc.document) && isStr(doc.document.category)) ? doc.document.category : '';
  }
  var PROFILE_VALUES = ['csaf_base', 'csaf_security_incident_response', 'csaf_informational_advisory',
    'csaf_security_advisory', 'csaf_vex'];
  var VEX_JUSTIFICATIONS = ['component_not_present', 'vulnerable_code_not_present',
    'vulnerable_code_not_in_execute_path', 'vulnerable_code_cannot_be_controlled_by_adversary',
    'inline_mitigations_already_exist'];

  // ── the tests ───────────────────────────────────────────────────────────────
  // Every entry is one numbered test from CSAF 2.0 section 6.1. run() returns findings.
  var TESTS = [];
  function test(id, title, run) { TESTS.push({ id: id, title: title, run: run }); }
  function F(ptr, msg) { return { ptr: ptr, msg: msg }; }

  test('6.1.1', 'Missing Definition of Product ID', function (doc) {
    var defined = definedProductIds(doc), out = [];
    productRefs(doc).forEach(function (r) {
      if (!isStr(r.id)) return;
      if (!defined[r.id]) out.push(F(r.ptr, 'product_id "' + r.id + '" is used here but no full product name in the product tree defines it'));
    });
    return out;
  });

  test('6.1.2', 'Multiple Definition of Product ID', function (doc) {
    var defined = definedProductIds(doc), out = [];
    Object.keys(defined).forEach(function (id) {
      if (defined[id].length > 1) {
        defined[id].slice(1).forEach(function (p) {
          out.push(F(p, 'product_id "' + id + '" is defined ' + defined[id].length + ' times in this document'));
        });
      }
    });
    return out;
  });

  test('6.1.3', 'Circular Definition of Product ID', function (doc) {
    var pt = isObj(doc.product_tree) ? doc.product_tree : {};
    var rels = arrOf(pt.relationships), edges = Object.create(null), where = Object.create(null), out = [];
    rels.forEach(function (r, ix) {
      if (!isObj(r) || !isObj(r.full_product_name) || !isStr(r.full_product_name.product_id)) return;
      var id = r.full_product_name.product_id;
      where[id] = '/product_tree/relationships/' + ix + '/full_product_name/product_id';
      edges[id] = (edges[id] || []).concat(
        [r.product_reference, r.relates_to_product_reference].filter(isStr));
    });
    Object.keys(edges).forEach(function (start) {
      var seen = Object.create(null), stack = [start], hit = false;
      while (stack.length) {
        var cur = stack.pop();
        (edges[cur] || []).forEach(function (nxt) {
          if (nxt === start) { hit = true; return; }
          if (!seen[nxt]) { seen[nxt] = 1; stack.push(nxt); }
        });
        if (hit) break;
      }
      if (hit) out.push(F(where[start], 'product_id "' + start + '" is defined by a relationship that, followed through, refers back to itself'));
    });
    return out;
  });

  test('6.1.4', 'Missing Definition of Product Group ID', function (doc) {
    var groups = groupMap(doc), out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      ['remediations', 'threats'].forEach(function (sec) {
        arrOf(v[sec]).forEach(function (it, ii) {
          if (!isObj(it)) return;
          arrOf(it.group_ids).forEach(function (g, k) {
            if (!groups[g]) out.push(F('/vulnerabilities/' + vi + '/' + sec + '/' + ii + '/group_ids/' + k,
              'group_id "' + g + '" is used here but no product group with that id exists'));
          });
        });
      });
    });
    return out;
  });

  test('6.1.5', 'Multiple Definition of Product Group ID', function (doc) {
    var pt = isObj(doc.product_tree) ? doc.product_tree : {}, seen = Object.create(null), out = [];
    arrOf(pt.product_groups).forEach(function (g, ix) {
      if (!isObj(g) || !isStr(g.group_id)) return;
      if (seen[g.group_id]) out.push(F('/product_tree/product_groups/' + ix + '/group_id',
        'group_id "' + g.group_id + '" is defined more than once'));
      seen[g.group_id] = 1;
    });
    return out;
  });

  test('6.1.6', 'Contradicting Product Status', function (doc) {
    var GROUPS = {
      affected: ['first_affected', 'known_affected', 'last_affected'],
      'not affected': ['known_not_affected'],
      fixed: ['first_fixed', 'fixed'],
      'under investigation': ['under_investigation']
    };
    var names = Object.keys(GROUPS), out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v) || !isObj(v.product_status)) return;
      var members = {};
      names.forEach(function (n) {
        var s = Object.create(null);
        GROUPS[n].forEach(function (k) { arrOf(v.product_status[k]).forEach(function (p) { if (isStr(p)) s[p] = k; }); });
        members[n] = s;
      });
      for (var a = 0; a < names.length; a++) {
        for (var b = a + 1; b < names.length; b++) {
          Object.keys(members[names[a]]).forEach(function (p) {
            if (members[names[b]][p]) {
              out.push(F('/vulnerabilities/' + vi + '/product_status/' + members[names[b]][p],
                'product_id "' + p + '" is listed as ' + names[a] + ' and as ' + names[b] + ' in the same vulnerability'));
            }
          });
        }
      }
    });
    return out;
  });

  test('6.1.7', 'Multiple Scores with same Version per Product', function (doc) {
    var out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      var seen = Object.create(null);
      arrOf(v.scores).forEach(function (s, si) {
        if (!isObj(s)) return;
        ['cvss_v2', 'cvss_v3'].forEach(function (key) {
          if (!isObj(s[key])) return;
          var vsn = String(s[key].version || (key === 'cvss_v2' ? '2.0' : ''));
          arrOf(s.products).forEach(function (p, pi) {
            var k = p + '@' + vsn;
            if (seen[k]) {
              out.push(F('/vulnerabilities/' + vi + '/scores/' + si + '/products/' + pi,
                'product_id "' + p + '" already has a CVSS ' + vsn + ' score in this vulnerability'));
            }
            seen[k] = 1;
          });
        });
      });
    });
    return out;
  });

  test('6.1.8', 'Invalid CVSS', function (doc) {
    var out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      arrOf(v.scores).forEach(function (s, si) {
        if (!isObj(s)) return;
        var base = '/vulnerabilities/' + vi + '/scores/' + si;
        if (isObj(s.cvss_v3)) {
          var c = s.cvss_v3, p = base + '/cvss_v3';
          if (!/^3\.[01]$/.test(String(c.version || ''))) out.push(F(p + '/version', 'cvss_v3.version must be "3.0" or "3.1", found ' + JSON.stringify(c.version)));
          if (!isStr(c.vectorString)) out.push(F(p, 'cvss_v3 has no vectorString'));
          else {
            var pv = parseVector3(c.vectorString);
            if (!pv.ok) out.push(F(p + '/vectorString', 'vectorString is not a valid CVSS v3 vector (' + pv.bad.join(', ') + ')'));
            else if (pv.version && String(c.version) && pv.version !== String(c.version)) {
              out.push(F(p + '/vectorString', 'vectorString says CVSS:' + pv.version + ' but version says ' + c.version));
            }
          }
          if (typeof c.baseScore !== 'number') out.push(F(p, 'cvss_v3 has no numeric baseScore'));
          else if (c.baseScore < 0 || c.baseScore > 10) out.push(F(p + '/baseScore', 'baseScore ' + c.baseScore + ' is outside 0.0-10.0'));
          if (!isStr(c.baseSeverity)) out.push(F(p, 'cvss_v3 has no baseSeverity'));
          else if (['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].indexOf(c.baseSeverity) < 0) {
            out.push(F(p + '/baseSeverity', 'baseSeverity ' + JSON.stringify(c.baseSeverity) + ' is not one of NONE, LOW, MEDIUM, HIGH, CRITICAL'));
          }
        }
        if (isObj(s.cvss_v2)) {
          var c2 = s.cvss_v2, p2 = base + '/cvss_v2';
          if (String(c2.version || '') !== '2.0') out.push(F(p2 + '/version', 'cvss_v2.version must be "2.0", found ' + JSON.stringify(c2.version)));
          if (!isStr(c2.vectorString)) out.push(F(p2, 'cvss_v2 has no vectorString'));
          else {
            var pv2 = parseVector2(c2.vectorString);
            if (!pv2.ok) out.push(F(p2 + '/vectorString', 'vectorString is not a valid CVSS v2 vector (' + pv2.bad.join(', ') + ')'));
          }
          if (typeof c2.baseScore !== 'number') out.push(F(p2, 'cvss_v2 has no numeric baseScore'));
          else if (c2.baseScore < 0 || c2.baseScore > 10) out.push(F(p2 + '/baseScore', 'baseScore ' + c2.baseScore + ' is outside 0.0-10.0'));
        }
      });
    });
    return out;
  });

  test('6.1.9', 'Invalid CVSS computation', function (doc) {
    var out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      arrOf(v.scores).forEach(function (s, si) {
        if (!isObj(s)) return;
        var base = '/vulnerabilities/' + vi + '/scores/' + si;
        if (isObj(s.cvss_v3) && isStr(s.cvss_v3.vectorString)) {
          var c = s.cvss_v3, p = base + '/cvss_v3', pv = parseVector3(c.vectorString);
          if (pv.ok) {
            var got = score3(pv.m, pv.version === '3.0' ? '3.0' : '3.1');
            if (typeof c.baseScore === 'number' && Math.abs(c.baseScore - got.base) > 0.001) {
              out.push(F(p + '/baseScore', 'baseScore is ' + c.baseScore + ' but the vector computes to ' + got.base));
            }
            if (isStr(c.baseSeverity) && c.baseSeverity !== sev3(got.base)) {
              out.push(F(p + '/baseSeverity', 'baseSeverity is ' + c.baseSeverity + ' but a base score of ' + got.base + ' is ' + sev3(got.base)));
            }
            if (typeof c.temporalScore === 'number' && Math.abs(c.temporalScore - got.temporal) > 0.001) {
              out.push(F(p + '/temporalScore', 'temporalScore is ' + c.temporalScore + ' but the vector computes to ' + got.temporal));
            }
            if (isStr(c.temporalSeverity) && c.temporalSeverity !== sev3(got.temporal)) {
              out.push(F(p + '/temporalSeverity', 'temporalSeverity is ' + c.temporalSeverity + ' but a temporal score of ' + got.temporal + ' is ' + sev3(got.temporal)));
            }
            if (typeof c.environmentalScore === 'number' && Math.abs(c.environmentalScore - got.environmental) > 0.001) {
              out.push(F(p + '/environmentalScore', 'environmentalScore is ' + c.environmentalScore + ' but the vector computes to ' + got.environmental));
            }
            if (isStr(c.environmentalSeverity) && c.environmentalSeverity !== sev3(got.environmental)) {
              out.push(F(p + '/environmentalSeverity', 'environmentalSeverity is ' + c.environmentalSeverity + ' but an environmental score of ' + got.environmental + ' is ' + sev3(got.environmental)));
            }
          }
        }
        if (isObj(s.cvss_v2) && isStr(s.cvss_v2.vectorString)) {
          var c2 = s.cvss_v2, p2 = base + '/cvss_v2', pv2 = parseVector2(c2.vectorString);
          if (pv2.ok) {
            var g2 = score2(pv2.m);
            if (typeof c2.baseScore === 'number' && Math.abs(c2.baseScore - g2.base) > 0.001) {
              out.push(F(p2 + '/baseScore', 'baseScore is ' + c2.baseScore + ' but the vector computes to ' + g2.base));
            }
            if (typeof c2.temporalScore === 'number' && Math.abs(c2.temporalScore - g2.temporal) > 0.001) {
              out.push(F(p2 + '/temporalScore', 'temporalScore is ' + c2.temporalScore + ' but the vector computes to ' + g2.temporal));
            }
            if (typeof c2.environmentalScore === 'number' && Math.abs(c2.environmentalScore - g2.environmental) > 0.001) {
              out.push(F(p2 + '/environmentalScore', 'environmentalScore is ' + c2.environmentalScore + ' but the vector computes to ' + g2.environmental));
            }
          }
        }
      });
    });
    return out;
  });

  test('6.1.10', 'Inconsistent CVSS', function (doc) {
    var out = [];
    var V3FIELD = { AV: 'attackVector', AC: 'attackComplexity', PR: 'privilegesRequired', UI: 'userInteraction',
      S: 'scope', C: 'confidentialityImpact', I: 'integrityImpact', A: 'availabilityImpact',
      E: 'exploitCodeMaturity', RL: 'remediationLevel', RC: 'reportConfidence',
      CR: 'confidentialityRequirement', IR: 'integrityRequirement', AR: 'availabilityRequirement',
      MAV: 'modifiedAttackVector', MAC: 'modifiedAttackComplexity', MPR: 'modifiedPrivilegesRequired',
      MUI: 'modifiedUserInteraction', MS: 'modifiedScope', MC: 'modifiedConfidentialityImpact',
      MI: 'modifiedIntegrityImpact', MA: 'modifiedAvailabilityImpact' };
    var V3VAL = { N: ['NETWORK', 'NONE', 'NOT_DEFINED'], A: ['ADJACENT_NETWORK', 'AVAILABILITY'], L: ['LOCAL', 'LOW'],
      P: ['PHYSICAL', 'PROOF_OF_CONCEPT'], H: ['HIGH'], R: ['REQUIRED'], U: ['UNCHANGED', 'UNPROVEN'],
      C: ['CHANGED', 'CONFIRMED'], M: ['MEDIUM'], X: ['NOT_DEFINED'], O: ['OFFICIAL_FIX'], T: ['TEMPORARY_FIX'],
      W: ['WORKAROUND'] };
    var V2FIELD = { AV: 'accessVector', AC: 'accessComplexity', Au: 'authentication',
      C: 'confidentialityImpact', I: 'integrityImpact', A: 'availabilityImpact' };
    var V2VAL = { L: ['LOCAL', 'LOW'], A: ['ADJACENT_NETWORK'], N: ['NETWORK', 'NONE'], H: ['HIGH'], M: ['MEDIUM', 'MULTIPLE'],
      S: ['SINGLE'], P: ['PARTIAL'], C: ['COMPLETE'] };
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      arrOf(v.scores).forEach(function (s, si) {
        if (!isObj(s)) return;
        var base = '/vulnerabilities/' + vi + '/scores/' + si;
        if (isObj(s.cvss_v3) && isStr(s.cvss_v3.vectorString)) {
          var pv = parseVector3(s.cvss_v3.vectorString);
          if (pv.ok) {
            Object.keys(V3FIELD).forEach(function (k) {
              var field = V3FIELD[k], stated = s.cvss_v3[field];
              if (!isStr(stated)) return;
              var letter = pv.m[k];
              var allowed = letter ? (V3VAL[letter] || []) : ['NOT_DEFINED'];
              if (allowed.indexOf(stated) < 0) {
                out.push(F(base + '/cvss_v3/' + field, field + ' says ' + stated + ' but the vector says ' + (letter ? k + ':' + letter : 'nothing for ' + k)));
              }
            });
          }
        }
        if (isObj(s.cvss_v2) && isStr(s.cvss_v2.vectorString)) {
          var pv2 = parseVector2(s.cvss_v2.vectorString);
          if (pv2.ok) {
            Object.keys(V2FIELD).forEach(function (k) {
              var field = V2FIELD[k], stated = s.cvss_v2[field];
              if (!isStr(stated)) return;
              var letter = pv2.m[k];
              var allowed = letter ? (V2VAL[letter] || []) : [];
              if (allowed.indexOf(stated) < 0) {
                out.push(F(base + '/cvss_v2/' + field, field + ' says ' + stated + ' but the vector says ' + (letter ? k + ':' + letter : 'nothing for ' + k)));
              }
            });
          }
        }
      });
    });
    return out;
  });

  test('6.1.11', 'CWE', function (doc) {
    var out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v) || !isObj(v.cwe)) return;
      var p = '/vulnerabilities/' + vi + '/cwe', id = v.cwe.id, name = v.cwe.name;
      if (!isStr(id) || !/^CWE-[1-9]\d*$/.test(id)) {
        out.push(F(p + '/id', 'cwe.id ' + JSON.stringify(id) + ' is not of the form CWE-<number>'));
        return;
      }
      var num = id.slice(4), official = CWE[num];
      if (!official) { out.push(F(p + '/id', id + ' is not a weakness in the CWE catalogue this build carries')); return; }
      if (!isStr(name)) { out.push(F(p, id + ' has no name; the official name is "' + official + '"')); return; }
      if (name !== official) out.push(F(p + '/name', 'cwe.name is "' + name + '" but ' + id + ' is officially "' + official + '"'));
    });
    return out;
  });

  test('6.1.12', 'Language', function (doc) {
    var d = isObj(doc.document) ? doc.document : {}, out = [];
    ['lang', 'source_lang'].forEach(function (k) {
      if (d[k] === undefined) return;
      var bad = langBad(d[k]);
      if (bad) out.push(F('/document/' + k, 'document.' + k + ' ' + JSON.stringify(d[k]) + ': ' + bad));
    });
    return out;
  });

  test('6.1.13', 'PURL', function (doc) {
    var out = [];
    eachFPN(doc, function (f, ptr) {
      var h = f.product_identification_helper;
      if (!isObj(h) || h.purl === undefined) return;
      if (!isStr(h.purl) || !PURL_RE.test(h.purl)) {
        out.push(F(ptr + '/product_identification_helper/purl', 'purl ' + JSON.stringify(h.purl) + ' is not a valid package URL'));
      }
    });
    return out;
  });

  test('6.1.14', 'Sorted Revision History', function (doc) {
    var list = sortedByDate(revisions(doc)), out = [];
    for (var i = 1; i < list.length; i++) {
      var prev = list[i - 1].r.number, cur = list[i].r.number;
      if (prev === undefined || cur === undefined) continue;
      if (cmpVer(prev, cur) >= 0) {
        out.push(F(list[i].ptr + '/number', 'sorted by date, revision ' + JSON.stringify(cur) + ' does not come after ' + JSON.stringify(prev)));
      }
    }
    return out;
  });

  test('6.1.15', 'Translator', function (doc) {
    var d = isObj(doc.document) ? doc.document : {};
    var pub = isObj(d.publisher) ? d.publisher : {};
    if (pub.category !== 'translator') return [];
    if (isStr(d.source_lang) && d.source_lang) return [];
    return [F('/document/publisher/category', 'the publisher category is "translator" so /document/source_lang must be present and set')];
  });

  test('6.1.16', 'Latest Document Version', function (doc) {
    var t = (isObj(doc.document) && isObj(doc.document.tracking)) ? doc.document.tracking : null;
    if (!t || t.version === undefined) return [];
    var list = sortedByDate(revisions(doc));
    if (!list.length) return [];
    var last = list[list.length - 1].r.number;
    if (last === undefined) return [];
    var a = ver(t.version), b = ver(last), draft = t.status === 'draft';
    var same = draft
      ? (a.major === b.major && a.minor === b.minor && a.patch === b.patch)
      : sameVersion(t.version, last);
    if (!same) {
      return [F('/document/tracking/version', 'document version ' + JSON.stringify(t.version) +
        ' does not match the newest revision history entry ' + JSON.stringify(last))];
    }
    return [];
  });

  test('6.1.17', 'Document Status Draft', function (doc) {
    var t = (isObj(doc.document) && isObj(doc.document.tracking)) ? doc.document.tracking : null;
    if (!t || t.version === undefined) return [];
    var v = ver(t.version);
    var looksDraft = (v.kind === 'int' && v.major === 0) || (v.kind === 'semver' && (v.major === 0 || v.pre));
    if (looksDraft && t.status !== 'draft') {
      return [F('/document/tracking/status', 'version ' + JSON.stringify(t.version) + ' is a pre-release, so status must be "draft", not ' + JSON.stringify(t.status))];
    }
    return [];
  });

  test('6.1.18', 'Released Revision History', function (doc) {
    var t = (isObj(doc.document) && isObj(doc.document.tracking)) ? doc.document.tracking : null;
    if (!t || (t.status !== 'final' && t.status !== 'interim')) return [];
    var out = [];
    revisions(doc).forEach(function (it) {
      var v = ver(it.r.number);
      if ((v.kind === 'int' && v.major === 0) || (v.kind === 'semver' && v.major === 0)) {
        out.push(F(it.ptr + '/number', 'the document is ' + t.status + ' but this revision is numbered ' + JSON.stringify(it.r.number)));
      }
    });
    return out;
  });

  test('6.1.19', 'Revision History Entries for Pre-release Versions', function (doc) {
    var out = [];
    revisions(doc).forEach(function (it) {
      var v = ver(it.r.number);
      if (v.kind === 'semver' && v.pre) {
        out.push(F(it.ptr + '/number', 'revision number ' + JSON.stringify(it.r.number) + ' carries pre-release information'));
      }
    });
    return out;
  });

  test('6.1.20', 'Non-draft Document Version', function (doc) {
    var t = (isObj(doc.document) && isObj(doc.document.tracking)) ? doc.document.tracking : null;
    if (!t || (t.status !== 'final' && t.status !== 'interim')) return [];
    var v = ver(t.version);
    if (v.kind === 'semver' && v.pre) {
      return [F('/document/tracking/version', 'the document is ' + t.status + ' but the version ' + JSON.stringify(t.version) + ' has a pre-release part')];
    }
    return [];
  });

  test('6.1.21', 'Missing Item in Revision History', function (doc) {
    var list = sortedByDate(revisions(doc));
    if (!list.length) return [];
    var out = [], nums = list.map(function (it) { return ver(it.r.number); });
    var first = nums[0];
    if (first.kind !== 'bad' && first.major !== 0 && first.major !== 1) {
      out.push(F(list[0].ptr + '/number', 'the oldest revision is numbered ' + JSON.stringify(list[0].r.number) + '; the first entry must start at 0 or 1'));
    }
    for (var i = 1; i < nums.length; i++) {
      if (nums[i].kind === 'bad' || nums[i - 1].kind === 'bad') continue;
      var gap = nums[i].major - nums[i - 1].major;
      if (gap > 1) {
        out.push(F(list[i].ptr + '/number', 'revision ' + JSON.stringify(list[i].r.number) + ' follows ' + JSON.stringify(list[i - 1].r.number) + '; ' + (gap - 1) + ' version number(s) are missing'));
      }
    }
    return out;
  });

  test('6.1.22', 'Multiple Definition in Revision History', function (doc) {
    var seen = Object.create(null), out = [];
    revisions(doc).forEach(function (it) {
      if (it.r.number === undefined) return;
      var v = ver(it.r.number);
      var key = v.kind === 'bad' ? String(it.r.number) : (v.major + '.' + v.minor + '.' + v.patch + '-' + v.pre);
      if (seen[key]) out.push(F(it.ptr + '/number', 'revision number ' + JSON.stringify(it.r.number) + ' is used more than once'));
      seen[key] = 1;
    });
    return out;
  });

  test('6.1.23', 'Multiple Use of Same CVE', function (doc) {
    var seen = Object.create(null), out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v) || !isStr(v.cve)) return;
      if (seen[v.cve]) out.push(F('/vulnerabilities/' + vi + '/cve', v.cve + ' is already used by another vulnerability item'));
      seen[v.cve] = 1;
    });
    return out;
  });

  test('6.1.24', 'Multiple Definition in Involvements', function (doc) {
    var out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      var seen = Object.create(null);
      arrOf(v.involvements).forEach(function (it, ii) {
        if (!isObj(it)) return;
        var k = String(it.party) + '@' + String(it.date === undefined ? '' : it.date);
        if (seen[k]) {
          out.push(F('/vulnerabilities/' + vi + '/involvements/' + ii,
            'the party "' + it.party + '" is already recorded at this date, whatever the status'));
        }
        seen[k] = 1;
      });
    });
    return out;
  });

  test('6.1.25', 'Multiple Use of Same Hash Algorithm', function (doc) {
    var out = [];
    eachFPN(doc, function (f, ptr) {
      var h = f.product_identification_helper;
      if (!isObj(h)) return;
      arrOf(h.hashes).forEach(function (entry, hi) {
        if (!isObj(entry)) return;
        var seen = Object.create(null);
        arrOf(entry.file_hashes).forEach(function (fh, fi) {
          if (!isObj(fh) || !isStr(fh.algorithm)) return;
          if (seen[fh.algorithm]) {
            out.push(F(ptr + '/product_identification_helper/hashes/' + hi + '/file_hashes/' + fi + '/algorithm',
              'the hash algorithm "' + fh.algorithm + '" is used more than once for the same file'));
          }
          seen[fh.algorithm] = 1;
        });
      });
    });
    return out;
  });

  test('6.1.26', 'Prohibited Document Category Name', function (doc) {
    var cat = docCategory(doc);
    if (!cat) return [];
    if (PROFILE_VALUES.indexOf(cat) >= 0) return [];        // a real profile value: test is skipped
    var norm = function (s) { return String(s).toLowerCase().replace(/[-_\s]/g, ''); };
    var n = norm(cat), out = [];
    var reserved = ['security_incident_response', 'informational_advisory', 'security_advisory', 'vex',
      'csaf_security_incident_response', 'csaf_informational_advisory', 'csaf_security_advisory', 'csaf_vex'];
    for (var i = 0; i < reserved.length; i++) {
      if (n === norm(reserved[i]) || n === norm(String(reserved[i]).replace(/^csaf_/, ''))) {
        out.push(F('/document/category', 'the category ' + JSON.stringify(cat) + ' is the name of another profile; use that profile value or a different category'));
        break;
      }
    }
    if (!out.length && /^csaf_/i.test(cat)) {
      out.push(F('/document/category', 'the category ' + JSON.stringify(cat) + ' uses the reserved prefix "csaf_"'));
    }
    return out;
  });

  // 6.1.27 Profile Tests — one entry per profile test, skipped when the category does not match.
  function catIn(doc, list) { return list.indexOf(docCategory(doc)) >= 0; }

  test('6.1.27.1', 'Document Notes', function (doc) {
    if (!catIn(doc, ['csaf_informational_advisory', 'csaf_security_incident_response'])) return [];
    var want = ['description', 'details', 'general', 'summary'];
    var ok = arrOf(isObj(doc.document) ? doc.document.notes : []).some(function (n) {
      return isObj(n) && want.indexOf(n.category) >= 0;
    });
    if (ok) return [];
    return [F('/document', 'profile ' + docCategory(doc) + ' needs at least one /document/notes item with category description, details, general or summary')];
  });

  test('6.1.27.2', 'Document References', function (doc) {
    if (!catIn(doc, ['csaf_informational_advisory', 'csaf_security_incident_response'])) return [];
    var refs = arrOf(isObj(doc.document) ? doc.document.references : []);
    var ok = refs.some(function (r) { return isObj(r) && r.category === 'external'; });
    if (ok) return [];
    return [F('/document', 'profile ' + docCategory(doc) + ' needs at least one /document/references item with category "external"')];
  });

  test('6.1.27.3', 'Vulnerabilities must be absent', function (doc) {
    if (!catIn(doc, ['csaf_informational_advisory'])) return [];
    if (doc.vulnerabilities === undefined) return [];
    return [F('/vulnerabilities', 'profile csaf_informational_advisory must not carry a /vulnerabilities element')];
  });

  test('6.1.27.4', 'Product Tree', function (doc) {
    if (!catIn(doc, ['csaf_security_advisory', 'csaf_vex'])) return [];
    if (doc.product_tree !== undefined) return [];
    return [F('', 'profile ' + docCategory(doc) + ' requires a /product_tree element')];
  });

  test('6.1.27.5', 'Vulnerability Notes', function (doc) {
    if (!catIn(doc, ['csaf_security_advisory', 'csaf_vex'])) return [];
    var out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v) || v.notes !== undefined) return;
      out.push(F('/vulnerabilities/' + vi, 'profile ' + docCategory(doc) + ' requires notes on every vulnerability item'));
    });
    return out;
  });

  test('6.1.27.6', 'Product Status', function (doc) {
    if (!catIn(doc, ['csaf_security_advisory'])) return [];
    var out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v) || v.product_status !== undefined) return;
      out.push(F('/vulnerabilities/' + vi, 'profile csaf_security_advisory requires product_status on every vulnerability item'));
    });
    return out;
  });

  test('6.1.27.7', 'VEX Product Status', function (doc) {
    if (!catIn(doc, ['csaf_vex'])) return [];
    var want = ['fixed', 'known_affected', 'known_not_affected', 'under_investigation'], out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      var ps = isObj(v.product_status) ? v.product_status : {};
      var ok = want.some(function (k) { return ps[k] !== undefined; });
      if (!ok) out.push(F('/vulnerabilities/' + vi, 'profile csaf_vex requires one of fixed, known_affected, known_not_affected or under_investigation in product_status'));
    });
    return out;
  });

  test('6.1.27.8', 'Vulnerability ID', function (doc) {
    if (!catIn(doc, ['csaf_vex'])) return [];
    var out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      if (v.cve === undefined && v.ids === undefined) {
        out.push(F('/vulnerabilities/' + vi, 'profile csaf_vex requires either cve or ids on every vulnerability item'));
      }
    });
    return out;
  });

  test('6.1.27.9', 'Impact Statement', function (doc) {
    if (!catIn(doc, ['csaf_vex'])) return [];
    var groups = groupMap(doc), out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v) || !isObj(v.product_status)) return;
      var covered = Object.create(null);
      arrOf(v.flags).forEach(function (f) { if (isObj(f)) expand(f, groups).forEach(function (p) { covered[p] = 1; }); });
      arrOf(v.threats).forEach(function (t) {
        if (isObj(t) && t.category === 'impact') expand(t, groups).forEach(function (p) { covered[p] = 1; });
      });
      arrOf(v.product_status.known_not_affected).forEach(function (p, pi) {
        if (!covered[p]) {
          out.push(F('/vulnerabilities/' + vi + '/product_status/known_not_affected/' + pi,
            'product_id "' + p + '" is known_not_affected but has no impact statement in flags or in a threat of category "impact"'));
        }
      });
    });
    return out;
  });

  test('6.1.27.10', 'Action Statement', function (doc) {
    if (!catIn(doc, ['csaf_vex'])) return [];
    var groups = groupMap(doc), out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v) || !isObj(v.product_status)) return;
      var covered = Object.create(null);
      arrOf(v.remediations).forEach(function (r) { if (isObj(r)) expand(r, groups).forEach(function (p) { covered[p] = 1; }); });
      arrOf(v.product_status.known_affected).forEach(function (p, pi) {
        if (!covered[p]) {
          out.push(F('/vulnerabilities/' + vi + '/product_status/known_affected/' + pi,
            'product_id "' + p + '" is known_affected but no remediation in this vulnerability refers to it'));
        }
      });
    });
    return out;
  });

  test('6.1.27.11', 'Vulnerabilities must exist', function (doc) {
    if (!catIn(doc, ['csaf_security_advisory', 'csaf_vex'])) return [];
    if (doc.vulnerabilities !== undefined) return [];
    return [F('', 'profile ' + docCategory(doc) + ' requires a /vulnerabilities element')];
  });

  test('6.1.28', 'Translation', function (doc) {
    var d = isObj(doc.document) ? doc.document : {};
    if (!isStr(d.lang) || !isStr(d.source_lang)) return [];
    if (d.lang.toLowerCase() !== d.source_lang.toLowerCase()) return [];
    return [F('/document/source_lang', 'source_lang and lang are both ' + JSON.stringify(d.lang) + '; a translation must differ from its source')];
  });

  test('6.1.29', 'Remediation without Product Reference', function (doc) {
    var out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      arrOf(v.remediations).forEach(function (r, ri) {
        if (!isObj(r)) return;
        if (r.group_ids === undefined && r.product_ids === undefined) {
          out.push(F('/vulnerabilities/' + vi + '/remediations/' + ri, 'this remediation names neither product_ids nor group_ids, so no reader can tell what to patch'));
        }
      });
    });
    return out;
  });

  test('6.1.30', 'Mixed Integer and Semantic Versioning', function (doc) {
    var t = (isObj(doc.document) && isObj(doc.document.tracking)) ? doc.document.tracking : null;
    if (!t) return [];
    var items = [];
    if (t.version !== undefined) items.push({ v: t.version, ptr: '/document/tracking/version' });
    revisions(doc).forEach(function (it) {
      if (it.r.number !== undefined) items.push({ v: it.r.number, ptr: it.ptr + '/number' });
    });
    var kinds = {}, out = [];
    items.forEach(function (it) { var k = ver(it.v).kind; if (k !== 'bad') kinds[k] = 1; });
    if (kinds.int && kinds.semver) {
      items.forEach(function (it) {
        if (ver(it.v).kind === 'semver') {
          out.push(F(it.ptr, 'version ' + JSON.stringify(it.v) + ' is semantic versioning while other versions in this document are integers; pick one and keep it'));
        }
      });
    }
    return out;
  });

  test('6.1.31', 'Version Range in Product Version', function (doc) {
    var BAD = ['<', '<=', '>', '>=', 'after', 'all', 'before', 'earlier', 'later', 'prior', 'versions'];
    var out = [];
    eachBranch(doc, function (b, ptr) {
      if (b.category !== 'product_version' || !isStr(b.name)) return;
      var low = b.name.toLowerCase(), found = [];
      BAD.forEach(function (w) { if (low.indexOf(w) >= 0) found.push(w); });
      if (found.length) {
        out.push(F(ptr + '/name', 'a product_version branch must name one version, but ' + JSON.stringify(b.name) + ' reads as a range (' + found.join(', ') + ')'));
      }
    });
    return out;
  });

  test('6.1.32', 'Flag without Product Reference', function (doc) {
    var out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      arrOf(v.flags).forEach(function (f, fi) {
        if (!isObj(f)) return;
        if (f.group_ids === undefined && f.product_ids === undefined) {
          out.push(F('/vulnerabilities/' + vi + '/flags/' + fi, 'this flag names neither product_ids nor group_ids, so its justification applies to nothing'));
        }
      });
    });
    return out;
  });

  test('6.1.33', 'Multiple Flags with VEX Justification Codes per Product', function (doc) {
    var groups = groupMap(doc), out = [];
    arrOf(doc.vulnerabilities).forEach(function (v, vi) {
      if (!isObj(v)) return;
      var seen = Object.create(null);
      arrOf(v.flags).forEach(function (f, fi) {
        if (!isObj(f) || VEX_JUSTIFICATIONS.indexOf(f.label) < 0) return;
        expand(f, groups).forEach(function (p) {
          if (seen[p]) {
            out.push(F('/vulnerabilities/' + vi + '/flags/' + fi,
              'product_id "' + p + '" already carries the VEX justification "' + seen[p] + '" in this vulnerability'));
          } else { seen[p] = f.label; }
        });
      });
    });
    return out;
  });

  // ── CSAF Base required fields ───────────────────────────────────────────────
  // Section 6.1.26 notes these "SHALL be checked by validating the JSON schema", which an editor
  // does not do on its own, so the engine reports them too - clearly marked, outside the 43.
  var BASE_REQUIRED = [
    ['/document/category', function (d) { return isObj(d.document) && d.document.category !== undefined; }],
    ['/document/csaf_version', function (d) { return isObj(d.document) && d.document.csaf_version === '2.0'; }],
    ['/document/publisher/category', function (d) { return isObj(d.document) && isObj(d.document.publisher) && d.document.publisher.category !== undefined; }],
    ['/document/publisher/name', function (d) { return isObj(d.document) && isObj(d.document.publisher) && d.document.publisher.name !== undefined; }],
    ['/document/publisher/namespace', function (d) { return isObj(d.document) && isObj(d.document.publisher) && d.document.publisher.namespace !== undefined; }],
    ['/document/title', function (d) { return isObj(d.document) && d.document.title !== undefined; }],
    ['/document/tracking/current_release_date', function (d) { return isObj(d.document) && isObj(d.document.tracking) && d.document.tracking.current_release_date !== undefined; }],
    ['/document/tracking/id', function (d) { return isObj(d.document) && isObj(d.document.tracking) && d.document.tracking.id !== undefined; }],
    ['/document/tracking/initial_release_date', function (d) { return isObj(d.document) && isObj(d.document.tracking) && d.document.tracking.initial_release_date !== undefined; }],
    ['/document/tracking/revision_history', function (d) { return isObj(d.document) && isObj(d.document.tracking) && arrOf(d.document.tracking.revision_history).length > 0; }],
    ['/document/tracking/status', function (d) { return isObj(d.document) && isObj(d.document.tracking) && d.document.tracking.status !== undefined; }],
    ['/document/tracking/version', function (d) { return isObj(d.document) && isObj(d.document.tracking) && d.document.tracking.version !== undefined; }]
  ];

  // ── public API ──────────────────────────────────────────────────────────────
  function looksLikeCsaf(text) { return /"csaf_version"\s*:/.test(String(text)); }

  function check(text, opts) {
    opts = opts || {};
    var res = { ok: false, parseError: null, findings: [], tests: TESTS.length, ran: 0, doc: null };
    var parsed;
    try { parsed = parseWithLines(String(text)); } catch (e) {
      res.parseError = e.message;
      res.findings.push({ test: 'json', title: 'Readable JSON', sev: 'error', line: e.line || 1, ptr: '', msg: 'This file is not readable JSON: ' + e.message });
      return res;
    }
    var doc = parsed.value, lines = parsed.lines;
    res.doc = doc;
    if (!isObj(doc)) {
      res.findings.push({ test: 'json', title: 'Readable JSON', sev: 'error', line: 1, ptr: '', msg: 'A CSAF document must be a JSON object' });
      return res;
    }
    if (opts.base !== false) {
      BASE_REQUIRED.forEach(function (p) {
        var okp = false;
        try { okp = !!p[1](doc); } catch (e) { okp = false; }
        if (!okp) {
          res.findings.push({ test: 'base', title: 'CSAF Base required field', sev: 'error',
            line: lineOf(lines, p[0]), ptr: p[0],
            msg: p[0] + ' is required by the CSAF Base profile and is missing or wrong' });
        }
      });
    }
    var only = opts.only ? String(opts.only) : null;
    TESTS.forEach(function (t) {
      if (only && t.id.indexOf(only) !== 0) return;
      res.ran++;
      var hits;
      try { hits = t.run(doc) || []; } catch (e) {
        hits = [F('', 'this test could not run on this document: ' + e.message)];
      }
      hits.forEach(function (h) {
        res.findings.push({ test: t.id, title: t.title, sev: 'error',
          line: lineOf(lines, h.ptr), ptr: h.ptr, msg: h.msg });
      });
    });
    res.findings.sort(function (a, b) { return a.line - b.line || (a.test < b.test ? -1 : 1); });
    res.ok = res.findings.length === 0;
    return res;
  }

  return {
    check: check,
    TESTS: TESTS,
    looksLikeCsaf: looksLikeCsaf,
    baseRequiredCount: BASE_REQUIRED.length,
    cwePresent: Object.keys(CWE).length,
    // exported so the verification script can drive the maths directly
    _internal: { parseWithLines: parseWithLines, score3: score3, score2: score2, ver: ver,
      parseVector3: parseVector3, parseVector2: parseVector2, sev3: sev3, langBad: langBad }
  };
}));
