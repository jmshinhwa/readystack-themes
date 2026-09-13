// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing the workflow file", "done": "Deprecated lines found - see the panel for the date each one stops running.", "nothing_found": "No deprecated actions, runner labels or workflow commands in this file.", "paste": "Paste a workflow YAML file here", "check": "Audit this file", "extra_rules": "Extra rules of your own, checked alongside the 25 dated GitHub deprecations that ship inside.", "need_key": "Full version: scan every workflow in the repository, export the report and fail CI on a finding - not just this open file. $29 once, one licence key per person or team seat, 7-day full refund. A freelance DevOps engineer bills about $100/hour in 2026; one blocked release morning costs more.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "key_ok": "Licence accepted. Repository scan, export, CI output, watch-on-save and custom rules are open.", "key_bad": "That key did not validate. Check it in your Polar receipt, or buy a licence."};
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
const RULES = [{"pattern": "actions/checkout@v[1-4]\\b", "flags": "i", "sev": "warn", "fix": "actions/checkout@v5", "message": "actions/checkout@v1-v4 runs on Node 20. Node 20 is removed from GitHub-hosted runners on 2026-09-23 - move to actions/checkout@v5 (needs runner 2.327.1 or later)."}, {"pattern": "actions/setup-node@v[1-4]\\b", "flags": "i", "sev": "warn", "fix": "actions/setup-node@v5", "message": "actions/setup-node@v1-v4 runs on Node 20, removed from the runner on 2026-09-23 - move to actions/setup-node@v5."}, {"pattern": "actions/(upload|download)-artifact@v3\\b", "flags": "i", "sev": "error", "fix": "actions/upload-artifact@v6", "message": "artifact actions v3 were shut down on 2025-01-30 - the step fails today. Move to v6 (v4 changed to immutable artifacts, so a job that uploaded the same name twice needs merge-multiple)."}, {"pattern": "actions/(upload|download)-artifact@v[45]\\b", "flags": "i", "sev": "warn", "fix": "actions/upload-artifact@v6", "message": "artifact actions v4 and v5 still default to Node 20, which the runner drops on 2026-09-23 - move to v6 (needs runner 2.327.1 or later)."}, {"pattern": "actions/cache@v[12]\\b", "flags": "i", "sev": "error", "fix": "actions/cache@v5", "message": "actions/cache@v1 and @v2 stopped working on 2025-02-01, and the v1 cache service was shut down on 2025-04-15 - move to actions/cache@v5."}, {"pattern": "actions/cache@v[34]\\b", "flags": "i", "sev": "warn", "fix": "actions/cache@v5", "message": "actions/cache@v3-v4 runs on Node 20, removed from the runner on 2026-09-23 - move to actions/cache@v5, which uses the rewritten cache service."}, {"pattern": "actions/setup-python@v[1-5]\\b", "flags": "i", "sev": "warn", "fix": "actions/setup-python@v6", "message": "actions/setup-python@v1-v5 runs on Node 20, removed from the runner on 2026-09-23 - move to actions/setup-python@v6."}, {"pattern": "actions/setup-java@v[1-4]\\b", "flags": "i", "sev": "warn", "fix": "actions/setup-java@v6", "message": "actions/setup-java@v1-v4 is deprecated and runs on Node 20, removed from the runner on 2026-09-23 - move to actions/setup-java@v6."}, {"pattern": "runs-on:.*ubuntu-18\\.04", "flags": "i", "sev": "error", "fix": "ubuntu-24.04", "message": "the ubuntu-18.04 runner image was removed on 2022-12-01 - the job cannot start. Use ubuntu-24.04."}, {"pattern": "runs-on:.*ubuntu-20\\.04", "flags": "i", "sev": "error", "fix": "ubuntu-24.04", "message": "the ubuntu-20.04 runner image became fully unsupported on 2025-04-15 - the job fails to start. Use ubuntu-24.04."}, {"pattern": "runs-on:.*ubuntu-22\\.04", "flags": "i", "sev": "warn", "fix": "ubuntu-24.04", "message": "ubuntu-22.04 and ubuntu-22.04-arm enter deprecation on 2026-09-17 and are fully unsupported on 2027-04-17 - move to ubuntu-24.04 or ubuntu-26.04 before the brownouts start."}, {"pattern": "runs-on:.*windows-2019", "flags": "i", "sev": "error", "fix": "windows-2025", "message": "the windows-2019 runner image became fully unsupported on 2025-06-30 - the job fails to start. Use windows-2022 or windows-2025."}, {"pattern": "runs-on:.*macos-1[12]\\b", "flags": "i", "sev": "error", "fix": "macos-15", "message": "macos-11 was removed on 2024-06-28 and macos-12 on 2024-12-03 - the job cannot start. Use macos-15, or macos-15-intel if the build needs x86_64."}, {"pattern": "runs-on:.*macos-13\\b", "flags": "i", "sev": "error", "fix": "macos-15-intel", "message": "the macos-13 runner image was retired on 2025-12-04 - the job cannot start. Use macos-15 (arm64) or macos-15-intel for x86_64 builds."}, {"pattern": "runs-on:.*macos-latest", "flags": "i", "sev": "info", "fix": "macos-15-intel", "message": "macos-latest is arm64. An x86_64-only build silently needs macos-15-intel or a -large label, and GitHub drops x86_64 macOS after the macos-15 image retires in autumn 2027."}, {"pattern": "runs-on:.*ubuntu-latest", "flags": "i", "sev": "info", "fix": "ubuntu-24.04", "message": "ubuntu-latest resolves to ubuntu-24.04 today and moves without notice when GitHub promotes the next LTS (ubuntu-26.04 labels already exist). Pin the version if the build depends on the image contents."}, {"pattern": "::set-output", "flags": "i", "sev": "error", "fix": "echo \"name=value\" >> \"$GITHUB_OUTPUT\"", "message": "the ::set-output workflow command was disabled on 2023-06-01 and is now ignored - write to the $GITHUB_OUTPUT file instead."}, {"pattern": "::save-state", "flags": "i", "sev": "error", "fix": "echo \"name=value\" >> \"$GITHUB_STATE\"", "message": "the ::save-state workflow command was disabled on 2023-06-01 and is now ignored - write to the $GITHUB_STATE file instead."}, {"pattern": "::(set-env|add-path)", "flags": "i", "sev": "error", "fix": "echo \"NAME=value\" >> \"$GITHUB_ENV\"", "message": "the ::set-env and ::add-path commands were disabled on 2020-11-16 for a security advisory - write to $GITHUB_ENV or $GITHUB_PATH instead."}, {"pattern": "using:\\s*['\"]?node(12|16)['\"]?", "flags": "i", "sev": "error", "fix": "using: 'node24'", "message": "this action declares the node12 or node16 runtime, which no longer exists on the runner - declare using: 'node24'."}, {"pattern": "using:\\s*['\"]?node20['\"]?", "flags": "i", "sev": "warn", "fix": "using: 'node24'", "message": "this action declares the node20 runtime. Node 24 became the runner default on 2026-06-16 and Node 20 is removed on 2026-09-23 - declare using: 'node24' (needs runner 2.327.1 or later)."}, {"pattern": "ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION", "flags": "i", "sev": "warn", "fix": "using: 'node24'", "message": "this opt-out pins actions back to Node 20. It stops working on 2026-09-23 when Node 20 is removed from the runner - migrate the action to node24 instead of setting it."}, {"pattern": "FORCE_JAVASCRIPT_ACTIONS_TO_NODE24", "flags": "i", "sev": "info", "fix": "", "message": "this was the early opt-in to Node 24. Node 24 has been the runner default since 2026-06-16, so the variable no longer changes anything and can be deleted."}, {"pattern": "actions/(create-release|upload-release-asset)", "flags": "i", "sev": "warn", "fix": "gh release create", "message": "actions/create-release and actions/upload-release-asset were archived by GitHub and receive no runtime updates - use the gh CLI (gh release create) or softprops/action-gh-release."}, {"pattern": "node-version:\\s*['\"]?(16|18)(\\.|['\"]|\\s|$)", "flags": "i", "sev": "warn", "fix": "node-version: '24'", "message": "Node 16 reached end-of-life on 2023-09-11 and Node 18 on 2025-04-30 - neither gets security patches. Build against Node 22 or 24."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('actions-deprecation-lint-2026');
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

// ★무료 — ★마지막 결과 패널을 다시 연다
async function showReport() { out().show(true); }

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

// ★역방향 체험 — ★첫 스윕부터 7일간 ★전체 스윕과 보고서를 키 없이 ★줄이지 않고 준다. 그 뒤에 키를 묻는다.
//   ⛔무료 경로(열린 파일·고른 줄)는 이 문도 지나지 않는다.
const TRIAL_MS = 7 * 24 * 3600 * 1000;
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';
const NEED_KEY = S.need_key;   // ⛔원문을 잡아둔다 — 아래에서 앞에 붙이므로 쌓이면 안 된다
async function sweepTrial(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + TRIAL_MS; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    // ★자기 폴더에서 본 숫자를 먼저 보여주고 키를 묻는다 (역방향 체험의 심장)
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found '
      + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  return { inTrial: inTrial, st: st };
}

async function scanWorkspace(ctx) {
  const t = await sweepTrial(ctx);
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
  vscode.window.showInformationMessage((found ? S.done : S.nothing_found) + (t.inTrial ? TRIAL_NOTE : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const t = await sweepTrial(ctx);
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
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath + (t.inTrial ? TRIAL_NOTE : ''));
}

async function ciJson(ctx) {
  const t = await sweepTrial(ctx);
  if (!t) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'actions-deprecation-lint-2026-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath + (t.inTrial ? TRIAL_NOTE : ''));
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
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('actions-deprecation-lint-2026').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
