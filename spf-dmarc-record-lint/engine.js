// SPF & DMARC Record Lint — one brain. Same file runs in Node (the extension) and in the browser (the free web page).
'use strict';
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SPF_RULES;

function rule(id) {
  for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i];
  return { id: id, sev: 'error', msg: id };
}
function push(out, id, line, n) {
  var r = rule(id);
  out.push({ check: r.id, sev: r.sev, msg: String(r.msg).replace('{n}', String(n)), line: line });
}
function strings(raw) {
  var m = raw.match(/"[^"]*"/g);
  return m ? m.map(function (s) { return s.slice(1, -1); }) : [];
}
function tags(rec) {
  var t = {};
  rec.split(';').forEach(function (part) {
    var kv = part.split('=');
    if (kv.length < 2) return;
    var k = kv[0].trim().toLowerCase();
    if (k) t[k] = kv.slice(1).join('=').trim();
  });
  return t;
}
function owner(raw) {
  if (!/^\S/.test(raw)) return null;
  if (!/\bTXT\b/i.test(raw)) return null;
  var first = raw.split(/\s+/)[0];
  return first ? first.toLowerCase().replace(/\.$/, '') : null;
}

function checkSpf(rec, line, out) {
  var terms = rec.split(/\s+/).slice(1);
  var lookups = 0, hasAll = false, passAll = false, hasPtr = false, hasRedirect = false;
  for (var i = 0; i < terms.length; i++) {
    var t = terms[i].replace(/[",;)]+$/, '');
    if (!t) continue;
    var q = '';
    if (/^[+\-~?]/.test(t)) { q = t.charAt(0); t = t.slice(1); }
    var name = t.split(/[:\/=]/)[0].toLowerCase();
    if (name === 'include' || name === 'a' || name === 'mx' || name === 'ptr' || name === 'exists') lookups++;
    if (name === 'redirect' && /^redirect=/i.test(t)) { lookups++; hasRedirect = true; }
    if (name === 'ptr') hasPtr = true;
    if (name === 'all') { hasAll = true; if (q === '' || q === '+') passAll = true; }
  }
  if (lookups > 10) push(out, 'spf_lookup_limit', line, lookups);
  else if (lookups >= 7) push(out, 'spf_lookup_near', line, lookups);
  if (passAll) push(out, 'spf_pass_all', line);
  if (hasPtr) push(out, 'spf_ptr', line);
  if (!hasAll && !hasRedirect) push(out, 'spf_no_all', line);
  return lookups;
}
function checkDmarc(rec, raw, prev, line, out) {
  var t = tags(rec);
  if (!t.p) push(out, 'dmarc_missing_p', line);
  else if (t.p.toLowerCase() === 'none') push(out, 'dmarc_p_none', line);
  if (!t.rua) push(out, 'dmarc_no_rua', line);
  if (t.sp && t.sp.toLowerCase() === 'none' && t.p && t.p.toLowerCase() !== 'none') push(out, 'dmarc_sp_none', line);
  if (t.pct) push(out, 'dmarc_pct', line, t.pct);                                   // RFC 9989 A.6 (2026-05) — pct removed
  if (t.t && /^y/i.test(t.t)) push(out, 'dmarc_t_test', line);                      // RFC 9989 4.7 — test mode
  if (t.np && t.np.toLowerCase() === 'none') push(out, 'dmarc_np_none', line);      // RFC 9989 4.7 — non-existent subdomains
  if (t.rua) {
    var own = (owner(raw) || '').replace(/^_dmarc\./, '');
    var hosts = [];
    (t.rua.match(/mailto:[^\s,;!]+/gi) || []).forEach(function (u) {
      var h = u.split('@')[1];
      if (!h) return;
      h = h.toLowerCase().replace(/\.$/, '');
      if (own && (h === own || h.slice(-(own.length + 1)) === '.' + own)) return;   // same organizational domain — no authorisation record needed
      if (hosts.indexOf(h) < 0) hosts.push(h);
    });
    if (own && hosts.length) push(out, 'dmarc_rua_external', line, hosts.join(', '));  // RFC 9990 4 — external destination verification
  }
  if (!/_dmarc/i.test(raw + '\n' + prev)) push(out, 'dmarc_owner', line);
}
function checkDkim(rec, line, out) {
  var t = tags(rec);
  var p = (t.p || '').replace(/\s+/g, '');
  if (!p) push(out, 'dkim_p_empty', line);
  else if (p.length < 250) push(out, "dkim_key_short", line, p.length);
  if (t.t && /(^|:)y(:|$)/i.test(t.t)) push(out, 'dkim_test_mode', line);
}

function check(text, opts) {
  opts = opts || {};
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var out = [], seen = {}, records = 0;
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    if (/^\s*[;#]/.test(raw)) continue;
    var parts = strings(raw);
    var joined = parts.length ? parts.join('') : raw;
    var isSpf = /v=spf1\b/i.test(joined), isDmarc = /v=DMARC1\b/i.test(joined), isDkim = /v=DKIM1\b/i.test(joined);
    if (!isSpf && !isDmarc && !isDkim) continue;
    records++;
    var line = i + 1;
    for (var s = 0; s < parts.length; s++) if (parts[s].length > 255) push(out, 'spf_string_255', line, parts[s].length);
    if (isSpf) {
      var own = owner(raw);
      if (own) { if (seen[own]) push(out, 'spf_duplicate', line); seen[own] = true; }
      checkSpf(joined.slice(joined.search(/v=spf1\b/i)).trim(), line, out);
    }
    if (isDmarc) {
      var prev = lines.slice(Math.max(0, i - 4), i).join('\n');
      checkDmarc(joined.slice(joined.search(/v=DMARC1\b/i)).trim(), raw, prev, line, out);
    }
    if (isDkim) checkDkim(joined.slice(joined.search(/v=DKIM1\b/i)).trim(), line, out);
  }
  out.sort(function (a, b) { return (a.line || 0) - (b.line || 0); });
  return { findings: out, records: records, rules: RULES.length, today: opts.today || '' };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.SPFENGINE = API;
