// CSAF Advisory Check for CRA 2026 - VS Code wiring.
// The conformance engine lives in csaf.js and is shared, unchanged, with the free web page.
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const lic = require('./license.js');
const CSAF = require('./csaf.js');

const SLUG = 'csaf-advisory-check-cra-2026';
const DISPLAY = 'CSAF Advisory Check';
const RULES = CSAF.TESTS;                 // 43 numbered tests from CSAF 2.0 section 6.1

const S = {
  done: 'Conformance findings - see the CSAF Advisory Check panel.',
  nothing_found: 'No conformance findings: this document passes all 43 mandatory and profile tests.',
  not_csaf: 'This file has no "csaf_version" field, so it is not a CSAF document.',
  run: 'Checking this advisory against CSAF 2.0 section 6.1.',
  need_key: 'Full version: every advisory in the workspace in one pass, an evidence file you keep, and a CI checker that fails the build before an advisory is published. $29 once · one licence key per person or team seat · 7-day full refund. Published CRA cost calculators calibrate this work at EUR 45 per hour of engineering and consulting effort.',
  enter_key: 'Enter licence key',
  buy: 'Get the full version — $29',
  key_ok: 'Licence accepted - workspace check, evidence export, CI checker and check-on-save are open.',
  key_bad: 'That key did not validate. Check it against your Polar receipt, or take the 7-day refund.',
  paste: 'Open a CSAF advisory (.json) and run the check.'
};

let DIAG = null;
function diag() {
  if (!DIAG) DIAG = vscode.languages.createDiagnosticCollection(SLUG);
  return DIAG;
}
function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel(DISPLAY);
  return out._c;
}
function cfg() { return vscode.workspace.getConfiguration(SLUG); }

function opts() {
  return {
    base: cfg().get('includeBaseFields') !== false,
    skip: (cfg().get('skipTests') || []).map(String)
  };
}
function runEngine(text) {
  const o = opts();
  const res = CSAF.check(text, { base: o.base });
  if (o.skip.length) res.findings = res.findings.filter((f) => o.skip.indexOf(f.test) < 0);
  return res;
}

function paint(doc, res) {
  const items = res.findings.map((f) => {
    const line = Math.max(0, (f.line || 1) - 1);
    const range = doc ? doc.lineAt(Math.min(line, doc.lineCount - 1)).range
      : new vscode.Range(line, 0, line, 1);
    const d = new vscode.Diagnostic(range, f.test + ' ' + f.title + ': ' + f.msg,
      vscode.DiagnosticSeverity.Error);
    d.source = DISPLAY;
    d.code = f.test;
    return d;
  });
  if (doc) diag().set(doc.uri, items);
}

function report(rows) {
  const c = out();
  c.clear();
  let n = 0;
  for (const r of rows) {
    c.appendLine(path.basename(r.file) + (r.parseError ? '  (' + r.parseError + ')' : ''));
    for (const f of r.findings) { c.appendLine('  line ' + f.line + '  ' + f.test + '  ' + f.msg); n++; }
    if (!r.findings.length) c.appendLine('  clean');
  }
  c.appendLine('—— ' + n + ' finding(s) across ' + rows.length + ' file(s) · ' + RULES.length + ' checks ——');
  c.show(true);
  return n;
}

// ── free: the open advisory, all 43 checks, no key asked ──────────────────────
async function checkFile() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.paste); return null; }
  const text = ed.document.getText();
  if (!CSAF.looksLikeCsaf(text)) { vscode.window.showInformationMessage(S.not_csaf); return null; }
  const res = runEngine(text);
  paint(ed.document, res);
  report([{ file: ed.document.fileName, findings: res.findings, parseError: res.parseError }]);
  vscode.window.showInformationMessage(res.findings.length ? S.done : S.nothing_found);
  return res;
}

// ── free: reopen the panel ────────────────────────────────────────────────────
async function showReport() { out().show(true); }

