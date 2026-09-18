// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Running the checks over your code", "done": "Check finished. The findings are in the output panel, with file and line number.", "nothing_found": "No findings. Nothing in this code matches any of the 20 checks.", "need_key": "This is one of the paid commands. Paste your licence key to unlock it on this machine.", "key_ok": "Licence key accepted. The workspace check, the fix and the report export are unlocked here.", "key_bad": "That key was not accepted. Check for a stray space at the start or the end, then paste it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Jest Snippets + 7 More Stacks (40 Snippets)');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('jest-snippets-8-stacks').get('min_severity')
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
const RULES = [{"pattern": "\\bfit\\s*\\(", "flags": "i", "message": "fit( runs this test alone and the whole run still reports green. Change it back to it( before you push.", "fix": "it("}, {"pattern": "\\bfdescribe\\s*\\(", "flags": "i", "message": "fdescribe( silences every other block in the file while the run stays green.", "fix": "describe("}, {"pattern": "\\bit\\.only\\s*\\(", "flags": "i", "message": "it.only leaves one test running in this file. The suite passes because almost nothing ran.", "fix": "it("}, {"pattern": "\\btest\\.only\\s*\\(", "flags": "i", "message": "test.only leaves one test running in this file. Remove it before the pull request.", "fix": "test("}, {"pattern": "\\bdescribe\\.only\\s*\\(", "flags": "i", "message": "describe.only skips every other block in this file and CI cannot tell you that.", "fix": "describe("}, {"pattern": "\\bxit\\s*\\(", "flags": "i", "message": "xit( is a test that never runs again. If it is disabled on purpose, say why in a comment above it.", "fix": "it("}, {"pattern": "\\b(it|test|describe)\\.skip\\s*\\(", "flags": "i", "message": "A skipped test is committed here. It costs nothing to keep and catches nothing either."}, {"pattern": "console\\.log\\s*\\(", "flags": "i", "message": "console.log left in the code. It floods the test output and hides the failure line."}, {"pattern": "expect\\s*\\([^)]*\\)\\s*;", "flags": "i", "message": "expect() with no matcher after it. This line asserts nothing and always passes."}, {"pattern": "\\.toBeTruthy\\s*\\(\\s*\\)", "flags": "i", "message": "toBeTruthy() passes for any non-empty string, object or number. Assert the value you actually mean.", "fix": ".toBe(true)"}, {"pattern": "new\\s+Promise\\s*\\(\\s*\\w+\\s*=>\\s*setTimeout", "flags": "i", "message": "Sleeping inside a test is the usual source of a flaky CI run. Use jest.useFakeTimers() and advanceTimersByTime instead."}, {"pattern": "jest\\.setTimeout\\s*\\(\\s*\\d{5,}\\s*\\)", "flags": "i", "message": "A timeout of ten seconds or more usually hides a promise that never resolves rather than a slow test."}, {"pattern": "async\\s*\\([^)]*done[^)]*\\)", "flags": "i", "message": "A test cannot be async and take the done callback at the same time. Jest fails this test."}, {"pattern": "\\bexpect\\s*\\(\\s*await", "flags": "i", "message": "expect(await x).rejects never sees a rejection, because the await throws first. Use await expect(x).rejects instead."}, {"pattern": "dangerouslySetInnerHTML", "flags": "i", "message": "dangerouslySetInnerHTML writes unescaped markup into the page. Anything that reaches it from user input becomes script."}, {"pattern": "\\[innerHTML\\]", "flags": "i", "message": "Angular strips scripts here but not every attribute. Bind text, or sanitize explicitly and say so in a comment."}, {"pattern": "\\.html_safe\\b", "flags": "i", "message": "html_safe turns off escaping for this string. If any part of it came from a request parameter, it is an injection point."}, {"pattern": "\\.permit!", "flags": "i", "message": "permit! accepts every parameter the request sends, including columns you never meant to expose."}, {"pattern": "<img(?![^>]*alt=)[^>]*>", "flags": "i", "message": "This img has no alt attribute. A screen reader reads the file name instead, and an accessibility audit records it as a failure."}, {"pattern": "<html(?![^>]*\\blang=)", "flags": "i", "message": "The html element has no lang attribute, so screen readers and translation tools guess the language of the page."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('jest-snippets-8-stacks');
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

const SNIPPETS = {"jest_describe_block": ["describe('${1:UserService}', () => {", "\tit('${2:returns the active user}', () => {", "\t\texpect(${3:actual}).toBe(${4:expected});", "\t});", "});"], "jest_async_test": ["it('${1:resolves with the saved record}', async () => {", "\tawait expect(${2:save(record)}).resolves.toEqual(${3:expected});", "});"], "jest_module_mock": ["jest.mock('${1:../api/client}', () => ({", "\t${2:fetchUser}: jest.fn(),", "}));", "", "beforeEach(() => {", "\tjest.clearAllMocks();", "});"], "jest_spy_on": ["const ${1:spy} = jest.spyOn(${2:console}, '${3:warn}').mockImplementation(() => {});", "", "afterEach(() => {", "\t${1:spy}.mockRestore();", "});"], "jest_each_table": ["it.each([", "\t[${1:1}, ${2:2}, ${3:3}],", "])('${4:adds %i and %i to make %i}', (a, b, expected) => {", "\texpect(${5:add}(a, b)).toBe(expected);", "});"], "jest_fake_timers": ["beforeEach(() => {", "\tjest.useFakeTimers();", "});", "", "it('${1:fires after the delay}', () => {", "\t${2:schedule}();", "\tjest.advanceTimersByTime(${3:1000});", "\texpect(${4:onDone}).toHaveBeenCalledTimes(1);", "});"], "jest_expect_throws": ["it('${1:rejects an empty id}', () => {", "\texpect(() => ${2:load}(${3:''})).toThrow('${4:id is required}');", "});"], "jest_setup_hooks": ["beforeAll(() => {", "\t${1:startServer}();", "});", "", "afterAll(() => {", "\t${2:stopServer}();", "});", "", "afterEach(() => {", "\tjest.restoreAllMocks();", "});"], "next_server_component": ["export default async function ${1:Page}() {", "\tconst ${2:data} = await ${3:getData}();", "", "\treturn <main>{${2:data}.${4:title}}</main>;", "}"], "next_client_component": ["'use client';", "", "import { useState } from 'react';", "", "export default function ${1:Counter}() {", "\tconst [${2:count}, ${3:setCount}] = useState(${4:0});", "", "\treturn <button onClick={() => ${3:setCount}(${2:count} + 1)}>{${2:count}}</button>;", "}"], "next_route_handler": ["export async function GET(request: Request) {", "\tconst { searchParams } = new URL(request.url);", "\tconst ${1:id} = searchParams.get('${1:id}');", "", "\treturn Response.json({ ${1:id} });", "}"], "next_metadata_export": ["export const metadata = {", "\ttitle: '${1:Pricing}',", "\tdescription: '${2:Plans, limits and what each one includes.}',", "};"], "next_component_test": ["import { render, screen } from '@testing-library/react';", "import ${1:Pricing} from './${1:Pricing}';", "", "it('${2:shows the plan name}', () => {", "\trender(<${1:Pricing} />);", "\texpect(screen.getByText('${3:Pro plan}')).toBeInTheDocument();", "});"], "tailwind_card": ["<div class=\"rounded-xl border border-slate-200 bg-white p-6 shadow-sm\">", "\t<h3 class=\"text-lg font-semibold text-slate-900\">${1:Card title}</h3>", "\t<p class=\"mt-2 text-sm text-slate-600\">${2:One line that explains it.}</p>", "</div>"], "tailwind_button": ["<button type=\"button\" class=\"inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50\">${1:Save changes}</button>"], "tailwind_responsive_grid": ["<div class=\"grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-${1:3}\">", "\t${2:<!-- cards go here -->}", "</div>"], "tailwind_form_field": ["<div>", "\t<label for=\"${1:email}\" class=\"block text-sm font-medium text-slate-900\">${2:Email}</label>", "\t<input id=\"${1:email}\" name=\"${1:email}\" type=\"${3:email}\" required class=\"mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500\" />", "</div>"], "angular_standalone_component": ["import { Component } from '@angular/core';", "", "@Component({", "\tselector: '${1:app-user-card}',", "\tstandalone: true,", "\ttemplate: `<p>{{ ${2:name} }}</p>`,", "})", "export class ${3:UserCardComponent} {", "\t${2:name} = '${4:Ada}';", "}"], "angular_injectable_service": ["import { Injectable, inject } from '@angular/core';", "import { HttpClient } from '@angular/common/http';", "", "@Injectable({ providedIn: 'root' })", "export class ${1:UserService} {", "\tprivate http = inject(HttpClient);", "", "\t${2:list}() {", "\t\treturn this.http.get('${3:/api/users}');", "\t}", "}"], "angular_component_spec": ["import { TestBed } from '@angular/core/testing';", "import { ${1:UserCardComponent} } from './${2:user-card.component}';", "", "describe('${1:UserCardComponent}', () => {", "\tit('${3:renders the name}', async () => {", "\t\tawait TestBed.configureTestingModule({ imports: [${1:UserCardComponent}] }).compileComponents();", "\t\tconst fixture = TestBed.createComponent(${1:UserCardComponent});", "\t\tfixture.detectChanges();", "\t\texpect(fixture.nativeElement.textContent).toContain('${4:Ada}');", "\t});", "});"], "angular_reactive_form": ["import { FormBuilder, Validators } from '@angular/forms';", "import { inject } from '@angular/core';", "", "private fb = inject(FormBuilder);", "", "form = this.fb.group({", "\t${1:email}: ['', [Validators.required, Validators.email]],", "\t${2:password}: ['', [Validators.required, Validators.minLength(${3:8})]],", "});"], "rails_model_validations": ["class ${1:Invoice} < ApplicationRecord", "\tbelongs_to :${2:customer}", "", "\tvalidates :${3:number}, presence: true, uniqueness: true", "\tvalidates :${4:total_cents}, numericality: { greater_than_or_equal_to: 0 }", "", "\tscope :${5:unpaid}, -> { where(paid_at: nil) }", "end"], "rails_controller_action": ["class ${1:InvoicesController} < ApplicationController", "\tdef create", "\t\t@${2:invoice} = ${3:Invoice}.new(${2:invoice}_params)", "", "\t\tif @${2:invoice}.save", "\t\t\tredirect_to @${2:invoice}, notice: '${4:Invoice created.}'", "\t\telse", "\t\t\trender :new, status: :unprocessable_entity", "\t\tend", "\tend", "", "\tprivate", "", "\tdef ${2:invoice}_params", "\t\tparams.require(:${2:invoice}).permit(:${5:number}, :${6:total_cents})", "\tend", "end"], "rails_minitest_case": ["require 'test_helper'", "", "class ${1:InvoiceTest} < ActiveSupport::TestCase", "\ttest '${2:is invalid without a number}' do", "\t\t${3:invoice} = ${4:Invoice}.new(number: nil)", "\t\tassert_not ${3:invoice}.valid?", "\tend", "end"], "rails_migration": ["class ${1:CreateInvoices} < ActiveRecord::Migration[${2:7.1}]", "\tdef change", "\t\tcreate_table :${3:invoices} do |t|", "\t\t\tt.references :${4:customer}, null: false, foreign_key: true", "\t\t\tt.string :${5:number}, null: false", "\t\t\tt.integer :${6:total_cents}, null: false, default: 0", "\t\t\tt.timestamps", "\t\tend", "", "\t\tadd_index :${3:invoices}, :${5:number}, unique: true", "\tend", "end"], "rails_erb_form": ["<%= form_with model: @${1:invoice} do |f| %>", "\t<div>", "\t\t<%= f.label :${2:number} %>", "\t\t<%= f.text_field :${2:number}, required: true %>", "\t</div>", "\t<%= f.submit '${3:Save}' %>", "<% end %>"], "css_theme_tokens": [":root {", "\t--${1:color-fg}: ${2:#0f172a};", "\t--${3:color-bg}: ${4:#ffffff};", "\t--${5:space-3}: ${6:0.75rem};", "}"], "css_grid_autofit": [".${1:cards} {", "\tdisplay: grid;", "\tgrid-template-columns: repeat(auto-fit, minmax(${2:16rem}, 1fr));", "\tgap: ${3:1.5rem};", "}"], "css_flex_center": [".${1:center} {", "\tdisplay: flex;", "\talign-items: center;", "\tjustify-content: ${2:center};", "\tgap: ${3:0.5rem};", "}"], "css_container_query": [".${1:card-wrap} {", "\tcontainer-type: inline-size;", "}", "", "@container (min-width: ${2:32rem}) {", "\t.${3:card} {", "\t\tgrid-template-columns: ${4:1fr 2fr};", "\t}", "}"], "css_focus_visible_ring": [".${1:button}:focus-visible {", "\toutline: ${2:2px} solid ${3:#4f46e5};", "\toutline-offset: ${4:2px};", "}"], "html5_document": ["<!doctype html>", "<html lang=\"${1:en}\">", "<head>", "\t<meta charset=\"utf-8\" />", "\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />", "\t<title>${2:Page title}</title>", "\t<meta name=\"description\" content=\"${3:What this page is for, in one line.}\" />", "</head>", "<body>", "\t<main>${4:content}</main>", "</body>", "</html>"], "html5_labelled_form": ["<form method=\"post\" action=\"${1:/subscribe}\">", "\t<label for=\"${2:email}\">${3:Email}</label>", "\t<input id=\"${2:email}\" name=\"${2:email}\" type=\"email\" autocomplete=\"email\" required />", "\t<button type=\"submit\">${4:Subscribe}</button>", "</form>"], "html5_picture_srcset": ["<picture>", "\t<source srcset=\"${1:hero.avif}\" type=\"image/avif\" />", "\t<img src=\"${2:hero.jpg}\" width=\"${3:1200}\" height=\"${4:630}\" loading=\"lazy\" decoding=\"async\" alt=\"${5:What the image shows}\" />", "</picture>"], "html5_data_table": ["<table>", "\t<caption>${1:Invoices for March}</caption>", "\t<thead>", "\t\t<tr><th scope=\"col\">${2:Number}</th><th scope=\"col\">${3:Total}</th></tr>", "\t</thead>", "\t<tbody>", "\t\t<tr><td>${4:INV-001}</td><td>${5:120.00}</td></tr>", "\t</tbody>", "</table>"], "html5_dialog": ["<dialog id=\"${1:confirm}\">", "\t<form method=\"dialog\">", "\t\t<p>${2:Delete this invoice?}</p>", "\t\t<button value=\"cancel\">${3:Cancel}</button>", "\t\t<button value=\"confirm\">${4:Delete}</button>", "\t</form>", "</dialog>"], "gist_readme_header": ["# ${1:What this gist does}", "", "**Runs on:** ${2:Node 20, Jest 29}", "", "## Use it", "", "```bash", "${3:npx jest path/to/file.test.js}", "```"], "gist_repro_report": ["## What I expected", "", "${1:The suite runs all 42 tests.}", "", "## What happened", "", "${2:One test ran and the run was reported green.}", "", "## Repro", "", "```js", "${3:fit('only me', () => expect(1).toBe(1));}", "```"], "md_pull_request_checklist": ["## What changed", "", "${1:One sentence.}", "", "## Test evidence", "", "- [ ] ${2:New tests cover the changed branch}", "- [ ] ${3:No focused or skipped tests left in the diff}", "- [ ] ${4:Full suite run locally}"], "md_note_with_code": ["> **Note**", "> ${1:This snippet assumes ESM and Node 20.}", "", "```${2:ts}", "${3:export const config = { runtime: 'nodejs' };}", "```"]};

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
  const _c = vscode.workspace.getConfiguration('jest-snippets-8-stacks');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('jest-snippets-8-stacks').get('reportFormat')
    || vscode.workspace.getConfiguration('jest-snippets-8-stacks').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'jest-snippets-8-stacks-report.' + pick.toLowerCase());
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
  try { lic.pullFeed(ctx, "jest-snippets-8-stacks").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('jest-snippets-8-stacks.insert_snippet', insertSnippet);
  reg('jest-snippets-8-stacks.audit_file', runCurrent);
  reg('jest-snippets-8-stacks.audit_selection', runSelection);
  reg('jest-snippets-8-stacks.list_rules', listRules);
  reg('jest-snippets-8-stacks.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('jest-snippets-8-stacks.export_report', function () { return exportReport(ctx); });
  reg('jest-snippets-8-stacks.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('jest-snippets-8-stacks').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
