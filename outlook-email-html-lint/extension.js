// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking against classic Outlook and the new Outlook", "done": "Findings are in the output panel", "nothing_found": "Nothing found - this file is clean for both Outlook engines", "need_key": "That is in the paid tier - a licence key unlocks it", "key_ok": "Licence accepted", "key_bad": "That key did not validate", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Outlook Split Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('outlook-email-html-lint').get('min_severity')
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
const RULES = [{"pattern": "display\\s*:\\s*flex", "flags": "i", "message": "classic Outlook: classic Outlook (Word engine) ignores display:flex - the row collapses into stacked blocks.", "fix": "Lay the row out with <table role=\"presentation\"><tr><td>.", "sev": "error"}, {"pattern": "(flex-direction|justify-content|align-items|flex-wrap)\\s*:", "flags": "i", "message": "classic Outlook: flexbox property is ignored by the Word engine in classic Outlook.", "fix": "Use table cells with align/valign attributes.", "sev": "error"}, {"pattern": "display\\s*:\\s*(inline-)?grid|grid-template", "flags": "i", "message": "classic Outlook: CSS grid is not supported by classic Outlook (Word engine).", "fix": "Rebuild the grid as nested tables.", "sev": "error"}, {"pattern": "(^|[;\"\\x27\\s])gap\\s*:", "flags": "i", "message": "classic Outlook: gap is ignored by the Word engine - your columns will touch.", "fix": "Add a spacer <td width=\"20\"> between columns.", "sev": "warn"}, {"pattern": "max-width\\s*:", "flags": "i", "message": "classic Outlook: classic Outlook ignores max-width and renders the element at full width.", "fix": "Set width=\"600\" as an HTML attribute on the table.", "sev": "error"}, {"pattern": "<div[^>]*style=\"[^\"]*padding", "flags": "i", "message": "classic Outlook: padding on a <div> is dropped by the Word engine.", "fix": "Move the padding onto the surrounding <td>.", "sev": "error"}, {"pattern": "border-radius\\s*:", "flags": "i", "message": "classic Outlook: border-radius is ignored in classic Outlook - the corners render square.", "fix": "Accept square corners there, or draw the button with VML.", "sev": "warn"}, {"pattern": "box-shadow\\s*:|text-shadow\\s*:", "flags": "i", "message": "classic Outlook: shadows are not rendered by the Word engine.", "fix": "Use a solid border instead.", "sev": "warn"}, {"pattern": "position\\s*:\\s*(absolute|fixed|sticky)", "flags": "i", "message": "classic Outlook: CSS positioning is not supported by classic Outlook.", "fix": "Use table layout - overlap is not achievable there.", "sev": "error"}, {"pattern": "float\\s*:\\s*(left|right)", "flags": "i", "message": "classic Outlook: float is unreliable in the Word engine.", "fix": "Use table cells side by side.", "sev": "warn"}, {"pattern": "background(-image)?\\s*:\\s*(url\\(|linear-gradient|radial-gradient)", "flags": "i", "message": "classic Outlook: CSS background images and gradients do not render in classic Outlook.", "fix": "Add a VML v:rect fallback, and set a solid bgcolor.", "sev": "error"}, {"pattern": "opacity\\s*:|transform\\s*:|filter\\s*:", "flags": "i", "message": "classic Outlook: opacity/transform/filter are not supported by the Word engine.", "fix": "Bake the effect into the image instead.", "sev": "warn"}, {"pattern": "object-fit\\s*:", "flags": "i", "message": "classic Outlook: object-fit is ignored - the image will stretch in classic Outlook.", "fix": "Crop the image to its final ratio before export.", "sev": "warn"}, {"pattern": "<svg", "flags": "i", "message": "classic Outlook: classic Outlook does not render inline SVG - the graphic disappears.", "fix": "Export the SVG to PNG and reference it with <img>.", "sev": "error"}, {"pattern": "<(video|audio|iframe|canvas|form|script)\\b", "flags": "i", "message": "classic Outlook: this element is stripped by Outlook and most other mail clients.", "fix": "Link out to a hosted page instead.", "sev": "error"}, {"pattern": "@media", "flags": "i", "message": "classic Outlook: classic Outlook ignores media queries - it always sees the desktop rules.", "fix": "Make the desktop rules the safe default and let media queries only enhance.", "sev": "warn"}, {"pattern": ":\\s*-?[\\d.]+(vh|vw|rem|ch)\\b", "flags": "i", "message": "classic Outlook: viewport and root-relative units are not supported by the Word engine.", "fix": "Use px.", "sev": "error"}, {"pattern": "(color|background-color)\\s*:\\s*(rgba|hsla?)\\(", "flags": "i", "message": "classic Outlook: rgba/hsl colours (and alpha) are not understood by classic Outlook.", "fix": "Use a 6-digit hex colour.", "sev": "warn"}, {"pattern": "<(section|article|header|footer|main|aside|nav|figure)\\b", "flags": "i", "message": "classic Outlook: semantic HTML5 elements get no layout from the Word engine.", "fix": "Wrap the content in a table instead.", "sev": "warn"}, {"pattern": "<img(?![^>]*\\swidth\\s*=)[^>]*>", "flags": "i", "message": "classic Outlook: an <img> with no width attribute is scaled unpredictably by classic Outlook.", "fix": "Add width=\"...\" as an HTML attribute, not only in CSS.", "sev": "error"}, {"pattern": "<img(?![^>]*\\salt\\s*=)[^>]*>", "flags": "i", "message": "classic Outlook: an <img> with no alt text shows nothing - Outlook blocks images by default.", "fix": "Add alt=\"...\" describing the image.", "sev": "error"}, {"pattern": "line-height\\s*:(?![^;]*mso-line-height-rule)", "flags": "i", "message": "classic Outlook: the Word engine inflates line-height unless mso-line-height-rule is set.", "fix": "Add mso-line-height-rule:exactly; alongside it.", "sev": "warn"}, {"pattern": "<body[^>]*style=\"[^\"]*background", "flags": "i", "message": "classic Outlook: classic Outlook ignores a background set on <body>.", "fix": "Wrap everything in a width=\"100%\" table carrying bgcolor.", "sev": "warn"}, {"pattern": "<table(?![^>]*role\\s*=)", "flags": "i", "message": "classic Outlook: a layout <table> without role=\"presentation\" is announced as a data table by screen readers.", "fix": "Add role=\"presentation\".", "sev": "warn"}, {"pattern": "<v:(roundrect|rect|shape|fill|textbox|image|background)", "flags": "i", "message": "new Outlook: VML is NOT rendered by the new Outlook (WebView2) - this button or background silently disappears there.", "fix": "Keep the VML for classic, but put a real HTML/CSS version outside the mso conditional.", "sev": "error"}, {"pattern": "xmlns:(v|o|w)\\s*=", "flags": "i", "message": "new Outlook: VML namespaces declared - this file targets classic Outlook only; check the new Outlook path too.", "fix": "Verify the non-VML fallback renders on its own.", "sev": "warn"}, {"pattern": "<!--\\s*\\[if\\s+(gte\\s+|lte\\s+|lt\\s+|gt\\s+|!)?mso", "flags": "i", "message": "new Outlook: mso conditional comments are not processed by the new Outlook - anything living only inside this block will not appear.", "fix": "Make sure the content also exists outside the conditional.", "sev": "error"}, {"pattern": "mso-[a-z-]+\\s*:", "flags": "i", "message": "new Outlook: mso- properties are inert in the new Outlook (WebView2).", "fix": "Ensure a standard CSS equivalent is present as well.", "sev": "warn"}, {"pattern": "(?=[^<]*unsubscribe)(?=.*mailto:)", "flags": "i", "message": "before you send: a mailto-only unsubscribe does not satisfy the Gmail/Yahoo one-click unsubscribe requirement (RFC 8058) for bulk senders.", "fix": "Add an https List-Unsubscribe URL plus the List-Unsubscribe-Post header.", "sev": "error"}, {"pattern": "href\\s*=\\s*[\"\\x27]#[\"\\x27]", "flags": "i", "message": "before you send: placeholder href=\"#\" left in - if this is the unsubscribe or preference link, the opt-out is dead.", "fix": "Point it at the real URL before sending.", "sev": "error"}, {"pattern": "\\{\\{[^}]+\\}\\}|%%[A-Z_]+%%|\\*\\|[A-Z_]+\\|\\*|\\[\\[[A-Z_]+\\]\\]", "flags": "i", "message": "before you send: an unresolved merge tag would be sent literally to the whole list.", "fix": "Confirm your ESP replaces this token, or remove it.", "sev": "error"}, {"pattern": "(src|href)\\s*=\\s*[\"\\x27]http://", "flags": "i", "message": "before you send: a non-TLS http:// asset or link - images get blocked and the link is flagged.", "fix": "Serve it over https://.", "sev": "error"}, {"pattern": "(localhost|127\\.0\\.0\\.1|staging\\.|\\.local/|file:///|example\\.com)", "flags": "i", "message": "before you send: a development URL is still in the file - it will be broken for every recipient.", "fix": "Swap in the production URL.", "sev": "error"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('outlook-email-html-lint');
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
  const _c = vscode.workspace.getConfiguration('outlook-email-html-lint');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('outlook-email-html-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('outlook-email-html-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'outlook-email-html-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'outlook-email-html-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "outlook-email-html-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('outlook-email-html-lint.audit_file', runCurrent);
  reg('outlook-email-html-lint.audit_selection', runSelection);
  reg('outlook-email-html-lint.show_report', showReport);
  reg('outlook-email-html-lint.list_rules', listRules);
  reg('outlook-email-html-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('outlook-email-html-lint.export_report', function () { return exportReport(ctx); });
  reg('outlook-email-html-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('outlook-email-html-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
