// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "WCAG 2.1 AA audit", "done": "Audit finished - findings are in the output panel.", "nothing_found": "Nothing to report - no open file, or no WCAG 2.1 AA failures in it.", "need_key": "Full version: audit every template in the workspace and export the findings as CSV, JSON or HTML. $29 once - one licence key per person or team seat - 7-day full refund. A consultancy audit is $100-$250 per page.", "key_ok": "Licence accepted. Workspace audit, export, quick fix and watch-on-save are on.", "key_bad": "That licence key did not validate. The free per-file audit keeps working meanwhile.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "paste": "Paste an HTML, JSX, Vue, Twig, Blade, ERB or Razor template here", "check": "Audit this markup", "extra_rules": "Your own rules, checked alongside the 24 that ship inside."};
const PAID = ["workspace_scan", "export_report", "quick_fix", "watch_on_save"];

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

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질).
const RULES = [{"sev": "error", "pattern": "<html\\b(?![^>]*\\slang\\s*=)", "flags": "i", "message": "3.1.1 Language of Page (A) - <html> has no lang attribute, so the screen reader guesses the voice.", "fix": "Add lang to the <html> tag, e.g. lang=\"en\"."}, {"sev": "error", "pattern": "<img\\b(?![^>]*\\s(?:alt|aria-label|aria-labelledby)\\s*=)", "flags": "i", "message": "1.1.1 Non-text Content (A) - <img> has no alt. Use alt=\"\" only when the image is decorative.", "fix": "Add alt text, or alt=\"\" if the image is decorative."}, {"sev": "error", "pattern": "<input\\b(?=[^>]*type\\s*=\\s*[\"\\']?image)(?![^>]*\\s(?:alt|aria-label)\\s*=)", "flags": "i", "message": "1.1.1 Non-text Content (A) - <input type=\"image\"> has no alt. The picture is the button's only name.", "fix": "Add alt describing the action, not the picture."}, {"sev": "warn", "pattern": "<svg\\b(?![^>]*\\s(?:aria-label|aria-labelledby|aria-hidden|role)\\s*=)", "flags": "i", "message": "1.1.1 Non-text Content (A) - <svg> is neither named nor hidden. Check for a <title> child.", "fix": "Add aria-hidden=\"true\" if decorative, or role=\"img\" with aria-label."}, {"sev": "error", "pattern": "<iframe\\b(?![^>]*\\stitle\\s*=)", "flags": "i", "message": "4.1.2 Name, Role, Value (A) - <iframe> has no title. The frame list announces it as \"frame\".", "fix": "Add title describing what the frame contains."}, {"sev": "error", "pattern": "tabindex\\s*=\\s*[\"\\']?\\+?[1-9]\\d*[\"\\']?", "flags": "i", "message": "2.4.3 Focus Order (A) - a positive tabindex forces an order that fights the DOM order.", "fix": "Use tabindex=\"0\" and let the DOM order decide.", "replace": "tabindex=\"0\""}, {"sev": "error", "pattern": "user-scalable\\s*=\\s*(?:no|0)\\b", "flags": "i", "message": "1.4.4 Resize Text (AA) - user-scalable=no blocks pinch zoom. This is an AA failure, not a preference.", "fix": "Remove it, or set user-scalable=yes.", "replace": "user-scalable=yes"}, {"sev": "error", "pattern": "maximum-scale\\s*=\\s*1(?:\\.0+)?\\b", "flags": "i", "message": "1.4.4 Resize Text (AA) - maximum-scale=1 caps zoom at 100%. AA needs text to reach 200%.", "fix": "Raise the cap, e.g. maximum-scale=5.", "replace": "maximum-scale=5"}, {"sev": "warn", "pattern": ">\\s*(?:click here|read more|learn more|more|here|details|link)\\s*</a>", "flags": "i", "message": "2.4.4 Link Purpose (A) - the link text does not say where it goes. In a link list it reads as \"click here\".", "fix": "Put the destination in the link text."}, {"sev": "error", "pattern": "<a\\b(?![^>]*\\s(?:aria-label|aria-labelledby|title)\\s*=)[^>]*>\\s*<i\\b", "flags": "i", "message": "4.1.2 Name, Role, Value (A) - icon-only link with no accessible name. It is announced as \"link\".", "fix": "Add aria-label, or visually hidden text inside the link."}, {"sev": "error", "pattern": "<button\\b[^>]*>\\s*</button>", "flags": "i", "message": "4.1.2 Name, Role, Value (A) - <button> is empty, so it has no accessible name at all.", "fix": "Put text inside, or add aria-label."}, {"sev": "error", "pattern": "<button\\b(?![^>]*\\s(?:aria-label|aria-labelledby|title)\\s*=)[^>]*>\\s*<(?:i|svg)\\b", "flags": "i", "message": "4.1.2 Name, Role, Value (A) - icon-only button with no accessible name.", "fix": "Add aria-label describing the action."}, {"sev": "error", "pattern": "<(?:div|span|li|td|p|img)\\b[^>]*\\son(?:click|mousedown|mouseup)\\s*=", "flags": "i", "message": "2.1.1 Keyboard (A) - a click handler on a <div>/<span> cannot be reached by Tab.", "fix": "Use <button>, or add role, tabindex=\"0\" and a key handler."}, {"sev": "warn", "pattern": "<[a-z][a-z0-9]*\\b(?![^>]*\\sonfocus\\s*=)[^>]*\\sonmouseover\\s*=", "flags": "i", "message": "2.1.1 Keyboard (A) - onmouseover with no onfocus. A keyboard user never triggers it.", "fix": "Mirror the hover handler with onfocus/onblur."}, {"sev": "warn", "pattern": "<a\\b[^>]*href\\s*=\\s*[\"\\'](?:#|javascript:void\\(0\\)|javascript:;)[\"\\']", "flags": "i", "message": "2.1.1 Keyboard (A) - href=\"#\" is a button in disguise. Enter fires it, Space does not.", "fix": "Use <button type=\"button\"> for an action, <a> for a destination."}, {"sev": "warn", "pattern": "<input\\b(?![^>]*\\stype\\s*=\\s*[\"\\']?(?:hidden|submit|button|reset|image)\\b)(?![^>]*\\s(?:id|aria-label|aria-labelledby|title)\\s*=)", "flags": "i", "message": "3.3.2 Labels or Instructions (A) - <input> has no id or aria-label, so no <label> can point at it. Confirm it is wrapped in one.", "fix": "Add id and a <label for>, or aria-label."}, {"sev": "warn", "pattern": "<label\\b(?![^>]*\\sfor\\s*=)", "flags": "i", "message": "1.3.1 Info and Relationships (A) - <label> has no for attribute. Wrapping also works, so check the markup.", "fix": "Add for pointing at the control id, or wrap the control."}, {"sev": "error", "pattern": "<input\\b(?=[^>]*(?:type\\s*=\\s*[\"\\']?(?:email|tel)|name\\s*=\\s*[\"\\'](?:email|e-mail|tel|phone|fname|lname|fullname|name|address|zip|postal|country|cc-number|username)[\"\\']))(?![^>]*\\sautocomplete\\s*=)", "flags": "i", "message": "1.3.5 Identify Input Purpose (AA) - no autocomplete token. This criterion is NEW in WCAG 2.1, so WCAG 2.0-era checkers never report it.", "fix": "Add the autocomplete token for the field, e.g. autocomplete=\"email\"."}, {"sev": "error", "pattern": "<(?:audio|video)\\b(?=[^>]*\\sautoplay)(?![^>]*\\smuted)", "flags": "i", "message": "1.4.2 Audio Control (A) - media autoplays with sound and no in-page way to stop it.", "fix": "Remove autoplay, add muted, or give a pause control in the page."}, {"sev": "error", "pattern": "<(?:marquee|blink)\\b", "flags": "i", "message": "2.2.2 Pause, Stop, Hide (A) - <marquee>/<blink> moves past 5 seconds with no pause control.", "fix": "Replace with static markup, or add a pause control."}, {"sev": "error", "pattern": "<(?:a|button|input|select|textarea)\\b[^>]*\\saria-hidden\\s*=\\s*[\"\\']?true", "flags": "i", "message": "4.1.2 Name, Role, Value (A) - aria-hidden=\"true\" on a focusable control. Tab lands on something the screen reader cannot see.", "fix": "Remove aria-hidden, or take the control out of the tab order too."}, {"sev": "warn", "pattern": "<h[1-6]\\b[^>]*>\\s*</h[1-6]>", "flags": "i", "message": "2.4.6 Headings and Labels (AA) - empty heading. It still shows as a blank row in the heading list.", "fix": "Give the heading text, or remove the element."}, {"sev": "warn", "pattern": "<(?:select|textarea)\\b(?![^>]*\\s(?:id|aria-label|aria-labelledby|title)\\s*=)", "flags": "i", "message": "3.3.2 Labels or Instructions (A) - <select>/<textarea> has no id or aria-label for a label to attach to.", "fix": "Add id and a <label for>, or aria-label."}, {"sev": "error", "pattern": "<[a-z][a-z0-9]*\\b(?![^>]*\\stabindex\\s*=)[^>]*\\srole\\s*=\\s*[\"\\']button[\"\\']", "flags": "i", "message": "2.1.1 Keyboard (A) - role=\"button\" without tabindex. It announces as a button but cannot be focused.", "fix": "Add tabindex=\"0\", or use a real <button>."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('wcag21-aa-legal-baseline-audit');
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

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

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
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('wcag21-aa-legal-baseline-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
