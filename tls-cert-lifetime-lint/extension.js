// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const GLOB = '**/{*.sh,*.bash,*.tf,*.hcl,*.yml,*.yaml,*.conf,*.cnf,*.go,*.toml,*.ini,*.md,Dockerfile,Makefile,.htaccess,_headers,Caddyfile}';
const PREFIX = 'tls-cert-lifetime-lint';
const ENGINE = require('./engine.js');
const S = {"run": "Checking", "check": "Check this config", "paste": "Paste an openssl command, a Terraform file, a cert-manager Certificate or an nginx block", "done": "Findings are in the TLS Cert Lifetime Lint panel", "nothing_found": "Nothing in this file breaks under the SC-081v3 schedule", "need_key": "Full version: scan every file in the repo, take the findings away as CSV, JSON or HTML, and emit CI JSON so a pull request fails before an over-length certificate reaches production. $29 once - one licence key per person or team seat. A certificate lifecycle management platform starts at $50,000-$100,000 a year plus $1-$5 per certificate (Keyfactor Command, 2026 vendor pricing).", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted - the full version is unlocked", "key_bad": "That key did not validate. Check it, or email us", "extra_rules": "Extra patterns of your own, checked alongside the 12 that ship inside."};
S.title = 'TLS Cert Lifetime Lint - SC-081v3 renewal check';   // = package.json displayName (auto.js · clean-sweep badge)
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('TLS Cert Lifetime Lint');
  return out._c;
}

// ★무료 — ★열린 파일 하나를 ★끝까지 본다. ⛔키를 묻지 않는다.
function today() { return new Date().toISOString().slice(0, 10); }

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
  const _min = _ORD[String(vscode.workspace.getConfiguration('tls-cert-lifetime-lint').get('min_severity')
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
  const res = ENGINE.engine.check(text, { today: today(), path: fileName, extraRules: extra });
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

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령(열린 파일·고른 줄·규칙 목록)은 이 문을 지나지 않는다.
//   ⛔무료 경로에는 어떤 제한도 두지 않는다 (8% 법). 문턱 문구는 ★손님 자신의 숫자를 부른다 (endowment).
//   이미 시작된 기간(sweepTrialUntil)은 약속이니 끝까지 지킨다 · ⛔새로 열지 않는다.
const NEED_KEY = S.need_key;   // ⛔원래 문장은 그대로 두고 ★앞에만 붙인다 (겹쳐 쌓이지 않게)
async function paidGate(ctx) {
  const st = ctx.globalState; const hasKey = !!st.get('licenseKey');
  const until = Number(st.get('sweepTrialUntil') || 0);
  const inPeriod = !hasKey && Date.now() < until;
  if (!inPeriod) {
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your last sweep covered ' + last.files + ' files and found ' + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return false;
  }
  return true;
}

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('tls-cert-lifetime-lint');
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
  if (!found) { const _m = S.nothing_found + ' \u2014 ' + files.length + ' files, 0 findings.'; try { if (require('./auto.js').sweptClean(vscode, ctx, { msg: _m, title: S.title, slug: 'tls-cert-lifetime-lint', prefix: PREFIX })) { await ctx.globalState.update('lastSweep', { files: files.length, findings: 0, at: today() }); return; } } catch (e) {} }   // s163 — the clean sweep offers the README badge (auto.js)
  await ctx.globalState.update('lastSweep', { files: files.length, findings: found, at: today() });
  vscode.window.showInformationMessage(S.done + ' \u2014 ' + files.length + ' files, ' + found + ' findings.');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('tls-cert-lifetime-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('tls-cert-lifetime-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'tls-cert-lifetime-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'tls-cert-lifetime-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "tls-cert-lifetime-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('tls-cert-lifetime-lint.audit_file', runCurrent);
  reg('tls-cert-lifetime-lint.audit_selection', runSelection);
  reg('tls-cert-lifetime-lint.list_rules', listRules);
  reg('tls-cert-lifetime-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('tls-cert-lifetime-lint.export_report', function () { return exportReport(ctx); });
  reg('tls-cert-lifetime-lint.ci_json', function () { return ciJson(ctx); });
  // auto.js (status bar · hint) calls <PREFIX>.checkFile / <PREFIX>.checkWorkspace → the same free file check / paid sweep
  reg(PREFIX + '.checkFile', runCurrent);
  reg(PREFIX + '.checkWorkspace', function () { return scanWorkspace(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('tls-cert-lifetime-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
  // s158 — ★확장이 말을 한다: 열기/저장 자동 검사 · 상태표시줄 N · 폴더 알림 1회 → checkWorkspace (auto.js · 설정 readystack.autoCheck/workspaceHint 로 끈다)
  try { require('./auto.js').start(ctx, { vscode: vscode, ENGINE: ENGINE, GLOB: GLOB, PREFIX: PREFIX, title: S.title, slug: 'tls-cert-lifetime-lint', price: 29 }); } catch (e) {}
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
