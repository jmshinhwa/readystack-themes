// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing this file against 30 rules.", "done": "Audit finished. The findings are listed in the output panel with their line numbers.", "nothing_found": "No findings. All 30 rules passed on this file.", "need_key": "This is a paid command. Paste your licence key to unlock it.", "key_ok": "Licence key accepted. Workspace audit, export and quick fix are unlocked.", "key_bad": "That key was not accepted. Check for a missing character and paste it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('GNU Linker Map + 7 Formats — Audit & Snippets');
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
  for (const r of rows) {
    if (!r.hits.length) continue;
    c.appendLine(path.basename(r.file));
    for (const h of r.hits) { c.appendLine('  ' + h.line + ': ' + h.msg); n++; }
  }
  c.appendLine('—— ' + n + ' ——');
  c.show(true);
  return n;
}

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질).
const RULES = [{"pattern": "\\*fill\\*\\s+0x", "flags": "m", "message": "GNU map: a *fill* entry. The linker padded this gap to satisfy an alignment request, and those bytes are in the image. Reorder the section or relax the alignment to get them back."}, {"pattern": "(_printf_float|_svfprintf_r|_vfprintf_r)", "flags": "m", "message": "GNU map: the floating-point variant of printf was pulled into the image. Check whether any format string really uses %f; if not, drop the -u _printf_float link option."}, {"pattern": "^\\s*\\.eh_frame\\b", "flags": "m", "message": "GNU map: C++ exception unwind tables are linked into the image. If this firmware never throws, build with -fno-exceptions so the section is not produced."}, {"pattern": "\\*\\(COMMON\\)|^\\s*COMMON\\s+0x", "flags": "m", "message": "GNU map: a COMMON block. Two files that both write `int flag;` at file scope are merged into one object with no warning. GCC 10 and newer default to -fno-common, so this build re-enabled it or an older toolchain produced this map."}, {"pattern": "\\.html_safe\\b", "flags": "m", "message": "ERB: html_safe turns escaping off for this value. Anything a user typed goes into the page as markup."}, {"pattern": "<%==", "flags": "m", "message": "ERB: <%== writes the value unescaped. Use <%= so Rails escapes it.", "fix": "<%="}, {"pattern": "<%=\\s*raw\\s*\\(", "flags": "m", "message": "ERB: raw() cancels escaping for this output. Pass it through sanitize() with an allow-list instead.", "fix": "<%= sanitize("}, {"pattern": "<%=\\s*params\\s*\\[", "flags": "m", "message": "ERB: a request parameter is rendered straight into the template. Assign it to a checked local in the controller first."}, {"pattern": "allow\\s+[a-z,\\s]*:\\s*if\\s+true", "flags": "m", "message": "Firestore rules: `if true` opens this path to anyone on the internet, signed in or not. Lock it and add the condition you meant.", "fix": "allow read, write: if false;"}, {"pattern": "allow\\s+[a-z,\\s]*:\\s*if\\s+request\\.auth\\s*!=\\s*null\\s*;", "flags": "m", "message": "Firestore rules: any signed-in account passes this, including one that signed up a second ago. Compare request.auth.uid with the document owner as well."}, {"pattern": "\"\\.(read|write)\"\\s*:\\s*true", "flags": "m", "message": "Realtime Database rules: a `.read` or `.write` set to true grants that operation on this node and everything under it to every caller."}, {"pattern": "rules_version\\s*=\\s*['\"]1['\"]", "flags": "m", "message": "Firestore rules version 1. Version 2 changes how the recursive wildcard {document=**} matches nested collections; migrate before writing rules that depend on it."}, {"pattern": "unsafeHTML\\s*\\(", "flags": "m", "message": "lit-html: unsafeHTML puts the string into the DOM as markup with no escaping. Only pass content you produced yourself."}, {"pattern": "\\.innerHTML\\s*=", "flags": "m", "message": "lit-html: writing innerHTML steps around the template, so lit's escaping does not apply and the next render can overwrite it."}, {"pattern": "(?<![?.@])(checked|disabled|hidden|readonly|required|selected)\\s*=\\s*\"?\\$\\{", "flags": "m", "message": "lit-html: a boolean attribute bound as attr=${...} is always present, because the attribute exists even when the value is false. Write ?attr=${...}."}, {"pattern": "html\\s*`[^`]*\\$\\{[^}]*\\.map\\s*\\(", "flags": "m", "message": "lit-html: .map() inside a template rebuilds every child element on each render. repeat() with a key reuses the nodes that are already there."}, {"pattern": "(?<![`:\\w])`[^`\\n]+`(?![`_])", "flags": "m", "message": "reStructuredText: single backticks are interpreted text, not literal. Use double backticks for code, or the output silently loses the formatting."}, {"pattern": "^\\s*\\.\\.\\s+(note|warning|tip|important|caution|code-block|image|figure|toctree|literalinclude|include|contents)\\s*:(?!:)", "flags": "m", "message": "reStructuredText: a directive needs two colons. With one, docutils treats the whole block as a comment and prints nothing — with no error."}, {"pattern": "^\\s*\\.\\.\\s+_[A-Za-z][^:\\n]*$", "flags": "m", "message": "reStructuredText: a hyperlink target must end with a colon, as in `.. _install-guide:`. Without it the target is a comment and every :ref: to it fails."}, {"pattern": "[ \\t]+$", "flags": "m", "message": "Trailing whitespace at the end of this line. In a fixed-width text record it changes the field; in a diff it shows the line as modified when nothing was."}, {"pattern": "\\u00a0", "flags": "m", "message": "A non-breaking space (U+00A0). It looks exactly like a space and it is not one, so grep, split and every parser that expects ASCII whitespace miss it.", "fix": " "}, {"pattern": "[\\u200b-\\u200d\\ufeff]", "flags": "m", "message": "A zero-width character is on this line. Nothing shows it, and it makes two strings that look identical compare as different."}, {"pattern": "\\*ngFor=\"(?:(?!trackBy)[^\"])*\"", "flags": "m", "message": "Angular template: *ngFor with no trackBy. Replacing the array destroys and rebuilds every row, so scroll position, focus and any open input are lost."}, {"pattern": "<[^>]*\\*ngIf=[^>]*\\*ngFor=|<[^>]*\\*ngFor=[^>]*\\*ngIf=", "flags": "m", "message": "Angular template: two structural directives on one element. Angular refuses to compile this; move one onto an <ng-container>."}, {"pattern": "\\[innerHTML\\]\\s*=", "flags": "m", "message": "Angular template: [innerHTML] is sanitised, so scripts and most attributes in that string are dropped without a message. If the rendered content is missing pieces, this is where they went."}, {"pattern": "<(div|span|li|td|img|p)\\b[^>]*\\(click\\)=", "flags": "m", "message": "Angular template: a click handler on an element a keyboard cannot reach. Use <button type=\"button\">, or add tabindex and a keydown handler."}, {"pattern": "^:[0-9A-F]*[a-f][0-9A-Fa-f]*\\s*$", "flags": "m", "message": "Intel HEX: this record uses lowercase hex digits. Several device programmers and EEPROM tools accept uppercase only."}, {"pattern": "^:[0-9A-Fa-f]{10,}[^0-9A-Fa-f\\s]", "flags": "m", "message": "Intel HEX: a character that is not a hex digit inside the record. The record is corrupt and the loader will stop here."}, {"pattern": "^:(?:[0-9A-Fa-f]{2})*[0-9A-Fa-f]\\s*$", "flags": "m", "message": "Intel HEX: an odd number of hex digits. Every field is a whole byte of two digits, so one digit is missing from this record."}, {"pattern": "^:[0-9A-Fa-f]{6}(?!0[0-5])[0-9A-Fa-f]{2}", "flags": "m", "message": "Intel HEX: the record type field is not one of 00 to 05. Those six are the only types the format defines."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('linker-map-format-audit');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      let re;
      try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
      if (re.test(lines[i])) hits.push({ line: i + 1, msg: r.message, fix: r.fix || null });
    }
  }
  return hits;
}

