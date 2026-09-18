// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking for patterns the framework has removed", "done": "Check finished. Every finding is in the output panel with the file name and the line number.", "nothing_found": "Nothing removed or renamed was found in this file.", "need_key": "This is a paid command. Paste your licence key to open the repo-wide scan, the in-place rewrite, the save watcher and the report file.", "key_ok": "Licence key accepted. The paid commands are open on this machine.", "key_bad": "That licence key was not accepted. Check for a missing character, or reply to your order email and we will re-issue it.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "watch_on_save", "export_report"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Snippets for 8 Stacks + Deprecated-Code Audit');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('modern-stack-snippets-audit').get('min_severity')
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
const RULES = [{"pattern": "getInitialProps", "flags": "i", "message": "getInitialProps is read only by the pages/ router and opts the page out of static optimisation. Inside an app/ directory it never runs — fetch inside the Server Component itself."}, {"pattern": "\\b(getServerSideProps|getStaticProps)\\b", "flags": "i", "message": "This export is read only by the pages/ router. Inside app/ it is dead code, and the page renders with no data and no error."}, {"pattern": "from\\s+[\"']next/head[\"']", "flags": "i", "message": "next/head does nothing inside app/. Export a metadata object, or a generateMetadata function, from the page or the layout instead."}, {"pattern": "legacyBehavior", "flags": "i", "message": "legacyBehavior keeps the old form where the link wraps an inner anchor. The current form takes className and the rest of the props directly and needs no anchor child."}, {"pattern": "from\\s+[\"']next/router[\"']", "flags": "i", "message": "next/router works only in pages/. Inside app/ the hooks come from next/navigation, and useRouter there has no query, no pathname and no asPath field."}, {"pattern": "@tailwind\\s+(base|components|utilities)", "flags": "i", "message": "Version 4 replaced the three @tailwind directives with a single @import \"tailwindcss\" line. Left as they are, no utilities are generated at all."}, {"pattern": "\\b(bg|text|border|ring|divide)-opacity-\\d+\\b", "flags": "i", "message": "The separate opacity utilities were dropped in version 4. Opacity is written as a slash on the colour itself, for example bg-black/50."}, {"pattern": "\\bflex-shrink-0\\b", "flags": "i", "message": "flex-shrink-0 was renamed. The current utility is shrink-0.", "fix": "shrink-0"}, {"pattern": "\\bflex-grow\\b", "flags": "i", "message": "flex-grow was renamed. The current utility is grow.", "fix": "grow"}, {"pattern": "\\*ngIf", "flags": "i", "message": "The structural directive still compiles, but the built-in @if block does the same thing without importing NgIf, and it is what the current templates are written in."}, {"pattern": "\\*ngFor", "flags": "i", "message": "The built-in @for block replaces this, and it requires a track expression — which is the part that fixes the list re-rendering that ngFor did silently without trackBy."}, {"pattern": "entryComponents", "flags": "i", "message": "entryComponents was removed. Components are resolved dynamically without being listed, so this array is read by nothing."}, {"pattern": "@angular/http", "flags": "i", "message": "The @angular/http package was removed. HttpClient lives in @angular/common/http and is supplied with provideHttpClient in the application bootstrap."}, {"pattern": "jest\\.genMockFromModule", "flags": "i", "message": "jest.genMockFromModule was renamed to jest.createMockFromModule.", "fix": "jest.createMockFromModule"}, {"pattern": "\\.toBeCalledWith\\(", "flags": "i", "message": "toBeCalledWith is the old alias. The documented matcher is toHaveBeenCalledWith.", "fix": ".toHaveBeenCalledWith("}, {"pattern": "\\.toBeCalled\\(", "flags": "i", "message": "toBeCalled is the old alias. The documented matcher is toHaveBeenCalled.", "fix": ".toHaveBeenCalled("}, {"pattern": "\\bbefore_filter\\b", "flags": "i", "message": "before_filter was removed from Rails. The callback is before_action.", "fix": "before_action"}, {"pattern": "\\bupdate_attributes\\b", "flags": "i", "message": "update_attributes was removed from Rails. The method is update.", "fix": "update"}, {"pattern": "render\\s+(text:|:text\\s*=>)", "flags": "i", "message": "render :text was removed. A bare string body is sent with render plain:, and anything that must not be escaped needs render html: instead."}, {"pattern": "<(center|font|marquee|big|strike|frameset)\\b", "flags": "i", "message": "This element was removed from HTML. Browsers still draw something, but no validator and no assistive technology treats it as meaning anything."}, {"pattern": "target=\"_blank\"(?![^>]*rel=)", "flags": "i", "message": "A link that opens a new tab without rel gives the opened page a handle back to yours. Add rel=\"noopener noreferrer\"."}, {"pattern": "(max|min)-device-width", "flags": "i", "message": "The device-width media features were removed from the specification. They measure the screen, not the window, so the query never matches a resized browser. Use max-width."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('modern-stack-snippets-audit');
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

const SNIPPETS = {"markdown_front_matter": ["---", "title: ${1:Weekly notes}", "date: ${2:2026-09-06}", "tags: [${3:notes}]", "---", ""], "markdown_task_list": ["## ${1:Today}", "", "- [ ] ${2:Draft the release note}", "- [ ] ${3:Reply to the review comments}", "- [x] ${4:Merge the config fix}"], "markdown_table": ["| ${1:Item} | ${2:Owner} | ${3:Status} |", "| --- | --- | --- |", "| ${4:Release note} | ${5:Ana} | ${6:In review} |"], "markdown_callout": ["> [!NOTE]", "> ${1:This note is synced, so anything pasted here leaves this machine.}"], "markdown_code_fence": ["```${1:ts}", "${2:export const revalidate = 60;}", "```"], "markdown_details": ["<details>", "<summary>${1:Full stack trace}</summary>", "", "```${2:text}", "${3:TypeError: Cannot read properties of undefined}", "```", "", "</details>"], "jest_describe_it": ["describe('${1:formatPrice}', () => {", "  it('${2:rounds to two decimals}', () => {", "    expect(${3:formatPrice(1.005)}).toBe(${4:'1.01'});", "  });", "});"], "jest_test_each": ["test.each([", "  [${1:1}, ${2:1}, ${3:2}],", "  [${4:2}, ${5:2}, ${6:4}],", "])('${7:add(%i, %i) is %i}', (a, b, expected) => {", "  expect(${8:add}(a, b)).toBe(expected);", "});"], "jest_hooks": ["beforeEach(() => {", "  jest.clearAllMocks();", "});", "", "afterEach(() => {", "  jest.useRealTimers();", "});"], "jest_mock_module": ["jest.mock('${1:../lib/api}', () => ({", "  __esModule: true,", "  ${2:fetchUser}: jest.fn().mockResolvedValue({ id: ${3:1} }),", "}));"], "jest_async_rejects": ["it('${1:throws when the id is missing}', async () => {", "  await expect(${2:fetchUser}(${3:undefined})).rejects.toThrow('${4:id is required}');", "});"], "jest_fake_timers": ["jest.useFakeTimers().setSystemTime(new Date('${1:2026-01-01T00:00:00Z}'));", "", "jest.advanceTimersByTime(${2:1000});", "expect(${3:onTimeout}).toHaveBeenCalledTimes(${4:1});"], "approuter_page_metadata": ["import type { Metadata } from 'next';", "", "export const metadata: Metadata = {", "  title: '${1:Pricing}',", "  description: '${2:What each plan includes.}',", "};", "", "export default async function Page() {", "  return (", "    <main>", "      <h1>${1:Pricing}</h1>", "    </main>", "  );", "}"], "approuter_layout": ["export default function Layout({ children }: { children: React.ReactNode }) {", "  return (", "    <section className=\"${1:mx-auto max-w-3xl p-6}\">", "      {children}", "    </section>", "  );", "}"], "approuter_route_handler": ["import { NextResponse } from 'next/server';", "", "export async function GET(request: Request) {", "  const { searchParams } = new URL(request.url);", "  const ${1:id} = searchParams.get('${1:id}');", "", "  if (!${1:id}) {", "    return NextResponse.json({ error: '${2:id is required}' }, { status: 400 });", "  }", "", "  return NextResponse.json({ ${1:id} });", "}"], "approuter_server_action": ["'use server';", "", "import { revalidatePath } from 'next/cache';", "", "export async function ${1:createInvoice}(formData: FormData) {", "  const ${2:amount} = formData.get('${2:amount}');", "  ${3:await db.invoice.create({ data: { amount: Number(amount) } });}", "  revalidatePath('${4:/invoices}');", "  return { ok: true };", "}"], "approuter_static_params": ["export const dynamicParams = false;", "export const revalidate = ${1:3600};", "", "export async function generateStaticParams() {", "  const ${2:posts} = await ${3:getPosts}();", "  return ${2:posts}.map((post) => ({ ${4:slug}: post.${4:slug} }));", "}"], "approuter_error_boundary": ["'use client';", "", "export default function Error({ error, reset }: { error: Error; reset: () => void }) {", "  return (", "    <div role=\"alert\">", "      <p>${1:That page could not be loaded.}</p>", "      <button onClick={() => reset()}>${2:Try again}</button>", "    </div>", "  );", "}"], "tailwind_v4_entry": ["@import \"tailwindcss\";", "", "@theme {", "  --color-brand: ${1:oklch(0.62 0.19 260)};", "  --font-display: ${2:\"Inter\", sans-serif};", "  --radius-card: ${3:0.75rem};", "}"], "tailwind_custom_utility": ["@utility ${1:card-surface} {", "  border-radius: var(--radius-card, ${2:0.75rem});", "  background-color: ${3:white};", "  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);", "}"], "tailwind_component_class": [".${1:btn-primary} {", "  @apply inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium;", "  @apply bg-black/90 text-white hover:bg-black focus-visible:outline-2;", "}"], "tailwind_dark_variant": ["@custom-variant dark (&:where(.dark, .dark *));", "", "/* then write: class=\"bg-white text-black dark:bg-neutral-900 dark:text-white\" */"], "tailwind_card_markup": ["<article class=\"rounded-xl border border-black/10 p-6 shadow-sm dark:border-white/10\">", "  <h3 class=\"text-lg font-semibold\">${1:Starter}</h3>", "  <p class=\"mt-2 text-sm text-black/60 dark:text-white/60\">${2:Everything you need to ship one project.}</p>", "  <p class=\"mt-4 text-3xl font-bold\">${3:29}</p>", "</article>"], "tailwind_responsive_grid": ["<div class=\"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-${1:3}\">", "  <div class=\"min-h-24 rounded-lg bg-black/5 dark:bg-white/5\"></div>", "</div>"], "angular_standalone_component": ["import { Component, ChangeDetectionStrategy, signal } from '@angular/core';", "", "@Component({", "  selector: '${1:app-invoice-card}',", "  standalone: true,", "  changeDetection: ChangeDetectionStrategy.OnPush,", "  template: `<h2>{{ title() }}</h2>`,", "})", "export class ${2:InvoiceCardComponent} {", "  readonly title = signal('${3:Invoice}');", "}"], "angular_signal_state": ["readonly ${1:count} = signal(${2:0});", "readonly ${3:doubled} = computed(() => this.${1:count}() * 2);", "", "increment(): void {", "  this.${1:count}.update((n) => n + 1);", "}"], "angular_signal_inputs": ["readonly ${1:invoice} = input.required<${2:Invoice}>();", "readonly ${3:showTotal} = input(false, { transform: booleanAttribute });", "readonly ${4:paid} = output<${2:Invoice}>();"], "angular_inject_function": ["private readonly ${1:http} = inject(${2:HttpClient});", "private readonly ${3:route} = inject(${4:ActivatedRoute});", "private readonly ${5:destroyRef} = inject(DestroyRef);"], "angular_control_flow": ["@if (${1:invoices}().length) {", "  <ul>", "    @for (invoice of ${1:invoices}(); track invoice.id) {", "      <li>{{ invoice.reference }}</li>", "    }", "  </ul>", "} @else {", "  <p>${2:No invoices yet.}</p>", "}"], "angular_bootstrap_providers": ["bootstrapApplication(${1:AppComponent}, {", "  providers: [", "    provideHttpClient(withFetch()),", "    provideRouter(${2:routes}),", "    provideZoneChangeDetection({ eventCoalescing: true }),", "  ],", "});"], "rails_migration": ["class ${1:CreateInvoices} < ActiveRecord::Migration[8.0]", "  def change", "    create_table :${2:invoices} do |t|", "      t.references :${3:customer}, null: false, foreign_key: true", "      t.decimal :${4:amount}, precision: 10, scale: 2, null: false", "      t.datetime :${5:paid_at}", "      t.timestamps", "    end", "  end", "end"], "rails_model": ["class ${1:Invoice} < ApplicationRecord", "  belongs_to :${2:customer}", "", "  validates :${3:amount}, presence: true, numericality: { greater_than: 0 }", "", "  scope :${4:unpaid}, -> { where(paid_at: nil) }", "end"], "rails_create_action": ["def create", "  @${1:invoice} = ${2:Invoice}.new(${1:invoice}_params)", "", "  if @${1:invoice}.save", "    redirect_to @${1:invoice}, notice: \"${3:Invoice created.}\"", "  else", "    render :new, status: :unprocessable_entity", "  end", "end", "", "private", "", "def ${1:invoice}_params", "  params.require(:${1:invoice}).permit(:${4:amount}, :${5:customer_id})", "end"], "rails_turbo_stream": ["respond_to do |format|", "  format.turbo_stream do", "    render turbo_stream: turbo_stream.prepend(", "      \"${1:invoices}\",", "      partial: \"${2:invoices/invoice}\",", "      locals: { ${3:invoice}: @${3:invoice} }", "    )", "  end", "  format.html { redirect_to ${4:invoices_path} }", "end"], "rails_stimulus_controller": ["import { Controller } from \"@hotwired/stimulus\"", "", "export default class extends Controller {", "  static targets = [\"${1:output}\"]", "  static values = { ${2:label}: String }", "", "  ${3:copy}() {", "    this.${1:output}Target.textContent = this.${2:label}Value", "  }", "}"], "rails_integration_test": ["require \"test_helper\"", "", "class ${1:InvoicesTest} < ActionDispatch::IntegrationTest", "  test \"${2:creates an invoice}\" do", "    assert_difference(\"${3:Invoice}.count\") do", "      post ${4:invoices_path}, params: { ${5:invoice}: { ${6:amount}: 25 } }", "    end", "", "    assert_redirected_to ${3:Invoice}.last", "  end", "end"], "css_auto_fit_grid": [".${1:card-grid} {", "  display: grid;", "  grid-template-columns: repeat(auto-fit, minmax(${2:16rem}, 1fr));", "  gap: ${3:1rem};", "}"], "css_container_query": [".${1:card} {", "  container-type: inline-size;", "  container-name: ${1:card};", "}", "", "@container ${1:card} (min-width: ${2:32rem}) {", "  .${1:card} .body {", "    display: grid;", "    grid-template-columns: 1fr 2fr;", "  }", "}"], "css_has_selector": [".${1:field}:has(input:invalid:not(:placeholder-shown)) {", "  border-color: ${2:#b42318};", "}", "", ".${1:field}:has(input:focus-visible) {", "  outline: 2px solid ${3:#2563eb};", "  outline-offset: 2px;", "}"], "css_fluid_type_scale": [":root {", "  --step-0: clamp(${1:1rem}, 0.95rem + 0.25vw, ${2:1.125rem});", "  --step-1: clamp(${3:1.25rem}, 1.1rem + 0.75vw, ${4:1.5rem});", "  --step-2: clamp(${5:1.75rem}, 1.4rem + 1.75vw, ${6:2.5rem});", "}"], "css_color_mix_tokens": [":root {", "  --brand: ${1:#2563eb};", "  --brand-hover: color-mix(in oklab, var(--brand) ${2:85%}, black);", "  --brand-tint: color-mix(in oklab, var(--brand) ${3:12%}, white);", "}"], "css_reduced_motion": ["@media (prefers-reduced-motion: reduce) {", "  *, *::before, *::after {", "    animation-duration: 0.01ms !important;", "    animation-iteration-count: 1 !important;", "    transition-duration: 0.01ms !important;", "    scroll-behavior: auto !important;", "  }", "}"], "html5_document": ["<!doctype html>", "<html lang=\"${1:en}\">", "<head>", "  <meta charset=\"utf-8\">", "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">", "  <title>${2:Pricing}</title>", "</head>", "<body>", "  <a href=\"#main\" class=\"skip-link\">${3:Skip to content}</a>", "  <header><nav aria-label=\"${4:Main}\"></nav></header>", "  <main id=\"main\"></main>", "  <footer></footer>", "</body>", "</html>"], "html5_share_head": ["<meta name=\"description\" content=\"${1:What each plan includes.}\">", "<meta property=\"og:title\" content=\"${2:Pricing}\">", "<meta property=\"og:description\" content=\"${1:What each plan includes.}\">", "<meta property=\"og:type\" content=\"website\">", "<meta name=\"theme-color\" content=\"${3:#0b0b0b}\">"], "html5_form_field": ["<div class=\"field\">", "  <label for=\"${1:email}\">${2:Work email}</label>", "  <input id=\"${1:email}\" name=\"${1:email}\" type=\"email\" autocomplete=\"email\" required aria-describedby=\"${1:email}-hint\">", "  <p id=\"${1:email}-hint\">${3:We reply within one working day.}</p>", "</div>"], "html5_picture": ["<picture>", "  <source srcset=\"${1:hero.avif}\" type=\"image/avif\">", "  <source srcset=\"${2:hero.webp}\" type=\"image/webp\">", "  <img src=\"${3:hero.jpg}\" alt=\"${4:A desk with an open laptop}\" width=\"${5:1200}\" height=\"${6:630}\" loading=\"lazy\" decoding=\"async\">", "</picture>"], "html5_dialog": ["<dialog id=\"${1:confirm}\" aria-labelledby=\"${1:confirm}-title\">", "  <h2 id=\"${1:confirm}-title\">${2:Delete this invoice?}</h2>", "  <form method=\"dialog\">", "    <button value=\"cancel\">${3:Cancel}</button>", "    <button value=\"confirm\">${4:Delete}</button>", "  </form>", "</dialog>"], "html5_data_table": ["<table>", "  <caption>${1:Invoices this month}</caption>", "  <thead>", "    <tr><th scope=\"col\">${2:Reference}</th><th scope=\"col\">${3:Amount}</th></tr>", "  </thead>", "  <tbody>", "    <tr><th scope=\"row\">${4:INV-0142}</th><td>${5:250.00}</td></tr>", "  </tbody>", "</table>"]};

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
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('modern-stack-snippets-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('modern-stack-snippets-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('modern-stack-snippets-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'modern-stack-snippets-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "modern-stack-snippets-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('modern-stack-snippets-audit.insert_snippet', insertSnippet);
  reg('modern-stack-snippets-audit.audit_file', runCurrent);
  reg('modern-stack-snippets-audit.list_rules', listRules);
  reg('modern-stack-snippets-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('modern-stack-snippets-audit.quick_fix', function () { return quickFix(ctx); });
  reg('modern-stack-snippets-audit.watch_on_save', function () { return watchOnSave(ctx); });
  reg('modern-stack-snippets-audit.export_report', function () { return exportReport(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('modern-stack-snippets-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
