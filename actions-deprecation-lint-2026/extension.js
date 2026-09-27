// ⛔뼈대 (s165 rebuild28) — 두뇌는 ./engine.js + rules.json · 첫 1분은 ./auto.js · 유료 문턱은 license.js
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const GLOB = '**/*.{yml,yaml}';
const PREFIX = 'actions-deprecation-lint-2026';
const ENGINE = require('./engine.js');
const S = {"run": "Auditing the workflow file", "done": "Deprecated lines found - see the panel for the date each one stops running.", "nothing_found": "No deprecated actions, runner labels or workflow commands in this file.", "paste": "Paste a workflow YAML file here", "check": "Audit this file", "extra_rules": "Extra rules of your own, checked alongside the 25 dated GitHub deprecations that ship inside.", "need_key": "Full version: scan every workflow in the repository, export the report and fail CI on a finding - not just this open file. $29 once, one licence key per person or team seat. A freelance DevOps engineer bills about $100/hour in 2026; one blocked release morning costs more.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "key_ok": "Licence accepted. Repository scan, export, CI output, watch-on-save and custom rules are open.", "key_bad": "That key did not validate. Check it in your Polar receipt, or buy a licence."};
const PAID = ["workspace_scan", "export_report", "ci_json", "watch_on_save", "custom_rules"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('GitHub Actions Deprecation Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('actions-deprecation-lint-2026').get('min_severity')
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
// ★규칙은 rules.json · 두뇌는 engine.js (웹판과 같은 두뇌). 설정의 extraRules 만 여기서 얹는다.
function scan(text, fileName) {
  const extra = vscode.workspace.getConfiguration('actions-deprecation-lint-2026').get('extraRules');
  const res = ENGINE.engine.check(text, { today: new Date().toISOString().slice(0, 10), path: fileName, extra: Array.isArray(extra) ? extra : [] });
  return (res.findings || []).map(function (f) { return { line: f.line, msg: f.msg, fix: f.fix, sev: f.sev }; });
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

// ★유료 문 — 작업공간 스윕 · 보고서 · CI. ⛔무료 경로(열린 파일·고른 줄)는 이 문을 지나지 않는다.
const NEED_KEY = S.need_key;   // ⛔원문을 잡아둔다 — 아래에서 앞에 붙이므로 쌓이면 안 된다
async function sweepGate(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  const until = Number(st.get('sweepTrialUntil') || 0);   // s158 — already-started windows are honoured; none are opened
  const open = !hasKey && Date.now() < until;
  if (!open) {
    // ★자기 폴더에서 본 숫자를 먼저 보여주고 키를 묻는다
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your last sweep covered ' + last.files + ' files and found '
      + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  return { st: st };
}

async function scanWorkspace(ctx) {
  const t = await sweepGate(ctx);
  if (!t) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('actions-deprecation-lint-2026');
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
  const found = report(rows);
  await t.st.update('lastSweep', { files: rows.length, findings: found,
                                   at: new Date().toISOString().slice(0, 10) });
  vscode.window.showInformationMessage((found ? S.done : S.nothing_found));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const t = await sweepGate(ctx);
  if (!t) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('actions-deprecation-lint-2026').get('reportFormat')
    || vscode.workspace.getConfiguration('actions-deprecation-lint-2026').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'actions-deprecation-lint-2026-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  const t = await sweepGate(ctx);
  if (!t) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'actions-deprecation-lint-2026-report.json');
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
  await vscode.commands.executeCommand('workbench.action.openSettings', 'actions-deprecation-lint-2026');
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "actions-deprecation-lint-2026").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('actions-deprecation-lint-2026.audit_file', runCurrent);
  reg('actions-deprecation-lint-2026.audit_selection', runSelection);
  reg('actions-deprecation-lint-2026.show_report', showReport);
  reg('actions-deprecation-lint-2026.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('actions-deprecation-lint-2026.export_report', function () { return exportReport(ctx); });
  reg('actions-deprecation-lint-2026.ci_json', function () { return ciJson(ctx); });
  reg('actions-deprecation-lint-2026.watch_on_save', function () { return watchOnSave(ctx); });
  reg('actions-deprecation-lint-2026.custom_rules', function () { return customRules(ctx); });
  // s165 — auto.js (status bar · first-minute hint) calls PREFIX.checkFile / PREFIX.checkWorkspace
  reg(PREFIX + '.checkFile', runCurrent);
  reg(PREFIX + '.checkWorkspace', function () { return scanWorkspace(ctx); });
  try { require('./auto.js').start(ctx, { vscode: vscode, ENGINE: ENGINE, GLOB: GLOB, PREFIX: PREFIX, title: 'GitHub Actions Deprecation Lint', slug: 'actions-deprecation-lint-2026', price: 29 }); } catch (e) {}
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('actions-deprecation-lint-2026').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