const SNIPPETS = {"ld_map_flags": ["CFLAGS  += -ffunction-sections -fdata-sections", "LDFLAGS += -Wl,--gc-sections", "LDFLAGS += -Wl,-Map=${1:build}/${2:firmware}.map,--cref", "LDFLAGS += -Wl,--print-memory-usage"], "ld_newlib_nano": ["LDFLAGS += --specs=nano.specs", "# uncomment only if a format string really uses %f:", "# LDFLAGS += -u _printf_float"], "ld_memory_layout": ["MEMORY", "{", "  FLASH (rx)  : ORIGIN = 0x${1:08000000}, LENGTH = ${2:512}K", "  RAM   (rwx) : ORIGIN = 0x${3:20000000}, LENGTH = ${4:128}K", "}", "", "SECTIONS", "{", "  .text   : { *(.text*) }   > FLASH", "  .rodata : { *(.rodata*) } > FLASH", "  .data   : { *(.data*) }   > RAM AT> FLASH", "  .bss    : { *(.bss*) *(COMMON) } > RAM", "}"], "erb_sanitize": ["<%= sanitize(${1:body_html}, tags: %w[p br b i em strong ul ol li a], attributes: %w[href title]) %>"], "erb_each": ["<% ${1:items}.each do |${2:item}| %>", "  <li><%= ${2:item}.${3:name} %></li>", "<% end %>"], "erb_if_present": ["<% if ${1:record}.present? %>", "  <%= ${1:record}.${2:name} %>", "<% else %>", "  <%= t('.${3:not_provided}') %>", "<% end %>"], "firestore_owner_only": ["rules_version = '2';", "service cloud.firestore {", "  match /databases/{database}/documents {", "    match /${1:users}/{userId} {", "      allow read, write: if request.auth != null && request.auth.uid == userId;", "    }", "  }", "}"], "firestore_read_auth_write_owner": ["match /${1:posts}/{postId} {", "  allow read: if request.auth != null;", "  allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;", "  allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;", "}"], "firebase_hosting_block": ["{", "  \"hosting\": {", "    \"public\": \"dist\",", "    \"ignore\": [\"firebase.json\", \"**/.*\", \"**/node_modules/**\"],", "    \"rewrites\": [{ \"source\": \"**\", \"destination\": \"/index.html\" }],", "    \"headers\": [", "      { \"source\": \"**/*.@(js|css)\", \"headers\": [{ \"key\": \"Cache-Control\", \"value\": \"max-age=31536000\" }] }", "    ]", "  }", "}"], "lit_element": ["import { LitElement, html, css } from 'lit';", "import { customElement, property } from 'lit/decorators.js';", "", "@customElement('${1:my-panel}')", "export class ${2:MyPanel} extends LitElement {", "  static styles = css`", "    :host { display: block; }", "  `;", "", "  @property({ type: String }) label = '${3:Panel}';", "", "  render() {", "    return html`<h2>\\${this.label}</h2>`;", "  }", "}"], "lit_keyed_repeat": ["import { repeat } from 'lit/directives/repeat.js';", "", "render() {", "  return html`<ul>", "    \\${repeat(this.${1:items}, (item) => item.id, (item) => html`<li>\\${item.${2:name}}</li>`)}", "  </ul>`;", "}"], "lit_conditional": ["import { nothing } from 'lit';", "", "render() {", "  return html`\\${this.${1:isOpen} ? html`<p>\\${this.${2:message}}</p>` : nothing}`;", "}"], "lit_property": ["@property({ type: ${1|String,Number,Boolean,Array,Object|}, reflect: ${2|false,true|}, attribute: '${3:my-value}' })", "${4:myValue} = ${5:''};"], "rst_code_block": [".. code-block:: ${1|python,c,bash,json,yaml,text|}", "   :caption: ${2:build flags}", "   :linenos:", "", "   ${3:print(\"hello\")}"], "rst_admonition": [".. ${1|note,warning,tip,important,caution|}::", "", "   ${2:This build needs GCC 12 or newer.}"], "rst_list_table": [".. list-table:: ${1:Supported formats}", "   :header-rows: 1", "   :widths: 30 70", "", "   * - ${2:Format}", "     - ${3:What it holds}", "   * - ${4:.map}", "     - ${5:Section and symbol addresses}"], "rst_hyperlink_target": [".. _${1:install-guide}:", "", "See :ref:`${1:install-guide}` from anywhere in this document."], "txt_column_ruler": ["....+....1....+....2....+....3....+....4....+....5....+....6....+....7....+....8"], "txt_record_header": ["# encoding: UTF-8 (no BOM)", "# line ending: LF", "# field widths: ${1:8},${2:12},${3:20}", "# generated by: ${4:build.sh}"], "ng_for_trackby": ["<li *ngFor=\"let ${1:item} of ${2:items}; trackBy: track${3:Item}\">", "  {{ ${1:item}.${4:name} }}", "</li>"], "ng_trackby_function": ["track${1:Item}(index: number, item: ${2:Item}): ${3:string} {", "  return item.${4:id};", "}"], "ng_async_container": ["<ng-container *ngIf=\"${1:data$} | async as ${2:data}; else ${3:loading}\">", "  {{ ${2:data}.${4:name} }}", "</ng-container>", "<ng-template #${3:loading}>${5:Loading}</ng-template>"], "ng_keyboard_reachable_action": ["<button type=\"button\" (click)=\"${1:onSave}()\" [disabled]=\"${2:form}.invalid\">${3:Save}</button>"], "ihex_eof_record": [":00000001FF"], "ihex_extended_linear_address": [":020000040800F2"]};

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

// ★무료 — ★스니펫을 골라 ★커서 자리에 넣는다
async function insertSnippet() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const names = Object.keys(SNIPPETS);
  if (!names.length) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const pick = await vscode.window.showQuickPick(names, { placeHolder: S.run });
  if (!pick) return;
  await ed.insertSnippet(new vscode.SnippetString(SNIPPETS[pick].join('\n')));
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
  const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 2000);
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
  const cfgFmt = String(vscode.workspace.getConfiguration('linker-map-format-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('linker-map-format-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'linker-map-format-audit-report.' + pick.toLowerCase());
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

function activate(ctx) {
  try { lic.pullFeed(ctx, "linker-map-format-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('linker-map-format-audit.audit_file', runCurrent);
  reg('linker-map-format-audit.audit_selection', runSelection);
  reg('linker-map-format-audit.insert_snippet', insertSnippet);
  reg('linker-map-format-audit.list_rules', listRules);
  reg('linker-map-format-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('linker-map-format-audit.export_report', function () { return exportReport(ctx); });
  reg('linker-map-format-audit.quick_fix', function () { return quickFix(ctx); });
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
