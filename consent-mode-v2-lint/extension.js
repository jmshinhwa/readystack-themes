// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"paste": "Paste your gtag/GTM snippet, an HTML page, or a GTM container export (.json) here", "check": "Check consent mode", "run": "Checking consent-mode signals", "done": "Consent-mode check finished", "nothing_found": "No consent-mode problems found in this file.", "need_key": "Full version: scans every file in the workspace, writes the report to a file, and returns CI-readable JSON. $29 once - one licence key per person or team seat - 7-day full refund. A freelancer's consent-mode audit runs $400-$1,200.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted - workspace scan, export and CI output are unlocked.", "key_bad": "That key did not validate. Check it was copied in full."};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Consent Mode v2 Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('consent-mode-v2-lint').get('min_severity')
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
const RULES = [{"pattern": "\\b(adStorage|adUserData|adPersonalization|analyticsStorage|securityStorage|functionalityStorage|personalizationStorage)\\b", "flags": "", "sev": "error", "fix": "ad_user_data", "message": "Not a consent signal name. Consent types are snake_case (ad_storage, analytics_storage, ad_user_data, ad_personalization) - a camelCase key sets no consent state at all."}, {"pattern": "['\"](ad-storage|ad-user-data|ad-personalization|analytics-storage)['\"]", "flags": "", "sev": "error", "fix": "ad_user_data", "message": "Consent type names use underscores, not hyphens - this key sets no consent state."}, {"pattern": "\\b(analytic_storage|ads_storage|ad_userdata|ad_personalisation|ad_personalizations)\\b", "flags": "", "sev": "error", "fix": "ad_personalization", "message": "Misspelled consent type. The four required names are ad_storage, analytics_storage, ad_user_data, ad_personalization (US spelling, no 's' on ad_storage)."}, {"pattern": "['\"]?(ad_storage|analytics_storage|ad_user_data|ad_personalization|security_storage|functionality_storage|personalization_storage)['\"]?\\s*:\\s*(true|false)\\b", "flags": "", "sev": "error", "fix": "'denied'", "message": "Consent value must be the string 'granted' or 'denied'. A boolean is not a valid consent state."}, {"pattern": "['\"]?(ad_storage|analytics_storage|ad_user_data|ad_personalization)['\"]?\\s*:\\s*[01]\\s*[,}]", "flags": "", "sev": "error", "fix": "'denied'", "message": "Consent value must be the string 'granted' or 'denied', not a number."}, {"pattern": "['\"]?(ad_storage|analytics_storage|ad_user_data|ad_personalization)['\"]?\\s*:\\s*['\"](true|false)['\"]", "flags": "", "sev": "error", "fix": "'denied'", "message": "Consent value must be 'granted' or 'denied' - the strings 'true' and 'false' are not consent states."}, {"pattern": "['\"]?(ad_storage|analytics_storage|ad_user_data|ad_personalization)['\"]?\\s*:\\s*(granted|denied)\\s*[,}]", "flags": "", "sev": "error", "fix": "'denied'", "message": "Consent value is an unquoted identifier. It must be the quoted string 'granted' or 'denied'."}, {"pattern": "region\\s*:\\s*\\[[^\\]]*['\"](EU|EEA|EU27|EUROPE|EEA-UK|GDPR)['\"]", "flags": "i", "sev": "error", "fix": "region: ['DE','FR','ES','IT','NL','GB']", "message": "There is no 'EU' or 'EEA' shorthand. The region parameter takes ISO 3166-2 codes only (e.g. 'DE', 'FR', 'ES-MD'). An unrecognised code silently applies no regional default."}, {"pattern": "wait_for_update['\"]?\\s*:\\s*([0-9]|[1-9][0-9]|[1-4][0-9]{2})\\s*[,}]", "flags": "", "sev": "warn", "fix": "wait_for_update: 500", "message": "wait_for_update is under 500 ms. An asynchronous consent banner will not have answered yet, so the first hits fire with the default (denied) state."}, {"pattern": "wait_for_update['\"]?\\s*:\\s*['\"]", "flags": "", "sev": "error", "fix": "wait_for_update: 500", "message": "wait_for_update must be a number of milliseconds, not a string."}, {"pattern": "url_passthrough['\"]?\\s*:\\s*false", "flags": "", "sev": "warn", "fix": "url_passthrough: true", "message": "url_passthrough is off. While ad_storage is denied, the ad-click id is not carried in the URL, so conversions lose their campaign attribution."}, {"pattern": "ads_data_redaction['\"]?\\s*:\\s*false", "flags": "", "sev": "warn", "fix": "ads_data_redaction: true", "message": "ads_data_redaction is off. When ad_storage is denied, ad identifiers are still sent in full."}, {"pattern": "dataLayer\\s*\\.\\s*push\\s*\\(\\s*\\[\\s*['\"]consent['\"]", "flags": "", "sev": "error", "fix": "gtag('consent','default',{...})", "message": "Consent cannot be set with dataLayer.push([...]). It must use the gtag() arguments form so the value lands before the tag reads it."}, {"pattern": "gtag\\s*\\(\\s*['\"]consent['\"]\\s*,\\s*['\"](defaults|updates|set|Default|DEFAULT|Update|UPDATE)['\"]", "flags": "", "sev": "error", "fix": "gtag('consent','default',{...})", "message": "The consent command takes 'default' or 'update' - lowercase and singular. Any other value is ignored, so no consent state is ever set."}, {"pattern": "['\"]consent['\"]\\s*,\\s*['\"]default['\"][^;]*(ad_storage|ad_user_data|ad_personalization|analytics_storage)['\"]?\\s*:\\s*['\"]granted", "flags": "", "sev": "error", "fix": "'denied'", "message": "The consent default grants a signal before the visitor has answered. For EEA/UK traffic the default must be 'denied', raised by gtag('consent','update',...) once the banner is answered."}, {"pattern": "allow_google_signals", "flags": "", "sev": "info", "fix": "ad_storage", "message": "Google Signals no longer governs whether data reaches Google Ads. Since 15 June 2026 that is controlled by the ad_storage consent signal alone; this setting now only affects GA4 behavioural reporting."}, {"pattern": "(G-XXXXXXXXXX|AW-XXXXXXXXX|GTM-XXXXXXX|G-XXXXXXX\\b)", "flags": "", "sev": "error", "fix": "your real tag ID", "message": "Placeholder tag ID left in the snippet - no data reaches the property, and consent settings on it are never exercised."}, {"pattern": "anonymize_ip", "flags": "", "sev": "info", "fix": "(remove)", "message": "anonymize_ip has no effect in GA4 - IP anonymisation is always on. Leaving it in a privacy review implies a control you do not actually operate."}, {"json": {"kind": "each", "list": "containerVersion.tag", "paths": ["consentSettings.consentStatus"], "when": {"path": "exportFormatVersion"}}, "sev": "warn", "message": "GTM container export: tag has no consent settings, so it fires as soon as its trigger fires regardless of consent state"}, {"json": {"kind": "each_bad", "list": "containerVersion.tag", "path": "consentSettings.consentStatus", "bad": ["notneeded"], "filter": {"path": "type", "has": "awct"}, "when": {"path": "exportFormatVersion"}}, "sev": "error", "message": "GTM container export: Google Ads conversion tag is marked 'No additional consent required', so it fires before the visitor answers the banner"}];

