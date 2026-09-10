// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking", "done": "Findings are in the Privacy Manifest Lint panel", "nothing_found": "No required-reason API and no manifest defect in this file", "need_key": "Full version: scan every file in the repo, export the findings as CSV/JSON/HTML, emit CI JSON, and auto-fix the misspelled manifest keys. $29 once - one licence key per person or team seat - 7-day full refund. An experienced freelance iOS developer bills $85-145/hour in 2026.", "key_ok": "Licence accepted - the full version is unlocked", "key_bad": "That key did not validate. Check it, or use the refund window", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "paste": "Paste your PrivacyInfo.xcprivacy, or a source file in C#, Dart, JS/TS, Swift, Obj-C or Kotlin", "check": "Check this file", "extra_rules": "Your own regex rules, checked alongside the 48 that ship inside."};
const PAID = ["workspace_scan", "export_report", "ci_json", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Privacy Manifest Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('privacy-manifest-lint').get('min_severity')
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
const RULES = [{"pattern": ">DDA9\\.1<", "flags": "", "sev": "info", "message": "DDA9.1 belongs to NSPrivacyAccessedAPICategoryFileTimestamp - display file timestamps to the person using the device; the value must not be sent off-device. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">C617\\.1<", "flags": "", "sev": "info", "message": "C617.1 belongs to NSPrivacyAccessedAPICategoryFileTimestamp - read timestamps/size/metadata of files inside the app container, app group container, or the app CloudKit container. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">3B52\\.1<", "flags": "", "sev": "info", "message": "3B52.1 belongs to NSPrivacyAccessedAPICategoryFileTimestamp - read metadata of files or directories the person explicitly granted access to, e.g. through a document picker. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">0A2A\\.1<", "flags": "", "sev": "info", "message": "0A2A.1 belongs to NSPrivacyAccessedAPICategoryFileTimestamp - third-party SDK that wraps file-timestamp APIs and touches them only when the containing app calls the wrapper. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">35F9\\.1<", "flags": "", "sev": "info", "message": "35F9.1 belongs to NSPrivacyAccessedAPICategorySystemBootTime - measure the time elapsed between events inside your app, or drive timers. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">8FFB\\.1<", "flags": "", "sev": "info", "message": "8FFB.1 belongs to NSPrivacyAccessedAPICategorySystemBootTime - calculate absolute timestamps for events that happened inside your app, such as UIKit or AVFAudio events. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">3D61\\.1<", "flags": "", "sev": "info", "message": "3D61.1 belongs to NSPrivacyAccessedAPICategorySystemBootTime - include boot time in an optional bug report that the person chooses to submit. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">85F4\\.1<", "flags": "", "sev": "info", "message": "85F4.1 belongs to NSPrivacyAccessedAPICategoryDiskSpace - display disk space to the person, in bytes or in minutes of a media type. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">E174\\.1<", "flags": "", "sev": "info", "message": "E174.1 belongs to NSPrivacyAccessedAPICategoryDiskSpace - check space before writing, or free space by deleting; the app must visibly react to the disk-space level. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">7D9E\\.1<", "flags": "", "sev": "info", "message": "7D9E.1 belongs to NSPrivacyAccessedAPICategoryDiskSpace - include disk space in an optional bug report that the person chooses to submit. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">B728\\.1<", "flags": "", "sev": "info", "message": "B728.1 belongs to NSPrivacyAccessedAPICategoryDiskSpace - health-research app detecting and telling participants about low disk space that affects data collection. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">3EC4\\.1<", "flags": "", "sev": "info", "message": "3EC4.1 belongs to NSPrivacyAccessedAPICategoryActiveKeyboards - your app is a custom keyboard app whose primary function is providing a systemwide keyboard. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">54BD\\.1<", "flags": "", "sev": "info", "message": "54BD.1 belongs to NSPrivacyAccessedAPICategoryActiveKeyboards - read active keyboards to present the correct customised UI; the app must have text fields and visibly change behaviour. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">CA92\\.1<", "flags": "", "sev": "info", "message": "CA92.1 belongs to NSPrivacyAccessedAPICategoryUserDefaults - read/write data exclusive to the app itself - not other apps, not the system. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">1C8F\\.1<", "flags": "", "sev": "info", "message": "1C8F.1 belongs to NSPrivacyAccessedAPICategoryUserDefaults - read/write data only within apps, app extensions and App Clips in the same App Group. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">C56D\\.1<", "flags": "", "sev": "info", "message": "C56D.1 belongs to NSPrivacyAccessedAPICategoryUserDefaults - third-party SDK that wraps the user-defaults APIs and touches them only when the containing app calls the wrapper. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": ">AC6B\\.1<", "flags": "", "sev": "info", "message": "AC6B.1 belongs to NSPrivacyAccessedAPICategoryUserDefaults - read com.apple.configuration.managed or write com.apple.feedback.managed for MDM managed app configuration - MDM ONLY. If this code sits under any other category, App Store Connect returns ITMS-91055 / ITMS-91056."}, {"pattern": "<string>(?!(?:DDA9|C617|3B52|0A2A|35F9|8FFB|3D61|85F4|E174|7D9E|B728|3EC4|54BD|CA92|1C8F|C56D|AC6B)\\.1</string>)[0-9A-Za-z]{4}\\.[0-9]+</string>", "flags": "", "sev": "error", "message": "Not a reason code Apple issues. Exactly 17 exist and every one ends in \".1\": DDA9.1, C617.1, 3B52.1, 0A2A.1, 35F9.1, 8FFB.1, 3D61.1, 85F4.1, E174.1, 7D9E.1, B728.1, 3EC4.1, 54BD.1, CA92.1, 1C8F.1, C56D.1, AC6B.1. Upload returns ITMS-91055 / ITMS-91056."}, {"pattern": "NSPrivacyAccessedAPICategoryUserDefault<", "flags": "", "sev": "error", "message": "Category is plural: NSPrivacyAccessedAPICategoryUserDefaults. Upload returns ITMS-91056.", "replace": "NSPrivacyAccessedAPICategoryUserDefaults<", "fix": "NSPrivacyAccessedAPICategoryUserDefaults<"}, {"pattern": "NSPrivacyAccessedAPICategoryFileTimestamps<", "flags": "", "sev": "error", "message": "Category is singular: NSPrivacyAccessedAPICategoryFileTimestamp. Upload returns ITMS-91056.", "replace": "NSPrivacyAccessedAPICategoryFileTimestamp<", "fix": "NSPrivacyAccessedAPICategoryFileTimestamp<"}, {"pattern": "NSPrivacyAccessedAPICategoryBootTime<", "flags": "", "sev": "error", "message": "Category is NSPrivacyAccessedAPICategorySystemBootTime - \"System\" is not optional. Upload returns ITMS-91056.", "replace": "NSPrivacyAccessedAPICategorySystemBootTime<", "fix": "NSPrivacyAccessedAPICategorySystemBootTime<"}, {"pattern": "NSPrivacyAccessedAPICategoryActiveKeyboard<", "flags": "", "sev": "error", "message": "Category is plural: NSPrivacyAccessedAPICategoryActiveKeyboards. Upload returns ITMS-91056.", "replace": "NSPrivacyAccessedAPICategoryActiveKeyboards<", "fix": "NSPrivacyAccessedAPICategoryActiveKeyboards<"}, {"pattern": "NSPrivacyAccessedAPICategoryDiskSpaces<", "flags": "", "sev": "error", "message": "Category is singular: NSPrivacyAccessedAPICategoryDiskSpace. Upload returns ITMS-91056.", "replace": "NSPrivacyAccessedAPICategoryDiskSpace<", "fix": "NSPrivacyAccessedAPICategoryDiskSpace<"}, {"pattern": "<key>NSPrivacyAccessedAPIReasons</key>", "flags": "", "sev": "error", "message": "The key is NSPrivacyAccessedAPITypeReasons. \"Type\" is missing here. Upload returns ITMS-91056.", "replace": "<key>NSPrivacyAccessedAPITypeReasons</key>", "fix": "<key>NSPrivacyAccessedAPITypeReasons</key>"}, {"pattern": "<key>NSPrivacyAccessedAPICategory</key>", "flags": "", "sev": "error", "message": "The key is NSPrivacyAccessedAPIType; the category name is its <string> value, not the key. Upload returns ITMS-91056.", "replace": "<key>NSPrivacyAccessedAPIType</key>", "fix": "<key>NSPrivacyAccessedAPIType</key>"}, {"pattern": "<key>NSPrivacyTrackingDomain</key>", "flags": "", "sev": "error", "message": "The key is plural: NSPrivacyTrackingDomains. Upload returns ITMS-91056.", "replace": "<key>NSPrivacyTrackingDomains</key>", "fix": "<key>NSPrivacyTrackingDomains</key>"}, {"pattern": "<key>NSPrivacyCollectedDataType</key>", "flags": "", "sev": "error", "message": "The top-level key is plural: NSPrivacyCollectedDataTypes. Upload returns ITMS-91056.", "replace": "<key>NSPrivacyCollectedDataTypes</key>", "fix": "<key>NSPrivacyCollectedDataTypes</key>"}, {"pattern": "<key>NSPrivacyAccessedAPIType</key>\\s*<array>", "flags": "", "sev": "error", "message": "An array of declarations goes under the plural key NSPrivacyAccessedAPITypes. Upload returns ITMS-91056.", "replace": "<key>NSPrivacyAccessedAPITypes</key>\n\t<array>", "fix": "<key>NSPrivacyAccessedAPITypes</key>\n\t<array>"}, {"pattern": "\\b(NS)?UserDefaults\\b", "flags": "", "sev": "warn", "message": "UserDefaults is a required-reason API. Declare NSPrivacyAccessedAPICategoryUserDefaults with CA92.1 (app-only), 1C8F.1 (App Group), C56D.1 (SDK wrapper) or AC6B.1 (MDM only)."}, {"pattern": "\\bPreferences\\.(Default|Get|Set|Remove|Clear|ContainsKey)\\b", "flags": "", "sev": "warn", "message": ".NET MAUI Preferences maps to NSUserDefaults on iOS. Declare NSPrivacyAccessedAPICategoryUserDefaults, normally CA92.1."}, {"pattern": "Microsoft\\.Maui\\.Storage\\.Preferences", "flags": "", "sev": "warn", "message": ".NET MAUI Preferences maps to NSUserDefaults on iOS. Declare NSPrivacyAccessedAPICategoryUserDefaults, normally CA92.1."}, {"pattern": "\\bSharedPreferences\\.getInstance\\b", "flags": "", "sev": "warn", "message": "Flutter shared_preferences uses NSUserDefaults in its default iOS implementation. Confirm the plugin version ships its own manifest, or declare NSPrivacyAccessedAPICategoryUserDefaults yourself."}, {"pattern": "\\.systemUptime\\b", "flags": "", "sev": "warn", "message": "systemUptime is a required-reason API. Declare NSPrivacyAccessedAPICategorySystemBootTime with 35F9.1, 8FFB.1 or 3D61.1."}, {"pattern": "\\bmach_absolute_time\\s*\\(", "flags": "", "sev": "warn", "message": "mach_absolute_time() is a required-reason API. Declare NSPrivacyAccessedAPICategorySystemBootTime with 35F9.1, 8FFB.1 or 3D61.1."}, {"pattern": "\\bEnvironment\\.TickCount\\b", "flags": "", "sev": "warn", "message": ".NET Environment.TickCount reads the system uptime clock on iOS. Declare NSPrivacyAccessedAPICategorySystemBootTime, normally 35F9.1."}, {"pattern": "\\bCACurrentMediaTime\\s*\\(", "flags": "", "sev": "info", "message": "CACurrentMediaTime() is derived from the system boot-time clock. Check whether your use falls under NSPrivacyAccessedAPICategorySystemBootTime."}, {"pattern": "\\bvolume(Available|Total)Capacity(ForImportantUsage|ForOpportunisticUsage)?Key\\b", "flags": "", "sev": "warn", "message": "Volume capacity keys are required-reason APIs. Declare NSPrivacyAccessedAPICategoryDiskSpace with 85F4.1, E174.1, 7D9E.1 or B728.1."}, {"pattern": "\\bNSFileSystem(FreeSize|Size)\\b", "flags": "", "sev": "warn", "message": "NSFileSystemFreeSize / NSFileSystemSize are required-reason APIs. Declare NSPrivacyAccessedAPICategoryDiskSpace."}, {"pattern": "\\b(statfs|statvfs|fstatfs|fstatvfs)\\s*\\(", "flags": "", "sev": "warn", "message": "statfs family reads disk space. Declare NSPrivacyAccessedAPICategoryDiskSpace with 85F4.1, E174.1, 7D9E.1 or B728.1."}, {"pattern": "\\bDriveInfo\\b|\\bAvailableFreeSpace\\b|\\bTotalFreeSpace\\b", "flags": "", "sev": "warn", "message": ".NET DriveInfo free-space members read disk space on iOS. Declare NSPrivacyAccessedAPICategoryDiskSpace."}, {"pattern": "\\bgetFreeDiskStorage\\b|\\bgetTotalDiskCapacity\\b", "flags": "", "sev": "warn", "message": "react-native-device-info disk helpers read disk space. Declare NSPrivacyAccessedAPICategoryDiskSpace, or confirm the library ships its own manifest."}, {"pattern": "\\b(getattrlist|getattrlistbulk|fgetattrlist|getattrlistat)\\s*\\(", "flags": "", "sev": "warn", "message": "getattrlist family reads file metadata. Declare NSPrivacyAccessedAPICategoryFileTimestamp with DDA9.1, C617.1, 3B52.1 or 0A2A.1."}, {"pattern": "\\b(stat|fstat|lstat|fstatat)\\s*\\(", "flags": "", "sev": "warn", "message": "stat family reads file timestamps. Declare NSPrivacyAccessedAPICategoryFileTimestamp with DDA9.1, C617.1, 3B52.1 or 0A2A.1."}, {"pattern": "\\b(creationDate|modificationDate|fileModificationDate|fileCreationDate)\\b", "flags": "", "sev": "warn", "message": "File date properties are required-reason APIs. Declare NSPrivacyAccessedAPICategoryFileTimestamp."}, {"pattern": "\\bNSURL(ContentModificationDate|CreationDate)Key\\b|\\b(contentModificationDateKey|creationDateKey)\\b", "flags": "", "sev": "warn", "message": "URL resource date keys are required-reason APIs. Declare NSPrivacyAccessedAPICategoryFileTimestamp."}, {"pattern": "\\bFile\\.Get(CreationTime|LastWriteTime|LastAccessTime)(Utc)?\\b", "flags": "", "sev": "warn", "message": ".NET File.Get*Time calls stat on iOS. Declare NSPrivacyAccessedAPICategoryFileTimestamp, normally C617.1 for files in your own container."}, {"pattern": "\\.lastModifiedSync\\s*\\(|\\.lastModified\\s*\\(|\\.statSync\\s*\\(", "flags": "", "sev": "warn", "message": "Dart File.lastModified / stat read file timestamps. Declare NSPrivacyAccessedAPICategoryFileTimestamp."}, {"pattern": "\\bactiveInputModes\\b", "flags": "", "sev": "warn", "message": "UITextInputMode.activeInputModes is a required-reason API. Declare NSPrivacyAccessedAPICategoryActiveKeyboards with 3EC4.1 or 54BD.1."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('privacy-manifest-lint');
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

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('privacy-manifest-lint');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('privacy-manifest-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('privacy-manifest-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'privacy-manifest-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'privacy-manifest-lint-report.json');
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
  try { lic.pullFeed(ctx, "privacy-manifest-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('privacy-manifest-lint.audit_file', runCurrent);
  reg('privacy-manifest-lint.audit_selection', runSelection);
  reg('privacy-manifest-lint.list_rules', listRules);
  reg('privacy-manifest-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('privacy-manifest-lint.export_report', function () { return exportReport(ctx); });
  reg('privacy-manifest-lint.ci_json', function () { return ciJson(ctx); });
  reg('privacy-manifest-lint.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('privacy-manifest-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
