// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing against the 24 built-in rules…", "done": "Audit finished. Every hit is listed as file:line in the Stack Audit output channel — click a line to jump to it.", "nothing_found": "No rule matched. This file is clean against all 24 built-in rules.", "need_key": "This one is paid. Paste your licence key to turn on the workspace scan, the report file, auto-fix, watch-on-save, your own rules and the CI JSON. The snippets and the open-file audit keep working without a key.", "key_ok": "Licence key accepted. Workspace scan, reports, auto-fix, watch-on-save, custom rules and CI JSON are on, and stay on offline for 30 days between checks.", "key_bad": "That key was not accepted — check for a missing character. If it still fails, email us from the listing page and we will re-issue it; the 7-day full refund stands either way.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "watch_on_save", "custom_rules", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('MicroProfile Tools & 9-Stack Snippets');
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
  for (const r of rows) {
    if (!r.hits.length) continue;
    c.appendLine(path.basename(r.file));
    for (const h of r.hits) { c.appendLine('  ' + h.line + ': ' + h.msg); n++; }
  }
  c.appendLine('—— ' + n + ' ——');
  c.show(true);
  return n;
}

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질).
const RULES = [{"pattern": "@ConfigProperty\\(\\s*name\\s*=\\s*\"[^\"]+\"\\s*\\)", "flags": "", "message": "MicroProfile Config: this @ConfigProperty has no defaultValue and is not wrapped in Optional. If the key is absent at startup, the container fails deployment rather than the request."}, {"pattern": "@Retry\\((?:(?!maxRetries)[^)])*\\)", "flags": "", "message": "Fault Tolerance: @Retry without an explicit maxRetries silently uses the specification default. Write the number you actually want."}, {"pattern": "@CircuitBreaker\\((?:(?!failureRatio)[^)])*\\)", "flags": "", "message": "Fault Tolerance: @CircuitBreaker without failureRatio uses the default trip ratio. State it so the trip point is reviewable."}, {"pattern": "^\\s*mp\\.[A-Za-z0-9_.]*[A-Z][A-Za-z0-9_.]*\\s*=", "flags": "m", "message": "MicroProfile Config keys defined by the specification are lower-case dotted (mp.jwt.verify.issuer). An upper-case segment does not match and the property is silently never read."}, {"pattern": "^\\s*[A-Za-z0-9_.-]*(password|secret|token|apikey|api_key)\\s*=\\s*(?!\\$\\{)[^\\s#]+", "flags": "im", "message": "A literal secret in a config file gets committed and then lives in the repository history. Reference an environment variable (${VAR}) or a separate config source."}, {"pattern": "status\\s*=\\s*\"ok\"\\s*;", "flags": "", "message": "DeviceTree expects status = \"okay\". The string \"ok\" is not recognised, so the node stays disabled and the driver never probes.", "fix": "status = \"okay\";"}, {"pattern": "compatible\\s*=\\s*\"[A-Za-z0-9._+-]+\"\\s*;", "flags": "", "message": "This compatible string has no vendor prefix. Linux matches on \"vendor,device\", so a bare name will not bind to any driver."}, {"pattern": "^\\s*[a-z0-9]+_[a-z0-9_]*(@[0-9a-fA-F]+)?\\s*\\{", "flags": "m", "message": "DeviceTree node names use hyphens, not underscores (gpio-keys, not gpio_keys)."}, {"pattern": "gpios\\s*=\\s*<\\s*&[a-z0-9_]+\\s+[0-9]+\\s*>", "flags": "", "message": "This GPIO specifier has no flags cell. Add GPIO_ACTIVE_HIGH or GPIO_ACTIVE_LOW, otherwise the polarity is whatever the driver assumes."}, {"pattern": "^\\s*MsgBox\\s*,", "flags": "m", "message": "AutoHotkey v1 command syntax. In v2 this is MsgBox(\"text\") and the comma form is a syntax error."}, {"pattern": "\\bStringReplace\\b", "flags": "", "message": "StringReplace was removed in AutoHotkey v2. Use StrReplace().", "fix": "StrReplace"}, {"pattern": "^\\s*Gui\\s*,", "flags": "m", "message": "AutoHotkey v1 Gui command. In v2 you build a Gui object: myGui := Gui()."}, {"pattern": "^\\s*SetTimer\\s*,", "flags": "m", "message": "AutoHotkey v1 comma syntax. In v2 this is SetTimer(Callback, Period)."}, {"pattern": "^\\s*label\\s+[A-Za-z_][A-Za-z0-9_]*\\s*$", "flags": "m", "message": "Ren'Py: a label needs a trailing colon. Without it the script does not compile and the error only appears when you launch."}, {"pattern": "^\\s*menu\\s*$", "flags": "m", "message": "Ren'Py: menu needs a trailing colon (menu:)."}, {"pattern": "^\\s*python\\s*:", "flags": "m", "message": "Ren'Py: a plain python: block runs during the scene. Definitions that must exist before the game starts belong in init python:.", "fix": "init python:"}, {"pattern": "^\\s*version\\s*=\\s*[0-9]+\\.[0-9]+(\\.[0-9]+)?\\s*$", "flags": "m", "message": "TOML: an unquoted dotted version is not a valid value. Write version = \"0.1.0\"."}, {"pattern": "=\\s*0[0-9]+\\s*$", "flags": "m", "message": "TOML: integers may not carry a leading zero. Remove it, or quote the value if it is really a string."}, {"pattern": "^\\s*\\[[A-Za-z0-9_.-]+\\s+[A-Za-z0-9_.-]+\\]", "flags": "m", "message": "TOML: a table name containing a space must be quoted, for example [\"my table\"]."}, {"pattern": "\\btry!\\s", "flags": "", "message": "Swift: force-try aborts the process on any thrown error. Use try? with a fallback, or do/catch."}, {"pattern": "\\bas!\\s", "flags": "", "message": "Swift: a force downcast traps at runtime when the type does not match. Use as? with a guard let."}, {"pattern": "\\bDispatchQueue\\.main\\.sync\\b", "flags": "", "message": "Swift: DispatchQueue.main.sync deadlocks when it is already running on the main queue. Use async, or await MainActor.run."}, {"pattern": "^\\s*except\\s*:\\s*$", "flags": "m", "message": "Python: a bare except swallows KeyboardInterrupt and SystemExit as well. Catch Exception, or the specific error."}, {"pattern": "^\\s*from\\s+[A-Za-z0-9_.]+\\s+import\\s+\\*", "flags": "m", "message": "Python: a wildcard import hides which names are actually used and defeats static checking. Import the names you need."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('microprofile-nine-stack-toolkit');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      let re;
      try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
      if (re.test(lines[i])) hits.push({ line: i + 1, msg: r.message, fix: r.fix || null });
    }
  }
  return hits;
}

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 2000);
  const rows = [];
  for (const f of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(f);
      rows.push({ file: f.fsPath, hits: scan(doc.getText(), f.fsPath) });
    } catch (e) { /* 열 수 없는 파일은 건너뛴다 */ }
  }
  report(rows);
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

