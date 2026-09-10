// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const REG = require('./regimes.js');
const S = {"run": "Audit this file", "done": "Audit complete", "nothing_found": "No matches for the 23 shipped rules in this file. Line-scoped checks cannot see multi-line tags or computed markup - keep manual testing.", "need_key": "Full version: scan the whole workspace, export the conformance report file (CSV/JSON/HTML), emit CI JSON, and re-audit on every save. $29 once - one licence key per person or team seat - 7-day full refund. A one-off professional WCAG audit runs about $1,250-$2,750.", "key_ok": "Licence key accepted - workspace scan, report export, CI JSON and watch-on-save are unlocked.", "key_bad": "That licence key was not accepted. Check it and try again, or contact us for a 7-day full refund.", "buy": "Get the full version - $29", "extra_rules": "Extra rules of your own, checked alongside the 23 cited rules that ship inside.", "enter_key": "Enter licence key"};
const PAID = ["workspace_scan", "export_report", "ci_json", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('WCAG 2.1 AA Audit: ADA Title II, EAA, 508');
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
  const n21 = [];
  // Which standard version and which date actually bind you. Generic scanners
  // report against WCAG 2.2 by default and never answer this.
  c.appendLine('WHICH STANDARD BINDS YOU');
  for (const rg of REG.REGIMES) {
    const st = REG.status(rg);
    c.appendLine('  ' + st.label);
    c.appendLine('      ' + st.standard + '   |   ' + st.when);
  }
  c.appendLine('');
  c.appendLine('FINDINGS');
  // ★설정을 읽는다 — min_severity. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  const _ORD = { info: 0, warn: 1, error: 2 };
  const _min = _ORD[String(vscode.workspace.getConfiguration('wcag-clause-audit').get('min_severity')
    || 'info').toLowerCase()] || 0;
  for (const r of rows) {
    const _hits = r.hits.filter(function (h) {
      return (_ORD[String(h.sev || 'info').toLowerCase()] || 0) >= _min;
    });
    if (!_hits.length) continue;
    c.appendLine(path.basename(r.file));
    for (const h of _hits) {
      c.appendLine('  ' + h.line + ': ' + h.msg); n++;
      if (String(h.wcag || '2.0') === '2.1') n21.push(h);
    }
  }
  c.appendLine('—— ' + n + ' ——');
  if (n21.length) {
    c.appendLine('');
    c.appendLine('SCOPE: ' + n21.length + ' of these ' + n + ' findings are WCAG 2.1 criteria.');
    c.appendLine('  Required under ADA Title II and under the EAA (EN 301 549 v3.2.1).');
    c.appendLine('  NOT required under Section 508, which still cites WCAG 2.0 Level AA.');
  }
  c.show(true);
  return n;
}

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질).
const RULES = [{"pattern": "<img(?![^>]*\\balt\\s*=)[^>]*>", "flags": "i", "message": "SC 1.1.1 (A) img has no alt attribute - EN 301 549 9.1.1.1 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "1.1.1"}, {"pattern": "<img[^>]*\\balt\\s*=\\s*[\"\\'](?:image|photo|picture|graphic|icon|logo|spacer)[\"\\']", "flags": "i", "message": "SC 1.1.1 (A) alt text is a placeholder word, not a description - EN 301 549 9.1.1.1 [508 . ADA . EAA]", "sev": "warn", "wcag": "2.0", "sc": "1.1.1"}, {"pattern": "<html(?![^>]*\\blang\\s*=)[^>]*>", "flags": "i", "message": "SC 3.1.1 (A) html element has no lang attribute - EN 301 549 9.3.1.1 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "3.1.1"}, {"pattern": "<input(?![^>]*\\btype\\s*=\\s*[\"\\'](?:hidden|submit|button|reset|image)[\"\\'])(?![^>]*\\baria-label)(?![^>]*\\baria-labelledby)(?![^>]*\\bid\\s*=)[^>]*>", "flags": "i", "message": "SC 4.1.2 (A) input has no id, aria-label or aria-labelledby, so it can never be labelled - EN 301 549 9.4.1.2 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "4.1.2"}, {"pattern": "<(?:select|textarea)\\b(?![^>]*\\baria-label)(?![^>]*\\baria-labelledby)(?![^>]*\\bid\\s*=)[^>]*>", "flags": "i", "message": "SC 4.1.2 (A) select/textarea has no id or aria-label, so it has no accessible name - EN 301 549 9.4.1.2 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "4.1.2"}, {"pattern": "<iframe(?![^>]*\\btitle\\s*=)[^>]*>", "flags": "i", "message": "SC 4.1.2 (A) iframe has no title attribute - EN 301 549 9.4.1.2 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "4.1.2"}, {"pattern": "\\btabindex\\s*=\\s*[\"\\']?[1-9]", "flags": "i", "message": "SC 2.4.3 (A) positive tabindex overrides the natural focus order - EN 301 549 9.2.4.3 [508 . ADA . EAA]", "sev": "warn", "wcag": "2.0", "sc": "2.4.3"}, {"pattern": "<a\\b(?![^>]*\\bhref\\s*=)[^>]*>", "flags": "i", "message": "SC 2.1.1 (A) anchor without href is not keyboard focusable - EN 301 549 9.2.1.1 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "2.1.1"}, {"pattern": "<(?:div|span|li|td|p|img)\\b[^>]*\\bonclick\\s*=", "flags": "i", "message": "SC 2.1.1 (A) click handler on a non-interactive element - no keyboard access - EN 301 549 9.2.1.1 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "2.1.1"}, {"pattern": "\\brole\\s*=\\s*[\"\\']button[\"\\'](?![^>]*\\btabindex\\s*=)", "flags": "i", "message": "SC 2.1.1 (A) role=\"button\" without tabindex is not reachable by keyboard - EN 301 549 9.2.1.1 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "2.1.1"}, {"pattern": "<(?:a|button|input|select|textarea)\\b[^>]*\\baria-hidden\\s*=\\s*[\"\\']true[\"\\']", "flags": "i", "message": "SC 4.1.2 (A) aria-hidden=\"true\" on a focusable control hides it from AT but keeps focus - EN 301 549 9.4.1.2 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "4.1.2"}, {"pattern": "<(?:video|audio)\\b[^>]*\\bautoplay\\b", "flags": "i", "message": "SC 1.4.2 (A) media autoplays with no mechanism to stop it - EN 301 549 9.1.4.2 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "1.4.2"}, {"pattern": "<video\\b(?![^>]*\\bcontrols\\b)[^>]*>", "flags": "i", "message": "SC 1.4.2 (A) video without controls gives no way to pause or mute - EN 301 549 9.1.4.2 [508 . ADA . EAA]", "sev": "warn", "wcag": "2.0", "sc": "1.4.2"}, {"pattern": "<th\\b(?![^>]*\\bscope\\s*=)[^>]*>", "flags": "i", "message": "SC 1.3.1 (A) th has no scope, so the header-cell relationship is not programmatic - EN 301 549 9.1.3.1 [508 . ADA . EAA]", "sev": "warn", "wcag": "2.0", "sc": "1.3.1"}, {"pattern": "<meta[^>]*viewport[^>]*(?:user-scalable\\s*=\\s*[\"\\']?no|maximum-scale\\s*=\\s*[\"\\']?1(?:\\.0)?\\b)", "flags": "i", "message": "SC 1.4.4 (AA) viewport blocks zoom - text cannot be resized to 200% - EN 301 549 9.1.4.4 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "1.4.4"}, {"pattern": "outline\\s*:\\s*(?:0|none)\\b", "flags": "i", "message": "SC 2.4.7 (AA) outline removed - confirm a visible focus style replaces it - EN 301 549 9.2.4.7 [508 . ADA . EAA]", "sev": "warn", "wcag": "2.0", "sc": "2.4.7"}, {"pattern": "<svg\\b(?![^>]*\\baria-hidden)(?![^>]*\\baria-label)(?![^>]*\\brole\\s*=)[^>]*>", "flags": "i", "message": "SC 1.1.1 (A) svg is neither labelled nor marked decorative with aria-hidden - EN 301 549 9.1.1.1 [508 . ADA . EAA]", "sev": "info", "wcag": "2.0", "sc": "1.1.1"}, {"pattern": "<button\\b(?![^>]*\\baria-label)(?![^>]*\\btitle\\s*=)[^>]*>\\s*<(?:i|svg)\\b", "flags": "i", "message": "SC 4.1.2 (A) icon-only button has no accessible name - EN 301 549 9.4.1.2 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "4.1.2"}, {"pattern": "\\baccesskey\\s*=", "flags": "i", "message": "SC 2.1.1 (A) accesskey often collides with AT and browser shortcuts - EN 301 549 9.2.1.1 [508 . ADA . EAA]", "sev": "warn", "wcag": "2.0", "sc": "2.1.1"}, {"pattern": "<(?:blink|marquee)\\b", "flags": "i", "message": "SC 2.2.2 (A) blink/marquee moves or blinks with no way to pause it - EN 301 549 9.2.2.2 [508 . ADA . EAA]", "sev": "error", "wcag": "2.0", "sc": "2.2.2"}, {"pattern": "<label\\b(?![^>]*\\bfor\\s*=)[^>]*>", "flags": "i", "message": "SC 1.3.1 (A) label has no for attribute - confirm it wraps its own control - EN 301 549 9.1.3.1 [508 . ADA . EAA]", "sev": "info", "wcag": "2.0", "sc": "1.3.1"}, {"pattern": "<input[^>]*\\bname\\s*=\\s*[\"\\'](?:email|e-mail|fname|firstname|first_name|lname|lastname|last_name|tel|telephone|phone|address|street|city|zip|postcode|postal|country|cc-number|cc-name)[\"\\'](?![^>]*\\bautocomplete\\s*=)", "flags": "i", "message": "SC 1.3.5 (AA) personal-data input has no autocomplete token - EN 301 549 9.1.3.5 - WCAG 2.1 ONLY [ADA . EAA - NOT 508]", "sev": "warn", "wcag": "2.1", "sc": "1.3.5"}, {"pattern": "screen\\.orientation\\.lock\\s*\\(", "flags": "i", "message": "SC 1.3.4 (AA) orientation is locked - EN 301 549 9.1.3.4 - WCAG 2.1 ONLY [ADA . EAA - NOT 508]", "sev": "error", "wcag": "2.1", "sc": "1.3.4"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('wcag-clause-audit');
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
                                         sev: r.sev || 'warn',
                                         wcag: r.wcag || '2.0', sc: r.sc || '' });
    }
  }
  return hits;
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
  c.appendLine('');
  for (const rg of REG.REGIMES) {
    const st = REG.status(rg);
    c.appendLine('  ' + st.label);
    c.appendLine('      ' + st.standard + '   |   ' + st.when);
    c.appendLine('      ' + st.note);
  }
  c.appendLine('');
  for (const r of RULES) {
    const only21 = String(r.wcag || '2.0') === '2.1';
    c.appendLine('  [WCAG ' + (r.wcag || '2.0') + (only21 ? ' - not 508' : ' - all regimes') + '] ' + r.message);
  }
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
  const _c = vscode.workspace.getConfiguration('wcag-clause-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('wcag-clause-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('wcag-clause-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'wcag-clause-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'wcag-clause-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
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
  try { lic.pullFeed(ctx, "wcag-clause-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('wcag-clause-audit.audit_file', runCurrent);
  reg('wcag-clause-audit.audit_selection', runSelection);
  reg('wcag-clause-audit.list_rules', listRules);
  reg('wcag-clause-audit.show_report', showReport);
  reg('wcag-clause-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('wcag-clause-audit.export_report', function () { return exportReport(ctx); });
  reg('wcag-clause-audit.ci_json', function () { return ciJson(ctx); });
  reg('wcag-clause-audit.watch_on_save', function () { return watchOnSave(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('wcag-clause-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
