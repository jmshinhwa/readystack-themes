// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const GLOB = '**/*.{py,js,ts,jsx,tsx,mjs,cjs,go,java,rb,php,cs,rs,kt,swift,sh,ipynb,json,yaml,yml,toml,env}';
const PREFIX = 'ai-model-retirement-lint';
const ENGINE = require('./engine.js');
const S = {"run": "Checking model IDs", "done": "Model IDs checked.", "nothing_found": "No retired or expiring model IDs in this file.", "paste": "Paste the file that pins your model IDs", "check": "Check this file", "need_key": "Full version: scans every file in the repository, fails the build in CI, and applies the vendor's replacement for you.", "buy": "Get the full version - $29", "key_ok": "Licence accepted.", "key_bad": "That key did not validate.", "enter_key": "Enter licence key"};
const PAID = ["workspace_scan", "ci_json", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('AI Model Retirement Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('ai-model-retirement-lint').get('min_severity')
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
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

// ★유료 문턱 — ★키를 묻는 순간에 ★손님 자신의 숫자(지난 스윕의 파일·건수)를 문구에 싣는다.
//   ⛔무료 경로(열린 파일 검사)는 어떤 제한도 두지 않는다.
const NEED_KEY = S.need_key;
function today() { return new Date().toISOString().slice(0, 10); }
async function sweepGate(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  /* s158: no new window is opened (ones already started are honoured) */
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your last sweep covered ' + last.files + ' files and found ' + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await paidGate(ctx))) return null;
  }
  return { inTrial: inTrial, until: until };
}
const TRIAL_NOTE = '';

async function scanWorkspace(ctx) {
  const trial = await sweepGate(ctx);
  if (!trial) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('ai-model-retirement-lint');
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
  const n = report(rows);
  await ctx.globalState.update('lastSweep', { files: files.length, findings: n, at: today() });
  vscode.window.showInformationMessage(S.done + ' (' + files.length + ' files, ' + n + ' findings)'
    + (trial.inTrial ? TRIAL_NOTE : ''));
}

async function ciJson(ctx) {
  const trial = await sweepGate(ctx);
  if (!trial) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'ai-model-retirement-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath + (trial.inTrial ? TRIAL_NOTE : ''));
}

async function quickFix(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const hits = scan(ed.document.getText(), ed.document.fileName).filter(function (h) { return h.fix; });
  if (!hits.length) { vscode.window.showInformationMessage(S.nothing_found); return; }
  // ★s134 2026-09-08 — ⛔줄 전체를 h.fix(안내 문구)로 바꾸던 버그를 고쳤다 (손님 파일을 지웠다 · 재방문 일꾼이 잡음).
  //   ★규칙에 replace 가 있을 때만 ★맞은 부분만 바꾼다. 없으면 안내만 한다 — 유료 기능이 손님 데이터를 망치면 안 된다.
  let applied = 0, manual = 0;
  await ed.edit(function (b) {
    for (const h of hits) {
      const r = RULES.find(function (x) { return x.message === h.msg || x.message === h.message; });
      if (!(r && typeof r.replace === 'string')) { manual++; continue; }
      const ln = ed.document.lineAt(h.line - 1);
      const re = new RegExp(r.pattern, r.flags || '');
      const m = re.exec(ln.text);
      if (!m) { manual++; continue; }
      const start = new vscode.Position(h.line - 1, m.index), end = new vscode.Position(h.line - 1, m.index + m[0].length);
      b.replace(new vscode.Range(start, end), m[0].replace(re, r.replace)); applied++;
    }
  });
  vscode.window.showInformationMessage(S.done + ' (' + applied + ' applied, ' + manual + ' need a manual edit - see the report)');
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "ai-model-retirement-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('ai-model-retirement-lint.audit_file', runCurrent);
  reg('ai-model-retirement-lint.list_rules', listRules);
  reg('ai-model-retirement-lint.show_report', showReport);
  reg('ai-model-retirement-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('ai-model-retirement-lint.ci_json', function () { return ciJson(ctx); });
  reg('ai-model-retirement-lint.quick_fix', function () { return quickFix(ctx); });
  // s165 — auto.js 가 부르는 이름(PREFIX.checkFile / PREFIX.checkWorkspace) · package.json 목록에는 없다
  reg(PREFIX + '.checkFile', runCurrent);
  reg(PREFIX + '.checkWorkspace', function () { return scanWorkspace(ctx); });
  try { require('./auto.js').start(ctx, { vscode: vscode, ENGINE: ENGINE, GLOB: GLOB, PREFIX: PREFIX, title: 'OpenAI Model Deprecation Lint - retired model IDs in code', slug: 'ai-model-retirement-lint', price: 29 }); } catch (e) {}
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('ai-model-retirement-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