async function customRules(ctx) {
  if (!(await paidGate(ctx))) return;
  await vscode.commands.executeCommand('workbench.action.openSettings', 'microprofile-nine-stack-toolkit');
}

async function exportReport(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const rows = ed ? [{ file: ed.document.fileName, hits: scan(ed.document.getText(), ed.document.fileName) }] : [];
  const lines = ['file,line,message'];
  for (const r of rows) for (const h of r.hits)
    lines.push([r.file, h.line, String(h.msg).replace(/,/g, ' ')].join(','));
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'microprofile-nine-stack-toolkit-report.csv');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(lines.join('\n'), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'microprofile-nine-stack-toolkit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "microprofile-nine-stack-toolkit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('microprofile-nine-stack-toolkit.audit_current_file', runCurrent);
  reg('microprofile-nine-stack-toolkit.audit_selection', runCurrent);
  reg('microprofile-nine-stack-toolkit.list_rules', runCurrent);
  reg('microprofile-nine-stack-toolkit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('microprofile-nine-stack-toolkit.quick_fix', function () { return quickFix(ctx); });
  reg('microprofile-nine-stack-toolkit.watch_on_save', function () { return watchOnSave(ctx); });
  reg('microprofile-nine-stack-toolkit.custom_rules', function () { return customRules(ctx); });
  reg('microprofile-nine-stack-toolkit.export_report', function () { return exportReport(ctx); });
  reg('microprofile-nine-stack-toolkit.ci_json', function () { return ciJson(ctx); });
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
