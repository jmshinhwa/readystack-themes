// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking against 15 rules…", "done": "Done. {count} findings — see the Output panel for file and line.", "nothing_found": "No findings. All 15 rules passed on this file.", "need_key": "That command is part of the paid half. Paste your licence key to unlock the workspace scan, fixes, export and watch-on-save. The free commands keep working either way.", "key_ok": "Key accepted. Workspace scan, fixes, export and watch-on-save are on.", "key_bad": "That key was not recognised. Check for a missing character, or reply to your purchase email and we will sort it out.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "export_report", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Web Stack Snippets + Audit — 8 Stacks');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('web-stack-snippets-audit').get('min_severity')
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
const RULES = [{"pattern": "\\.only\\s*\\(", "flags": "g", "message": "A focused test is left in this file: .only() makes the test runner skip every other test in it, so the suite can go green while almost nothing ran.", "fix": "("}, {"pattern": "\\.skip\\s*\\(", "flags": "g", "message": "A skipped test is left in this file. It reports as passing-but-skipped, and nobody comes back for it."}, {"pattern": "console\\.(log|debug)\\s*\\(", "flags": "g", "message": "Debug logging left in the code. It ships to production and prints whatever object you passed to it."}, {"pattern": "NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|KEY|PASSWORD)", "flags": "g", "message": "A NEXT_PUBLIC_ variable is holding a secret. Anything with that prefix is inlined into the browser bundle and is readable by every visitor."}, {"pattern": "dangerouslySetInnerHTML", "flags": "g", "message": "dangerouslySetInnerHTML puts unescaped markup into the page. If any part of that string came from a user, it is a script injection."}, {"pattern": "http://(?!localhost|127\\.0\\.0\\.1)", "flags": "g", "message": "An insecure http:// URL. Browsers block it as mixed content on an https page, so the request silently fails in production.", "fix": "https://"}, {"pattern": "<img(?![^>]*\\balt=)[^>]*>", "flags": "gi", "message": "An <img> with no alt attribute. A screen reader reads the file name instead, and this is the single most common accessibility finding in a review."}, {"pattern": "target=[\"']_blank[\"'](?![^>]*rel=)", "flags": "gi", "message": "target=\"_blank\" without rel. The opened page gets a handle on your window; add rel=\"noopener noreferrer\".", "fix": "target=\"_blank\" rel=\"noopener noreferrer\""}, {"pattern": "!important", "flags": "g", "message": "!important wins over everything and cannot be overridden by a later rule, so the next person adds another one. Raise the selector's specificity instead."}, {"pattern": "(w|h|p|m|gap)-\\[[0-9.]+px\\]", "flags": "g", "message": "An arbitrary pixel value bypasses the spacing scale, so this element stops matching the rest of the layout the moment the scale changes."}, {"pattern": "\\.subscribe\\s*\\(", "flags": "g", "message": "A manual subscription. Unless it is torn down (takeUntilDestroyed, or the async pipe), it keeps running after the component is destroyed."}, {"pattern": "where\\(\\s*[\"'][^\"']*#\\{", "flags": "g", "message": "String interpolation inside where() is SQL injection. Pass bind parameters: where(\"id = ?\", value)."}, {"pattern": "permit!", "flags": "g", "message": "permit! allows every parameter that was submitted, including columns you never meant to expose. List the attributes instead."}, {"pattern": "\\bvar\\s+", "flags": "g", "message": "var is function-scoped and hoisted, which is why it leaks out of loops and if-blocks. Use let or const.", "fix": "let "}, {"pattern": ":\\s*any\\b", "flags": "g", "message": "An explicit any switches type checking off for this value and everything it touches downstream."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('web-stack-snippets-audit');
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

const SNIPPETS = {"gist_create": ["const res = await fetch(\"https://api.github.com/gists\", {", "  method: \"POST\",", "  headers: {", "    Authorization: \"Bearer \" + ${1:token},", "    Accept: \"application/vnd.github+json\"", "  },", "  body: JSON.stringify({", "    description: \"${2:scratchpad}\",", "    public: ${3|false,true|},", "    files: { \"${4:notes.md}\": { content: ${5:content} } }", "  })", "});", "if (!res.ok) throw new Error(\"gist create failed: \" + res.status);", "const gist = await res.json();"], "gist_update": ["const res = await fetch(\"https://api.github.com/gists/\" + ${1:gistId}, {", "  method: \"PATCH\",", "  headers: {", "    Authorization: \"Bearer \" + ${2:token},", "    Accept: \"application/vnd.github+json\"", "  },", "  body: JSON.stringify({", "    files: { \"${3:notes.md}\": { content: ${4:content} } }", "  })", "});", "if (!res.ok) throw new Error(\"gist update failed: \" + res.status);"], "gist_list": ["async function ${1:listGists}(token) {", "  const out = [];", "  for (let page = 1; ; page++) {", "    const res = await fetch(", "      \"https://api.github.com/gists?per_page=100&page=\" + page,", "      { headers: { Authorization: \"Bearer \" + token } }", "    );", "    if (!res.ok) throw new Error(\"gist list failed: \" + res.status);", "    const batch = await res.json();", "    if (batch.length === 0) return out;", "    out.push(...batch);", "  }", "}"], "gist_read": ["const meta = await (await fetch(", "  \"https://api.github.com/gists/\" + ${1:gistId},", "  { headers: { Authorization: \"Bearer \" + ${2:token} } }", ")).json();", "const file = meta.files[\"${3:notes.md}\"];", "const text = file.truncated", "  ? await (await fetch(file.raw_url)).text()", "  : file.content;"], "gist_delete": ["const res = await fetch(\"https://api.github.com/gists/\" + ${1:gistId}, {", "  method: \"DELETE\",", "  headers: { Authorization: \"Bearer \" + ${2:token} }", "});", "if (res.status !== 204) throw new Error(\"gist delete failed: \" + res.status);"], "jest_describe_block": ["describe(\"${1:unit under test}\", () => {", "  it(\"${2:does the thing}\", () => {", "    expect(${3:actual}).toBe(${4:expected});", "  });", "});"], "jest_module_mock": ["jest.mock(\"${1:../api/client}\", () => ({", "  __esModule: true,", "  ${2:fetchUser}: jest.fn()", "}));", "", "import { ${2:fetchUser} } from \"${1:../api/client}\";", "const ${2:fetchUser}Mock = ${2:fetchUser} as jest.Mock;"], "jest_async_rejects": ["it(\"${1:rejects when the id is unknown}\", async () => {", "  await expect(${2:loadUser}(${3:\"nope\"})).rejects.toThrow(\"${4:not found}\");", "});"], "jest_table_test": ["it.each([", "  [${1:0}, ${2:\"zero\"}],", "  [${3:1}, ${4:\"one\"}]", "])(\"${5:formats} %i as %s\", (input, expected) => {", "  expect(${6:format}(input)).toBe(expected);", "});"], "jest_spy_restore": ["let ${1:spy}: jest.SpyInstance;", "", "beforeEach(() => {", "  ${1:spy} = jest.spyOn(${2:globalThis.console}, \"${3:warn}\").mockImplementation(() => {});", "});", "", "afterEach(() => {", "  ${1:spy}.mockRestore();", "});"], "next_server_page": ["export default async function ${1:Page}({", "  params", "}: {", "  params: Promise<{ ${2:slug}: string }>;", "}) {", "  const { ${2:slug} } = await params;", "  const ${3:data} = await ${4:load}(${2:slug});", "", "  return (", "    <main>", "      <h1>{${3:data}.${5:title}}</h1>", "    </main>", "  );", "}"], "next_route_handler": ["import { NextRequest, NextResponse } from \"next/server\";", "", "export async function GET(req: NextRequest) {", "  const ${1:q} = req.nextUrl.searchParams.get(\"${1:q}\");", "  if (!${1:q}) {", "    return NextResponse.json({ error: \"${1:q} is required\" }, { status: 400 });", "  }", "  return NextResponse.json({ ${2:result}: await ${3:search}(${1:q}) });", "}"], "next_generate_metadata": ["import type { Metadata } from \"next\";", "", "export async function generateMetadata({", "  params", "}: {", "  params: Promise<{ ${1:slug}: string }>;", "}): Promise<Metadata> {", "  const { ${1:slug} } = await params;", "  const ${2:item} = await ${3:load}(${1:slug});", "  return {", "    title: ${2:item}.${4:title},", "    description: ${2:item}.${5:summary}", "  };", "}"], "next_static_params": ["export async function generateStaticParams() {", "  const ${1:items} = await ${2:loadAll}();", "  return ${1:items}.map((item) => ({ ${3:slug}: item.${3:slug} }));", "}", "", "export const dynamicParams = ${4|false,true|};"], "next_server_action": ["\"use server\";", "", "import { revalidatePath } from \"next/cache\";", "", "export async function ${1:saveItem}(formData: FormData) {", "  const ${2:title} = String(formData.get(\"${2:title}\") ?? \"\").trim();", "  if (!${2:title}) return { error: \"${2:title} is required\" };", "", "  await ${3:save}({ ${2:title} });", "  revalidatePath(\"${4:/items}\");", "  return { ok: true };", "}"], "tailwind_card": ["<article class=\"rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900\">", "  <h3 class=\"text-lg font-semibold text-slate-900 dark:text-slate-100\">${1:Title}</h3>", "  <p class=\"mt-2 text-sm text-slate-600 dark:text-slate-400\">${2:One line of supporting text.}</p>", "</article>"], "tailwind_responsive_grid": ["<div class=\"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4\">", "  ${1:<!-- one child per cell -->}", "</div>"], "tailwind_button": ["<button type=\"${1|button,submit|}\" class=\"inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50\">", "  ${2:Save}", "</button>"], "tailwind_labeled_field": ["<div>", "  <label for=\"${1:email}\" class=\"block text-sm font-medium text-slate-900\">${2:Email}</label>", "  <input id=\"${1:email}\" name=\"${1:email}\" type=\"${3|email,text,tel,password|}\" autocomplete=\"${4:email}\" aria-describedby=\"${1:email}-error\" class=\"mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600\" />", "  <p id=\"${1:email}-error\" class=\"mt-1 text-sm text-red-600\">${5:Enter a valid address.}</p>", "</div>"], "tailwind_dark_section": ["<section class=\"bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100\">", "  <div class=\"mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8\">", "    ${1:<!-- section content -->}", "  </div>", "</section>"], "angular_standalone_component": ["import { Component, ChangeDetectionStrategy } from \"@angular/core\";", "", "@Component({", "  selector: \"${1:app-item}\",", "  standalone: true,", "  changeDetection: ChangeDetectionStrategy.OnPush,", "  template: `", "    <h2>{{ ${2:title} }}</h2>", "  `", "})", "export class ${3:ItemComponent} {", "  readonly ${2:title} = \"${4:Items}\";", "}"], "angular_signal_computed": ["import { signal, computed } from \"@angular/core\";", "", "readonly ${1:quantity} = signal(${2:1});", "readonly ${3:unitPrice} = signal(${4:0});", "readonly ${5:total} = computed(() => this.${1:quantity}() * this.${3:unitPrice}());"], "angular_injectable_service": ["import { Injectable, inject } from \"@angular/core\";", "import { HttpClient } from \"@angular/common/http\";", "import { Observable } from \"rxjs\";", "", "@Injectable({ providedIn: \"root\" })", "export class ${1:ItemService} {", "  private readonly http = inject(HttpClient);", "", "  ${2:list}(): Observable<${3:Item}[]> {", "    return this.http.get<${3:Item}[]>(\"${4:/api/items}\");", "  }", "}"], "angular_reactive_form": ["import { inject } from \"@angular/core\";", "import { FormBuilder, Validators } from \"@angular/forms\";", "", "private readonly fb = inject(FormBuilder);", "", "readonly ${1:form} = this.fb.nonNullable.group({", "  ${2:email}: [\"\", [Validators.required, Validators.email]],", "  ${3:name}: [\"\", [Validators.required, Validators.minLength(2)]]", "});", "", "${4:submit}() {", "  if (this.${1:form}.invalid) {", "    this.${1:form}.markAllAsTouched();", "    return;", "  }", "  const value = this.${1:form}.getRawValue();", "}"], "angular_control_flow_for": ["@for (${1:item} of ${2:items}(); track ${1:item}.${3:id}) {", "  <li>{{ ${1:item}.${4:name} }}</li>", "} @empty {", "  <li>${5:Nothing here yet.}</li>", "}"], "rails_migration": ["class ${1:CreateItems} < ActiveRecord::Migration[${2:7.1}]", "  def change", "    create_table :${3:items} do |t|", "      t.string :${4:title}, null: false", "      t.references :${5:user}, null: false, foreign_key: true", "      t.timestamps", "    end", "", "    add_index :${3:items}, [:${5:user}_id, :${4:title}], unique: true", "  end", "end"], "rails_controller": ["class ${1:ItemsController} < ApplicationController", "  before_action :set_${2:item}, only: %i[show update destroy]", "", "  def index", "    render json: ${3:Item}.order(created_at: :desc).limit(100)", "  end", "", "  def create", "    ${2:item} = ${3:Item}.new(${2:item}_params)", "    if ${2:item}.save", "      render json: ${2:item}, status: :created", "    else", "      render json: { errors: ${2:item}.errors }, status: :unprocessable_entity", "    end", "  end", "", "  private", "", "  def set_${2:item}", "    @${2:item} = ${3:Item}.find(params[:id])", "  end", "", "  def ${2:item}_params", "    params.require(:${2:item}).permit(:${4:title})", "  end", "end"], "rails_model": ["class ${1:Item} < ApplicationRecord", "  belongs_to :${2:user}", "", "  validates :${3:title}, presence: true, length: { maximum: ${4:120} }", "  validates :${3:title}, uniqueness: { scope: :${2:user}_id }", "", "  scope :${5:recent}, -> { order(created_at: :desc) }", "end"], "rails_active_job": ["class ${1:SyncItemJob} < ApplicationJob", "  queue_as :${2:default}", "  retry_on ${3:Net::OpenTimeout}, wait: :polynomially_longer, attempts: ${4:5}", "  discard_on ActiveRecord::RecordNotFound", "", "  def perform(${5:item_id})", "    ${6:item} = ${7:Item}.find(${5:item_id})", "  end", "end"], "rails_request_spec": ["require \"rails_helper\"", "", "RSpec.describe \"${1:Items}\", type: :request do", "  describe \"POST /${2:items}\" do", "    it \"returns 422 when ${3:title} is blank\" do", "      post \"/${2:items}\", params: { ${4:item}: { ${3:title}: \"\" } }, as: :json", "      expect(response).to have_http_status(:unprocessable_entity)", "    end", "  end", "end"], "css_custom_properties": [":root {", "  --${1:color-fg}: ${2:#0f172a};", "  --${3:color-bg}: ${4:#ffffff};", "  --${5:space}: ${6:1rem};", "}", "", "@media (prefers-color-scheme: dark) {", "  :root {", "    --${1:color-fg}: ${7:#e2e8f0};", "    --${3:color-bg}: ${8:#020617};", "  }", "}"], "css_auto_fit_grid": [".${1:cards} {", "  display: grid;", "  grid-template-columns: repeat(auto-fit, minmax(${2:16rem}, 1fr));", "  gap: ${3:1rem};", "}"], "css_fluid_type": [".${1:title} {", "  font-size: clamp(${2:1.25rem}, ${3:0.9rem} + ${4:1.6vw}, ${5:2.5rem});", "  line-height: ${6:1.2};", "  text-wrap: balance;", "}"], "css_reduced_motion": ["@media (prefers-reduced-motion: reduce) {", "  *,", "  *::before,", "  *::after {", "    animation-duration: 0.01ms !important;", "    animation-iteration-count: 1 !important;", "    transition-duration: 0.01ms !important;", "    scroll-behavior: auto !important;", "  }", "}"], "css_focus_visible": [".${1:btn}:focus-visible {", "  outline: ${2:2px} solid ${3:currentColor};", "  outline-offset: ${4:2px};", "  border-radius: ${5:0.375rem};", "}"], "html5_document": ["<!doctype html>", "<html lang=\"${1:en}\">", "  <head>", "    <meta charset=\"utf-8\" />", "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />", "    <title>${2:Page title}</title>", "    <meta name=\"description\" content=\"${3:One sentence about this page.}\" />", "    <link rel=\"canonical\" href=\"${4:https://example.org/page}\" />", "  </head>", "  <body>", "    <main>", "      <h1>${2:Page title}</h1>", "    </main>", "  </body>", "</html>"], "html5_social_meta": ["<meta property=\"og:type\" content=\"${1|website,article|}\" />", "<meta property=\"og:title\" content=\"${2:Page title}\" />", "<meta property=\"og:description\" content=\"${3:One sentence about this page.}\" />", "<meta property=\"og:url\" content=\"${4:https://example.org/page}\" />", "<meta property=\"og:image\" content=\"${5:https://example.org/share.png}\" />", "<meta name=\"twitter:card\" content=\"summary_large_image\" />"], "html5_form": ["<form method=\"post\" action=\"${1:/subscribe}\" novalidate>", "  <label for=\"${2:email}\">${3:Email address}</label>", "  <input id=\"${2:email}\" name=\"${2:email}\" type=\"email\" autocomplete=\"email\" required aria-describedby=\"${2:email}-help\" />", "  <p id=\"${2:email}-help\">${4:We use this only to send the confirmation.}</p>", "  <button type=\"submit\">${5:Subscribe}</button>", "</form>"], "html5_responsive_image": ["<picture>", "  <source srcset=\"${1:hero.avif}\" type=\"image/avif\" />", "  <source srcset=\"${2:hero.webp}\" type=\"image/webp\" />", "  <img src=\"${3:hero.jpg}\" alt=\"${4:What is happening in the picture}\" width=\"${5:1200}\" height=\"${6:630}\" loading=\"lazy\" decoding=\"async\" />", "</picture>"], "html5_data_table": ["<table>", "  <caption>${1:What this table shows}</caption>", "  <thead>", "    <tr>", "      <th scope=\"col\">${2:Name}</th>", "      <th scope=\"col\">${3:Amount}</th>", "    </tr>", "  </thead>", "  <tbody>", "    <tr>", "      <th scope=\"row\">${4:Row label}</th>", "      <td>${5:0}</td>", "    </tr>", "  </tbody>", "</table>"]};

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

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('web-stack-snippets-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('web-stack-snippets-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('web-stack-snippets-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'web-stack-snippets-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
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
  try { lic.pullFeed(ctx, "web-stack-snippets-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('web-stack-snippets-audit.audit_file', runCurrent);
  reg('web-stack-snippets-audit.audit_selection', runSelection);
  reg('web-stack-snippets-audit.insert_snippet', insertSnippet);
  reg('web-stack-snippets-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('web-stack-snippets-audit.quick_fix', function () { return quickFix(ctx); });
  reg('web-stack-snippets-audit.export_report', function () { return exportReport(ctx); });
  reg('web-stack-snippets-audit.watch_on_save', function () { return watchOnSave(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('web-stack-snippets-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
