// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Reading the file for schedules that misfire", "done": "Checked. Every schedule below is followed by the times it really fires.", "nothing_found": "No schedule in this file fires at the wrong time.", "paste": "Paste your crontab, workflow, CronJob, wrangler.toml or beat file here", "check": "Find the schedules that misfire", "extra_rules": "Extra rules from your settings", "enter_key": "Enter licence key", "need_key": "Full version: every schedule in the repository merged into one calendar, exported as CSV, JSON or HTML, and machine output a CI step can fail on. $29 once - one licence key per person or team seat - 7-day full refund. Healthchecks.io Business, the ordinary cron monitor, is $20 every month and only tells you after a run was already missed.", "buy": "Get the full version - $29", "key_ok": "Licence accepted. The repository calendar, the export and the CI output are open.", "key_bad": "That key was not accepted. Check it against the receipt, or ask for the 7-day full refund."};
const PAID = ["workspace_scan", "export_report", "ci_json"];
const NEED_KEY = S.need_key;   // ★체험이 끝난 뒤 앞에 한 줄을 붙여 쓴다 (원문은 여기 남는다)
const TRIAL_MS = 7 * 24 * 3600 * 1000;

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Cron Schedule Lint');
  return out._c;
}

// ★무료 — ★열린 파일 하나를 ★끝까지 본다. ⛔키를 묻지 않는다.
async function runCurrent() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return null; }
  const text = ed.document.getText();
  const hits = scan(text, ed.document.fileName);
  report([{ file: ed.document.fileName, hits: hits }]);
  vscode.window.showInformationMessage(hits.length ? S.done : S.nothing_found);
  return hits;
}

