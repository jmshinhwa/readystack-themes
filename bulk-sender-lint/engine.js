// Bulk Sender Lint - the brain. Same file runs in Node (VS Code extension) and in the browser (free web check).
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.BULK_RULES;

function lineOf(text, index) { return text.slice(0, index).split('\n').length; }
function rx(p, extra) { return new RegExp(p, 'i' + (extra || '')); }

function days(fromISO, toISO) {
  var a = Date.parse(fromISO + 'T00:00:00Z'), b = Date.parse(toISO + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}
function dated(rule, today) {
  if (!rule.since) return rule.msg + ' [' + rule.cite + ']';
  var d = days(rule.since, today), when;
  if (d === null) when = 'in force since ' + rule.since;
  else if (d >= 0) when = 'in force since ' + rule.since + ', ' + d + ' days ago';
  else when = 'takes effect ' + rule.since + ', in ' + (-d) + ' days';
  return rule.msg + ' (' + when + ') [' + rule.cite + ']';
}

// --- the SPF / DKIM / DMARC records and the unsubscribe headers found in the text ---
function records(text, re) {
  var out = [], m, g = new RegExp(re, 'gi');
  while ((m = g.exec(text))) { out.push({ s: m[0], line: lineOf(text, m.index) }); if (m.index === g.lastIndex) g.lastIndex++; }
  return out;
}
var SPF = "v=spf1[^\"'\\n]*", DMARC = "v=DMARC1[^\"'\\n]*", DKIM = "v=DKIM1[^\"'\\n]*";
var LOOKUP = /^[+\-~?]?(?:(?:include|exists|ptr|a|mx):\S+|redirect=\S+|a|mx|ptr)$/i;

var FN = {
  spf_lookups: function (text) {
    var hits = [];
    records(text, SPF).forEach(function (r) {
      var n = r.s.split(/\s+/).filter(function (t) { return LOOKUP.test(t); }).length;
      if (n > 10) hits.push({ line: r.line, extra: n + ' lookups in the record, limit is 10' });
    });
    return hits;
  },
  spf_multiple: function (text) {
    var r = records(text, SPF);
    return r.length > 1 ? [{ line: r[1].line, extra: r.length + ' v=spf1 records in this file' }] : [];
  },
  dmarc_pct: function (text) {
    var hits = [];
    records(text, DMARC).forEach(function (r) {
      var m = /pct=(\d+)/i.exec(r.s);
      if (m && parseInt(m[1], 10) < 100) hits.push({ line: r.line, extra: 'pct=' + m[1] + ', so ' + (100 - parseInt(m[1], 10)) + '% of failing mail is let through' });
    });
    return hits;
  },
  dkim_key: function (text) {
    var hits = [];
    records(text, DKIM).forEach(function (r) {
      var m = /p=([A-Za-z0-9+/=.]+)/.exec(r.s);
      if (m && m[1].length < 300) hits.push({ line: r.line, extra: m[1].length + ' base64 characters, a 2048-bit key is about 392' });
    });
    return hits;
  },
  bimi: function (text) {
    var b = records(text, "v=BIMI1[^\"'\\n]*");
    if (!b.length) return [];
    var d = records(text, DMARC);
    var enforced = d.some(function (r) { return /p=(quarantine|reject)/i.test(r.s); });
    return enforced ? [] : [{ line: b[0].line, extra: d.length ? 'DMARC is at p=none' : 'no DMARC record here' }];
  },
  unsub_post_value: function (text) {
    var hits = [];
    records(text, "List-Unsubscribe-Post[^\\n]*").forEach(function (r) {
      if (!/List-Unsubscribe\s*=\s*One-Click/i.test(r.s)) hits.push({ line: r.line, extra: 'value found: ' + r.s.slice(0, 80) });
    });
    return hits;
  },
  unsub_mailto: function (text) {
    var hits = [];
    records(text, "List-Unsubscribe(?!-Post)[\"']?\\s*[:=,][^\\n]*").forEach(function (r) {
      if (/mailto:/i.test(r.s) && !/https:\/\//i.test(r.s)) hits.push({ line: r.line, extra: 'header has mailto: and no https:// URI' });
    });
    return hits;
  },
  unsub_route: function (text) {
    var getJs = /\.get\s*\(\s*['"][^'"]*unsubscribe/i.exec(text);
    var postJs = /\.post\s*\(\s*['"][^'"]*unsubscribe/i.exec(text);
    if (getJs && !postJs) return [{ line: lineOf(text, getJs.index), extra: 'GET route found, no matching POST route' }];
    var py = /route\s*\(\s*['"][^'"]*unsubscribe[^'"]*['"][^)]*methods\s*=\s*\[[^\]]*\]/i.exec(text);
    if (py && !/POST/i.test(py[0])) return [{ line: lineOf(text, py.index), extra: 'route declares methods without POST' }];
    return [];
  }
};

function check(text, opts) {
  text = String(text == null ? '' : text);
  opts = opts || {};
  var today = opts.today || new Date().toISOString().slice(0, 10);
  var findings = [];
  function add(rule, line, extra) {
    findings.push({ check: rule.id, sev: rule.sev, line: line || 1, msg: (extra ? extra + '. ' : '') + dated(rule, today) });
  }
  RULES.forEach(function (rule) {
    if (rule.kind === 'forbid') {
      var seen = {}, m, g = new RegExp(rule.bad, 'gi'), n = 0;
      while ((m = g.exec(text)) && n < 10) {
        var ln = lineOf(text, m.index);
        if (!seen[ln]) { seen[ln] = 1; n++; add(rule, ln, null); }
        if (m.index === g.lastIndex) g.lastIndex++;
      }
    } else if (rule.kind === 'require_when') {
      var w = rx(rule.when).exec(text);
      if (w && !rx(rule.need).test(text)) add(rule, lineOf(text, w.index), null);
    } else if (rule.kind.indexOf('fn:') === 0) {
      var fn = FN[rule.kind.slice(3)];
      if (fn) fn(text).forEach(function (h) { add(rule, h.line, h.extra); });
    }
  });
  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings, checked: RULES.length, today: today };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.BULKENGINE = API;
