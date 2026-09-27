// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const GLOB = '**/*.{html,htm,jsx,tsx,vue,twig,php,erb,cshtml,razor}';
const PREFIX = 'wcag21-aa-legal-baseline-audit';
const ENGINE = require('./engine.js');
const S = {"run": "WCAG 2.1 AA audit", "done": "Audit finished - findings are in the output panel.", "nothing_found": "Nothing to report - no open file, or no WCAG 2.1 AA failures in it.", "need_key": "Full version: audit every template in the workspace and export the findings as CSV, JSON or HTML. $29 once - one licence key per person or team seat. A consultancy audit is $100-$250 per page.", "key_ok": "Licence accepted. Workspace audit, export, quick fix and watch-on-save are on.", "key_bad": "That licence key did not validate. The free per-file audit keeps working meanwhile.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "paste": "Paste an HTML, JSX, Vue, Twig, Blade, ERB or Razor template here", "check": "Audit this markup", "extra_rules": "Your own rules, checked alongside the 24 that ship inside."};
S.title = 'WCAG 2.1 AA Audit - HTML template legal baseline (ADA, EN 301 549)';   // = package.json displayName (auto.js · clean-sweep badge)
const PAID = ["workspace_scan", "export_report", "quick_fix", "watch_on_save"];

function today() { return new Date().toISOString().slice(0, 10); }

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('WCAG 2.1 AA Audit: ADA Title II & EN 301 549');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('wcag21-aa-legal-baseline-audit').get('min_severity')
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
    const ok = await lic.ensure(vscode, ctx, S);
    S.need_key = NEED_KEY;
    if (!ok) return false;
  }
  return true;
}

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('wcag21-aa-legal-baseline-audit');
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
  if (!n) { const _m = S.nothing_found + ' ' + rows.length + ' files, 0 findings.'; try { if (require('./auto.js').sweptClean(vscode, ctx, { msg: _m, title: S.title, slug: 'wcag21-aa-legal-baseline-audit', prefix: PREFIX })) { await ctx.globalState.update('lastSweep', { files: rows.length, findings: 0, at: today() }); return; } } catch (e) {} }   // s163 — the clean sweep offers the README badge (auto.js)
  await ctx.globalState.update('lastSweep', { files: rows.length, findings: n, at: today() });
  vscode.window.showInformationMessage(n ? S.done : S.nothing_found);
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
  const cfgFmt = String(vscode.workspace.getConfiguration('wcag21-aa-legal-baseline-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('wcag21-aa-legal-baseline-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'wcag21-aa-legal-baseline-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function quickFix(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const hits = scan(ed.document.getText(), ed.document.fileName).filter(function (h) { return h.fix; });
  if (!hits.length) { vscode.window.showInformationMessage(S.nothing_found); return; }
  // ★s134 2026-09-08 — ⛔줄 전체를 h.fix(안내 문구)로 바꾸던 버그를 고쳤다 (손님 파일을 지웠다 · 재방문 일꾼이 잡음).
  //   ★규칙에 replace 가 있을 때만 ★맞은 부분만 바꾼다. 없으면 안내만 한다 — 유료 기능이 데이터를 파괴하면 환불 폭탄이다.
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
  try { lic.pullFeed(ctx, "wcag21-aa-legal-baseline-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('wcag21-aa-legal-baseline-audit.audit_file', runCurrent);
  reg('wcag21-aa-legal-baseline-audit.audit_selection', runSelection);
  reg('wcag21-aa-legal-baseline-audit.list_rules', listRules);
  reg('wcag21-aa-legal-baseline-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('wcag21-aa-legal-baseline-audit.export_report', function () { return exportReport(ctx); });
  reg('wcag21-aa-legal-baseline-audit.quick_fix', function () { return quickFix(ctx); });
  reg('wcag21-aa-legal-baseline-audit.watch_on_save', function () { return watchOnSave(ctx); });
  // auto.js (status bar · hint) calls <PREFIX>.checkFile / <PREFIX>.checkWorkspace → the same free file check / paid sweep
  reg(PREFIX + '.checkFile', runCurrent);
  reg(PREFIX + '.checkWorkspace', function () { return scanWorkspace(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('wcag21-aa-legal-baseline-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
  // s158 — ★확장이 말을 한다: 열기/저장 자동 검사 · 상태표시줄 N · 폴더 알림 1회 → checkWorkspace (auto.js · 설정 readystack.autoCheck/workspaceHint 로 끈다)
  try { require('./auto.js').start(ctx, { vscode: vscode, ENGINE: ENGINE, GLOB: GLOB, PREFIX: PREFIX, title: S.title, slug: 'wcag21-aa-legal-baseline-audit', price: 29 }); } catch (e) {}
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