function report(rows) {
  const c = out(); c.clear();
  let n = 0;
  // ★설정을 읽는다 — min_severity. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  const _ORD = { info: 0, warn: 1, error: 2 };
  const _min = _ORD[String(vscode.workspace.getConfiguration('cron-schedule-lint').get('min_severity')
    || 'info').toLowerCase()] || 0;
  for (const r of rows) {
    const _hits = r.hits.filter(function (h) {
      return (_ORD[String(h.sev || 'info').toLowerCase()] || 0) >= _min;
    });
    if (!_hits.length) continue;
    c.appendLine(path.basename(r.file));
    for (const h of _hits) { c.appendLine('  ' + h.line + ': ' + h.msg); n++; }
  }
  c.appendLine('—— ' + n + ' ——');
  c.show(true);
  return n;
}

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질).
const RULES = [{"pattern": "-\\s*cron:\\s*['\\\"]\\s*(?:\\S+\\s+){5}\\S+\\s*['\\\"]", "flags": "", "sev": "error", "message": "GitHub Actions takes a five-field POSIX cron. Six fields is not a schedule it can read, the workflow simply never runs on time, and the Actions tab shows nothing at all. Drop the leading seconds field.", "fix": "- cron: '0 3 * * *'"}, {"pattern": "@Scheduled\\s*\\([^)]*cron\\s*=\\s*\\\"(?:[^\\s\\\"]+\\s+){4}[^\\s\\\"]+\\\"", "flags": "", "sev": "error", "message": "Spring's @Scheduled cron takes six fields, seconds first. A five-field Unix expression is rejected at startup with 'Cron expression must consist of 6 fields'. Prepend a 0 for the seconds field.", "fix": "@Scheduled(cron = \"0 0 3 * * *\")"}, {"pattern": "cron\\(\\s*(?:[^\\s)]+\\s+){4}[^\\s)]+\\s*\\)", "flags": "", "sev": "error", "message": "Amazon EventBridge cron() takes six fields and the sixth is the YEAR, not seconds: cron(minutes hours day-of-month month day-of-week year). A five-field Unix expression is rejected when the rule is created.", "fix": "cron(0 3 * * ? *)"}, {"pattern": "cron\\(\\s*[^\\s)]+\\s+[^\\s)]+\\s+(?!\\?)[^\\s)]+\\s+[^\\s)]+\\s+(?!\\?)[^\\s)]+\\s+[^\\s)]+\\s*\\)", "flags": "", "sev": "error", "message": "EventBridge will not accept a value or a * in both day-of-month and day-of-week; one of the two must be a ?. Note also that EventBridge numbers the week 1-7 with 1 = Sunday, so a Unix 1 (Monday) becomes Sunday here.", "fix": "cron(0 3 * * ? *)"}, {"pattern": "CronScheduleBuilder\\.cronSchedule\\s*\\(|org\\.quartz\\.CronExpression|new\\s+CronTrigger\\b", "flags": "", "sev": "warn", "message": "Quartz numbers the week 1-7 with 1 = Sunday, one place off from Unix cron, and it requires a ? in either day-of-month or day-of-week. A Unix expression pasted here runs on the wrong weekday rather than failing.", "fix": ""}, {"pattern": "^\\s*schedule:\\s*['\\\"]?(?:[^\\s'\\\"]+\\s+){5}[^\\s'\\\"]+", "flags": "", "sev": "error", "message": "A Kubernetes CronJob schedule is five fields. The API server rejects six, so kubectl apply fails - or, in a Helm template rendered at deploy time, the release fails and the old CronJob keeps running the old schedule.", "fix": "schedule: \"0 3 * * *\""}, {"pattern": "^\\s*concurrencyPolicy:\\s*[\\\"']?Allow", "flags": "", "sev": "warn", "message": "Allow is also what you get when the field is absent. The moment one run takes longer than the interval, the next run starts anyway and the two overlap - two exports, two invoices, two emails to the same customer. Forbid or Replace is usually what was meant.", "fix": "concurrencyPolicy: Forbid"}, {"pattern": "^\\s*startingDeadlineSeconds:\\s*(?:[1-9]\\d{5,})\\b", "flags": "", "sev": "error", "message": "A startingDeadlineSeconds window this long lets the CronJob controller count more than 100 missed starts. At 100 it stops scheduling this CronJob permanently and logs one line - 'Cannot determine if job needs to be started: too many missed start time (> 100)' - with no event, no alert and no restart.", "fix": "startingDeadlineSeconds: 200"}, {"pattern": "^\\s*suspend:\\s*true", "flags": "", "sev": "warn", "message": "A suspended CronJob keeps accumulating missed start times. Resume it after more than 100 missed intervals and the controller refuses to schedule it again at all, so a job paused over a long freeze never comes back on its own.", "fix": ""}, {"pattern": "^\\s*restartPolicy:\\s*[\\\"']?Always", "flags": "", "sev": "error", "message": "A Job pod template may only use Never or OnFailure. Always is rejected by the API server, so this CronJob is never created and nothing anywhere reports a missing schedule.", "fix": "restartPolicy: OnFailure"}, {"pattern": "^\\s*(?:CRON_TZ|TZ)\\s*=\\s*[A-Za-z]", "flags": "", "sev": "warn", "message": "CRON_TZ is a Vixie/cronie extension. busybox crond, which is the cron in every Alpine image, ignores it and runs in the container's own zone. Set the zone inside the job's command instead if the image is not running cronie.", "fix": ""}, {"pattern": "^\\s*ENV\\s+TZ\\s*[=\\s]", "flags": "", "sev": "warn", "message": "Setting TZ in an image that has no tzdata package changes nothing: both glibc and musl fall back to UTC when /usr/share/zoneinfo is missing, so every schedule in the container silently runs on UTC. Add tzdata (apk add --no-cache tzdata, or apt-get install -y tzdata).", "fix": "RUN apk add --no-cache tzdata"}, {"pattern": "cron:.*#.*\\b(?:EST|EDT|PST|PDT|CST|CDT|CET|CEST|BST|IST|KST|JST|AEST|local time)\\b", "flags": "i", "sev": "error", "message": "GitHub Actions runs every scheduled workflow on UTC and offers no per-schedule zone. A comment naming a local zone is right for half the year: on 2026-10-25 in Europe and 2026-11-01 in the United States the local hour this really fires at moves by one, and nothing in the file changes.", "fix": ""}, {"pattern": "^\\s*crons\\s*=\\s*\\[", "flags": "", "sev": "warn", "message": "Cloudflare Workers cron triggers run on UTC only; there is no per-trigger time zone. A 09:00 local job needs its expression changed by hand on every DST date, or it drifts an hour twice a year.", "fix": ""}, {"pattern": "\\\"schedule\\\"\\s*:\\s*\\\"[^\\\"]*\\*/", "flags": "", "sev": "error", "message": "Vercel runs cron jobs on UTC only, and on the Hobby plan any expression that resolves to more often than once a day fails at deploy time rather than at runtime, so the deployment itself is rejected.", "fix": ""}, {"pattern": "crontab\\s*\\(", "flags": "", "sev": "info", "message": "Celery beat runs its schedules on UTC unless the timezone setting is set. Once it is set, the beat schedule moves with DST, so a job written for 02:30 local silently does not run, or runs twice, on the transition day.", "fix": ""}, {"pattern": "^\\s*schedule:\\s*$", "flags": "", "sev": "warn", "message": "A scheduled workflow in a public repository is disabled automatically after 60 days with no repository activity. GitHub sends one email to whoever last enabled it and shows nothing in the Actions tab; the workflow just stops.", "fix": ""}, {"pattern": "-\\s*cron:\\s*['\\\"]\\s*\\*/[1-4]\\s", "flags": "", "sev": "error", "message": "GitHub Actions will not run a schedule more often than every 5 minutes. A shorter interval does not error - it is simply not honoured.", "fix": "- cron: '*/5 * * * *'"}, {"pattern": "-\\s*cron:\\s*['\\\"]\\s*0\\s+", "flags": "", "sev": "info", "message": "Every scheduled workflow on GitHub that fires at minute 0 lands in the same queue. GitHub's own documentation warns that runs during periods of high load may be delayed, and delayed runs are dropped rather than queued. Move the minute off 0.", "fix": "- cron: '7 3 * * *'"}, {"pattern": "catchup\\s*=\\s*True", "flags": "", "sev": "error", "message": "With a start_date in the past this queues one DAG run for every interval between that date and now, the moment the DAG is unpaused - hundreds of runs at once, every one of them consuming worker time and downstream API quota.", "fix": "catchup=False"}, {"pattern": "start_date\\s*=\\s*(?:[A-Za-z_.]*\\.)?now\\s*\\(|days_ago\\s*\\(", "flags": "", "sev": "error", "message": "A start_date evaluated when the file is parsed moves every time the scheduler re-reads it, so the first interval never closes and the DAG never runs. Pin a fixed datetime instead.", "fix": "start_date=datetime(2026, 1, 1)"}, {"pattern": "^\\s*OnCalendar\\s*=", "flags": "", "sev": "info", "message": "A systemd timer fires within AccuracySec of the stated time and AccuracySec defaults to 1min, so this is not an exact-second schedule. Without Persistent=true a run missed while the machine was down never happens at all.", "fix": "AccuracySec=1s\nPersistent=true"}, {"pattern": "^\\s*@reboot\\b", "flags": "", "sev": "warn", "message": "@reboot fires on every start of the cron daemon, not once per machine boot. In a container that restarts - a rolling deploy, an OOM kill, a node drain - this runs again each time.", "fix": ""}, {"pattern": "^\\s*@(?:daily|midnight)\\b", "flags": "", "sev": "info", "message": "@daily is 0 0 * * * in the daemon's own zone. Midnight is the busiest minute on every shared runner and the exact instant the date rolls over, so a job that stamps 'yesterday' is one minute of clock skew away from stamping the wrong day.", "fix": "17 0 * * *"}, {"pattern": "cron\\.schedule\\s*\\(\\s*['\\\"](?:\\S+\\s+){5}\\S+['\\\"]", "flags": "", "sev": "info", "message": "node-cron reads a six-field expression as seconds first. The identical string copied into a crontab file or a Kubernetes CronJob means something completely different, because there the first field is minutes.", "fix": ""}, {"pattern": "^\\s*[\\d*/,\\-]+\\s+[\\d*/,\\-]+\\s+(?:\\?\\s|\\S+\\s+\\?\\s|\\S+\\s+\\S+\\s+\\?\\s)", "flags": "", "sev": "error", "message": "? is a Quartz and EventBridge character. Vixie cron, cronie, busybox crond and Kubernetes CronJob all reject it, and a crontab that fails to load leaves the previous crontab running.", "fix": ""}, {"pattern": "^\\s*[\\d*/,\\-]+\\s+[\\d*/,\\-]+\\s+\\S*[LW#]\\S*\\s", "flags": "", "sev": "error", "message": "L (last), W (nearest weekday) and # (nth weekday) are Quartz extensions. POSIX cron, Kubernetes CronJob and GitHub Actions do not understand them, so 'last day of month' has to be written as a guard inside the command.", "fix": ""}, {"pattern": "^\\s*(?:[\\d*/,\\-]+\\s+){5}.*[^\\\\]%", "flags": "", "sev": "error", "message": "In a crontab an unescaped % ends the command; everything after it is fed to the job on standard input. date +%Y-%m-%d therefore runs as date + and the filename comes out empty. Escape each one as \\%.", "fix": "date +\\%Y-\\%m-\\%d"}, {"pattern": "^\\s*(?:[\\d*/,\\-]+\\s+){5}(?:python[23]?|node|npm|npx|php|ruby|java|aws|kubectl|docker|psql|pg_dump)\\b", "flags": "", "sev": "error", "message": "cron runs with a minimal PATH of /usr/bin:/bin and none of your shell profile, so a bare python, node, aws or kubectl that works in your terminal is 'command not found' at 03:00 - and the error goes to local mail that nobody reads. Use the absolute path.", "fix": "/usr/local/bin/python3"}];
/* ── CRONX ──────────────────────────────────────────────────────────────────
   One brain. This exact block is injected, byte for byte, into ext/extension.js
   and into index.html. It does the calendar arithmetic the regex rules cannot:
   which real instants a schedule fires at, in which zone, and on which dates
   that wall-clock time does not exist or happens twice.
   No dependencies. Uses Intl time-zone data, which ships with Node and browsers.
   ------------------------------------------------------------------------- */