// ── free: what is inside ──────────────────────────────────────────────────────
async function listTests() {
  const c = out();
  c.clear();
  c.appendLine(RULES.length + ' checks: the 32 mandatory tests of CSAF 2.0 section 6.1 and the 11 profile tests of 6.1.27.');
  c.appendLine('Plus ' + CSAF.baseRequiredCount + ' CSAF Base required fields (switch: ' + SLUG + '.includeBaseFields).');
  c.appendLine('CWE catalogue carried for test 6.1.11: ' + CSAF.cwePresent + ' weaknesses.');
  for (const t of RULES) c.appendLine('  ' + t.id + '  ' + t.title);
  c.show(true);
}

// ── paid 1: every advisory in the workspace, one pass ─────────────────────────
async function workspaceScan(ctx) {
  if (!await lic.ensure(vscode, ctx, S)) return null;
  const glob = String(cfg().get('filePatterns') || '**/*.json');
  const uris = await vscode.workspace.findFiles(glob, '**/node_modules/**', 2000);
  const rows = [];
  for (const u of uris) {
    let text;
    try { text = fs.readFileSync(u.fsPath, 'utf8'); } catch (e) { continue; }
    if (!CSAF.looksLikeCsaf(text)) continue;
    const res = runEngine(text);
    rows.push({ file: u.fsPath, findings: res.findings, parseError: res.parseError });
  }
  if (!rows.length) { vscode.window.showInformationMessage(S.not_csaf); return null; }
  report(rows);
  workspaceScan._last = rows;
  vscode.window.showInformationMessage(rows.length + ' CSAF document(s) checked.');
  return rows;
}

