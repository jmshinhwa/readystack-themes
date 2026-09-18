// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing the configuration file you have open…", "done": "Audit finished. Every finding is listed in the Output panel with its filename and line number.", "nothing_found": "No misconfiguration found in this file — it passes all 26 built-in rules.", "need_key": "This is a paid command. Paste your licence key to switch it on. The three free commands and all 46 setup blocks keep working without one.", "key_ok": "Licence key accepted. Workspace scan, apply-the-fix, report export, re-check on save, CI output and your own rules are now on.", "key_bad": "That licence key was not recognised. Check for a stray space at either end, or reply to your purchase email and we will re-issue it.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "export_report", "watch_on_save", "ci_json", "custom_rules"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('GNU GLOBAL (gtags) Workspace Setup Kit');
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
const RULES = [{"pattern": "\\$\\{workspaceRoot\\}", "flags": "g", "message": "${workspaceRoot} was replaced by ${workspaceFolder}. It no longer expands, so this task or include path resolves relative to the wrong directory and the failure is silent.", "fix": "${workspaceFolder}"}, {"pattern": "\"version\"\\s*:\\s*\"0\\.1\\.0\"", "flags": "", "message": "This tasks.json uses the legacy 0.1.0 schema. Keys such as group and presentation are ignored under it.", "fix": "\"version\": \"2.0.0\""}, {"pattern": "\"[A-Za-z0-9_.]*[Pp]ath\"\\s*:\\s*\"(/home/|/Users/|[A-Za-z]:)", "flags": "", "message": "A machine-specific absolute path in a committed config file. It works on your machine and breaks for everyone who clones the repository. Use ${workspaceFolder} or a settings key each developer sets locally.", "fix": ""}, {"pattern": "\"C_Cpp\\.intelliSenseEngine\"\\s*:\\s*\"Tag Parser\"", "flags": "", "message": "The Tag Parser is the fallback engine: it matches symbols by name only, so Go-to-Definition lands on the wrong overload and macro-guarded code is not understood.", "fix": ""}, {"pattern": "\"compilerPath\"\\s*:\\s*\"\"", "flags": "", "message": "compilerPath is empty, so system include directories are never discovered and every standard header shows as unresolved.", "fix": ""}, {"pattern": "\"cppStandard\"\\s*:\\s*\"c\\+\\+(98|03)\"", "flags": "", "message": "cppStandard is set to a pre-C++11 standard. Anything using auto, lambdas or range-for will be parsed as an error even though it compiles.", "fix": ""}, {"pattern": "\"limitSymbolsToIncludedHeaders\"\\s*:\\s*true", "flags": "", "message": "Cross-references are limited to headers this file already includes, so a caller in another translation unit will not be found.", "fix": "\"limitSymbolsToIncludedHeaders\": false"}, {"pattern": "\"C_Cpp\\.autocomplete\"\\s*:\\s*\"[Dd]isabled\"", "flags": "", "message": "C/C++ autocomplete is switched off in this configuration. Symbol completion will be word-based only.", "fix": ""}, {"pattern": "\"C_Cpp\\.errorSquiggles\"\\s*:\\s*\"[Dd]isabled\"", "flags": "", "message": "Error squiggles are off, so a broken includePath produces no visible signal at all — the tree just stops resolving quietly.", "fix": ""}, {"pattern": "\"editor\\.formatOnSave\"\\s*:\\s*false", "flags": "", "message": "Format on save is off in a committed setting. Formatting differences will surface as unrelated diff noise in review.", "fix": "\"editor.formatOnSave\": true"}, {"pattern": "\"editor\\.defaultFormatter\"\\s*:\\s*null", "flags": "", "message": "No default formatter is named, so VS Code asks which formatter to use on every save instead of formatting.", "fix": ""}, {"pattern": "\"files\\.autoSave\"\\s*:\\s*\"afterDelay\"", "flags": "", "message": "With autoSave set to afterDelay, format on save does not run on the delayed saves. Use onFocusChange or off if you rely on formatting.", "fix": ""}, {"pattern": "\"(css|scss|less)\\.lint\\.unknownAtRules\"\\s*:\\s*\"(error|warning)\"", "flags": "", "message": "@tailwind and @apply are reported as unknown at-rules with this setting, so the stylesheet shows errors that are not errors.", "fix": "\"css.lint.unknownAtRules\": \"ignore\""}, {"pattern": "\"editor\\.quickSuggestions\"\\s*:\\s*false", "flags": "", "message": "Quick suggestions are off entirely, which switches off class completion inside strings — the only place utility class names are written.", "fix": ""}, {"pattern": "\"tailwindCSS\\.emmetCompletions\"\\s*:\\s*false", "flags": "", "message": "Emmet-style class completion is off, so abbreviations in class attributes will not expand.", "fix": "\"tailwindCSS.emmetCompletions\": true"}, {"pattern": "\"editor\\.semanticHighlighting\\.enabled\"\\s*:\\s*false", "flags": "", "message": "Semantic highlighting is off, so parameters, fields and macros all fall back to the same TextMate colour and your token customisations do nothing.", "fix": "\"editor.semanticHighlighting.enabled\": true"}, {"pattern": "\"workbench\\.colorCustomizations\"\\s*:\\s*\\{\\s*\\}", "flags": "", "message": "An empty colorCustomizations block has no effect. Either fill it or remove it, so nobody assumes the theme is being overridden here.", "fix": ""}, {"pattern": "\"(password|passwd|token|secret|apiKey|api_key|client_secret|access_token)\"\\s*:\\s*\"[^\"$\\s]{8,}\"", "flags": "i", "message": "A literal credential in a configuration file that is committed. Once it is in git history, rotating the secret is the only fix. Move it to an environment variable or a local, ignored file.", "fix": ""}, {"pattern": "\"http\\.proxyStrictSSL\"\\s*:\\s*false", "flags": "", "message": "Certificate verification for extension and proxy traffic is switched off for anyone who opens this workspace.", "fix": "\"http.proxyStrictSSL\": true"}, {"pattern": "\"security\\.workspace\\.trust\\.enabled\"\\s*:\\s*false", "flags": "", "message": "Workspace trust is disabled, so tasks and extensions in any folder you open run without the trust prompt.", "fix": "\"security.workspace.trust.enabled\": true"}, {"pattern": "\"terminal\\.integrated\\.shellArgs\\.(windows|linux|osx)\"", "flags": "", "message": "The shellArgs keys were removed in favour of terminal profiles. This setting is read by nothing and the shell starts with default arguments.", "fix": ""}, {"pattern": "\"telemetry\\.enableTelemetry\"", "flags": "", "message": "telemetry.enableTelemetry is deprecated and no longer controls telemetry on its own. Use telemetry.telemetryLevel.", "fix": "\"telemetry.telemetryLevel\""}, {"pattern": "\"ASPNETCORE_ENVIRONMENT\"\\s*:\\s*\"Production\"", "flags": "", "message": "A debug configuration set to the Production environment: the developer exception page is suppressed, so a failing request returns a blank 500 with no stack.", "fix": "\"ASPNETCORE_ENVIRONMENT\": \"Development\""}, {"pattern": "\"java\\.import\\.maven\\.enabled\"\\s*:\\s*false", "flags": "", "message": "Maven import is disabled, so the MicroProfile project's dependencies are never put on the classpath and every import resolves as an error.", "fix": "\"java.import.maven.enabled\": true"}, {"pattern": "\"java\\.configuration\\.updateBuildConfiguration\"\\s*:\\s*\"disabled\"", "flags": "", "message": "Build configuration updates are disabled, so a change to pom.xml is ignored until the project is reloaded by hand.", "fix": "\"java.configuration.updateBuildConfiguration\": \"automatic\""}, {"pattern": "\"key\"\\s*:\\s*\"ctrl\\+[a-z]\"", "flags": "", "message": "A single Ctrl plus letter binding. Most of these are assigned by default in the editor; open Keyboard Shortcuts and check for a conflict, or use a two-key chord such as ctrl+k ctrl+t.", "fix": ""}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('gtags-workspace-config-kit');
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

async function exportReport(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const rows = ed ? [{ file: ed.document.fileName, hits: scan(ed.document.getText(), ed.document.fileName) }] : [];
  const lines = ['file,line,message'];
  for (const r of rows) for (const h of r.hits)
    lines.push([r.file, h.line, String(h.msg).replace(/,/g, ' ')].join(','));
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'gtags-workspace-config-kit-report.csv');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(lines.join('\n'), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'gtags-workspace-config-kit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
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
  await vscode.commands.executeCommand('workbench.action.openSettings', 'gtags-workspace-config-kit');
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
  try { lic.pullFeed(ctx, "gtags-workspace-config-kit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('gtags-workspace-config-kit.audit_open_file', runCurrent);
  reg('gtags-workspace-config-kit.insert_setup_block', runCurrent);
  reg('gtags-workspace-config-kit.show_setup_checklist', runCurrent);
  reg('gtags-workspace-config-kit.audit_workspace', function () { return scanWorkspace(ctx); });
  reg('gtags-workspace-config-kit.fix_open_file', function () { return scanWorkspace(ctx); });
  reg('gtags-workspace-config-kit.export_audit_report', function () { return scanWorkspace(ctx); });
  reg('gtags-workspace-config-kit.toggle_watch_on_save', function () { return watchOnSave(ctx); });
}
function deactivate() { if (watchOnSave._d) watchOnSave._d.dispose(); }
module.exports = { activate: activate, deactivate: deactivate };
