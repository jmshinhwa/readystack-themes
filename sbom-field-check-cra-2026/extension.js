// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const GLOB = '**/{bom.json,sbom.json,*.cdx.json,*.bom.json,*.sbom.json,*.spdx.json,*.spdx.jsonld,*.spdx}';
const PREFIX = 'sbom-field-check-cra-2026';
const ENGINE = require('./engine.js');
const S = {"run": "Watching this SBOM - it re-checks on every save.", "done": "Field gaps found - see the SBOM Field Check panel.", "nothing_found": "No field gaps found: every field these 34 rules look for is present.", "need_key": "Full version: every SBOM in the repo, an evidence file you keep, and CI output that fails the build before release. $29 once - one licence key per person or team seat. Published CRA cost calculators price this work at EUR 45/hour, and a documented readiness pass for one product family at EUR 12,000-25,000 of internal engineering time.", "key_ok": "Licence accepted - workspace check, evidence export and CI output are open.", "key_bad": "That key did not validate. Check it against your Polar receipt.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "paste": "Paste your SBOM here - bom.json (CycloneDX) or sbom.spdx.json (SPDX)", "check": "Check this SBOM", "extra_rules": "Extra rules of your own, checked alongside the 34 that ship inside."};
S.title = 'SBOM Field Check for CRA 2026';   // = package.json displayName (auto.js · clean-sweep badge)
const PAID = ["workspace_scan", "export_report", "ci_json", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('SBOM Field Check for CRA 2026');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('sbom-field-check-cra-2026').get('min_severity')
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

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질). 두뇌 = ./engine.js (규칙 = rules.json)
const RULES = ENGINE.RULES;
function scan(text, fileName) {
  const extra = vscode.workspace.getConfiguration(PREFIX).get('extraRules');
  const res = ENGINE.engine.check(text, { today: new Date().toISOString().slice(0, 10), path: fileName, extraRules: extra });
  return (res.findings || []).map(function (f) {
    return ('fix' in f) ? { line: f.line, msg: f.msg, fix: f.fix, sev: f.sev } : { line: f.line, msg: f.msg, sev: f.sev };
  });
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
//   키를 물을 때 ★손님 자신의 숫자(지난 스윕)를 앞에 붙인다.
//   s158 이전에 이미 열린 기간(sweepTrialUntil)만 조용히 지킨다 · ⛔새로 열지 않는다.
//   ⛔무료 경로(audit_file · list_rules · show_report)에는 어떤 제한도 두지 않는다 (8% 법).
const NEED_KEY = S.need_key;                 // ⛔손님 숫자를 앞에 붙이기 전의 원문

async function paidGate(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  const until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && Date.now() < until) return true;
  const last = st.get('lastSweep');
  S.need_key = (last && last.files ? ('Your last sweep covered ' + last.files + ' files and found '
    + last.findings + ' findings. ') : '') + NEED_KEY;
  return await lic.ensure(vscode, ctx, S);
}

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('sbom-field-check-cra-2026');
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
  // ★스윕한 숫자를 적어 둔다 — 다음에 키를 물을 때 이 숫자가 문장 앞에 선다.
  let _tot = 0;
  for (const r of rows) _tot += r.hits.length;
  await ctx.globalState.update('lastSweep', { files: rows.length, findings: _tot,
                                              at: new Date().toISOString().slice(0, 10) });
  const _m = 'Swept ' + rows.length + ' files - ' + _tot + ' field gaps. See the SBOM Field Check panel.';
  if (!_tot) { try { if (require('./auto.js').sweptClean(vscode, ctx, { msg: _m, title: S.title, slug: 'sbom-field-check-cra-2026', prefix: PREFIX })) return; } catch (e) {} }   // s163 — the clean sweep offers the README badge (auto.js)
  vscode.window.showInformationMessage(_m);
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
  const cfgFmt = String(vscode.workspace.getConfiguration('sbom-field-check-cra-2026').get('reportFormat')
    || vscode.workspace.getConfiguration('sbom-field-check-cra-2026').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'sbom-field-check-cra-2026-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'sbom-field-check-cra-2026-report.json');
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
  try { lic.pullFeed(ctx, "sbom-field-check-cra-2026").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('sbom-field-check-cra-2026.audit_file', runCurrent);
  reg('sbom-field-check-cra-2026.list_rules', listRules);
  reg('sbom-field-check-cra-2026.show_report', showReport);
  reg('sbom-field-check-cra-2026.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('sbom-field-check-cra-2026.export_report', function () { return exportReport(ctx); });
  reg('sbom-field-check-cra-2026.ci_json', function () { return ciJson(ctx); });
  reg('sbom-field-check-cra-2026.watch_on_save', function () { return watchOnSave(ctx); });
  // auto.js (status bar · hint) calls <PREFIX>.checkFile / <PREFIX>.checkWorkspace → the same free file check / paid sweep
  reg(PREFIX + '.checkFile', runCurrent);
  reg(PREFIX + '.checkWorkspace', function () { return scanWorkspace(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('sbom-field-check-cra-2026').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
  // s158 — ★확장이 말을 한다: 열기/저장 자동 검사 · 상태표시줄 N · 폴더 알림 1회 → checkWorkspace (auto.js · 설정 readystack.autoCheck/workspaceHint 로 끈다)
  try { require('./auto.js').start(ctx, { vscode: vscode, ENGINE: ENGINE, GLOB: GLOB, PREFIX: PREFIX, title: S.title, slug: 'sbom-field-check-cra-2026', price: 29 }); } catch (e) {}
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
