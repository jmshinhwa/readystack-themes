// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking the HMRC fraud prevention headers", "done": "HMRC header check complete", "nothing_found": "No HMRC fraud prevention header problems found here.", "need_key": "Full version: scan every file in the workspace, export a CSV, JSON or HTML audit trail, emit machine-readable output for CI, and auto-correct the misspelled header names. $29 once · one licence key per person or team seat · 7-day full refund. HMRC charges a 200 pound penalty once a filer crosses the points threshold for late MTD quarterly updates.", "key_ok": "Licence accepted. Workspace scan, export, CI output and auto-fix are unlocked.", "key_bad": "That key did not validate. Check it was copied in full, including any dashes.", "buy": "Get the full version — $29", "enter_key": "Enter licence key", "paste": "Paste the code where you set the Gov-Client-* and Gov-Vendor-* headers — your HTTP client, your middleware, or the request headers you captured.", "check": "Check these headers"};
const PAID = ["workspace_scan", "export_report", "ci_json", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('HMRC Fraud Prevention Header Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('hmrc-fraud-prevention-header-lint').get('min_severity')
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
const RULES = [{"pattern": "Gov-Client-Device-Id\\b", "flags": "", "message": "Gov-Client-Device-Id is misspelled. HMRC spells it Gov-Client-Device-ID with a capital ID.", "sev": "error", "fix": "Gov-Client-Device-ID", "replace": "Gov-Client-Device-ID"}, {"pattern": "Gov-Client-User-Ids\\b", "flags": "", "message": "Gov-Client-User-Ids is misspelled. HMRC spells it Gov-Client-User-IDs.", "sev": "error", "fix": "Gov-Client-User-IDs", "replace": "Gov-Client-User-IDs"}, {"pattern": "Gov-Client-User-ID\\b", "flags": "", "message": "Gov-Client-User-ID is singular. HMRC requires the plural Gov-Client-User-IDs.", "sev": "error", "fix": "Gov-Client-User-IDs", "replace": "Gov-Client-User-IDs"}, {"pattern": "Gov-Vendor-Licence-[Ii][Dd]s?\\b", "flags": "", "message": "HMRC uses the American spelling: Gov-Vendor-License-IDs. \"Licence\" is rejected.", "sev": "error", "fix": "Gov-Vendor-License-IDs", "replace": "Gov-Vendor-License-IDs"}, {"pattern": "Gov-Vendor-License-Ids\\b", "flags": "", "message": "Gov-Vendor-License-Ids is misspelled. HMRC spells it Gov-Vendor-License-IDs.", "sev": "error", "fix": "Gov-Vendor-License-IDs", "replace": "Gov-Vendor-License-IDs"}, {"pattern": "Gov-Client-MAC-Address\\b", "flags": "", "message": "Gov-Client-MAC-Address is singular. HMRC requires Gov-Client-MAC-Addresses.", "sev": "error", "fix": "Gov-Client-MAC-Addresses", "replace": "Gov-Client-MAC-Addresses"}, {"pattern": "Gov-Client-Mac-Addresses\\b", "flags": "", "message": "MAC must be upper case: Gov-Client-MAC-Addresses.", "sev": "error", "fix": "Gov-Client-MAC-Addresses", "replace": "Gov-Client-MAC-Addresses"}, {"pattern": "Gov-Client-Local-Ips\\b", "flags": "", "message": "Gov-Client-Local-Ips is misspelled. HMRC spells it Gov-Client-Local-IPs.", "sev": "error", "fix": "Gov-Client-Local-IPs", "replace": "Gov-Client-Local-IPs"}, {"pattern": "Gov-Client-Local-IP\\b", "flags": "", "message": "Gov-Client-Local-IP is singular. HMRC requires Gov-Client-Local-IPs.", "sev": "error", "fix": "Gov-Client-Local-IPs", "replace": "Gov-Client-Local-IPs"}, {"pattern": "Gov-Client-Public-Ip\\b", "flags": "", "message": "Gov-Client-Public-Ip is misspelled. HMRC spells it Gov-Client-Public-IP.", "sev": "error", "fix": "Gov-Client-Public-IP", "replace": "Gov-Client-Public-IP"}, {"pattern": "Gov-Client-Screen\\b", "flags": "", "message": "Gov-Client-Screen is singular. HMRC requires Gov-Client-Screens.", "sev": "error", "fix": "Gov-Client-Screens", "replace": "Gov-Client-Screens"}, {"pattern": "Gov-Client-Time-?Zone\\b", "flags": "", "message": "HMRC writes Timezone as one word, lower-case z: Gov-Client-Timezone.", "sev": "error", "fix": "Gov-Client-Timezone", "replace": "Gov-Client-Timezone"}, {"pattern": "Gov-Vendor-(Product-Version|Software-Version)\\b", "flags": "", "message": "There is no Gov-Vendor-Product-Version header. The version header is Gov-Vendor-Version.", "sev": "error", "fix": "Gov-Vendor-Version", "replace": "Gov-Vendor-Version"}, {"pattern": "Gov-Client-Browser-User-Agent\\b", "flags": "", "message": "The browser header is Gov-Client-Browser-JS-User-Agent (the value JavaScript reports).", "sev": "error", "fix": "Gov-Client-Browser-JS-User-Agent", "replace": "Gov-Client-Browser-JS-User-Agent"}, {"pattern": "Gov-Client-Multi-Factor-Auth\\w*", "flags": "", "message": "The header is Gov-Client-Multi-Factor, with no Auth suffix.", "sev": "error", "fix": "Gov-Client-Multi-Factor", "replace": "Gov-Client-Multi-Factor"}, {"pattern": "Gov-Client-Timezone[^\\n]*(Europe/|America/|Asia/|Australia/|Africa/)", "flags": "i", "message": "Gov-Client-Timezone must be a UTC offset in UTC+HH:MM form, not an IANA zone name such as Europe/London.", "sev": "error", "fix": "UTC+01:00"}, {"pattern": "Gov-Client-Timezone[^\\n]*\\b(GMT|BST|CET|EST|PST)\\b", "flags": "i", "message": "Gov-Client-Timezone must be a UTC offset in UTC+HH:MM form, not an abbreviation such as GMT or BST.", "sev": "error", "fix": "UTC+00:00"}, {"pattern": "Gov-Client-Timezone[^\\n]*UTC[+-]\\d\\b", "flags": "i", "message": "Gov-Client-Timezone needs a two-digit hour and minutes: UTC+01:00, not UTC+1.", "sev": "error", "fix": "UTC+01:00"}, {"pattern": "Gov-Client-Timezone[^\\n]*UTC[+-]\\d{2}(?!:)", "flags": "i", "message": "Gov-Client-Timezone is missing the :MM part. HMRC requires UTC+HH:MM, for example UTC+00:00.", "sev": "error", "fix": "UTC+00:00"}, {"pattern": "Gov-Client-(Public-IP|Local-IPs)-Timestamp[^\\n]*\\d{2}:\\d{2}:\\d{2}Z", "flags": "i", "message": "This timestamp has no milliseconds. HMRC requires yyyy-MM-ddThh:mm:ss.sssZ, for example 2020-09-21T14:30:05.123Z (keep trailing zeros).", "sev": "error", "fix": "2020-09-21T14:30:05.123Z"}, {"pattern": "Gov-Client-(Public-IP|Local-IPs)-Timestamp[^\\n]*(toUTCString|toLocaleString|toDateString|Date\\.now\\(\\))", "flags": "i", "message": "This does not produce HMRC’s timestamp format. Use an ISO-8601 UTC timestamp with milliseconds and a trailing Z.", "sev": "error", "fix": "new Date().toISOString()"}, {"pattern": "Gov-Client-(Public-IP|Local-IPs)-Timestamp[^\\n]*\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?[+-]\\d{2}:?\\d{2}", "flags": "i", "message": "This timestamp carries a local UTC offset. HMRC requires the time expressed in UTC with a trailing Z.", "sev": "error", "fix": "2020-09-21T14:30:05.123Z"}, {"pattern": "Gov-Client-Connection-Method[^\\n]*WEB_APP_DIRECT", "flags": "i", "message": "WEB_APP_DIRECT is not an HMRC connection method. A browser-based app is WEB_APP_VIA_SERVER.", "sev": "error", "fix": "WEB_APP_VIA_SERVER"}, {"pattern": "Gov-Client-Multi-Factor[^\\n]*type=\\s*[\\'\"]?(SMS|MFA|EMAIL|PUSH|2FA|OTP)\\b", "flags": "i", "message": "Gov-Client-Multi-Factor type must be TOTP, AUTH_CODE or OTHER.", "sev": "error", "fix": "type=AUTH_CODE"}, {"pattern": "Gov-Client-Multi-Factor[^\\n]*timestamp=\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}", "flags": "i", "message": "The colon inside the Multi-Factor timestamp value must be percent-encoded as %3A. Only the separators & = , stay literal.", "sev": "error", "fix": "timestamp=2021-11-21T13%3A23Z"}, {"pattern": "Gov-Client-Public-Port[^\\n]*[\\'\":=\\s](80|443)\\b", "flags": "i", "message": "Gov-Client-Public-Port must be the originating device source port (1-65535), not the server port 80 or 443.", "sev": "error"}, {"pattern": "(Gov-Client-Screens[^\\n]*)color-depth", "flags": "i", "message": "HMRC spells this key colour-depth, British spelling. color-depth is not read.", "sev": "error", "fix": "colour-depth", "replace": "$1colour-depth"}, {"pattern": "Gov-Client-Screens[^\\n]*width=[^\\n]*height=(?![^\\n]*colour-depth)", "flags": "i", "message": "Gov-Client-Screens is missing colour-depth. Each screen needs width, height, scaling-factor and colour-depth.", "sev": "warn", "fix": "width=1920&height=1080&scaling-factor=1&colour-depth=16"}, {"pattern": "(Gov-Client-User-Agent[^\\n]*)os_family", "flags": "i", "message": "Gov-Client-User-Agent keys are hyphenated: os-family, os-version, device-manufacturer, device-model.", "sev": "error", "fix": "os-family", "replace": "$1os-family"}, {"pattern": "Gov-Client-MAC-Addresses[^\\n]*[\\'\"][0-9a-f]{2}:[0-9a-f]{2}:", "flags": "i", "message": "MAC address colons must be percent-encoded as %3A, for example ea%3A43%3A1a%3A5d%3A21%3A45.", "sev": "error", "fix": "ea%3A43%3A1a%3A5d%3A21%3A45"}, {"pattern": "Gov-Vendor-Product-Name[\\'\"\\]\\)\\s]*[:,=]\\s*[\\'\"][^\\'\"\\n]*\\s[^\\'\"\\n]*[\\'\"]", "flags": "i", "message": "Gov-Vendor-Product-Name must be percent-encoded. A literal space is invalid, use %20.", "sev": "error", "fix": "Product%20Name"}, {"pattern": "Gov-Client-Window-Size[^\\n]*(width|height)=\\d+\\.\\d", "flags": "i", "message": "Gov-Client-Window-Size width and height must be positive whole numbers (clarified in version 3.3, 27 January 2025).", "sev": "error", "fix": "width=1256&height=803"}, {"pattern": "Gov-Client-(Browser-Plugins|Browser-Do-Not-Track)\\b", "flags": "", "message": "For WEB_APP_VIA_SERVER you no longer need to submit this header (versions 3.1 and 3.2). Older tutorials still show it as required.", "sev": "info"}, {"pattern": "Gov-Client-Device-ID[\\'\"\\]\\)\\s]*[:,=]\\s*[\\'\"](?![0-9a-fA-F]{8}-[0-9a-fA-F]{4}-)[^\\'\"\\n]{3,}[\\'\"]", "flags": "", "message": "Gov-Client-Device-ID must be a UUID that persists on the device, not a hard-coded string.", "sev": "error", "fix": "beec798b-b366-47fa-b1f8-92cede14a1ce"}];

// ★JSON 구조 검사 (s138) — ⛔줄 정규식이 ★못 보는 것을 본다: 문서 전체의 빠진 칸 · 목록 각 칸의 빠진 칸.
//   ★어휘 넷뿐이다: doc(문서에 이 칸이 있나) · ver(판 번호가 기준 이상인가)
//                  each(목록의 각 칸에 이 칸이 있나) · each_bad(값이 쓸모없는 값인가)
var JRULES = [];
function jHas(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}
function jVal(o, p) {
  var parts = String(p).split('.'), cur = o, i, k, got;
  for (i = 0; i < parts.length; i++) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {                       // ★목록을 만나면 ★남은 길을 각 칸에 물어본다
      for (k = 0; k < cur.length; k++) {
        got = jVal(cur[k], parts.slice(i).join('.'));
        if (jHas(got)) return got;
      }
      return undefined;
    }
    if (typeof cur !== 'object') return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}
function jAny(o, paths) {
  for (var i = 0; i < (paths || []).length; i++) { if (jHas(jVal(o, paths[i]))) return true; }
  return false;
}
function jNum(s) {
  var m = String(s === undefined || s === null ? '' : s).match(/(\d+(?:\.\d+)*)/);
  return m ? m[1].split('.').map(Number) : null;
}
function jCmp(a, b) {
  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    var x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function jWhen(doc, w) {
  if (!w) return true;
  var v = jVal(doc, w.path);
  if (w.eq !== undefined) return String(jHas(v) ? v : '').toLowerCase() === String(w.eq).toLowerCase();
  if (w.has !== undefined) {
    var s = Array.isArray(v) ? v.join(' ') : String(jHas(v) ? v : '');
    return s.toLowerCase().indexOf(String(w.has).toLowerCase()) >= 0;
  }
  return jHas(v);
}
function jList(doc, j) {
  var arr = jVal(doc, j.list);
  if (!Array.isArray(arr)) return [];
  if (!j.filter) return arr;
  return arr.filter(function (e) {
    var v = jVal(e, j.filter.path);
    var s = Array.isArray(v) ? v.join(' ') : String(jHas(v) ? v : '');
    return s.toLowerCase().indexOf(String(j.filter.has).toLowerCase()) >= 0;
  });
}
function jLine(raw, needle) {
  if (!needle) return 1;
  var s = String(raw), i = s.indexOf(JSON.stringify(String(needle)));
  if (i < 0) i = s.indexOf(String(needle));
  if (i < 0) return 1;
  return s.slice(0, i).split(/\r?\n/).length;
}
function jName(e) {
  if (!e || typeof e !== 'object') return '';
  return String(e.name || e.packageName || e['bom-ref'] || e.bomRef || e.SPDXID || e.spdxId || '');
}
// ⇒ ★JSON 이 아니면 null 을 돌려준다 (그러면 ★줄 규칙만 돈다)
function analyzeJson(raw) {
  var doc;
  try { doc = JSON.parse(raw); } catch (e) { return null; }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  var hits = [], i, r, j;
  for (i = 0; i < JRULES.length; i++) {
    r = JRULES[i]; j = r.json || {};
    if (!jWhen(doc, j.when)) continue;
    if (j.kind === 'doc') {
      if (!jAny(doc, j.paths)) hits.push({ line: 1, msg: r.message, sev: r.sev || 'warn' });
    } else if (j.kind === 'ver') {
      var got = jNum(jVal(doc, j.path)), min = jNum(j.min);
      if (!got) hits.push({ line: 1, msg: r.message + ' — found: none', sev: r.sev || 'error' });
      else if (jCmp(got, min) < 0) hits.push({ line: jLine(raw, j.path),
        msg: r.message + ' — found: ' + got.join('.'), sev: r.sev || 'error' });
    } else if (j.kind === 'each' || j.kind === 'each_bad') {
      var arr = jList(doc, j), miss = [], k, e, v, sv;
      for (k = 0; k < arr.length; k++) {
        e = arr[k];
        if (j.kind === 'each') { if (!jAny(e, j.paths)) miss.push(e); }
        else {
          v = jVal(e, j.path);
          sv = jHas(v) ? String(v).trim().toLowerCase() : '';
          if ((j.bad || []).indexOf(sv) >= 0) miss.push(e);
        }
      }
      if (miss.length) {
        var ex = miss.slice(0, 4).map(jName).filter(Boolean);
        hits.push({ line: jLine(raw, jName(miss[0])),
          msg: r.message + ' — ' + miss.length + ' of ' + arr.length
               + (ex.length ? ' (e.g. ' + ex.join(', ') + ')' : ''),
          sev: r.sev || 'error' });
      }
    }
  }
  return hits;
}

function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('hmrc-fraud-prevention-header-lint');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  // ★s138 — ★구조 규칙을 ★먼저. ⛔JSON 이 아니면 null 이라 ★줄 규칙만 돈다.
  const hits = (JRULES.length ? (analyzeJson(text) || []) : []);
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      if (!r || !r.pattern) continue;   // ★s138 — ★구조 규칙은 ★정규식이 없다. ⛔건너뛴다.
      let re;
      try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
      // ★s126 — ★심각도를 실어 보낸다. ⛔없으면 min_severity 가 ★전부를 지운다 (내가 만들 뻔한 거짓말)
      if (re.test(lines[i])) hits.push({ line: i + 1, msg: r.message, fix: r.fix || null,
                                         sev: r.sev || 'warn' });
    }
  }
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

// ★무료 — ★마지막 결과 패널을 다시 연다
async function showReport() { out().show(true); }

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('hmrc-fraud-prevention-header-lint');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('hmrc-fraud-prevention-header-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('hmrc-fraud-prevention-header-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'hmrc-fraud-prevention-header-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'hmrc-fraud-prevention-header-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

async function quickFix(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const hits = scan(ed.document.getText(), ed.document.fileName).filter(function (h) { return h.fix; });
  if (!hits.length) { vscode.window.showInformationMessage(S.nothing_found); return; }
  // ★s134 2026-09-08 — ⛔줄 전체를 h.fix(안내 문구)로 바꾸던 버그를 고쳤다 (손님 파일을 지웠다 · 재방문 일꾼이 잡음).
  //   ★규칙에 replace 가 있을 때만 ★맞은 부분만 바꾼다. 없으면 안내만 한다 — 유료 기능이 데이터를 파괴하면 환불 폭탄이다.
  let applied = 0, manual = 0;
  await ed.edit(function (b) {
    for (const h of hits) {
      const r = RULES.find(function (x) { return x.message === h.msg || x.message === h.message; });
      if (!(r && typeof r.replace === 'string')) { manual++; continue; }
      const ln = ed.document.lineAt(h.line - 1);
      const re = new RegExp(r.pattern, r.flags || '');
      const m = re.exec(ln.text);
      if (!m) { manual++; continue; }
      const start = new vscode.Position(h.line - 1, m.index), end = new vscode.Position(h.line - 1, m.index + m[0].length);
      b.replace(new vscode.Range(start, end), m[0].replace(re, r.replace)); applied++;
    }
  });
  vscode.window.showInformationMessage(S.done + ' (' + applied + ' applied, ' + manual + ' need a manual edit - see the report)');
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "hmrc-fraud-prevention-header-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('hmrc-fraud-prevention-header-lint.audit_file', runCurrent);
  reg('hmrc-fraud-prevention-header-lint.audit_selection', runSelection);
  reg('hmrc-fraud-prevention-header-lint.show_report', showReport);
  reg('hmrc-fraud-prevention-header-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('hmrc-fraud-prevention-header-lint.export_report', function () { return exportReport(ctx); });
  reg('hmrc-fraud-prevention-header-lint.ci_json', function () { return ciJson(ctx); });
  reg('hmrc-fraud-prevention-header-lint.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('hmrc-fraud-prevention-header-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
