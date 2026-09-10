'use strict';
const vscode = require('vscode');
const path = require('path');
const M = require('./mapparse.js');
const lic = require('./license.js');

const SLUG = 'linkerMapAuditor';
const PRICE = '$29';

const S = {
  run: 'Analyze linker map',
  done: 'Linker map analyzed.',
  nothing_found: 'Open a linker map file (.map, produced by -Wl,-Map=out.map) and run this again.',
  // The paywall is the one sentence a customer reads with their card out.
  need_key: 'Full version: track this build against a saved baseline, see exactly which '
    + 'object file grew, enforce per-region budgets, and export a CI report.',
  buy: 'Get the full version - ' + PRICE,
  enter_key: 'Enter licence key',
  terms: PRICE + ' once - one licence key per person or team seat - 7-day full refund. '
    + 'A freelance embedded engineer averages $103/hr (contractrates.fyi, 2026); this is about 17 minutes of one.',
  key_ok: 'Licence accepted. Baseline, budgets and export are on.',
  key_bad: 'That licence key was not accepted. Check it and try again.'
};

let LAST = null;          // last parsed map
let CHANNEL = null;
let STATUS = null;

function out() {
  if (!CHANNEL) CHANNEL = vscode.window.createOutputChannel('Linker Map Auditor');
  return CHANNEL;
}

function cfg() { return vscode.workspace.getConfiguration(SLUG); }

function topN() {
  const n = parseInt(cfg().get('top'), 10);
  return (isFinite(n) && n > 0) ? n : 12;
}

function show(text) {
  const c = out();
  c.clear();
  c.appendLine(text);
  c.show(true);
}

function statusFor(parsed) {
  if (!STATUS) {
    STATUS = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    STATUS.command = SLUG + '.showReport';
  }
  const bits = [];
  let over = false;
  for (let i = 0; i < parsed.regions.length; i++) {
    const R = parsed.regions[i];
    if (!R.used) continue;
    bits.push(R.name + ' ' + R.pct.toFixed(0) + '%');
    if (R.over) over = true;
  }
  STATUS.text = (over ? '$(error) ' : '$(check) ') + (bits.join('  ') || 'no regions');
  STATUS.tooltip = 'Linker Map Auditor - click for the full report';
  STATUS.show();
}

// Read the map text the user means: the active editor, else a file picker.
async function readMap() {
  const ed = vscode.window.activeTextEditor;
  if (ed && ed.document && ed.document.getText().length) {
    return { text: ed.document.getText(), name: path.basename(ed.document.fileName || 'map') };
  }
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false, openLabel: 'Analyze',
    filters: { 'Linker map': ['map', 'ld', 'txt'], 'All files': ['*'] }
  });
  if (!picked || !picked.length) return null;
  const buf = await vscode.workspace.fs.readFile(picked[0]);
  return { text: Buffer.from(buf).toString('utf8'), name: path.basename(picked[0].fsPath) };
}

// ---- FREE: the whole answer for one build, no key asked ----------------
async function analyze() {
  const src = await readMap();
  if (!src) { vscode.window.showInformationMessage(S.nothing_found); return null; }
  const parsed = M.parseMap(src.text, src.name);
  if (!parsed.regions.length) {
    show(M.formatReport(parsed, { top: topN() }));
    vscode.window.showWarningMessage(parsed.warnings[0] || S.nothing_found);
    return null;
  }
  LAST = parsed;
  show(M.formatReport(parsed, { top: topN() }));
  statusFor(parsed);
  let over = null;
  for (let i = 0; i < parsed.regions.length; i++) if (parsed.regions[i].over) over = parsed.regions[i];
  if (over) {
    vscode.window.showWarningMessage(
      over.name + ' overflowed by ' + M.commas(over.over) + ' bytes.');
  } else {
    vscode.window.showInformationMessage(S.done);
  }
  return parsed;
}

async function showReport() {
  if (!LAST) return analyze();
  out().show(true);
  return LAST;
}

// ---- PAID: across builds, budgets, take-away ---------------------------
function baselineKey() {
  const ws = vscode.workspace.workspaceFolders;
  return 'baseline:' + (ws && ws.length ? ws[0].uri.toString() : 'global');
}

async function need(ctx) {
  return lic.ensure(vscode, ctx, S);
}

async function saveBaseline(ctx) {
  if (!(await need(ctx))) return null;
  const parsed = LAST || (await analyze());
  if (!parsed) return null;
  const slim = { name: parsed.name, at: new Date().toISOString(), regions: parsed.regions, objects: parsed.objects };
  await ctx.globalState.update(baselineKey(), slim);
  vscode.window.showInformationMessage('Baseline saved: ' + parsed.name + ' (' + slim.at.slice(0, 19) + 'Z)');
  return slim;
}

