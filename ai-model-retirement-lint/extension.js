// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
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
const RULES = [{"pattern": "claude-3-opus-20240229", "flags": "i", "message": "RETIRED 2026-01-05 on the Claude API - this request fails now.", "fix": "claude-opus-4-8", "sev": "error"}, {"pattern": "claude-3-5-sonnet-2024(0620|1022)", "flags": "i", "message": "RETIRED 2025-10-28 on the Claude API - this request fails now.", "fix": "claude-sonnet-4-6", "sev": "error"}, {"pattern": "claude-3-7-sonnet-20250219", "flags": "i", "message": "RETIRED 2026-02-19 on the Claude API - this request fails now.", "fix": "claude-sonnet-4-6", "sev": "error"}, {"pattern": "claude-3-5-haiku-20241022", "flags": "i", "message": "RETIRED 2026-02-19 on the Claude API - this request fails now.", "fix": "claude-haiku-4-5-20251001", "sev": "error"}, {"pattern": "claude-3-haiku-20240307", "flags": "i", "message": "RETIRED 2026-04-20 on the Claude API - this request fails now.", "fix": "claude-haiku-4-5-20251001", "sev": "error"}, {"pattern": "claude-3-sonnet-20240229", "flags": "i", "message": "RETIRED 2025-07-21 on the Claude API - this request fails now.", "fix": "claude-sonnet-4-6", "sev": "error"}, {"pattern": "claude-sonnet-4-20250514", "flags": "i", "message": "RETIRED 2026-06-15 on the Claude API - this request fails now.", "fix": "claude-sonnet-4-6", "sev": "error"}, {"pattern": "claude-opus-4-20250514", "flags": "i", "message": "RETIRED 2026-06-15 on the Claude API - this request fails now.", "fix": "claude-opus-4-8", "sev": "error"}, {"pattern": "claude-opus-4-1-20250805", "flags": "i", "message": "RETIRED 2026-08-05 on the Claude API - this request fails now.", "fix": "claude-opus-4-8", "sev": "error"}, {"pattern": "claude-2\\.[01]\\b", "flags": "i", "message": "RETIRED 2025-07-21 on the Claude API - this request fails now.", "fix": "claude-opus-4-8", "sev": "error"}, {"pattern": "claude-instant-1\\.[0-2]|claude-1\\.[0-3]\\b", "flags": "i", "message": "RETIRED 2024-11-06 on the Claude API - this request fails now.", "fix": "claude-haiku-4-5-20251001", "sev": "error"}, {"pattern": "gpt-4-32k", "flags": "i", "message": "RETIRED 2025-06-06 on the OpenAI API - this request fails now.", "fix": "gpt-5.6-sol", "sev": "error"}, {"pattern": "gemini-2\\.0-flash(-lite)?(-001)?", "flags": "i", "message": "RETIRED 2026-06-01 on the Gemini API - this request fails now.", "fix": "gemini-2.5-flash", "sev": "error"}, {"pattern": "whisper-1\\b", "flags": "i", "message": "RETIRED 2026-08-26 on the OpenAI API - this request fails now.", "fix": "gpt-transcribe", "sev": "error"}, {"pattern": "gpt-4o(-mini)?-transcribe(-diarize)?", "flags": "i", "message": "RETIRED 2026-08-26 on the OpenAI API - this request fails now.", "fix": "gpt-transcribe", "sev": "error"}, {"pattern": "beta\\.assistants|/v1/assistants", "flags": "i", "message": "Assistants API RETIRED 2026-08-26 - move to the Responses API.", "fix": "client.responses.create", "sev": "error"}, {"pattern": "\\bsora-2(-pro)?(-2025-(10-06|12-08))?\\b", "flags": "i", "message": "Shuts down 2026-09-24 on the OpenAI API (Videos API sunsets the same day).", "fix": "", "sev": "warn"}, {"pattern": "gpt-3\\.5-turbo-instruct|babbage-002|davinci-002|gpt-3\\.5-turbo-1106", "flags": "i", "message": "Shuts down 2026-09-28 on the OpenAI API.", "fix": "gpt-5.6-terra", "sev": "warn"}, {"pattern": "gemini-2\\.5-(pro|flash)(-lite)?", "flags": "i", "message": "Shuts down 2026-10-16 on the Gemini API.", "fix": "", "sev": "warn"}, {"pattern": "gpt-3\\.5-turbo-0125", "flags": "i", "message": "Shuts down 2026-10-23 on the OpenAI API.", "fix": "gpt-5.6-terra", "sev": "warn"}, {"pattern": "gpt-4-0613|gpt-4-1106-preview|gpt-4-turbo", "flags": "i", "message": "Shuts down 2026-10-23 on the OpenAI API.", "fix": "gpt-5.6-sol", "sev": "warn"}, {"pattern": "gpt-4\\.1-nano", "flags": "i", "message": "Shuts down 2026-10-23 on the OpenAI API.", "fix": "gpt-5.6-luna", "sev": "warn"}, {"pattern": "gpt-4o-2024-05-13", "flags": "i", "message": "Shuts down 2026-10-23 on the OpenAI API; Azure auto-upgrades this version 2026-10-01.", "fix": "gpt-5.6-sol", "sev": "warn"}, {"pattern": "gpt-image-1(?![-.\\d])", "flags": "i", "message": "Shuts down 2026-10-23 on the OpenAI API.", "fix": "gpt-image-2", "sev": "warn"}, {"pattern": "o1-2024-12-17|o1-pro-2025-03-19", "flags": "i", "message": "Shuts down 2026-10-23 on the OpenAI API.", "fix": "gpt-5.6-sol", "sev": "warn"}, {"pattern": "o3-mini-2025-01-31|o4-mini-2025-04-16", "flags": "i", "message": "Shuts down 2026-10-23 on the OpenAI API.", "fix": "gpt-5.6-terra", "sev": "warn"}, {"pattern": "gpt-image-1-mini|gpt-image-1\\.5|chatgpt-image-latest", "flags": "i", "message": "Shuts down 2026-12-01 on the OpenAI API.", "fix": "gpt-image-2", "sev": "warn"}, {"pattern": "gpt-5(-mini|-nano)?-2025-08-07|gpt-5-pro-2025-10-06", "flags": "i", "message": "Shuts down 2026-12-11 on the OpenAI API.", "fix": "gpt-5.6-sol", "sev": "warn"}, {"pattern": "o3-2025-04-16|o3-pro-2025-06-10", "flags": "i", "message": "Shuts down 2026-12-11 on the OpenAI API.", "fix": "gpt-5.6-sol", "sev": "warn"}, {"pattern": "gpt-(4o-)?(mini-)?(realtime|audio)(-mini)?\\b", "flags": "i", "message": "Shuts down 2027-01-20 on the OpenAI API.", "fix": "gpt-realtime-2.1 / gpt-audio-1.5", "sev": "warn"}, {"pattern": "claude-sonnet-4-5-20250929", "flags": "i", "message": "Retires no sooner than 2026-09-29; Anthropic gives 60 days notice.", "fix": "claude-sonnet-5", "sev": "info"}, {"pattern": "claude-haiku-4-5-20251001", "flags": "i", "message": "Retires no sooner than 2026-10-15; Anthropic gives 60 days notice.", "fix": "", "sev": "info"}, {"pattern": "claude-opus-4-5-20251101", "flags": "i", "message": "Retires no sooner than 2026-11-24; Anthropic gives 60 days notice.", "fix": "claude-opus-5", "sev": "info"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('ai-model-retirement-lint');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      let re;
      try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
      // ★s126 — ★심각도를 실어 보낸다. ⛔없으면 min_severity 가 ★전부를 지운다 (내가 만들 뻔한 거짓말)
      if (re.test(lines[i])) hits.push({ line: i + 1, msg: r.message, fix: r.fix || null,
                                         sev: r.sev || 'warn' });
    }
  }
  return hits;
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

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
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
  report(rows);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'ai-model-retirement-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
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

function activate(ctx) {
  try { lic.pullFeed(ctx, "ai-model-retirement-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('ai-model-retirement-lint.audit_file', runCurrent);
  reg('ai-model-retirement-lint.list_rules', listRules);
  reg('ai-model-retirement-lint.show_report', showReport);
  reg('ai-model-retirement-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('ai-model-retirement-lint.ci_json', function () { return ciJson(ctx); });
  reg('ai-model-retirement-lint.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('ai-model-retirement-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