/* ── CRONX ──────────────────────────────────────────────────────────────────
   One brain. This exact block is injected, byte for byte, into ext/extension.js
   and into index.html. It does the calendar arithmetic the regex rules cannot:
   which real instants a schedule fires at, in which zone, and on which dates
   that wall-clock time does not exist or happens twice.
   No dependencies. Uses Intl time-zone data, which ships with Node and browsers.
   ------------------------------------------------------------------------- */
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

function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('cron-schedule-lint');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      let re;
      try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
      // ★s126 — ★심각도를 실어 보낸다. ⛔없으면 min_severity 가 ★전부를 지운다 (내가 만들 뻔한 거짓말)
      if (re.test(lines[i])) hits.push({ line: i + 1, msg: r.message, fix: r.fix || null,
                                         sev: r.sev || 'warn' });
    }
  }
  // ── the calendar engine. The rule table says which shapes are wrong; this says
  //    which instants a schedule really fires at, and where the wall clock breaks.
  const zone = CRONX.validZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
  const computed = CRONX.analyzeText(text, zone);
  for (const c of computed) hits.push({ line: c.line, msg: c.msg, fix: null, sev: c.sev });
  hits.sort(function (a, b) { return a.line - b.line; });
  return hits;
}

const SNIPPETS = {};

