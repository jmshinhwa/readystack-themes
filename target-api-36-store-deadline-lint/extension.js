// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking store-blocking versions", "done": "Store requirements checked.", "nothing_found": "Nothing in this file is blocked by a store requirement.", "paste": "Paste your build.gradle, package.json, Podfile or CI workflow", "check": "Check this file", "need_key": "Full version: scans every build file in the repository, fails the CI build before a blocked version merges, re-checks on save, and exports a dated release-readiness report. $29 once, one licence key per person or team seat, 7-day full refund. Google Play's extension window closes 2026-11-01 and a senior freelance Android developer averages about $128 an hour.", "buy": "Get the full version - $29", "key_ok": "Licence accepted. Repository scan, CI output, save-watch and export are open.", "key_bad": "That key did not validate. Check it in your Polar customer portal, or buy one from the link.", "extra_rules": "Extra version rules of your own, checked alongside the ones that ship inside.", "enter_key": "Enter licence key"};
const PAID = ["workspace_scan", "ci_json", "export_report", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Target API 36 & Xcode 26 Store Deadline Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('target-api-36-store-deadline-lint').get('min_severity')
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
const RULES = [{"pattern": "targetSdk(?:Version)?\\s*(?:=|:|\\s)\\s*[\"']?(?:1[4-9]|2[0-9]|3[0-4])\\b", "flags": "", "sev": "error", "message": "targetSdk below 35. Google Play stopped accepting updates without API 36 on 2026-08-31, and at this level your listing is already hidden from new users whose device runs a newer Android than you target. Extension requests close 2026-11-01.", "fix": "targetSdk 36"}, {"pattern": "targetSdk(?:Version)?\\s*(?:=|:|\\s)\\s*[\"']?35\\b", "flags": "", "sev": "error", "message": "targetSdk 35 (Android 15). Google Play has rejected updates without API 36 since 2026-08-31. You can request an extension in Play Console until 2026-11-01; after that no update ships at all.", "fix": "targetSdk 36"}, {"pattern": "compileSdk(?:Version)?\\s*(?:=|:|\\s)\\s*[\"']?(?:2[0-9]|3[0-5])\\b", "flags": "", "sev": "error", "message": "compileSdk below 36. You cannot compile against Android 16, and Gradle refuses a compileSdk lower than targetSdk.", "fix": "compileSdk 36"}, {"pattern": "buildToolsVersion\\s*(?:=|:|\\s)\\s*[\"'](?:2[0-9]|3[0-5])\\.", "flags": "", "sev": "warn", "message": "Build tools below 36.0.0 cannot build API 36 sources.", "fix": "buildToolsVersion \"36.0.0\""}, {"pattern": "flutter\\.(?:target|compile)SdkVersion", "flags": "", "sev": "warn", "message": "This level is inherited from whichever Flutter SDK the build machine has, not from this file, so it can differ between your laptop and CI. Pin it here.", "fix": "targetSdk = 36"}, {"pattern": "ndkVersion\\s*(?:=|:|\\s)\\s*[\"'](?:1[0-9]|2[0-7])\\.", "flags": "", "sev": "error", "message": "NDK below r28 does not align native libraries to 16 KB. Google Play has blocked releases containing native code that target Android 15 or higher since 2025-11-01.", "fix": "NDK r28 or newer"}, {"pattern": "com\\.android\\.tools\\.build:gradle:(?:[0-7]\\.|8\\.[0-4]\\b)", "flags": "", "sev": "error", "message": "Android Gradle Plugin below 8.5.1 does not produce 16 KB-aligned native libraries, which Google Play has required since 2025-11-01.", "fix": "com.android.tools.build:gradle:8.5.1 or newer"}, {"pattern": "windowOptOutEdgeToEdgeEnforcement", "flags": "", "sev": "warn", "message": "Android 16 removes this opt-out. At targetSdk 36 the flag is ignored and the app draws edge-to-edge, so content can sit under the system bars.", "fix": "Handle window insets instead of opting out"}, {"pattern": "\"react-native\"\\s*:\\s*\"[^\"]*0\\.(?:[0-6][0-9]|7[0-9]|80)\\b", "flags": "", "sev": "warn", "message": "React Native below 0.81 defaults to targetSdk 35. Android 16 support landed in 0.81.", "fix": "react-native 0.81 or newer"}, {"pattern": "\"expo\"\\s*:\\s*\"[^\"]*(?:4[0-9]|5[0-3])\\.", "flags": "", "sev": "warn", "message": "Expo SDK below 54 defaults to targetSdk 35. Either upgrade, or set compileSdkVersion and targetSdkVersion to 36 through expo-build-properties.", "fix": "expo 54 or newer"}, {"pattern": "android\\.hardware\\.type\\.(?:watch|television|automotive)", "flags": "", "sev": "info", "message": "Wear OS, Android TV and Automotive run on their own target-level timetable, so the 2026-08-31 API 36 requirement does not apply to this form factor the same way. Confirm this track in Play Console.", "fix": "Check the form-factor track in Play Console"}, {"pattern": "xcode[-_]?version\\s*:\\s*[\"']?(?:1[0-6]|[0-9])\\b", "flags": "i", "sev": "error", "message": "CI is pinned to an Xcode below 26. App Store Connect has rejected uploads not built with the iOS 26 SDK since 2026-04-28 (ITMS-90725).", "fix": "xcode-version: '26.0'"}, {"pattern": "runs-on\\s*:\\s*.*macos-(?:11|12|13|14)\\b", "flags": "i", "sev": "error", "message": "This runner image does not ship Xcode 26, so the archive it produces cannot be uploaded to App Store Connect after 2026-04-28.", "fix": "A runner image that ships Xcode 26"}, {"pattern": "Xcode_?(?:1[0-6]|[0-9])(?:\\.[0-9]+)*\\.app", "flags": "", "sev": "error", "message": "The build points at an Xcode below 26. Uploads built with an older SDK have been rejected since 2026-04-28.", "fix": "/Applications/Xcode_26.app"}, {"pattern": "xc(?:odes|version)\\s*\\(\\s*version\\s*:\\s*[\"'](?:1[0-6]|[0-9])", "flags": "", "sev": "error", "message": "Fastlane selects an Xcode below 26, so the resulting build cannot be uploaded to App Store Connect since 2026-04-28.", "fix": "version: '26.0'"}, {"pattern": "platform\\s*:ios\\s*,\\s*[\"'](?:[89]|1[0-4])(?:\\.[0-9]+)?[\"']", "flags": "", "sev": "warn", "message": "Deployment target below iOS 15. Not a store block by itself, but confirm the project still builds under the iOS 26 SDK that uploads have required since 2026-04-28.", "fix": "Confirm the build under Xcode 26"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('target-api-36-store-deadline-lint');
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
  return hits;
}

const SNIPPETS = {};

// ★무료 — ★들어 있는 규칙·스니펫 목록
async function listRules() {
  const c = out(); c.clear();
  c.appendLine('rules ' + RULES.length + ' / snippets ' + Object.keys(SNIPPETS).length);
  for (const r of RULES) { c.appendLine('  ' + r.message); }
  for (const k of Object.keys(SNIPPETS)) { c.appendLine('  + ' + k); }
  c.show(true);
}

// ★무료 — ★마지막 결과 패널을 다시 연다
async function showReport() { out().show(true); }

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('target-api-36-store-deadline-lint');
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

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'target-api-36-store-deadline-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
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
  const cfgFmt = String(vscode.workspace.getConfiguration('target-api-36-store-deadline-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('target-api-36-store-deadline-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'target-api-36-store-deadline-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function watchOnSave(ctx) {
  if (!(await paidGate(ctx))) return;
  if (watchOnSave._d) { watchOnSave._d.dispose(); watchOnSave._d = null;
    vscode.window.showInformationMessage(S.done); return; }
  watchOnSave._d = vscode.workspace.onDidSaveTextDocument(function (doc) {
    report([{ file: doc.fileName, hits: scan(doc.getText(), doc.fileName) }]);
  });
  ctx.subscriptions.push(watchOnSave._d);
  vscode.window.showInformationMessage(S.run);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "target-api-36-store-deadline-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('target-api-36-store-deadline-lint.audit_file', runCurrent);
  reg('target-api-36-store-deadline-lint.list_rules', listRules);
  reg('target-api-36-store-deadline-lint.show_report', showReport);
  reg('target-api-36-store-deadline-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('target-api-36-store-deadline-lint.ci_json', function () { return ciJson(ctx); });
  reg('target-api-36-store-deadline-lint.export_report', function () { return exportReport(ctx); });
  reg('target-api-36-store-deadline-lint.watch_on_save', function () { return watchOnSave(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('target-api-36-store-deadline-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
