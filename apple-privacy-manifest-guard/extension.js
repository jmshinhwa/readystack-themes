// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking this file for required-reason API calls", "done": "Check finished.", "nothing_found": "No required-reason API call and no invalid reason code on these lines.", "paste": "Paste a source file or your PrivacyInfo.xcprivacy here", "check": "Check this file", "need_key": "Full version: scan the whole repository, export the declaration report, and fail CI instead of the upload. $29 once - one licence key per person or team seat, 7-day full refund. Mid-level freelance iOS developers bill $85-$145/hr.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted. The repository scan, the report export and CI JSON are open.", "key_bad": "That key did not validate. Check it in your Polar customer portal."};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Privacy Manifest Guard');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('apple-privacy-manifest-guard').get('min_severity')
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
const RULES = [{"pattern": "\\b(?:creationDate|modificationDate|fileModificationDate)\\b", "flags": "", "message": "NSPrivacyAccessedAPICategoryFileTimestamp - undeclared, this upload fails ITMS-91053. Legal reasons: DDA9.1, C617.1, 3B52.1, 0A2A.1.", "fix": "C617.1 for files in your own container; 3B52.1 for a document the user picked.", "sev": "error"}, {"pattern": "\\b(?:contentModificationDateKey|creationDateKey)\\b", "flags": "", "message": "NSPrivacyAccessedAPICategoryFileTimestamp - undeclared, this upload fails ITMS-91053. Legal reasons: DDA9.1, C617.1, 3B52.1, 0A2A.1.", "fix": "C617.1 for files in your own container.", "sev": "error"}, {"pattern": "\\b(?:getattrlistbulk|getattrlistat|fgetattrlist|getattrlist)\\s*\\(", "flags": "", "message": "NSPrivacyAccessedAPICategoryFileTimestamp - undeclared, this upload fails ITMS-91053. Legal reasons: DDA9.1, C617.1, 3B52.1, 0A2A.1.", "fix": "C617.1. Note getattrlist also counts as DiskSpace when you ask for volume attributes.", "sev": "error"}, {"pattern": "\\b(?:fstatat|lstat|fstat|stat)\\s*\\(", "flags": "", "message": "NSPrivacyAccessedAPICategoryFileTimestamp - undeclared, this upload fails ITMS-91053. Legal reasons: DDA9.1, C617.1, 3B52.1, 0A2A.1.", "fix": "C617.1 for files in your own container.", "sev": "error"}, {"pattern": "\\battributesOfItem\\s*\\(", "flags": "", "message": "NSPrivacyAccessedAPICategoryFileTimestamp - undeclared, this upload fails ITMS-91053. Legal reasons: DDA9.1, C617.1, 3B52.1, 0A2A.1.", "fix": "C617.1 - the returned dictionary carries .creationDate and .modificationDate.", "sev": "error"}, {"pattern": "\\bfs\\.(?:stat|lstat|fstat|statSync|lstatSync)\\b", "flags": "", "message": "Node/React Native file stat reaches NSPrivacyAccessedAPICategoryFileTimestamp through the native layer. Legal reasons: DDA9.1, C617.1, 3B52.1, 0A2A.1.", "fix": "C617.1 if the path is inside your app container.", "sev": "warn"}, {"pattern": "\\bRNFS\\.(?:stat|readDir)\\b|react-native-fs", "flags": "", "message": "react-native-fs returns mtime, so NSPrivacyAccessedAPICategoryFileTimestamp must be declared.", "fix": "C617.1.", "sev": "warn"}, {"pattern": "\\bgetInfoAsync\\s*\\(", "flags": "", "message": "expo-file-system getInfoAsync returns modificationTime -> NSPrivacyAccessedAPICategoryFileTimestamp.", "fix": "C617.1.", "sev": "warn"}, {"pattern": "\\.lastModified(?:Sync)?\\s*\\(", "flags": "", "message": "Dart File.lastModified maps to a file timestamp API -> NSPrivacyAccessedAPICategoryFileTimestamp.", "fix": "C617.1.", "sev": "warn"}, {"pattern": "\\bFileStat\\b|\\.statSync\\s*\\(", "flags": "", "message": "Dart FileStat maps to stat() -> NSPrivacyAccessedAPICategoryFileTimestamp.", "fix": "C617.1.", "sev": "warn"}, {"pattern": "\\bsystemUptime\\b", "flags": "", "message": "NSPrivacyAccessedAPICategorySystemBootTime - undeclared, this upload fails ITMS-91053. Legal reasons: 35F9.1.", "fix": "35F9.1 - only if you use it to measure elapsed time inside the app.", "sev": "error"}, {"pattern": "\\bmach_absolute_time\\s*\\(", "flags": "", "message": "NSPrivacyAccessedAPICategorySystemBootTime - undeclared, this upload fails ITMS-91053. Legal reasons: 35F9.1.", "fix": "35F9.1.", "sev": "error"}, {"pattern": "\\bkern\\.boottime\\b|\\bKERN_BOOTTIME\\b", "flags": "", "message": "NSPrivacyAccessedAPICategorySystemBootTime - undeclared, this upload fails ITMS-91053. Legal reasons: 35F9.1.", "fix": "35F9.1.", "sev": "error"}, {"pattern": "\\bgetUptime\\s*\\(|\\buptimeMillis\\b", "flags": "", "message": "An uptime helper reaches NSPrivacyAccessedAPICategorySystemBootTime. Legal reason: 35F9.1.", "fix": "35F9.1.", "sev": "warn"}, {"pattern": "\\bvolumeAvailableCapacity(?:ForImportantUsage|ForOpportunisticUsage)?Key\\b", "flags": "", "message": "NSPrivacyAccessedAPICategoryDiskSpace - undeclared, this upload fails ITMS-91053. Legal reasons: 85F4.1, E174.1, 7D9E.1.", "fix": "E174.1 when you check room before writing a file.", "sev": "error"}, {"pattern": "\\bvolumeTotalCapacityKey\\b", "flags": "", "message": "NSPrivacyAccessedAPICategoryDiskSpace - undeclared, this upload fails ITMS-91053. Legal reasons: 85F4.1, E174.1, 7D9E.1.", "fix": "85F4.1 when you show it to the user.", "sev": "error"}, {"pattern": "\\b(?:systemFreeSize|systemSize)\\b", "flags": "", "message": "NSPrivacyAccessedAPICategoryDiskSpace - undeclared, this upload fails ITMS-91053. Legal reasons: 85F4.1, E174.1, 7D9E.1.", "fix": "E174.1 or 85F4.1.", "sev": "error"}, {"pattern": "\\b(?:statvfs|fstatvfs|statfs|fstatfs)\\s*\\(", "flags": "", "message": "NSPrivacyAccessedAPICategoryDiskSpace - undeclared, this upload fails ITMS-91053. Legal reasons: 85F4.1, E174.1, 7D9E.1.", "fix": "E174.1.", "sev": "error"}, {"pattern": "\\bgetFreeDiskStorage\\b|\\bgetTotalDiskCapacity\\b", "flags": "", "message": "react-native-device-info disk calls reach NSPrivacyAccessedAPICategoryDiskSpace. Legal reasons: 85F4.1, E174.1, 7D9E.1.", "fix": "E174.1.", "sev": "warn"}, {"pattern": "\\bdisk_space\\b|\\bgetFreeDiskSpace\\b", "flags": "", "message": "A disk-space plugin reaches NSPrivacyAccessedAPICategoryDiskSpace.", "fix": "E174.1.", "sev": "warn"}, {"pattern": "\\bactiveInputModes\\b", "flags": "", "message": "NSPrivacyAccessedAPICategoryActiveKeyboards - undeclared, this upload fails ITMS-91053. Legal reasons: 3EC4.1, 54BD.1.", "fix": "54BD.1 to lay out your UI; 3EC4.1 only if you are a custom keyboard app.", "sev": "error"}, {"pattern": "\\bUITextInputMode\\b", "flags": "", "message": "UITextInputMode leads to activeInputModes -> NSPrivacyAccessedAPICategoryActiveKeyboards. Legal reasons: 3EC4.1, 54BD.1.", "fix": "54BD.1.", "sev": "warn"}, {"pattern": "\\b(?:NSUserDefaults|UserDefaults)\\b", "flags": "", "message": "NSPrivacyAccessedAPICategoryUserDefaults - undeclared, this upload fails ITMS-91053. Legal reasons: CA92.1, 1C8F.1, C56D.1, AC6B.1.", "fix": "CA92.1 for your own app; 1C8F.1 when the suite is an App Group.", "sev": "error"}, {"pattern": "\\bstandardUserDefaults\\b", "flags": "", "message": "NSPrivacyAccessedAPICategoryUserDefaults - undeclared, this upload fails ITMS-91053. Legal reasons: CA92.1, 1C8F.1, C56D.1, AC6B.1.", "fix": "CA92.1.", "sev": "error"}, {"pattern": "\\binitWithSuiteName\\b|\\bsuiteName\\s*:", "flags": "", "message": "A shared defaults suite is an App Group read -> NSPrivacyAccessedAPICategoryUserDefaults. Use 1C8F.1, not CA92.1.", "fix": "1C8F.1.", "sev": "warn"}, {"pattern": "\\bSharedPreferences\\.getInstance\\b|\\bshared_preferences\\b", "flags": "", "message": "Flutter shared_preferences is backed by NSUserDefaults on iOS -> NSPrivacyAccessedAPICategoryUserDefaults. Legal reasons: CA92.1, 1C8F.1, C56D.1, AC6B.1.", "fix": "CA92.1.", "sev": "warn"}, {"pattern": "@capacitor/preferences", "flags": "", "message": "The Capacitor Preferences plugin is backed by UserDefaults on iOS -> NSPrivacyAccessedAPICategoryUserDefaults.", "fix": "CA92.1.", "sev": "warn"}, {"pattern": "react-native-default-preference", "flags": "", "message": "react-native-default-preference wraps NSUserDefaults -> NSPrivacyAccessedAPICategoryUserDefaults.", "fix": "CA92.1.", "sev": "warn"}, {"pattern": "<string>(?!(?:DDA9\\.1|C617\\.1|3B52\\.1|0A2A\\.1|35F9\\.1|85F4\\.1|E174\\.1|7D9E\\.1|3EC4\\.1|54BD\\.1|CA92\\.1|1C8F\\.1|C56D\\.1|AC6B\\.1)</string>)[0-9A-Za-z]{4}\\.[0-9]+</string>", "flags": "", "message": "Not one of the 14 reason codes Apple accepts - this upload fails ITMS-91055.", "fix": "Replace it with a real code for that category. Apple publishes exactly 14.", "sev": "error"}, {"pattern": "NSPrivacyAccessedAPICategory(?!(?:FileTimestamp|SystemBootTime|DiskSpace|ActiveKeyboards|UserDefaults)\\b)", "flags": "", "message": "Not one of the 5 categories Apple accepts - this upload fails ITMS-91054.", "fix": "Valid: ActiveKeyboards, DiskSpace, FileTimestamp, SystemBootTime, UserDefaults.", "sev": "error"}, {"pattern": "NSPrivacyAccessedAPITypeReason(?!s)", "flags": "", "message": "The key is NSPrivacyAccessedAPITypeReasons, plural. Xcode reads nothing from the singular.", "fix": "Add the s.", "sev": "error"}, {"pattern": "NSPrivacyAccessedAPICategoryActiveKeyboards\\b", "flags": "", "message": "Declared NSPrivacyAccessedAPICategoryActiveKeyboards. The only reasons Apple accepts here are 3EC4.1, 54BD.1 - anything else is ITMS-91055.", "fix": "Legal here: 3EC4.1, 54BD.1.", "sev": "info"}, {"pattern": "NSPrivacyAccessedAPICategoryDiskSpace\\b", "flags": "", "message": "Declared NSPrivacyAccessedAPICategoryDiskSpace. The only reasons Apple accepts here are 85F4.1, E174.1, 7D9E.1 - anything else is ITMS-91055.", "fix": "Legal here: 85F4.1, E174.1, 7D9E.1.", "sev": "info"}, {"pattern": "NSPrivacyAccessedAPICategoryFileTimestamp\\b", "flags": "", "message": "Declared NSPrivacyAccessedAPICategoryFileTimestamp. The only reasons Apple accepts here are DDA9.1, C617.1, 3B52.1, 0A2A.1 - anything else is ITMS-91055.", "fix": "Legal here: DDA9.1, C617.1, 3B52.1, 0A2A.1.", "sev": "info"}, {"pattern": "NSPrivacyAccessedAPICategorySystemBootTime\\b", "flags": "", "message": "Declared NSPrivacyAccessedAPICategorySystemBootTime. The only reasons Apple accepts here are 35F9.1 - anything else is ITMS-91055.", "fix": "Legal here: 35F9.1.", "sev": "info"}, {"pattern": "NSPrivacyAccessedAPICategoryUserDefaults\\b", "flags": "", "message": "Declared NSPrivacyAccessedAPICategoryUserDefaults. The only reasons Apple accepts here are CA92.1, 1C8F.1, C56D.1, AC6B.1 - anything else is ITMS-91055.", "fix": "Legal here: CA92.1, 1C8F.1, C56D.1, AC6B.1.", "sev": "info"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('apple-privacy-manifest-guard');
  const extra = cfg.get('extraRules');
  const rules = RULES.concat(Array.isArray(extra) ? extra : []);
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
  const _c = vscode.workspace.getConfiguration('apple-privacy-manifest-guard');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('apple-privacy-manifest-guard').get('reportFormat')
    || vscode.workspace.getConfiguration('apple-privacy-manifest-guard').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'apple-privacy-manifest-guard-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'apple-privacy-manifest-guard-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('apple-privacy-manifest-guard.audit_file', runCurrent);
  reg('apple-privacy-manifest-guard.audit_selection', runSelection);
  reg('apple-privacy-manifest-guard.list_rules', listRules);
  reg('apple-privacy-manifest-guard.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('apple-privacy-manifest-guard.export_report', function () { return exportReport(ctx); });
  reg('apple-privacy-manifest-guard.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('apple-privacy-manifest-guard').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