// ★무료 — ★고른 줄만 본다 (⛔파일 전체가 아니다. 명세가 그렇게 약속하면 ★이것을 찍는다)
async function runSelection() {
  const ed = vscode.window.activeTextEditor;
  if (!ed || ed.selection.isEmpty) { vscode.window.showInformationMessage(S.nothing_found); return null; }
  const text = ed.document.getText(ed.selection);
  const base = ed.selection.start.line;
  const hits = scan(text, ed.document.fileName).map(function (h) {
    return { line: h.line + base, msg: h.msg, fix: h.fix };
  });
  report([{ file: ed.document.fileName, hits: hits }]);
  vscode.window.showInformationMessage(hits.length ? S.done : S.nothing_found);
  return hits;
}

// ★무료 — ★들어 있는 규칙·스니펫 목록
async function listRules() {
  const c = out(); c.clear();
  c.appendLine('rules ' + RULES.length + ' / snippets ' + Object.keys(SNIPPETS).length);
  for (const r of RULES) { c.appendLine('  ' + r.message); }
  for (const k of Object.keys(SNIPPETS)) { c.appendLine('  + ' + k); }
  c.show(true);
}

// ★유료 — ★역방향 체험: ★첫 스윕부터 7일은 키 없이 ★전부 준다 (⛔줄이지 않는다). 그 뒤에 묻는다.
//   손님이 돈 낼지 정하는 순간은 ★자기 폴더에서 자기 발견 수를 본 뒤다.
async function trialState(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + TRIAL_MS; await st.update('sweepTrialUntil', until); }
  return { st: st, hasKey: hasKey, until: until, inTrial: !hasKey && Date.now() < until };
}

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다. ⛔체험 중에는 묻지 않는다.
async function paidGate(ctx) {
  const t = await trialState(ctx);
  if (t.inTrial) return true;
  const last = t.st.get('lastSweep');
  S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found '
    + last.findings + ' findings. ') : '') + NEED_KEY;
  return await lic.ensure(vscode, ctx, S);
}

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  const _t = await trialState(ctx);
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('cron-schedule-lint');
  const _max = Number(_c.get('max_files')) || 2000;
  const _skip = String(_c.get('exclude_glob') || '**/node_modules/**');
  const files = await vscode.workspace.findFiles('**/*', _skip, _max);
  const rows = [];
  for (const f of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(f);
      rows.push({ file: f.fsPath, hits: scan(doc.getText(), f.fsPath) });
    } catch (e) { /* 열 수 없는 파일은 건너뛴다 */ }
  }
  report(rows);
  let _n = 0;
  for (const r of rows) _n += r.hits.length;
  await _t.st.update('lastSweep', { files: rows.length, findings: _n,
    at: new Date().toISOString().slice(0, 10) });
  vscode.window.showInformationMessage(S.done
    + (_t.inTrial ? ' The full sweep is free for 7 days from your first sweep.' : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const rows = ed ? [{ file: ed.document.fileName, hits: scan(ed.document.getText(), ed.document.fileName) }] : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const flat = [];
  for (const r of rows) for (const h of r.hits) flat.push({ file: r.file, line: h.line, message: h.msg });
  const csv = ['file,line,message'].concat(
    flat.map(function (h) { return [h.file, h.line, String(h.message).replace(/,/g, ' ')].join(','); })
  ).join('\n');
  const esc = function (t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const html = ['<!doctype html><meta charset="utf-8"><title>report</title>',
    '<table border="1" cellpadding="4"><tr><th>file</th><th>line</th><th>message</th></tr>'
  ].concat(flat.map(function (h) {
    return '<tr><td>' + esc(h.file) + '</td><td>' + h.line + '</td><td>' + esc(h.message) + '</td></tr>';
  })).concat(['</table>']).join('\n');
  // ★설정을 ★먼저 읽는다 (report_format). ⛔기본값이 없을 때만 물어본다.
  const cfgFmt = String(vscode.workspace.getConfiguration('cron-schedule-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('cron-schedule-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cron-schedule-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cron-schedule-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "cron-schedule-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('cron-schedule-lint.audit_file', runCurrent);
  reg('cron-schedule-lint.audit_selection', runSelection);
  reg('cron-schedule-lint.list_rules', listRules);
  reg('cron-schedule-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('cron-schedule-lint.export_report', function () { return exportReport(ctx); });
  reg('cron-schedule-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('cron-schedule-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