async function diffBaseline(ctx) {
  if (!(await need(ctx))) return null;
  const base = ctx.globalState.get(baselineKey());
  if (!base) {
    vscode.window.showWarningMessage('No baseline yet. Run "Save this build as baseline" on a known-good build first.');
    return null;
  }
  const parsed = LAST || (await analyze());
  if (!parsed) return null;
  const d = M.diffMaps(base, parsed);
  const L = [];
  L.push('Linker Map Auditor - ' + parsed.name + ' vs baseline ' + String(base.at || '').slice(0, 19) + 'Z');
  L.push('');
  for (let i = 0; i < d.regions.length; i++) {
    const r = d.regions[i];
    const sign = r.delta > 0 ? '+' : '';
    L.push(r.name + ': ' + M.commas(r.before) + ' -> ' + M.commas(r.after) +
      '  (' + sign + M.commas(r.delta) + ' B)' +
      (r.isOver ? '  OVER by ' + M.commas(r.over) + ' B' : ''));
    if (!r.wasOver && r.isOver) L.push('  ^ this build is the one that stopped fitting.');
  }
  L.push('');
  L.push('What moved:');
  if (!d.objects.length) L.push('  nothing - byte for byte identical.');
  for (let j = 0; j < d.objects.length && j < topN(); j++) {
    const o = d.objects[j];
    L.push('  ' + (o.delta > 0 ? '+' : '') + M.commas(o.delta) + ' B  ' +
      o.region + '  ' + o.name + '  (' + o.state + ')');
  }
  show(L.join('\n'));
  return d;
}

async function checkBudget(ctx) {
  if (!(await need(ctx))) return null;
  const parsed = LAST || (await analyze());
  if (!parsed) return null;
  const budgets = cfg().get('budgets') || {};
  const res = M.checkBudgets(parsed, budgets);
  const L = ['Linker Map Auditor - budget check - ' + parsed.name, ''];
  for (let i = 0; i < res.rows.length; i++) {
    const r = res.rows[i];
    L.push((r.ok ? 'PASS  ' : 'FAIL  ') + r.region +
      '  used ' + M.commas(r.used) + ' / budget ' + M.commas(r.limit) + ' (' + r.budget + ')' +
      (r.ok ? '  headroom ' + M.commas(r.headroom) + ' B' : '  over by ' + M.commas(r.over) + ' B'));
  }
  if (!Object.keys(budgets).length) {
    L.push('');
    L.push('No budgets set - checked against raw region sizes. Set "' + SLUG +
      '.budgets", e.g. { "FLASH": "90%", "RAM": "7K" }.');
  }
  show(L.join('\n'));
  if (res.ok) vscode.window.showInformationMessage('Budget check passed.');
  else vscode.window.showErrorMessage('Budget check failed in ' + res.failed + ' region(s).');
  return res;
}

async function exportReport(ctx) {
  if (!(await need(ctx))) return null;
  const parsed = LAST || (await analyze());
  if (!parsed) return null;
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) {
    vscode.window.showWarningMessage('Open a folder first - the report is written next to your build.');
    return null;
  }
  const budgets = cfg().get('budgets') || {};
  const budget = M.checkBudgets(parsed, budgets);
  const json = {
    tool: 'linker-map-auditor', version: M.VERSION, map: parsed.name,
    generated: new Date().toISOString(),
    regions: parsed.regions.map(function (R) {
      return { name: R.name, used: R.used, capacity: R.length, free: R.free,
               pct: Number(R.pct.toFixed(2)), over: R.over, unattributed: R.unattributed };
    }),
    budget: budget,
    objects: parsed.objects.map(function (o) { return { name: o.name, byRegion: o.byRegion }; }),
    ok: budget.ok
  };
  const md = ['# Linker map report - ' + parsed.name, '',
    '| Region | Used | Size | Free | Used% | Status |', '|---|---:|---:|---:|---:|---|']
    .concat(parsed.regions.map(function (R) {
      return '| ' + R.name + ' | ' + M.commas(R.used) + ' | ' + M.commas(R.length) + ' | ' +
        M.commas(R.free) + ' | ' + R.pct.toFixed(1) + '% | ' +
        (R.over ? 'OVER by ' + M.commas(R.over) + ' B' : 'ok') + ' |';
    }))
    .concat(['', '```', M.formatReport(parsed, { top: topN() }), '```'])
    .join('\n');

  const enc = new TextEncoder();
  const dir = ws[0].uri;
  const jUri = vscode.Uri.joinPath(dir, 'linker-map-report.json');
  const mUri = vscode.Uri.joinPath(dir, 'linker-map-report.md');
  await vscode.workspace.fs.writeFile(jUri, enc.encode(JSON.stringify(json, null, 2)));
  await vscode.workspace.fs.writeFile(mUri, enc.encode(md));
  vscode.window.showInformationMessage('Wrote linker-map-report.json and linker-map-report.md');
  return { json: jUri.fsPath, md: mUri.fsPath };
}

function activate(ctx) {
  const reg = function (id, fn) {
    ctx.subscriptions.push(vscode.commands.registerCommand(SLUG + '.' + id, fn));
  };
  reg('analyze', function () { return analyze(); });
  reg('showReport', function () { return showReport(); });
  reg('saveBaseline', function () { return saveBaseline(ctx); });
  reg('diffBaseline', function () { return diffBaseline(ctx); });
  reg('checkBudget', function () { return checkBudget(ctx); });
  reg('exportReport', function () { return exportReport(ctx); });
}

function deactivate() {
  if (STATUS) STATUS.dispose();
  if (CHANNEL) CHANNEL.dispose();
}

module.exports = { activate: activate, deactivate: deactivate };