// ── paid 2: the evidence file you keep ────────────────────────────────────────
async function exportEvidence(ctx) {
  if (!await lic.ensure(vscode, ctx, S)) return null;
  let rows = workspaceScan._last;
  if (!rows) {
    const ed = vscode.window.activeTextEditor;
    if (!ed) { vscode.window.showInformationMessage(S.paste); return null; }
    const res = runEngine(ed.document.getText());
    rows = [{ file: ed.document.fileName, findings: res.findings, parseError: res.parseError }];
  }
  const fmt = String(cfg().get('reportFormat') || 'csv').toLowerCase();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const body = fmt === 'json' ? evidenceJson(rows) : fmt === 'html' ? evidenceHtml(rows) : evidenceCsv(rows);
  const folder = (vscode.workspace.workspaceFolders || [])[0];
  const dir = folder ? folder.uri.fsPath : path.dirname(rows[0].file);
  const target = path.join(dir, 'csaf-conformance-' + stamp + '.' + (fmt === 'json' ? 'json' : fmt === 'html' ? 'html' : 'csv'));
  fs.writeFileSync(target, body, 'utf8');
  const doc = await vscode.workspace.openTextDocument(target);
  vscode.window.showTextDocument(doc, { preview: false });
  return target;
}
function esc(s) { return '"' + String(s === undefined ? '' : s).replace(/"/g, '""') + '"'; }
function evidenceCsv(rows) {
  const lines = ['file,line,test,title,finding'];
  for (const r of rows) {
    if (!r.findings.length) lines.push([esc(r.file), '', esc('clean'), esc('no findings'), esc('')].join(','));
    for (const f of r.findings) lines.push([esc(r.file), f.line, esc(f.test), esc(f.title), esc(f.msg)].join(','));
  }
  return lines.join('\n') + '\n';
}
function evidenceJson(rows) {
  return JSON.stringify({
    tool: DISPLAY, checks: RULES.length, spec: 'CSAF 2.0 section 6.1',
    generated: new Date().toISOString(),
    files: rows.map((r) => ({ file: r.file, parseError: r.parseError || null, findings: r.findings }))
  }, null, 2) + '\n';
}
function evidenceHtml(rows) {
  const esch = (s) => String(s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let h = '<!doctype html><meta charset="utf-8"><title>CSAF conformance</title>' +
    '<style>body{font:15px/1.5 system-ui;margin:24px}table{border-collapse:collapse;width:100%}' +
    'td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}' +
    'h2{font-size:1rem;margin:24px 0 4px}</style>' +
    '<h1>CSAF 2.0 conformance evidence</h1><p>' + RULES.length + ' checks · generated ' +
    new Date().toISOString() + '</p>';
  for (const r of rows) {
    h += '<h2>' + esch(r.file) + '</h2>';
    if (!r.findings.length) { h += '<p>No findings.</p>'; continue; }
    h += '<table><tr><th>Line</th><th>Test</th><th>Finding</th></tr>';
    for (const f of r.findings) h += '<tr><td>' + f.line + '</td><td>' + esch(f.test) + '</td><td>' + esch(f.msg) + '</td></tr>';
    h += '</table>';
  }
  return h;
}

// ── paid 3: the CI checker you own and run in your pipeline ───────────────────
async function exportCiChecker(ctx) {
  if (!await lic.ensure(vscode, ctx, S)) return null;
  const folder = (vscode.workspace.workspaceFolders || [])[0];
  if (!folder) { vscode.window.showInformationMessage(S.paste); return null; }
  const dir = path.join(folder.uri.fsPath, '.csaf-check');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ['csaf.js', 'cwe.js']) {
    fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
  }
  fs.writeFileSync(path.join(dir, 'run.js'), CI_RUNNER, 'utf8');
  const doc = await vscode.workspace.openTextDocument(path.join(dir, 'run.js'));
  vscode.window.showTextDocument(doc, { preview: false });
  vscode.window.showInformationMessage('CI checker written to .csaf-check - run: node .csaf-check/run.js <files or globs>');
  return dir;
}
const CI_RUNNER = [
  '#!/usr/bin/env node',
  "// CSAF conformance gate. Exits 1 when any of the 43 checks fails, so a pipeline stops",
  "// before a non-conformant advisory is published. Same engine as the editor extension.",
  "'use strict';",
  "const fs = require('fs');",
  "const path = require('path');",
  "const CSAF = require(path.join(__dirname, 'csaf.js'));",
  "const args = process.argv.slice(2);",
  "if (!args.length) { console.error('usage: node run.js <advisory.json> [more.json ...]'); process.exit(2); }",
  "let bad = 0, files = 0;",
  "for (const f of args) {",
  "  let text;",
  "  try { text = fs.readFileSync(f, 'utf8'); } catch (e) { console.error(f + ': ' + e.message); bad++; continue; }",
  "  if (!CSAF.looksLikeCsaf(text)) { continue; }",
  "  files++;",
  "  const res = CSAF.check(text);",
  "  for (const x of res.findings) { console.log(f + ':' + x.line + ': ' + x.test + ' ' + x.msg); bad++; }",
  "}",
  "console.log(files + ' CSAF file(s) \\u00b7 ' + CSAF.TESTS.length + ' checks \\u00b7 ' + bad + ' finding(s)');",
  "process.exit(bad ? 1 : 0);",
  ''
].join('\n');

// ── paid 4: re-check on every save ────────────────────────────────────────────
async function watchOnSave(ctx) {
  if (!await lic.ensure(vscode, ctx, S)) return null;
  if (watchOnSave._sub) {
    watchOnSave._sub.dispose();
    watchOnSave._sub = null;
    vscode.window.showInformationMessage('Check on save: off.');
    return false;
  }
  watchOnSave._sub = vscode.workspace.onDidSaveTextDocument((doc) => {
    const text = doc.getText();
    if (!CSAF.looksLikeCsaf(text)) return;
    const res = runEngine(text);
    paint(doc, res);
    report([{ file: doc.fileName, findings: res.findings, parseError: res.parseError }]);
  });
  ctx.subscriptions.push(watchOnSave._sub);
  vscode.window.showInformationMessage('Check on save: on. ' + S.run);
  return true;
}

function activate(ctx) {
  const reg = (id, fn) => ctx.subscriptions.push(vscode.commands.registerCommand(SLUG + '.' + id, fn));
  reg('checkFile', checkFile);
  reg('showReport', showReport);
  reg('listTests', listTests);
  reg('workspaceScan', () => workspaceScan(ctx));
  reg('exportEvidence', () => exportEvidence(ctx));
  reg('exportCiChecker', () => exportCiChecker(ctx));
  reg('watchOnSave', () => watchOnSave(ctx));
  ctx.subscriptions.push(diag());
  if (cfg().get('runOnSave') === true) { watchOnSave(ctx); }
}
function deactivate() { if (DIAG) DIAG.dispose(); }

module.exports = { activate, deactivate,
  _test: { runEngine, evidenceCsv, evidenceJson, evidenceHtml, CI_RUNNER, RULES, S } };
