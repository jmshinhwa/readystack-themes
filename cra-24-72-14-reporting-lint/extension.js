'use strict';
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const ENGINE = require('./engine.js');
const REPORT = require('./report.js');

const PRICE = '$49';
const S = {
  title: 'CRA 24/72/14 Reporting Lint',
  nothing_open: 'Open the Markdown file you want checked — SECURITY.md, the disclosure policy, or the incident runbook.',
  clean: 'Clean against all ' + ENGINE.RULE_COUNT + ' checks.',
  // The paywall is a product surface. This is the only sentence a customer reads before paying.
  need_key: 'Full version: sweeps every Markdown file in the workspace in one pass, cross-checks them against each other, and writes one dated readiness report you can hand to an auditor.',
  terms: PRICE + ' once · one licence key per person or team seat · 7-day full refund. One hour of EU product-compliance consulting runs $150-250.',
  buy: 'Get the full version — ' + PRICE,
  enter_key: 'Enter licence key',
  key_ok: 'Licence accepted. The workspace sweep is unlocked.',
  key_bad: 'That key did not validate. Check it against your receipt, or contact support.'
};

// The trial prompt prepends the customer's own numbers to this; keep the original sentence intact.
const NEED_KEY_BASE = S.need_key;

let channel = null;
function out() {
  if (!channel) channel = vscode.window.createOutputChannel(S.title);
  return channel;
}

function cfg() { return vscode.workspace.getConfiguration('craReporting'); }

function today() {
  const pinned = String(cfg().get('today') || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(pinned)) return pinned;
  return new Date().toISOString().slice(0, 10);
}

const ORDER = { info: 0, warn: 1, error: 2 };
function filtered(findings) {
  const min = ORDER[String(cfg().get('min_severity') || 'info').toLowerCase()] || 0;
  return findings.filter(f => (ORDER[String(f.sev || 'info').toLowerCase()] || 0) >= min);
}

function show(blocks) {
  const c = out();
  c.clear();
  let total = 0;
  for (const b of blocks) {
    const keep = filtered(b.res.findings);
    total += keep.length;
    c.appendLine(b.label);
    c.appendLine(REPORT.toText({ ...b.res, findings: keep }, null));
    c.appendLine('');
  }
  c.appendLine('—— ' + total + ' ——');
  c.show(true);
  return total;
}

// FREE — the file you have open, all 18 checks, offline, nothing withheld.
async function checkFile() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_open); return null; }
  const res = ENGINE.engine.check(ed.document.getText(), { today: today() });
  const n = show([{ label: path.basename(ed.document.fileName || 'untitled'), res }]);
  vscode.window.showInformationMessage(n ? REPORT.summaryLine(res) : S.clean);
  return res;
}

// PAID — the same checks, a wider scope: every Markdown file at once, plus one report file.
// Reverse trial: the full sweep and the report run free for 7 days from the first sweep, then the key.
// The customer decides after seeing their own repository's numbers, so the paywall quotes them back.
async function checkWorkspace(ctx) {
  const st = ctx.globalState; const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + 7 * 24 * 3600 * 1000; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found ' + last.findings + ' findings. ') : '') + NEED_KEY_BASE;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || !folders.length) { vscode.window.showInformationMessage(S.nothing_open); return null; }
  const glob = String(cfg().get('include_glob') || '**/*.md');
  const uris = await vscode.workspace.findFiles(glob, '**/node_modules/**', 2000);
  const day = today();
  const blocks = [];
  for (const u of uris) {
    const doc = await vscode.workspace.openTextDocument(u);
    blocks.push({ label: vscode.workspace.asRelativePath(u), res: ENGINE.engine.check(doc.getText(), { today: day }) });
  }
  // Cross-file: a repo answers the question as a whole, not file by file.
  const everywhere = ENGINE.RULES
    .filter(r => r.kind === 'missing' && blocks.length && blocks.every(b => b.res.findings.some(f => f.check === r.id)))
    .map(r => r.id);
  const lines = [
    '# CRA 24/72/14 readiness report',
    '',
    'Generated ' + day + ' · ' + blocks.length + ' Markdown files · ' + ENGINE.RULE_COUNT + ' checks each.',
    '',
    '## Not answered anywhere in this repository',
    everywhere.length ? everywhere.map(id => '- ' + id).join('\n') : '- (none — every check is answered by at least one file)',
    ''
  ];
  for (const b of blocks) {
    const keep = filtered(b.res.findings);
    if (!keep.length) continue;
    lines.push('## ' + b.label, '', '```', REPORT.toText({ ...b.res, findings: keep }, null), '```', '');
  }
  const target = vscode.Uri.joinPath(folders[0].uri, 'CRA-24-72-14-READINESS.md');
  await vscode.workspace.fs.writeFile(target, Buffer.from(lines.join('\n'), 'utf8'));
  const total = show(blocks);
  await st.update('lastSweep', { files: blocks.length, findings: total, at: day });
  vscode.window.showInformationMessage('Swept ' + blocks.length + ' files. Report written to ' + vscode.workspace.asRelativePath(target) + '.' + (inTrial ? ' The full sweep is free for 7 days from your first sweep.' : ''));
  return blocks;
}

async function enterKey(ctx) {
  await ctx.globalState.update('licenseKey', undefined);
  await ctx.globalState.update('licenseOkAt', 0);
  await lic.ensure(vscode, ctx, S);
}

function activate(ctx) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('craReporting.checkFile', () => checkFile()),
    vscode.commands.registerCommand('craReporting.checkWorkspace', () => checkWorkspace(ctx)),
    vscode.commands.registerCommand('craReporting.enterKey', () => enterKey(ctx))
  );
}
function deactivate() { if (channel) channel.dispose(); }
module.exports = { activate, deactivate, checkFile, S };
