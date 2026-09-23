// Crypto Export Notice Lint — the brain. Same file runs in Node (extension) and in the browser (free web page).
'use strict';
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.XEXPORT_RULES;

var CRYPTO = /\b(aes|rsa|tls|ssl|libsodium|openssl|bouncycastle|chacha20|x25519|ed25519|encrypt(?:s|ed|ion)?|cryptograph\w+|cipher|keystore)\b/i;
var HEADING = /^(#{1,6})\s+(.*)$/;
var EXPORT_HEAD = /(export|encryption|cryptograph)/i;

function flat(s) { return String(s || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim(); }

function section(lines) {
  var start = -1, level = 0;
  for (var i = 0; i < lines.length; i++) {
    var m = HEADING.exec(lines[i]);
    if (m && EXPORT_HEAD.test(m[2])) { start = i; level = m[1].length; break; }
  }
  if (start < 0) return { found: false, from: 0, to: lines.length, line: 1 };
  var end = lines.length;
  for (var j = start + 1; j < lines.length; j++) {
    var h = HEADING.exec(lines[j]);
    if (h && h[1].length <= level) { end = j; break; }
  }
  return { found: true, from: start, to: end, line: start + 1 };
}

function lineOf(lines, from, to, re, fallback) {
  for (var i = from; i < to; i++) { if (re.test(lines[i])) return i + 1; }
  return fallback;
}

function days(fromISO, todayISO) {
  var a = Date.parse(fromISO + 'T00:00:00Z'), b = Date.parse(todayISO + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

function check(text, opts) {
  opts = opts || {};
  var todayISO = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today || '')) ? String(opts.today) : new Date().toISOString().slice(0, 10);
  var lines = String(text || '').replace(/\r/g, '').split('\n');
  var sec = section(lines);
  var body = flat(lines.slice(sec.from, sec.to).join(' '));
  var whole = flat(lines.join(' '));
  var findings = [];
  var R = {};
  for (var i = 0; i < RULES.length; i++) R[RULES[i].check] = RULES[i];

  function add(id, line, extra) {
    var r = R[id];
    if (!r) return;
    findings.push({ check: id, sev: r.sev, msg: extra ? r.msg + ' ' + extra : r.msg, line: line || 1 });
  }

  var cryptoHere = CRYPTO.test(whole);
  if (!cryptoHere) return { findings: findings, rules: RULES.length, today: todayISO };

  if (!sec.found) add('no_export_notice', lineOf(lines, 0, lines.length, CRYPTO, 1));
  if (!/crypt@bis\.doc\.gov/i.test(body)) add('missing_bis_email', sec.line);
  if (!/enc@nsa\.gov/i.test(body)) add('missing_nsa_email', sec.line);
  if (!/https?:\/\/[^\s)>\]]+/i.test(body)) add('missing_source_url', sec.line);
  if (!/\b5[ADE](?:002|992)\b/i.test(body)) add('missing_eccn', sec.line);

  var tsu = /740\s*\.\s*13\s*\(?\s*e\s*\)?|license exception tsu/i;
  if (tsu.test(body)) add('removed_tsu_citation', lineOf(lines, sec.from, sec.to, tsu, sec.line));

  var bogus = /not subject to (?:the )?(?:ear|export)|no export (?:licen[cs]e|restriction|control)|exempt from (?:the )?(?:ear|export)|\bEAR\s?99\b/i;
  if (bogus.test(body)) add('false_exemption_claim', lineOf(lines, sec.from, sec.to, bogus, sec.line));

  var dateRe = /\b(20\d{2})-(\d{2})-(\d{2})\b/;
  var dm = dateRe.exec(body);
  if (!dm) {
    add('missing_notification_date', sec.line);
  } else if (Number(dm[1]) < Number(todayISO.slice(0, 4))) {
    var n = days(dm[0], todayISO);
    add('stale_notification', lineOf(lines, sec.from, sec.to, dateRe, sec.line),
      'Last notification ' + dm[0] + ' — ' + (n === null ? 'unknown' : n) + ' days ago as of ' + todayISO + '.');
  }

  if (!/(url|internet location|location|mirror|host|repositor\w+)[^.]{0,140}chang/i.test(body)) add('missing_renotify_clause', sec.line);

  return { findings: findings, rules: RULES.length, today: todayISO };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof window !== 'undefined') window.XEXPORTENGINE = API;
if (typeof module !== 'undefined') module.exports = API;
