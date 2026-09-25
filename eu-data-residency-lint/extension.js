// ⛔뼈대 — kit/scaffold.py 가 찍는다 (s143). 두뇌는 ./engine.js · 문구는 S · 유료 문턱은 license.js
'use strict';
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const ENGINE = require('./engine.js');
const REPORT = require('./report.js');

const S = {
  title: 'EU Data Residency Lint (Terraform, GDPR Ch. V)',
  need_key: 'The workspace sweep and the written report are the paid part of EU Data Residency Lint (Terraform, GDPR Ch. V). Enter your licence key, or get one.',
  enter_key: 'Enter licence key', buy: 'Get a licence',
  key_ok: 'Licence accepted. Thank you.', key_bad: 'That key did not validate. Check for typos, or get a licence.',
  clean: 'Clean against all ' + (ENGINE.RULE_COUNT || (ENGINE.RULES || []).length) + ' checks.'
};
const PREFIX = 'euDataResidency';
const GLOB = '**/*.{tf,tfvars,bicep,yaml,yml}';
let channel = null, diags = null;
function out() { if (!channel) channel = vscode.window.createOutputChannel(S.title); return channel; }
function today() { return new Date().toISOString().slice(0, 10); }
function sev(f) {
  const s = String(f.sev || f.severity || 'error').toLowerCase();
  return s.startsWith('err') ? vscode.DiagnosticSeverity.Error : s.startsWith('warn') ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information;
}
function toDiagnostics(doc, res) {
  return (res.findings || []).map(function (f) {
    const ln = Math.max(0, Math.min(doc.lineCount - 1, (parseInt(f.line, 10) || 1) - 1));
    const range = doc.lineAt(ln).range;
    const d = new vscode.Diagnostic(range, String(f.msg || f.message || f.check), sev(f));
    d.source = S.title; d.code = String(f.check || f.id || '');
    return d;
  });
}
async function checkFile() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage('Open a file first.'); return; }
  if (!diags) diags = vscode.languages.createDiagnosticCollection(PREFIX);
  const res = ENGINE.engine.check(ed.document.getText(), { today: today(), path: ed.document.fileName });
  diags.set(ed.document.uri, toDiagnostics(ed.document, res));
  const ch = out(); ch.clear(); ch.appendLine(REPORT.toText(res, path.basename(ed.document.fileName))); ch.show(true);
  const n = (res.findings || []).length;
  vscode.window.showInformationMessage(n ? (n + ' finding' + (n === 1 ? '' : 's') + ' in ' + path.basename(ed.document.fileName) + ' — see the ' + S.title + ' output.') : S.clean);
}
async function checkWorkspace(ctx) {
  // s158 2026-09-23 — no new free trial: the paid view is shown directly (trials already started are honoured).
  //   일회성 상품에서 전체 검사를 무료로 주면 ★돈 낼 일을 공짜로 끝낸다(규정 검사는 한 번 훑으면 그 일이 끝난다).
  //   ⇒ 무료 = 연 파일 하나의 답 전부(8% 법 · 절대 안 줄인다) · 유료 = 작업공간 전체 목록 + 보고서 파일.
  //   ★키를 묻는 그 순간에 ★손님 자신의 숫자(N건 · M개 파일)를 보여준다(소유 효과 · 열린 고리) · "써보기"는 7일 환불이 맡는다.
  //   이미 시작된 체험(sweepTrialUntil)은 약속이니 끝까지 지킨다 · ⛔새 체험은 열지 않는다. 깨끗하면 ⛔돈을 묻지 않는다.
  const st = ctx.globalState; const hasKey = !!st.get('licenseKey');
  const until = Number(st.get('sweepTrialUntil') || 0);
  const inTrial = !hasKey && until > 0 && Date.now() < until;
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || !folders.length) { vscode.window.showInformationMessage('Open a folder first.'); return; }
  const uris = await vscode.workspace.findFiles(GLOB, '**/node_modules/**', 2000);
  const day = today(); const blocks = []; let total = 0, hit = 0;
  for (const u of uris) {
    const doc = await vscode.workspace.openTextDocument(u);
    const res = ENGINE.engine.check(doc.getText(), { today: day, path: u.fsPath });
    const n = (res.findings || []).length; total += n; if (n) hit++;
    blocks.push(REPORT.toText(res, vscode.workspace.asRelativePath(u)));
  }
  if (!total) { const _m = 'Swept ' + uris.length + ' files — ' + S.clean; try { if (require('./auto.js').sweptClean(vscode, ctx, { msg: _m, title: S.title, slug: 'eu-data-residency-lint', prefix: PREFIX })) return; } catch (e) {} vscode.window.showInformationMessage(_m); return; }   // s163 — the clean sweep offers the README badge (auto.js)
  if (!hasKey && !inTrial) {
    S.need_key = 'This workspace: ' + total + ' finding' + (total === 1 ? '' : 's') + ' in ' + hit + ' of ' + uris.length + ' files. The full list and the written report are the paid part of ' + S.title + ' — $29 once, one licence key per person or CI seat. Enter your licence key, or get one.';
    if (!(await lic.ensure(vscode, ctx, S))) return;              // ★유료 문턱: 범위(파일 하나 → 작업공간 전체) + 소유(보고서 파일)
  }
  const lines = ['# ' + S.title + ' — workspace report', '', 'Generated ' + day + ' · ' + uris.length + ' files · ' + (ENGINE.RULE_COUNT || (ENGINE.RULES || []).length) + ' checks each · ' + total + ' findings', ''].concat(blocks);
  const target = vscode.Uri.joinPath(folders[0].uri, PREFIX + '-report.md');
  await vscode.workspace.fs.writeFile(target, Buffer.from(lines.join('\n'), 'utf8'));
  await st.update('lastSweep', { files: uris.length, findings: total, at: day });
  vscode.window.showInformationMessage('Swept ' + uris.length + ' files (' + total + ' findings). Report written to ' + vscode.workspace.asRelativePath(target) + '.' + (inTrial ? ' Your trial runs until ' + new Date(until).toISOString().slice(0, 10) + ' — after that $29 once.' : ''));
  lic.maybeAskReview(vscode, ctx);   // s152 — 3번째 유료 실행 뒤 후기 부탁 한 번
}
async function enterKey(ctx) {
  await ctx.globalState.update('licenseKey', undefined);
  await ctx.globalState.update('licenseOkAt', 0);
  await lic.ensure(vscode, ctx, S);
}
function activate(ctx) {
  // s144 — subscription rules feed (B16 ②): keyed customers pull newer rules every 7 days; ENGINE.RULES is the array check() reads
  try { lic.pullFeed(ctx, 'eu-data-residency-lint').then(function (f) { if (f && Array.isArray(f.rules) && ENGINE && Array.isArray(ENGINE.RULES)) { globalThis.__yjFeed = f; for (var i = 0; i < f.rules.length; i++) ENGINE.RULES.push(f.rules[i]); } }).catch(function () {}); } catch (e) {}
  ctx.subscriptions.push(
    vscode.commands.registerCommand(PREFIX + '.checkFile', function () { return checkFile(); }),
    vscode.commands.registerCommand(PREFIX + '.checkWorkspace', function () { return checkWorkspace(ctx); }),
    vscode.commands.registerCommand(PREFIX + '.enterKey', function () { return enterKey(ctx); })
  );
  // s158 — ★확장이 말을 한다: 열기/저장 자동 검사 · 상태표시줄 N · 폴더 알림 1회 → checkWorkspace (auto.js · 설정 readystack.autoCheck/workspaceHint 로 끈다)
  try { require('./auto.js').start(ctx, { vscode: vscode, ENGINE: ENGINE, GLOB: GLOB, PREFIX: PREFIX, title: S.title, slug: 'eu-data-residency-lint', price: 29 }); } catch (e) {}
}
function deactivate() { if (channel) channel.dispose(); if (diags) diags.dispose(); }
module.exports = { activate: activate, deactivate: deactivate, checkFile: checkFile, S: S };
