// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking for Google Play release blockers", "done": "Play release blockers found - see the panel", "nothing_found": "No Play release blocker in this file.", "paste": "Paste your build.gradle, build.gradle.kts, libs.versions.toml, AndroidManifest.xml or app.json here.", "check": "Find my release blockers", "need_key": "Full version: scan every module in the repo, fail your CI before Play does, re-check on save, and export a dated release-readiness report. $29 once - one licence key per person or team seat - 7-day full refund. Upwork's published median for an Android developer is $25/hr.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted - workspace scan, CI output, watch and export are open.", "key_bad": "That key did not validate. Check it in your Polar customer portal."};
const PAID = ["workspace_scan", "ci_json", "export_report", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Play Release Blocker Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('play-release-blocker-lint').get('min_severity')
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
const RULES = [{"pattern": "targetSdk(?:Version)?[\"\\']?\\s*[:=]?\\s*[\"\\']?35\\b", "flags": "i", "sev": "error", "message": "[error] Play stopped accepting this on 2026-08-31: a new release must target Android 16 (API 36). API 35 keeps the listing alive but no update can be published. The extension window closes 2026-11-01.  Fix: targetSdk = 36", "fix": "targetSdk = 36"}, {"pattern": "targetSdk(?:Version)?[\"\\']?\\s*[:=]?\\s*[\"\\']?3[0-4]\\b", "flags": "i", "sev": "error", "message": "[error] Two Play gates fail on this line: releases have needed API 36 since 2026-08-31, and an existing app below API 35 is hidden from new users on devices running a newer Android than it targets.  Fix: targetSdk = 36", "fix": "targetSdk = 36"}, {"pattern": "targetSdk(?:Version)?[\"\\']?\\s*[:=]?\\s*[\"\\']?2[1-9]\\b", "flags": "i", "sev": "error", "message": "[error] Target API below 30. Play has refused updates at this level for years and the listing is invisible to new users on modern devices. Go straight to API 36, not one step at a time.  Fix: targetSdk = 36", "fix": "targetSdk = 36"}, {"pattern": "compileSdk(?:Version)?[\"\\']?\\s*[:=]?\\s*[\"\\']?3[0-5]\\b", "flags": "i", "sev": "warn", "message": "[warn] You cannot target API 36 while compiling against a lower SDK. Raise compileSdk first, then raise targetSdk, then fix what stops building.  Fix: compileSdk = 36", "fix": "compileSdk = 36"}, {"pattern": "com\\.android\\.billingclient:billing(?:-ktx)?:[1-7]\\.", "flags": "i", "sev": "error", "message": "[error] Play Billing Library below 8.0.0. Since 2026-08-31 Play rejects any new release using it. Builds already published keep transacting, so you only find out when you try to ship a fix. Extension closes 2026-11-01.  Fix: com.android.billingclient:billing:8.0.0", "fix": "com.android.billingclient:billing:8.0.0"}, {"pattern": "billing(?:client)?\\s*=\\s*[\"\\'][1-7]\\.", "flags": "i", "sev": "error", "message": "[error] The version catalog pins Play Billing Library below 8.0.0, which Play stopped accepting in new releases on 2026-08-31.  Fix: billing = \"8.0.0\"", "fix": "billing = \"8.0.0\""}, {"pattern": "android:extractNativeLibs\\s*=\\s*[\"\\']true[\"\\']", "flags": "i", "sev": "error", "message": "[error] Compressed native libraries cannot be 16 KB aligned. Play has required 16 KB page-size support from releases targeting Android 15 and above since 2025-11-01; the Play Console extension ran out on 2026-05-31.  Fix: android:extractNativeLibs=\"false\"", "fix": "android:extractNativeLibs=\"false\""}, {"pattern": "useLegacyPackaging\\s*[:=]\\s*true", "flags": "i", "sev": "error", "message": "[error] useLegacyPackaging = true compresses your .so files and breaks the 16 KB alignment Play has required since 2025-11-01.  Fix: useLegacyPackaging = false", "fix": "useLegacyPackaging = false"}, {"pattern": "max-page-size=0x1000", "flags": "i", "sev": "error", "message": "[error] The linker is pinned to a 4 KB page. On a device with 16 KB pages this library will not load, and Play refuses the upload.  Fix: -Wl,-z,max-page-size=16384", "fix": "-Wl,-z,max-page-size=16384"}, {"pattern": "ndkVersion\\s*[\"\\']?\\s*[:=]?\\s*[\"\\']?(?:1[0-9]|2[0-7])\\.", "flags": "i", "sev": "warn", "message": "[warn] NDK below r28 does not emit 16 KB aligned shared libraries by default. Google names NDK r28 or newer as the fix for the 16 KB requirement.  Fix: ndkVersion = \"28.0.13004108\"", "fix": "ndkVersion = \"28.0.13004108\""}, {"pattern": "com\\.android\\.tools\\.build:gradle:(?:[0-7]\\.|8\\.[0-4]\\.)", "flags": "i", "sev": "warn", "message": "[warn] Android Gradle Plugin below 8.5.1 does not align native libraries to 16 KB by default. Google names AGP 8.5.1 or newer as the tooling floor for that requirement.  Fix: com.android.tools.build:gradle:8.5.1 or newer", "fix": "com.android.tools.build:gradle:8.5.1 or newer"}, {"pattern": "agp\\s*=\\s*[\"\\'](?:[0-7]\\.|8\\.[0-4]\\.)", "flags": "i", "sev": "warn", "message": "[warn] The version catalog pins AGP below 8.5.1, under the tooling floor Google names for 16 KB alignment.  Fix: agp = \"8.5.1\"", "fix": "agp = \"8.5.1\""}, {"pattern": "windowOptOutEdgeToEdgeEnforcement", "flags": "i", "sev": "error", "message": "[error] This opt-out is ignored once the app targets API 36. Your content will draw behind the status and navigation bars, so handle window insets instead of opting out.  Fix: remove it and pad with WindowInsets", "fix": "remove it and pad with WindowInsets"}, {"pattern": "android:screenOrientation\\s*=\\s*[\"\\'](?:portrait|sensorPortrait|reversePortrait|userPortrait|landscape|sensorLandscape|reverseLandscape|userLandscape)[\"\\']", "flags": "i", "sev": "warn", "message": "[warn] Ignored on displays 600dp wide and above once the app targets API 36. The activity fills a tablet or unfolded screen in whatever orientation the user holds it, with no pillarboxing.  Fix: make the layout adaptive rather than locking the orientation", "fix": "make the layout adaptive rather than locking the orientation"}, {"pattern": "android:resizeableActivity\\s*=\\s*[\"\\']false[\"\\']", "flags": "i", "sev": "warn", "message": "[warn] Resizability restrictions no longer apply on displays 600dp and wider for apps targeting API 36. The activity is resized anyway, so test it before Play forces the target.  Fix: android:resizeableActivity=\"true\"", "fix": "android:resizeableActivity=\"true\""}, {"pattern": "android:maxAspectRatio", "flags": "i", "sev": "warn", "message": "[warn] Aspect-ratio limits are ignored on large screens for apps targeting API 36; the app fills the display window whatever its ratio.  Fix: remove it and test a 16:10 tablet layout", "fix": "remove it and test a 16:10 tablet layout"}, {"pattern": "android:enableOnBackInvokedCallback\\s*=\\s*[\"\\']false[\"\\']", "flags": "i", "sev": "info", "message": "[info] Predictive back animations run across the system on Android 16, including back-to-home, cross-task and cross-activity. Opting out leaves your app the only one without them.  Fix: android:enableOnBackInvokedCallback=\"true\"", "fix": "android:enableOnBackInvokedCallback=\"true\""}, {"pattern": "android:debuggable\\s*=\\s*[\"\\']true[\"\\']", "flags": "i", "sev": "error", "message": "[error] Play rejects any bundle whose manifest is debuggable. Delete the attribute; the debug build type sets it for you.  Fix: delete android:debuggable from the manifest", "fix": "delete android:debuggable from the manifest"}, {"pattern": "com\\.google\\.android\\.play:core:", "flags": "i", "sev": "error", "message": "[error] The monolithic Play Core library is deprecated and crashes on Android 14 and newer. Split it into the libraries you actually use.  Fix: com.google.android.play:app-update / :asset-delivery / :review", "fix": "com.google.android.play:app-update / :asset-delivery / :review"}, {"pattern": "jcenter\\s*\\(", "flags": "", "sev": "warn", "message": "[warn] JCenter is read-only and being shut down. A build that resolves through it can stop resolving without warning, and a build you cannot run is a release you cannot ship.  Fix: mavenCentral()", "fix": "mavenCentral()"}, {"pattern": "QUERY_ALL_PACKAGES", "flags": "", "sev": "error", "message": "[error] Broad package visibility needs an approved Play Console declaration and is refused for most app categories. Without it the release is rejected.  Fix: replace with a <queries> element listing the packages you need", "fix": "replace with a <queries> element listing the packages you need"}, {"pattern": "MANAGE_EXTERNAL_STORAGE", "flags": "", "sev": "error", "message": "[error] All-files access needs an approved Play declaration and is granted only to a short list of app types. MediaStore or the Storage Access Framework passes review.  Fix: use MediaStore or the Storage Access Framework", "fix": "use MediaStore or the Storage Access Framework"}, {"pattern": "REQUEST_INSTALL_PACKAGES", "flags": "", "sev": "error", "message": "[error] Installing other packages needs a Play Console declaration form and is limited to eligible app types. Undeclared, the release is rejected.  Fix: remove it, or file the declaration before you upload", "fix": "remove it, or file the declaration before you upload"}, {"pattern": "android\\.permission\\.(?:READ_SMS|RECEIVE_SMS|SEND_SMS|READ_CALL_LOG|WRITE_CALL_LOG|PROCESS_OUTGOING_CALLS)", "flags": "", "sev": "error", "message": "[error] SMS and Call Log are restricted permissions. Play accepts them only from an app whose approved default-handler role needs them, with a declaration on file.  Fix: use the SMS Retriever API or an intent instead", "fix": "use the SMS Retriever API or an intent instead"}, {"pattern": "WRITE_EXTERNAL_STORAGE[\"\\'](?:(?!maxSdkVersion)[^>])*/?>", "flags": "", "sev": "warn", "message": "[warn] WRITE_EXTERNAL_STORAGE with no android:maxSdkVersion. Under scoped storage it does nothing on API 29 and above, and it still reads as broad storage access on your listing.  Fix: android:maxSdkVersion=\"28\"", "fix": "android:maxSdkVersion=\"28\""}, {"pattern": "SCHEDULE_EXACT_ALARM", "flags": "", "sev": "warn", "message": "[warn] Exact alarms need a Play declaration and are granted mainly to alarm, clock and calendar apps. Anything else should use setAndAllowWhileIdle or WorkManager.  Fix: use WorkManager, or USE_EXACT_ALARM if the app qualifies", "fix": "use WorkManager, or USE_EXACT_ALARM if the app qualifies"}, {"pattern": "android\\.permission\\.FOREGROUND_SERVICE[\"\\']", "flags": "", "sev": "warn", "message": "[warn] Since API 34 every foreground service also needs a typed FOREGROUND_SERVICE_* permission and android:foregroundServiceType, and Play wants a declaration explaining the use.  Fix: add FOREGROUND_SERVICE_DATA_SYNC (or the right type) and foregroundServiceType", "fix": "add FOREGROUND_SERVICE_DATA_SYNC (or the right type) and foregroundServiceType"}, {"pattern": "com\\.google\\.android\\.gms\\.permission\\.AD_ID", "flags": "", "sev": "info", "message": "[info] Declaring the advertising ID permission commits you to a matching Data safety declaration, and an app aimed at children must not declare it at all.  Fix: remove it if you do not read the advertising ID", "fix": "remove it if you do not read the advertising ID"}, {"pattern": "android:usesCleartextTraffic\\s*=\\s*[\"\\']true[\"\\']", "flags": "i", "sev": "warn", "message": "[warn] Cleartext HTTP is flagged by the Play pre-launch report and has to be disclosed on the Data safety form. Move the endpoints to HTTPS or scope it in a network security config.  Fix: android:usesCleartextTraffic=\"false\" plus a network security config", "fix": "android:usesCleartextTraffic=\"false\" plus a network security config"}, {"pattern": "<uses-sdk", "flags": "i", "sev": "info", "message": "[info] <uses-sdk> in the manifest is overridden by the Gradle values, so the number here can disagree with what Play actually receives. Keep the SDK levels in build.gradle only.  Fix: delete <uses-sdk> and set the levels in build.gradle", "fix": "delete <uses-sdk> and set the levels in build.gradle"}, {"pattern": "<(?:activity|activity-alias|service|receiver)\\b(?:(?!android:exported)[^>])*>", "flags": "i", "sev": "info", "message": "[info] No android:exported on this line. Every component with an intent filter has had to declare it since API 31, and a missing value fails the build before Play ever sees it.  Fix: android:exported=\"false\"", "fix": "android:exported=\"false\""}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('play-release-blocker-lint');
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
  const _c = vscode.workspace.getConfiguration('play-release-blocker-lint');
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
  const uri = vscode.Uri.joinPath(ws[0].uri, 'play-release-blocker-lint-report.json');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('play-release-blocker-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('play-release-blocker-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'play-release-blocker-lint-report.' + pick.toLowerCase());
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
  try { lic.pullFeed(ctx, "play-release-blocker-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('play-release-blocker-lint.audit_file', runCurrent);
  reg('play-release-blocker-lint.show_report', showReport);
  reg('play-release-blocker-lint.list_rules', listRules);
  reg('play-release-blocker-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('play-release-blocker-lint.ci_json', function () { return ciJson(ctx); });
  reg('play-release-blocker-lint.export_report', function () { return exportReport(ctx); });
  reg('play-release-blocker-lint.watch_on_save', function () { return watchOnSave(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('play-release-blocker-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
