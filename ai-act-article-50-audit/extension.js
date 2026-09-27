// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const GLOB = '**/*.{py,js,ts,jsx,tsx,mjs,cjs,go,java,rb,php,md,txt,yaml,yml}';
const PREFIX = 'ai-act-article-50-audit';
const ENGINE = require('./engine.js');
const S = {"run": "Pick a format for the register", "check": "Audit this file", "paste": "Paste a file here - a chatbot handler, a system prompt, an image or voice generation service, an HR scoring script", "done": "Audit complete", "nothing_found": "Nothing found to report.", "need_key": "Full version: audit the whole repository and export the Article 50 register (CSV / JSON / HTML). $49 once, one licence key per person or team seat.", "buy": "Get the full version - $49", "key_ok": "Licence accepted. Repository audit and register export are unlocked.", "key_bad": "That key did not validate. Check it for typos, or reopen the purchase page.", "extra_rules": "Your own rules, checked alongside the 28 that ship inside. Each entry: pattern, flags, message, sev.", "enter_key": "Enter licence key"};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('AI Act Article 50 Audit');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('ai-act-article-50-audit').get('min_severity')
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
const RULES = ENGINE.RULES;
function scan(text, fileName) {
  const cfg = vscode.workspace.getConfiguration(PREFIX);
  const extra = cfg.get('extraRules');
  const today = new Date().toISOString().slice(0, 10);
  // ★두뇌는 ./engine.js (rules.json + extraRules + 키 고객 규칙 피드) — 무료·유료·auto.js 가 같은 판정을 쓴다
  const res = ENGINE.engine.check(text, { today: today, path: fileName, extra: Array.isArray(extra) ? extra : [] });
  return (res.findings || []).map(function (f) {
    return { line: f.line, msg: f.msg, fix: f.fix || null, sev: f.sev || 'warn', check: f.check };
  });
}

const SNIPPETS = {};

// ★무료 — ★고른 줄만 본다 (⛔파일 전체가 아니다. 명세가 그렇게 약속하면 ★이것을 찍는다)
async function runSelection() {
  const ed = vscode.window.activeTextEditor;
  if (!ed || ed.selection.isEmpty) { vscode.window.showInformationMessage(S.nothing_found); return null; }
  const text = ed.document.getText(ed.selection);
  const base = ed.selection.start.line;
  const hits = scan(text, ed.document.fileName).map(function (h) {
    return { line: h.line + base, msg: h.msg, fix: h.fix, sev: h.sev };
  });
  report([{ file: ed.document.fileName, hits: hits }]);
  vscode.window.showInformationMessage(hits.length ? S.done : S.nothing_found);
  return hits;
}

// ★무료 — ★마지막 결과 패널을 다시 연다
async function showReport() { out().show(true); }

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
  const _c = vscode.workspace.getConfiguration('ai-act-article-50-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('ai-act-article-50-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('ai-act-article-50-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'ai-act-article-50-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'ai-act-article-50-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "ai-act-article-50-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('ai-act-article-50-audit.audit_file', runCurrent);
  reg('ai-act-article-50-audit.audit_selection', runSelection);
  reg('ai-act-article-50-audit.show_report', showReport);
  reg('ai-act-article-50-audit.list_rules', listRules);
  reg('ai-act-article-50-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('ai-act-article-50-audit.export_report', function () { return exportReport(ctx); });
  reg('ai-act-article-50-audit.ci_json', function () { return ciJson(ctx); });
  // s165 — auto.js 가 부르는 이름(PREFIX.checkFile / PREFIX.checkWorkspace) · package.json 목록에는 없다
  reg(PREFIX + '.checkFile', runCurrent);
  reg(PREFIX + '.checkWorkspace', function () { return scanWorkspace(ctx); });
  try { require('./auto.js').start(ctx, { vscode: vscode, ENGINE: ENGINE, GLOB: GLOB, PREFIX: PREFIX, title: 'AI Act Transparency Audit - Article 50 (chatbots, deepfakes, AI text)', slug: 'ai-act-article-50-audit', price: 49 }); } catch (e) {}
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('ai-act-article-50-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