// ★JSON 구조 검사 (s138) — ⛔줄 정규식이 ★못 보는 것을 본다: 문서 전체의 빠진 칸 · 목록 각 칸의 빠진 칸.
//   ★어휘 넷뿐이다: doc(문서에 이 칸이 있나) · ver(판 번호가 기준 이상인가)
//                  each(목록의 각 칸에 이 칸이 있나) · each_bad(값이 쓸모없는 값인가)
var JRULES = [{"json": {"kind": "each", "list": "containerVersion.tag", "paths": ["consentSettings.consentStatus"], "when": {"path": "exportFormatVersion"}}, "sev": "warn", "message": "GTM container export: tag has no consent settings, so it fires as soon as its trigger fires regardless of consent state"}, {"json": {"kind": "each_bad", "list": "containerVersion.tag", "path": "consentSettings.consentStatus", "bad": ["notneeded"], "filter": {"path": "type", "has": "awct"}, "when": {"path": "exportFormatVersion"}}, "sev": "error", "message": "GTM container export: Google Ads conversion tag is marked 'No additional consent required', so it fires before the visitor answers the banner"}];
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
  const cfg = vscode.workspace.getConfiguration('consent-mode-v2-lint');
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

// ★무료 — ★들어 있는 규칙·스니펫 목록
async function listRules() {
  const c = out(); c.clear();
  c.appendLine('rules ' + RULES.length + ' / snippets ' + Object.keys(SNIPPETS).length);
  for (const r of RULES) { c.appendLine('  ' + r.message); }
  for (const k of Object.keys(SNIPPETS)) { c.appendLine('  + ' + k); }
  c.show(true);
}

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('consent-mode-v2-lint');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('consent-mode-v2-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('consent-mode-v2-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'consent-mode-v2-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'consent-mode-v2-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "consent-mode-v2-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('consent-mode-v2-lint.audit_file', runCurrent);
  reg('consent-mode-v2-lint.audit_selection', runSelection);
  reg('consent-mode-v2-lint.show_report', showReport);
  reg('consent-mode-v2-lint.list_rules', listRules);
  reg('consent-mode-v2-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('consent-mode-v2-lint.export_report', function () { return exportReport(ctx); });
  reg('consent-mode-v2-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('consent-mode-v2-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
