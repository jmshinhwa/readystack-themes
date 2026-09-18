// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Watching workflow files on save", "done": "Findings are listed in the Workflow Expiry panel.", "nothing_found": "No expiring lines found in this file.", "paste": "Paste a workflow YAML file here (.github/workflows/ci.yml)", "check": "Check for expiry dates", "extra_rules": "Extra rules of your own, checked alongside the 29 that ship inside.", "need_key": "Full version: scan every workflow in the repo at once, export the dated audit, and gate CI on it. $29 once - one licence key per person or team seat - 7-day full refund. Upwork lists DevOps engineers at $40-$100/hour, median $60.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted. The full version is unlocked.", "key_bad": "That key did not validate. Check it, or contact support for a refund."};
const PAID = ["workspace_scan", "export_report", "ci_json", "quick_fix", "watch_on_save", "custom_rules"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Workflow Expiry');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('workflow-expiry-check').get('min_severity')
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
const RULES = [{"pattern": "ubuntu-22\\.04-arm", "flags": "", "sev": "error", "message": "ubuntu-22.04-arm: deprecation starts 2026-09-17, fully unsupported 2027-04-17. Brownouts fail the job before then.  ->  runs-on: ubuntu-24.04-arm", "fix": "runs-on: ubuntu-24.04-arm"}, {"pattern": "ubuntu-22\\.04(?!-arm)", "flags": "", "sev": "error", "message": "ubuntu-22.04: deprecation starts 2026-09-17, fully unsupported 2027-04-17. Still a valid label today, so no linter flags it.  ->  runs-on: ubuntu-24.04", "fix": "runs-on: ubuntu-24.04"}, {"pattern": "ubuntu-(16|18|20)\\.04", "flags": "", "sev": "error", "message": "This Ubuntu image is already retired (20.04 went fully unsupported 2025-04-15). The job cannot start.  ->  runs-on: ubuntu-24.04", "fix": "runs-on: ubuntu-24.04"}, {"pattern": "windows-2019", "flags": "", "sev": "error", "message": "windows-2019 was retired on 2025-06-30. The job cannot start.  ->  runs-on: windows-2022", "fix": "runs-on: windows-2022"}, {"pattern": "windows-2016", "flags": "", "sev": "error", "message": "windows-2016 has been retired for years. The job cannot start.  ->  runs-on: windows-2022", "fix": "runs-on: windows-2022"}, {"pattern": "macos-(10|11|12)\\b", "flags": "", "sev": "error", "message": "macos-12 was retired on 2024-12-03; 10.x and 11 earlier still. The job cannot start.  ->  runs-on: macos-14", "fix": "runs-on: macos-14"}, {"pattern": "ubuntu-latest", "flags": "", "sev": "info", "message": "ubuntu-latest already moved 22.04 -> 24.04 and will move again to 26.04. Fine if your build is OS-agnostic; pin if it is not.", "fix": "runs-on: ubuntu-24.04"}, {"pattern": "using:\\s*['\\\"]?node20", "flags": "i", "sev": "error", "message": "runs.using node20: Node 20 is removed from the runner on 2026-09-23. This action stops running that day.  ->  using: 'node24'", "fix": "using: 'node24'"}, {"pattern": "using:\\s*['\\\"]?node(12|16)", "flags": "i", "sev": "error", "message": "runs.using node12/node16: already removed from the runner. This action cannot execute.  ->  using: 'node24'", "fix": "using: 'node24'"}, {"pattern": "ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION", "flags": "", "sev": "warn", "message": "This escape hatch only defers the Node 20 removal, and it stops working on 2026-09-23. It is not a fix.  ->  Move the action to node24 instead", "fix": "Move the action to node24 instead"}, {"pattern": "node-version:\\s*['\\\"]?(14|16|18)\\b", "flags": "i", "sev": "warn", "message": "Node 18 reached end of life on 2025-04-30; 16 and 14 long before. No security patches.  ->  node-version: '24'", "fix": "node-version: '24'"}, {"pattern": "actions/checkout@v[1-3]\\b", "flags": "", "sev": "error", "message": "actions/checkout v1-v3 run on Node 16, which is gone from the runner.  ->  uses: actions/checkout@v5", "fix": "uses: actions/checkout@v5"}, {"pattern": "actions/checkout@v4\\b", "flags": "", "sev": "warn", "message": "actions/checkout@v4 runs on Node 20, removed from the runner on 2026-09-23.  ->  uses: actions/checkout@v5", "fix": "uses: actions/checkout@v5"}, {"pattern": "actions/upload-artifact@v[1-3]\\b", "flags": "", "sev": "error", "message": "upload-artifact v3 was shut down on 2025-01-30. Jobs using it fail outright.  ->  uses: actions/upload-artifact@v6", "fix": "uses: actions/upload-artifact@v6"}, {"pattern": "actions/download-artifact@v[1-3]\\b", "flags": "", "sev": "error", "message": "download-artifact v3 was shut down on 2025-01-30. Jobs using it fail outright.  ->  uses: actions/download-artifact@v6", "fix": "uses: actions/download-artifact@v6"}, {"pattern": "actions/(upload|download)-artifact@v[45]\\b", "flags": "", "sev": "warn", "message": "artifact v4/v5 run on Node 20, removed from the runner on 2026-09-23.  ->  uses: actions/upload-artifact@v6", "fix": "uses: actions/upload-artifact@v6"}, {"pattern": "actions/cache@v[1-3]\\b", "flags": "", "sev": "error", "message": "actions/cache v1/v2 were shut down on 2025-02-01; v3 runs on a dead Node.  ->  uses: actions/cache@v4", "fix": "uses: actions/cache@v4"}, {"pattern": "actions/setup-node@v[1-3]\\b", "flags": "", "sev": "error", "message": "setup-node v1-v3 run on Node 16, which is gone from the runner.  ->  uses: actions/setup-node@v6", "fix": "uses: actions/setup-node@v6"}, {"pattern": "actions/setup-node@v[45]\\b", "flags": "", "sev": "warn", "message": "setup-node v4/v5 run on Node 20, removed from the runner on 2026-09-23.  ->  uses: actions/setup-node@v6", "fix": "uses: actions/setup-node@v6"}, {"pattern": "uses:\\s*(?!actions/)[\\w.-]+/[\\w.-]+@v[1-3]\\b", "flags": "", "sev": "warn", "message": "A third-party action still on v1-v3 almost certainly bundles Node 16 or 20. Check its runs.using before 2026-09-23.  ->  Upgrade to a major built on node24", "fix": "Upgrade to a major built on node24"}, {"pattern": "::set-output", "flags": "", "sev": "error", "message": "The ::set-output workflow command was removed. It is silently ignored, so the value is empty downstream.  ->  echo \"name=value\" >> \"$GITHUB_OUTPUT\"", "fix": "echo \"name=value\" >> \"$GITHUB_OUTPUT\""}, {"pattern": "::save-state", "flags": "", "sev": "error", "message": "The ::save-state workflow command was removed and is silently ignored.  ->  echo \"name=value\" >> \"$GITHUB_STATE\"", "fix": "echo \"name=value\" >> \"$GITHUB_STATE\""}, {"pattern": "::set-env", "flags": "", "sev": "error", "message": "The ::set-env workflow command was removed in 2020 for security reasons.  ->  echo \"NAME=value\" >> \"$GITHUB_ENV\"", "fix": "echo \"NAME=value\" >> \"$GITHUB_ENV\""}, {"pattern": "::add-path", "flags": "", "sev": "error", "message": "The ::add-path workflow command was removed in 2020 for security reasons.  ->  echo \"/some/path\" >> \"$GITHUB_PATH\"", "fix": "echo \"/some/path\" >> \"$GITHUB_PATH\""}, {"pattern": "\\$\\{\\{\\s*github\\.event\\.(issue\\.(title|body)|pull_request\\.(title|body)|comment\\.body|review\\.body|review_comment\\.body|discussion\\.(title|body)|head_commit\\.message)", "flags": "", "sev": "error", "message": "Attacker-controlled text. Interpolated into a run: block it is shell injection - anyone who can open an issue runs commands as your job.  ->  Pass it through env: then quote \"$VAR\" in the script", "fix": "Pass it through env: then quote \"$VAR\" in the script"}, {"pattern": "\\$\\{\\{\\s*github\\.(head_ref|event\\.pull_request\\.head\\.(ref|label))", "flags": "", "sev": "error", "message": "A branch name is attacker-chosen text. Interpolated into run: it is shell injection.  ->  Pass it through env: then quote \"$VAR\" in the script", "fix": "Pass it through env: then quote \"$VAR\" in the script"}, {"pattern": "pull_request_target", "flags": "", "sev": "warn", "message": "pull_request_target runs with a writable token and your secrets. Never check out the PR head under it.  ->  Use pull_request, or check out the base ref only", "fix": "Use pull_request, or check out the base ref only"}, {"pattern": "permissions:\\s*write-all", "flags": "", "sev": "error", "message": "write-all hands every job a token that can push code and publish packages.  ->  permissions: {contents: read}", "fix": "permissions: {contents: read}"}, {"pattern": "uses:\\s*(?!actions/)[\\w.-]+/[\\w.-]+@(main|master|HEAD|latest)\\b", "flags": "", "sev": "error", "message": "Pinned to a moving branch. A force-push into that branch runs in your pipeline with your secrets.  ->  Pin to the full 40-character commit SHA", "fix": "Pin to the full 40-character commit SHA"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('workflow-expiry-check');
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
  const _c = vscode.workspace.getConfiguration('workflow-expiry-check');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('workflow-expiry-check').get('reportFormat')
    || vscode.workspace.getConfiguration('workflow-expiry-check').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'workflow-expiry-check-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'workflow-expiry-check-report.json');
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
  await vscode.commands.executeCommand('workbench.action.openSettings', 'workflow-expiry-check');
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "workflow-expiry-check").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('workflow-expiry-check.audit_file', runCurrent);
  reg('workflow-expiry-check.audit_selection', runSelection);
  reg('workflow-expiry-check.list_rules', listRules);
  reg('workflow-expiry-check.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('workflow-expiry-check.export_report', function () { return exportReport(ctx); });
  reg('workflow-expiry-check.ci_json', function () { return ciJson(ctx); });
  reg('workflow-expiry-check.quick_fix', function () { return quickFix(ctx); });
  reg('workflow-expiry-check.watch_on_save', function () { return watchOnSave(ctx); });
  reg('workflow-expiry-check.custom_rules', function () { return customRules(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('workflow-expiry-check').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
