// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const GLOB = '**/{*.sql,*.prisma,models.py,models/*.py,*.entity.ts,*.entity.js,entities/*.ts,*.model.ts}';
const PREFIX = 'personal-data-map-dsar-audit';
const ENGINE = require('./engine.js');
const S = {"run": "Mapping personal data in this file", "done": "Personal-data columns found - the panel lists each line and its GDPR article.", "nothing_found": "No personal-data columns matched in this file.", "paste": "Paste a migration, Prisma schema, Django model or TypeORM entity here", "check": "Map this schema", "extra_rules": "Extra rules of your own, checked alongside the 13 GDPR schema rules that ship inside.", "need_key": "Full version: map every migration and model in the repository, export the map as CSV, JSON or HTML, and fail CI on a finding - not just this open file. $29 once, one licence key per person or team seat. An independent EU privacy consultant bills EUR 100-200/hour and one manual DSAR averages about $1,524 in staff time.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "key_ok": "Licence accepted. Repository map, export and CI output are open.", "key_bad": "That key did not validate. Check it in your Polar receipt, or buy a licence."};
S.title = 'Personal Data Map - find PII columns for GDPR DSAR (SQL, ORM)';   // = package.json displayName (auto.js · clean-sweep badge)
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Personal Data Map');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('personal-data-map-dsar-audit').get('min_severity')
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

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질). 두뇌 = ./engine.js
const RULES = ENGINE.RULES;
function scan(text, fileName) {
  const extra = vscode.workspace.getConfiguration(PREFIX).get('extraRules');
  const res = ENGINE.engine.check(text, { today: new Date().toISOString().slice(0, 10), path: fileName, extraRules: extra });
  return (res.findings || []).map(function (f) { return { line: f.line, msg: f.msg, fix: f.fix || null, sev: f.sev || 'warn' }; });
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
//   키를 물을 때 ★손님 자신의 숫자(지난 스윕)를 앞에 붙인다.
//   s158 이전에 이미 열린 기간(sweepTrialUntil)만 조용히 지킨다 · ⛔새로 열지 않는다.
//   ⛔무료 경로(열린 파일·선택 범위 검사)에는 어떤 제한도 두지 않는다 (8% 법).
const LIC_KEY = 'licenseKey';              // ⛔license.js 가 저장하는 이름과 같아야 한다
const NEED_KEY = S.need_key;               // ★원문장 — 매번 그 앞에 손님의 숫자만 붙인다 (⛔겹쳐 쌓지 않게)

// 통과하면 { inPeriod } 을, 막히면 null 을 낸다.
async function paidGate(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get(LIC_KEY);
  const until = Number(st.get('sweepTrialUntil') || 0);
  const inPeriod = !hasKey && Date.now() < until;
  if (!inPeriod) {
    const last = st.get('lastSweep');
    S.need_key = (last && last.files
      ? ('Your last sweep covered ' + last.files + ' files and found ' + last.findings + ' findings. ')
      : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  return { inPeriod: inPeriod };
}

async function scanWorkspace(ctx) {
  const gate = await paidGate(ctx);
  if (!gate) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('personal-data-map-dsar-audit');
  const _max = Number(_c.get('max_files')) || 2000;
  const _skip = String(_c.get('exclude_glob') || '**/node_modules/**');
  const files = await vscode.workspace.findFiles('**/*', _skip, _max);
  const rows = [];
  // ★체험 안내에 쓸 숫자 — ★본 파일 수와 ★찾은 건수
  let _files = 0, _findings = 0;
  for (const f of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(f);
      const hits = scan(doc.getText(), f.fsPath);
      _files++; _findings += hits.length;
      rows.push({ file: f.fsPath, hits: hits });
    } catch (e) { /* 열 수 없는 파일은 건너뛴다 */ }
  }
  report(rows);
  if (!_findings) { const _m = S.nothing_found + ' ' + _files + ' files, 0 findings.'; try { if (require('./auto.js').sweptClean(vscode, ctx, { msg: _m, title: S.title, slug: 'personal-data-map-dsar-audit', prefix: PREFIX })) { await ctx.globalState.update('lastSweep', { files: _files, findings: 0, at: new Date().toISOString().slice(0, 10) }); return; } } catch (e) {} }   // s163 — the clean sweep offers the README badge (auto.js)
  await ctx.globalState.update('lastSweep', {
    files: _files, findings: _findings, at: new Date().toISOString().slice(0, 10)
  });
  vscode.window.showInformationMessage((_findings ? S.done : S.nothing_found)
    + ' ' + _files + ' files, ' + _findings + ' findings.');
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const gate = await paidGate(ctx);
  if (!gate) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('personal-data-map-dsar-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('personal-data-map-dsar-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'personal-data-map-dsar-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  const gate = await paidGate(ctx);
  if (!gate) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'personal-data-map-dsar-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "personal-data-map-dsar-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('personal-data-map-dsar-audit.audit_file', runCurrent);
  reg('personal-data-map-dsar-audit.audit_selection', runSelection);
  reg('personal-data-map-dsar-audit.list_rules', listRules);
  reg('personal-data-map-dsar-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('personal-data-map-dsar-audit.export_report', function () { return exportReport(ctx); });
  reg('personal-data-map-dsar-audit.ci_json', function () { return ciJson(ctx); });
  // auto.js (status bar · hint) calls <PREFIX>.checkFile / <PREFIX>.checkWorkspace → the same free file check / paid sweep
  reg(PREFIX + '.checkFile', runCurrent);
  reg(PREFIX + '.checkWorkspace', function () { return scanWorkspace(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('personal-data-map-dsar-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
  // s158 — ★확장이 말을 한다: 열기/저장 자동 검사 · 상태표시줄 N · 폴더 알림 1회 → checkWorkspace (auto.js · 설정 readystack.autoCheck/workspaceHint 로 끈다)
  try { require('./auto.js').start(ctx, { vscode: vscode, ENGINE: ENGINE, GLOB: GLOB, PREFIX: PREFIX, title: S.title, slug: 'personal-data-map-dsar-audit', price: 29 }); } catch (e) {}
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
