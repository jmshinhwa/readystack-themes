/*
 * Cron Schedule Lint - engine
 *
 * One brain, two homes: Node (the VS Code extension) and the browser.
 * Input  : the text of a crontab, a GitHub Actions workflow, a Kubernetes CronJob, a wrangler.toml,
 *          a vercel.json, a Dockerfile, a systemd timer or a scheduler call in code
 * Output : {findings: [{line, msg, sev, check, fix}]}
 *
 * Two passes, same as the old extension.js scan():
 *   1. every line against every rule in rules.json (plus opts.extra and the keyed rules feed)
 *   2. CRONX, the calendar engine: which instants each schedule really fires at, in which zone,
 *      and on which dates that wall-clock time does not exist or happens twice.
 */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.CSL_RULES;

/* ── CRONX ──────────────────────────────────────────────────────────────────
   One brain. This exact block is injected, byte for byte, into ext/extension.js
   and into index.html. It does the calendar arithmetic the regex rules cannot:
   which real instants a schedule fires at, in which zone, and on which dates
   that wall-clock time does not exist or happens twice.
   No dependencies. Uses Intl time-zone data, which ships with Node and browsers.
   ------------------------------------------------------------------------- */
var CRONX = (function () {
  'use strict';
  var DAY = 86400000;
  var DOW_NAMES = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
  var MON_NAMES = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
                    JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  // dialect -> how many fields, where the 5 calendar fields sit, how Sunday is numbered
  var DIALECT = {
    crontab:     { n: [5],    off: 0, sunday: 0, label: 'crontab / CronJob / Actions' },
    spring:      { n: [6],    off: 1, sunday: 0, label: 'Spring @Scheduled' },
    quartz:      { n: [6, 7], off: 1, sunday: 1, label: 'Quartz' },
    eventbridge: { n: [6],    off: 0, sunday: 1, label: 'EventBridge cron()' },
    nodecron:    { n: [5, 6], off: -1, sunday: 0, label: 'node-cron' }
  };
  var SHORTHAND = {
    '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *',
    '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *',
    '@hourly': '0 * * * *'
  };

  /* ---- time zone maths -------------------------------------------------- */
  var _fmt = {};
  function validZone(z) {
    if (!z || typeof z !== 'string') return false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return true; } catch (e) { return false; }
  }
  function fmt(zone) {
    if (!_fmt[zone]) {
      _fmt[zone] = new Intl.DateTimeFormat('en-US', {
        timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
    return _fmt[zone];
  }
  function parts(zone, ms) {
    var p = {}, a = fmt(zone).formatToParts(new Date(ms)), i;
    for (i = 0; i < a.length; i++) {
      if (a[i].type !== 'literal') p[a[i].type] = parseInt(a[i].value, 10);
    }
    if (p.hour === 24) p.hour = 0;
    return p;
  }
  function offsetMin(zone, ms) {
    var p = parts(zone, ms);
    return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
            - Math.floor(ms / 1000) * 1000) / 60000;
  }
  function localToUtc(zone, y, mo, d, h, mi) {
    var naive = Date.UTC(y, mo - 1, d, h, mi, 0);
    var o1 = offsetMin(zone, naive), ms = naive - o1 * 60000;
    var o2 = offsetMin(zone, ms);
    if (o2 !== o1) ms = naive - o2 * 60000;
    return ms;
  }
  // returns the instant, or null when that wall-clock minute does not exist in that zone
  function existsLocal(zone, y, mo, d, h, mi) {
    var ms = localToUtc(zone, y, mo, d, h, mi), p = parts(zone, ms);
    return (p.year === y && p.month === mo && p.day === d
            && p.hour === h && p.minute === mi) ? ms : null;
  }
  var _tr = {};
  // every offset change in the zone over the window, narrowed to the minute
  function transitions(zone, fromMs, days) {
    var key = zone + '|' + Math.floor(fromMs / DAY) + '|' + days;
    if (_tr[key]) return _tr[key];
    var out = [], step = 3600000, prev = offsetMin(zone, fromMs), end = fromMs + days * DAY, t, o;
    for (t = fromMs + step; t <= end; t += step) {
      o = offsetMin(zone, t);
      if (o !== prev) {
        var lo = t - step, hi = t, mid;
        while (hi - lo > 60000) {
          mid = lo + Math.floor((hi - lo) / 120000) * 60000;
          if (mid <= lo) mid = lo + 60000;
          if (offsetMin(zone, mid) === prev) lo = mid; else hi = mid;
        }
        out.push({ ms: hi, from: prev, to: o });
        prev = o;
      }
    }
    _tr[key] = out;
    return out;
  }

  /* ---- field expansion --------------------------------------------------- */
  function num(s, names) {
    s = String(s).trim().toUpperCase();
    if (names && Object.prototype.hasOwnProperty.call(names, s)) return names[s];
    if (!/^\d+$/.test(s)) return null;
    return parseInt(s, 10);
  }
  function expand(tok, lo, hi, names) {
    tok = String(tok).trim();
    var raw = tok, special = /[LW#]/i.test(tok);
    if (special) return null;
    if (tok === '?') tok = '*';
    var chunks = tok.split(','), seen = {}, i, j, stepUsed = 0, wildcard = (tok === '*');
    for (i = 0; i < chunks.length; i++) {
      var p = chunks[i], step = 1, m = p.match(/^(.*)\/(\d+)$/);
      if (m) { p = m[1]; step = parseInt(m[2], 10); if (!step) return null; stepUsed = step; }
      var a, b;
      if (p === '*' || p === '') { a = lo; b = hi; }
      else {
        var r = p.split('-');
        a = num(r[0], names);
        b = (r.length > 1) ? num(r[1], names) : (m ? hi : a);
        if (a === null || b === null) return null;
      }
      if (a < lo || b > hi) return null;
      if (a > b) {
        for (j = a; j <= hi; j += step) seen[j] = 1;
        for (j = lo; j <= b; j += step) seen[j] = 1;
      } else {
        for (j = a; j <= b; j += step) seen[j] = 1;
      }
    }
    var vals = Object.keys(seen).map(Number).sort(function (x, y) { return x - y; });
    if (!vals.length) return null;
    return { vals: vals, raw: raw, restricted: !(raw === '*' || raw === '?'),
             step: stepUsed, wildcard: wildcard, span: hi - lo + 1 };
  }

  /* ---- parse ------------------------------------------------------------- */
  function parse(expr, dialect) {
    var d = DIALECT[dialect] || DIALECT.crontab;
    var e = String(expr).trim();
    if (SHORTHAND[e.toLowerCase()]) { e = SHORTHAND[e.toLowerCase()]; d = DIALECT.crontab; }
    var f = e.split(/\s+/);
    if (d.n.indexOf(f.length) < 0) return { ok: false, why: 'fields', got: f.length, want: d.n };
    var off = d.off;
    if (off === -1) off = (f.length === 6) ? 1 : 0;          // node-cron: seconds are optional
    var mi = expand(f[off], 0, 59, null);
    var hr = expand(f[off + 1], 0, 23, null);
    var dom = expand(f[off + 2], 1, 31, null);
    var mon = expand(f[off + 3], 1, 12, MON_NAMES);
    var dowLo = d.sunday === 1 ? 1 : 0, dowHi = d.sunday === 1 ? 7 : 7;
    var dowNames = {}, k;
    for (k in DOW_NAMES) if (Object.prototype.hasOwnProperty.call(DOW_NAMES, k)) {
      dowNames[k] = DOW_NAMES[k] + (d.sunday === 1 ? 1 : 0);
    }
    var dow = expand(f[off + 4], dowLo, dowHi, dowNames);
    if (!mi || !hr || !dom || !mon || !dow) return { ok: false, why: 'field-value' };
    // normalise day-of-week to 0=Sunday .. 6=Saturday
    var norm = {}, i;
    for (i = 0; i < dow.vals.length; i++) {
      var v = dow.vals[i];
      norm[d.sunday === 1 ? (v - 1) : (v === 7 ? 0 : v)] = 1;
    }
    dow.vals = Object.keys(norm).map(Number).sort(function (x, y) { return x - y; });
    return { ok: true, mi: mi, hr: hr, dom: dom, mon: mon, dow: dow,
             dialect: dialect || 'crontab', label: d.label, expr: e };
  }

  function dayMatches(s, y, mo, d) {
    if (s.mon.vals.indexOf(mo) < 0) return false;
    var w = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
    var dOK = s.dom.vals.indexOf(d) >= 0, wOK = s.dow.vals.indexOf(w) >= 0;
    if (s.dom.restricted && s.dow.restricted) return dOK || wOK;   // POSIX: union, not intersection
    if (s.dom.restricted) return dOK;
    if (s.dow.restricted) return wOK;
    return true;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(y, mo, d, h, mi) {
    return y + '-' + pad(mo) + '-' + pad(d) + ' ' + pad(h) + ':' + pad(mi);
  }

  function nextRuns(s, zone, fromMs, count) {
    var p = parts(zone, fromMs), cur = Date.UTC(p.year, p.month - 1, p.day), out = [], k;
    for (k = 0; k < 1500 && out.length < count; k++) {
      var dt = new Date(cur + k * DAY);
      var yy = dt.getUTCFullYear(), mm = dt.getUTCMonth() + 1, dd = dt.getUTCDate();
      if (!dayMatches(s, yy, mm, dd)) continue;
      for (var a = 0; a < s.hr.vals.length && out.length < count; a++) {
        for (var b = 0; b < s.mi.vals.length && out.length < count; b++) {
          var H = s.hr.vals[a], M = s.mi.vals[b];
          var ms = existsLocal(zone, yy, mm, dd, H, M);
          if (ms === null || ms <= fromMs) continue;
          out.push({ ms: ms, txt: stamp(yy, mm, dd, H, M) });
        }
      }
    }
    return out;
  }
  function daysMatching(s, fromMs, days) {
    var d0 = new Date(fromMs), cur = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate());
    var n = 0, k;
    for (k = 0; k < days; k++) {
      var dt = new Date(cur + k * DAY);
      if (dayMatches(s, dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())) n++;
    }
    return n;
  }
  function monthsWithoutADay(s) {
    var LEN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var NM = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
              'August', 'September', 'October', 'November', 'December'];
    if (!s.dom.restricted || s.dow.restricted) return [];
    var out = [], m, i, hit;
    for (m = 0; m < 12; m++) {
      if (s.mon.vals.indexOf(m + 1) < 0) continue;
      hit = false;
      for (i = 0; i < s.dom.vals.length; i++) if (s.dom.vals[i] <= LEN[m]) { hit = true; break; }
      if (!hit) out.push(NM[m]);
    }
    return out;
  }
  // wall-clock minutes that do not exist, or happen twice, in the window
  function dstHits(s, zone, fromMs, days) {
    var tr = transitions(zone, fromMs, days), res = [], i, q;
    for (i = 0; i < tr.length; i++) {
      var t = tr[i], delta = t.to - t.from, n = Math.abs(delta);
      if (!n) continue;
      var base = (delta > 0) ? (t.ms + t.from * 60000) : (t.ms + t.to * 60000);
      for (q = 0; q < n; q++) {
        var nz = new Date(base + q * 60000);
        var yy = nz.getUTCFullYear(), mm = nz.getUTCMonth() + 1, dd = nz.getUTCDate();
        var H = nz.getUTCHours(), M = nz.getUTCMinutes();
        if (s.mi.vals.indexOf(M) >= 0 && s.hr.vals.indexOf(H) >= 0 && dayMatches(s, yy, mm, dd)) {
          res.push({ kind: delta > 0 ? 'gap' : 'dup', at: stamp(yy, mm, dd, H, M) });
        }
      }
    }
    return res;
  }

  /* ---- pulling schedules out of a file ----------------------------------- */
  var EXPR = "[0-9A-Za-z*?,/\\-]+(?:\\s+[0-9A-Za-z*?,/\\-]+){4,6}";
  function docZone(text, fallback) {
    var m = String(text).match(/^[ \t-]*(?:timeZone|time_zone)\s*:\s*["']?([A-Za-z]+\/[A-Za-z_+\-0-9\/]+)/m);
    if (m && validZone(m[1])) return { zone: m[1], why: 'spec.timeZone in this file' };
    m = String(text).match(/^\s*(?:CRON_TZ|TZ)\s*=\s*["']?([A-Za-z]+\/[A-Za-z_+\-0-9\/]+)/m);
    if (m && validZone(m[1])) return { zone: m[1], why: 'CRON_TZ in this file' };
    return { zone: fallback, why: 'the zone you picked' };
  }
  function findSchedules(text, fallbackZone) {
    var lines = String(text).split(/\r?\n/), out = [], i, m;
    var dz = docZone(text, fallbackZone);
    for (i = 0; i < lines.length; i++) {
      var L = lines[i], n = i + 1, hit = null;
      if (/^\s*#/.test(L) && !/cron/i.test(L)) continue;
      if ((m = L.match(new RegExp("-\\s*cron\\s*:\\s*['\"]\\s*(" + EXPR + ")\\s*['\"]")))) {
        hit = { expr: m[1], dialect: 'crontab', zone: 'UTC', src: 'GitHub Actions', forced: true };
      } else if ((m = L.match(new RegExp("\"schedule\"\\s*:\\s*\"\\s*(" + EXPR + ")\\s*\"")))) {
        hit = { expr: m[1], dialect: 'crontab', zone: 'UTC', src: 'Vercel cron', forced: true };
      } else if ((m = L.match(new RegExp("^\\s*schedule\\s*:\\s*['\"]?\\s*(" + EXPR + ")\\s*['\"]?\\s*$")))) {
        hit = { expr: m[1], dialect: 'crontab', zone: dz.zone, src: 'Kubernetes CronJob', forced: false };
      } else if ((m = L.match(new RegExp("^\\s*crons\\s*=\\s*\\[\\s*\"\\s*(" + EXPR + ")\\s*\"")))) {
        hit = { expr: m[1], dialect: 'crontab', zone: 'UTC', src: 'Cloudflare Workers', forced: true };
      } else if ((m = L.match(new RegExp("cron\\(\\s*(" + EXPR + ")\\s*\\)")))) {
        hit = { expr: m[1], dialect: 'eventbridge', zone: 'UTC', src: 'EventBridge rule', forced: true };
      } else if ((m = L.match(new RegExp("@Scheduled\\s*\\([^)]*cron\\s*=\\s*\"\\s*(" + EXPR + ")\\s*\"")))) {
        hit = { expr: m[1], dialect: 'spring', zone: dz.zone, src: 'Spring @Scheduled', forced: false };
      } else if ((m = L.match(new RegExp("cronSchedule\\s*\\(\\s*\"\\s*(" + EXPR + ")\\s*\"")))) {
        hit = { expr: m[1], dialect: 'quartz', zone: dz.zone, src: 'Quartz', forced: false };
      } else if ((m = L.match(new RegExp("cron\\.schedule\\s*\\(\\s*['\"]\\s*(" + EXPR + ")\\s*['\"]")))) {
        hit = { expr: m[1], dialect: 'nodecron', zone: dz.zone, src: 'node-cron', forced: false };
      } else if ((m = L.match(/^\s*(@(?:yearly|annually|monthly|weekly|daily|midnight|hourly))\s+\S/))) {
        hit = { expr: m[1], dialect: 'crontab', zone: dz.zone, src: 'crontab', forced: false };
      } else if ((m = L.match(new RegExp("^\\s*([0-9*/,\\-]+\\s+[0-9*/,\\-]+\\s+[0-9A-Za-z*/,\\-]+\\s+[0-9A-Za-z*/,\\-]+\\s+[0-9A-Za-z*/,\\-]+)\\s+\\S")))) {
        hit = { expr: m[1], dialect: 'crontab', zone: dz.zone, src: 'crontab', forced: false };
      }
      if (hit) { hit.line = n; hit.zoneWhy = hit.forced ? 'this platform runs schedules in UTC only' : dz.why; out.push(hit); }
    }
    return out;
  }

  /* ---- the findings the regex table cannot produce ------------------------ */
  function analyzeText(text, fallbackZone, nowMs) {
    var zone0 = validZone(fallbackZone) ? fallbackZone : 'UTC';
    var now = nowMs || Date.now();
    var found = findSchedules(text, zone0), out = [], i;
    for (i = 0; i < found.length; i++) {
      var f = found[i], s = parse(f.expr, f.dialect);
      if (!s.ok) {
        // a wrong FIELD COUNT is already named by the rule table; a wrong VALUE is not
        if (s.why === 'field-value') {
          out.push({ line: f.line, sev: 'error', engine: true,
            msg: f.src + ' \u00b7 ' + f.expr + ' \u2014 this cannot be read as '
               + (DIALECT[f.dialect] || DIALECT.crontab).label + '. A field is out of range '
               + '(minute 0-59, hour 0-23, day 1-31, month 1-12), or it uses L, W or # '
               + 'which only Quartz understands. Nothing runs.' });
        }
        continue;
      }
      var runs = nextRuns(s, f.zone, now, 3);
      var perYear = daysMatching(s, now, 365) * s.hr.vals.length * s.mi.vals.length;
      if (!runs.length) {
        out.push({ line: f.line, sev: 'error', engine: true,
          msg: f.src + ' \u00b7 ' + f.expr + ' \u2014 this schedule never fires. '
             + 'No date in the next four years satisfies it.' });
        continue;
      }
      // ⛔runs may hold fewer than three: a leap-day schedule has one hit in four years.
      var when = [];
      for (var w = 0; w < runs.length; w++) when.push(runs[w].txt);
      out.push({ line: f.line, sev: 'info', engine: true,
        msg: f.src + ' \u00b7 ' + f.expr + ' \u2014 fires next at ' + when.join(', ')
           + (runs.length < 3 ? ' (and not again inside the next four years)' : '')
           + ' ' + f.zone + ' (' + f.zoneWhy + ') \u00b7 ' + perYear
           + (perYear === 1 ? ' run' : ' runs') + ' in the next 365 days.' });
      var skipped = monthsWithoutADay(s);
      if (skipped.length) {
        out.push({ line: f.line, sev: 'error', engine: true,
          msg: 'Day-of-month ' + s.dom.raw + ' never occurs in ' + skipped.join(', ')
             + '. This schedule is silently absent in ' + skipped.length
             + ' month' + (skipped.length > 1 ? 's' : '') + ' of every year.' });
      }
      if (s.dom.restricted && s.dow.restricted) {
        out.push({ line: f.line, sev: 'error', engine: true,
          msg: 'Day-of-month and day-of-week are both restricted, so POSIX cron takes the UNION: '
             + 'this fires on day ' + s.dom.raw + ' of the month OR on weekday ' + s.dow.raw
             + ', which is ' + perYear + ' runs a year, not the one you meant. '
             + 'Leave one of the two fields as *.' });
      }
      var fields = [['minute', s.mi], ['hour', s.hr], ['day-of-month', s.dom], ['month', s.mon]];
      for (var q = 0; q < fields.length; q++) {
        var fld = fields[q][1];
        if (fld.step > 1 && fld.raw.indexOf('*/') === 0 && (fld.span % fld.step) !== 0) {
          var last = fld.vals[fld.vals.length - 1];
          out.push({ line: f.line, sev: 'warn', engine: true,
            msg: 'Step ' + fld.raw + ' does not divide the ' + fields[q][0] + ' field. '
               + 'It restarts at the top of every cycle, so the gap between the last run ('
               + last + ') and the next is ' + (fld.span - last + fld.vals[0]) + ', not ' + fld.step + '.' });
        }
      }
      var hits = dstHits(s, f.zone, now, 366);
      for (var h = 0; h < hits.length && h < 2; h++) {
        out.push({ line: f.line, sev: 'error', engine: true,
          msg: hits[h].kind === 'gap'
            ? ('On ' + hits[h].at + ' the clock in ' + f.zone + ' jumps forward and this wall-clock '
               + 'time does not exist at all. Move the job outside the transition hour.')
            : ('On ' + hits[h].at + ' the clock in ' + f.zone + ' goes back and this wall-clock '
               + 'time happens twice. Whether your scheduler fires once or twice here is '
               + 'implementation-defined - move the job outside the transition hour.') });
      }
    }
    return out;
  }

  return { validZone: validZone, parse: parse, expand: expand, nextRuns: nextRuns, dstHits: dstHits,
           findSchedules: findSchedules, analyzeText: analyzeText, transitions: transitions,
           existsLocal: existsLocal, offsetMin: offsetMin, daysMatching: daysMatching,
           monthsWithoutADay: monthsWithoutADay, dayMatches: dayMatches };
})();

  function localZone() {
    var z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return CRONX.validZone(z) ? z : 'UTC';
  }

  // opts.today / opts.path are accepted for the shared call shape; the calendar pass runs from opts.now (ms) or the clock
  function check(text, opts) {
    opts = opts || {};
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
    var rules = RULES.concat(Array.isArray(opts.extra) ? opts.extra : [], feed);
    var findings = [];
    var i, r, re, c;
    for (i = 0; i < lines.length; i++) {
      for (r = 0; r < rules.length; r++) {
        if (!rules[r]) continue;
        try { re = new RegExp(rules[r].pattern, rules[r].flags || ''); } catch (e) { continue; }
        if (re.test(lines[i])) {
          findings.push({ line: i + 1, msg: rules[r].message, sev: rules[r].sev || 'warn',
                          check: rules[r].id || ('rule-' + (r + 1)), fix: rules[r].fix || null });
        }
      }
    }
    var computed = CRONX.analyzeText(text, opts.zone || localZone(), opts.now);
    for (c = 0; c < computed.length; c++) {
      findings.push({ line: computed[c].line, msg: computed[c].msg, sev: computed[c].sev, check: 'calendar', fix: null });
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return {findings: findings};
  }

  var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length, CRONX: CRONX};

  if (typeof module !== 'undefined') { module.exports = API; }
  if (typeof window !== 'undefined') { window.CSLENGINE = API; }
})();
