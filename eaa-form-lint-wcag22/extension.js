// ⛔뼈대 — kit/scaffold.py 가 찍는다 (s143). 두뇌는 ./engine.js · 문구는 S · 유료 문턱은 license.js
'use strict';
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const ENGINE = require('./engine.js');
const REPORT = require('./report.js');

const S = {
  title: 'EAA Form Lint: WCAG 2.2 AA for HTML',
  need_key: 'The workspace sweep and the written report are the paid part of EAA Form Lint: WCAG 2.2 AA for HTML. Enter your licence key, or get one. $29 once - one licence key per person or team seat - 7-day full refund. A WCAG audit from an accessibility vendor starts around $2,500 for one signup flow.',
  enter_key: 'Enter licence key', buy: 'Get the full version - $29',
  key_ok: 'Licence accepted. Thank you.', key_bad: 'That key did not validate. Check for typos, or get a licence.',
  clean: 'Clean against all ' + (ENGINE.RULE_COUNT || (ENGINE.RULES || []).length) + ' checks.'
};
const PREFIX = 'eaaFormLint';
const GLOB = '**/*.{html,htm,vue,svelte}';
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
  if (!(await lic.ensure(vscode, ctx, S))) return;              // ★유료 문턱: 범위(파일 하나 → 작업공간 전체) + 소유(보고서 파일)
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || !folders.length) { vscode.window.showInformationMessage('Open a folder first.'); return; }
  const uris = await vscode.workspace.findFiles(GLOB, '**/node_modules/**', 2000);
  const day = today(); const blocks = []; let total = 0;
  for (const u of uris) {
    const doc = await vscode.workspace.openTextDocument(u);
    const res = ENGINE.engine.check(doc.getText(), { today: day, path: u.fsPath });
    total += (res.findings || []).length;
    blocks.push(REPORT.toText(res, vscode.workspace.asRelativePath(u)));
  }
  const lines = ['# ' + S.title + ' — workspace report', '', 'Generated ' + day + ' · ' + uris.length + ' files · ' + (ENGINE.RULE_COUNT || (ENGINE.RULES || []).length) + ' checks each · ' + total + ' findings', ''].concat(blocks);
  const target = vscode.Uri.joinPath(folders[0].uri, PREFIX + '-report.md');
  await vscode.workspace.fs.writeFile(target, Buffer.from(lines.join('\n'), 'utf8'));
  vscode.window.showInformationMessage('Swept ' + uris.length + ' files (' + total + ' findings). Report written to ' + vscode.workspace.asRelativePath(target) + '.');
}
async function enterKey(ctx) {
  await ctx.globalState.update('licenseKey', undefined);
  await ctx.globalState.update('licenseOkAt', 0);
  await lic.ensure(vscode, ctx, S);
}
function activate(ctx) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand(PREFIX + '.checkFile', function () { return checkFile(); }),
    vscode.commands.registerCommand(PREFIX + '.checkWorkspace', function () { return checkWorkspace(ctx); }),
    vscode.commands.registerCommand(PREFIX + '.enterKey', function () { return enterKey(ctx); })
  );
}
function deactivate() { if (channel) channel.dispose(); if (diags) diags.dispose(); }
module.exports = { activate: activate, deactivate: deactivate, checkFile: checkFile, S: S };
