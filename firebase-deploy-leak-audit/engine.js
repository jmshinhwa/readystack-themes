// Firebase Deploy Leak Audit — one brain, used by the VS Code extension and by the free web page.
const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FDL_RULES;
const BY_ID = {};
RULES.forEach(function (r) { BY_ID[r.id] = r; });

function lineOf(text, needle) {
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) if (lines[i].indexOf(needle) !== -1) return i + 1;
  return 1;
}

function hit(out, text, id, where, extra) {
  const r = BY_ID[id];
  if (!r) return;
  out.push({
    check: id,
    sev: r.sev,
    msg: (extra ? extra + ' ' : '') + r.msg + ' Fix: ' + r.fix,
    line: lineOf(text, where || '"hosting"')
  });
}

function asArray(v) { return Array.isArray(v) ? v : (v ? [v] : []); }

// every header key/value pair declared anywhere in this hosting block
function headerPairs(h) {
  const pairs = [];
  asArray(h.headers).forEach(function (entry) {
    const src = entry && entry.source ? String(entry.source) : '';
    asArray(entry && entry.headers).forEach(function (p) {
      if (!p || !p.key) return;
      pairs.push({ source: src, key: String(p.key).toLowerCase(), value: String(p.value == null ? '' : p.value) });
    });
  });
  return pairs;
}

function hasHeader(pairs, key) {
  return pairs.some(function (p) { return p.key === key; });
}

function check(text, opts) {
  opts = opts || {};
  const findings = [];
  let doc;
  try {
    doc = JSON.parse(String(text));
  } catch (e) {
    hit(findings, text, 'json_parse', '{', '(' + e.message + ')');
    return { findings: findings };
  }
  const blocks = asArray(doc && doc.hosting);
  if (!blocks.length) return { findings: findings };

  blocks.forEach(function (h, i) {
    if (!h || typeof h !== 'object') return;
    const label = blocks.length > 1 ? '[hosting #' + (i + 1) + (h.target ? ' target ' + h.target : '') + ']' : '';
    const anchor = h.public !== undefined ? '"public"' : '"hosting"';

    // --- where the bundle comes from -------------------------------------
    const pub = h.public === undefined ? null : String(h.public).trim();
    if (pub !== null && (pub === '.' || pub === './' || pub === '' || pub === '/')) {
      hit(findings, text, 'public_is_repo_root', '"public"', label);
    }
    if (pub === null && h.source === undefined) {
      hit(findings, text, 'public_missing', anchor, label);
    }

    // --- what the ignore list lets through -------------------------------
    const ignore = Array.isArray(h.ignore) ? h.ignore.map(function (s) { return String(s).toLowerCase(); }) : null;
    const covers = function (frag) { return ignore !== null && ignore.some(function (e) { return e.indexOf(frag) !== -1; }); };
    const dotfiles = covers('**/.*');

    if (ignore === null) {
      hit(findings, text, 'ignore_absent', anchor, label);
    } else {
      if (!dotfiles) hit(findings, text, 'missing_dotfiles', '"ignore"', label);
      if (!covers('node_modules/**')) hit(findings, text, 'missing_node_modules', '"ignore"', label);
      if (!ignore.some(function (e) { return e === 'firebase.json' || e.indexOf('firebase*.json') !== -1; })) {
        hit(findings, text, 'missing_firebase_json', '"ignore"', label);
      }
    }
    if (!covers('.env') && !dotfiles) hit(findings, text, 'env_not_ignored', ignore === null ? anchor : '"ignore"', label);
    if (!covers('.map')) hit(findings, text, 'sourcemap_not_ignored', ignore === null ? anchor : '"ignore"', label);
    if (!covers('serviceaccount') && !covers('adminsdk') && !covers('.pem') && !covers('-key.json')) {
      hit(findings, text, 'service_account_not_ignored', ignore === null ? anchor : '"ignore"', label);
    }

    // --- what the CDN answers with ---------------------------------------
    const pairs = headerPairs(h);
    if (!pairs.length) {
      hit(findings, text, 'headers_absent', anchor, label);
    } else {
      const csp = pairs.filter(function (p) { return p.key === 'content-security-policy'; });
      if (!csp.length) hit(findings, text, 'csp_missing', '"headers"', label);
      if (!hasHeader(pairs, 'strict-transport-security')) hit(findings, text, 'hsts_missing', '"headers"', label);
      if (!hasHeader(pairs, 'x-content-type-options')) hit(findings, text, 'nosniff_missing', '"headers"', label);
      const framed = hasHeader(pairs, 'x-frame-options') ||
        csp.some(function (p) { return p.value.toLowerCase().indexOf('frame-ancestors') !== -1; });
      if (!framed) hit(findings, text, 'frame_missing', '"headers"', label);
    }
    pairs.forEach(function (p) {
      if (p.key === 'access-control-allow-origin' && p.value.trim() === '*') {
        hit(findings, text, 'cors_wildcard', 'Access-Control-Allow-Origin', label);
      }
      if (p.key === 'cache-control' && /html/i.test(p.source)) {
        const m = /max-age\s*=\s*(\d+)/i.exec(p.value);
        if (m && Number(m[1]) > 3600) {
          hit(findings, text, 'html_immutable_cache', p.source, label + ' (max-age=' + m[1] + ' on ' + p.source + ')');
        }
      }
    });
  });

  findings.sort(function (a, b) {
    const rank = { high: 0, med: 1, low: 2 };
    return (rank[a.sev] - rank[b.sev]) || (a.line - b.line);
  });
  return { findings: findings };
}

const OUT = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') module.exports = OUT;
if (typeof window !== 'undefined') window.FDLENGINE = OUT;
