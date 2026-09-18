// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking the class attributes against 16 BEM naming rules.", "done": "Check finished. The findings are listed in the output panel with file name and line number.", "nothing_found": "No naming problems found. Every class in this file follows the 16 BEM rules.", "need_key": "This is one of the paid commands. Enter your licence key to unlock it.", "key_ok": "Licence key accepted. The workspace check, the findings file and the in-place correction are unlocked.", "key_bad": "That licence key was not accepted. Check for a missing character and enter it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('BEM Class Auditor for HTML and SCSS');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('bem-class-extractor-html').get('min_severity')
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
const RULES = [{"pattern": "class=\"[^\"]*\\b[a-z][a-z0-9]*[A-Z]", "flags": "m", "message": "camelCase class name. BEM names are lower kebab-case: cardTitle becomes card-title."}, {"pattern": "class=\"[^\"]*\\b[a-z0-9-]+_(?!_)[a-z0-9-]+", "flags": "m", "message": "The element separator is exactly two underscores: card_title becomes card__title."}, {"pattern": "\\b[a-z0-9-]+__[a-z0-9-]+__[a-z0-9-]+", "flags": "m", "message": "BEM has no element of an element. card__body__title becomes card__body-title, or a block of its own."}, {"pattern": "\\b[a-z0-9-]+--[a-z0-9-]+__", "flags": "m", "message": "The modifier comes last. card--wide__title becomes card__title with card__title--wide."}, {"pattern": "class=\"\\s*[a-z0-9-]+--[a-z0-9-]+\\s*\"", "flags": "m", "message": "A modifier stands alone here. It must ride next to its base class: class=\"card card--wide\"."}, {"pattern": "CLASS=", "flags": "m", "message": "Attribute name in capitals. The extractor reads a lower-case class= attribute.", "fix": "class="}, {"pattern": "class=\"\\s+", "flags": "m", "message": "Space directly after the opening quote. It becomes an empty selector in the extracted stylesheet.", "fix": "class=\""}, {"pattern": "\\bjs_", "flags": "m", "message": "Scripting hook written with an underscore. Use a hyphen: js_toggle becomes js-toggle.", "fix": "js-"}, {"pattern": "class=\"[^\"]*\\b([a-z0-9_-]{3,})\\b[^\"]*\\b\\1\\b", "flags": "m", "message": "The same class appears twice in one attribute, so the extracted stylesheet would carry the rule twice."}, {"pattern": "class=\"[^\"]*\\b(?:red|blue|green|big|small|left|right|center|bold)\\b", "flags": "i", "message": "Presentational class name. Name the role, not the paint: card__title--red becomes card__title--alert."}, {"pattern": "class=\"[^\"]*\\b(?:test|tmp|temp|foo|bar|div1|box1|new|old|copy)\\b", "flags": "i", "message": "Placeholder class name still in the markup. It will land in the stylesheet as a real selector."}, {"pattern": "class=\"[^\"]*(?:\\{\\{|\\{%|<\\?|\\$\\{)", "flags": "m", "message": "Class name built by a template expression. The extractor cannot resolve it; write the static block part as a class of its own."}, {"pattern": "class=\"[^\"]*(?:\\s+[^\\s\"]+){7}\\s*\"", "flags": "m", "message": "Eight or more classes on one element. The block interface is being replaced by loose utilities."}, {"pattern": "\\b[a-z0-9]+(?:-[a-z0-9]+){4,}(?:__|--|\\s|\")", "flags": "m", "message": "Five or more words in one BEM name. Split the block; the name is carrying the whole page path."}, {"pattern": "<[a-z][a-z0-9-]*[^>]*\\sstyle=\"", "flags": "i", "message": "Inline style on this element. That declaration never reaches the extracted stylesheet, so the block ends up styled in two places."}, {"pattern": "class='[^']*'", "flags": "m", "message": "Class attribute in single quotes. The extractor reads double-quoted attributes."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('bem-class-extractor-html');
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

const SNIPPETS = {"bem_card_html": ["<article class=\"${1:card}\">", "  <img class=\"${1:card}__media\" src=\"${2:/img/cover.jpg}\" alt=\"${3:Product cover}\">", "  <h3 class=\"${1:card}__title\">${4:Wireless keyboard}</h3>", "  <p class=\"${1:card}__text\">${5:Low-profile keys, 80 hours per charge.}</p>", "  <a class=\"${1:card}__action\" href=\"${6:/products/keyboard}\">${7:See details}</a>", "</article>"], "bem_card_scss": [".${1:card} {", "  display: flex;", "  flex-direction: column;", "  gap: 0.75rem;", "", "  &__media { display: block; width: 100%; }", "  &__title { margin: 0; font-size: 1.125rem; }", "  &__text { margin: 0; }", "  &__action { margin-top: auto; }", "", "  &--compact { gap: 0.25rem; }", "}"], "bem_nav_html": ["<nav class=\"${1:nav}\" aria-label=\"${2:Main}\">", "  <ul class=\"${1:nav}__list\">", "    <li class=\"${1:nav}__item\">", "      <a class=\"${1:nav}__link ${1:nav}__link--current\" href=\"${3:/}\" aria-current=\"page\">${4:Home}</a>", "    </li>", "    <li class=\"${1:nav}__item\">", "      <a class=\"${1:nav}__link\" href=\"${5:/pricing}\">${6:Pricing}</a>", "    </li>", "  </ul>", "</nav>"], "bem_nav_scss": [".${1:nav} {", "  &__list { display: flex; gap: 1rem; margin: 0; padding: 0; list-style: none; }", "  &__item { display: flex; }", "  &__link { padding: 0.5rem 0; text-decoration: none; }", "  &__link--current { border-bottom: 2px solid currentColor; }", "}"], "bem_modal_html": ["<div class=\"${1:modal} ${1:modal}--open\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"${2:modal-title}\">", "  <div class=\"${1:modal}__backdrop\"></div>", "  <div class=\"${1:modal}__panel\">", "    <h2 class=\"${1:modal}__title\" id=\"${2:modal-title}\">${3:Delete this project?}</h2>", "    <p class=\"${1:modal}__text\">${4:This cannot be undone.}</p>", "    <div class=\"${1:modal}__actions\">", "      <button class=\"${1:modal}__button ${1:modal}__button--ghost\" type=\"button\">${5:Cancel}</button>", "      <button class=\"${1:modal}__button ${1:modal}__button--danger\" type=\"button\">${6:Delete}</button>", "    </div>", "  </div>", "</div>"], "bem_modal_scss": [".${1:modal} {", "  position: fixed;", "  inset: 0;", "  display: none;", "", "  &--open { display: grid; place-items: center; }", "  &__backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.5); }", "  &__panel { position: relative; max-width: 32rem; padding: 1.5rem; background: #ffffff; }", "  &__title { margin: 0 0 0.5rem; }", "  &__actions { display: flex; gap: 0.5rem; justify-content: flex-end; }", "  &__button--ghost { background: transparent; border: 1px solid #d9d9d9; }", "  &__button--danger { background: #b3261e; color: #ffffff; border: 0; }", "}"], "bem_form_html": ["<form class=\"${1:signup-form}\" method=\"post\" action=\"${2:/subscribe}\" novalidate>", "  <div class=\"${1:signup-form}__field\">", "    <label class=\"${1:signup-form}__label\" for=\"${3:email}\">${4:Work email}</label>", "    <input class=\"${1:signup-form}__input\" id=\"${3:email}\" name=\"${3:email}\" type=\"email\" required>", "    <p class=\"${1:signup-form}__hint\">${5:We reply within one working day.}</p>", "  </div>", "  <button class=\"${1:signup-form}__submit\" type=\"submit\">${6:Send}</button>", "</form>"], "bem_form_scss": [".${1:signup-form} {", "  display: grid;", "  gap: 1rem;", "  max-width: 28rem;", "", "  &__field { display: grid; gap: 0.25rem; }", "  &__label { font-weight: 600; }", "  &__input { padding: 0.5rem 0.75rem; border: 1px solid #767676; }", "  &__input--invalid { border-color: #b3261e; }", "  &__hint { margin: 0; font-size: 0.875rem; }", "  &__submit { justify-self: start; padding: 0.625rem 1.25rem; }", "}"], "bem_table_html": ["<table class=\"${1:data-table}\">", "  <caption class=\"${1:data-table}__caption\">${2:Invoices, March 2026}</caption>", "  <thead class=\"${1:data-table}__head\">", "    <tr class=\"${1:data-table}__row\">", "      <th class=\"${1:data-table}__cell ${1:data-table}__cell--head\" scope=\"col\">${3:Invoice}</th>", "      <th class=\"${1:data-table}__cell ${1:data-table}__cell--head\" scope=\"col\">${4:Amount}</th>", "    </tr>", "  </thead>", "  <tbody class=\"${1:data-table}__body\">", "    <tr class=\"${1:data-table}__row\">", "      <td class=\"${1:data-table}__cell\">${5:2026-0184}</td>", "      <td class=\"${1:data-table}__cell ${1:data-table}__cell--numeric\">${6:1,240.00}</td>", "    </tr>", "  </tbody>", "</table>"], "bem_table_scss": [".${1:data-table} {", "  width: 100%;", "  border-collapse: collapse;", "", "  &__caption { padding-bottom: 0.5rem; text-align: start; }", "  &__cell { padding: 0.5rem 0.75rem; border-bottom: 1px solid #d9d9d9; }", "  &__cell--head { font-weight: 600; }", "  &__cell--numeric { text-align: end; font-variant-numeric: tabular-nums; }", "  &__row:hover &__cell { background: #f5f5f5; }", "}"], "bem_tabs_html": ["<div class=\"${1:tabs}\">", "  <div class=\"${1:tabs}__list\" role=\"tablist\">", "    <button class=\"${1:tabs}__tab ${1:tabs}__tab--active\" role=\"tab\" aria-selected=\"true\" id=\"${2:tab-overview}\" aria-controls=\"${3:panel-overview}\">${4:Overview}</button>", "    <button class=\"${1:tabs}__tab\" role=\"tab\" aria-selected=\"false\" id=\"${5:tab-billing}\" aria-controls=\"${6:panel-billing}\">${7:Billing}</button>", "  </div>", "  <section class=\"${1:tabs}__panel\" role=\"tabpanel\" id=\"${3:panel-overview}\" aria-labelledby=\"${2:tab-overview}\">${8:Usage for this month.}</section>", "</div>"], "bem_tabs_scss": [".${1:tabs} {", "  &__list { display: flex; gap: 0.25rem; border-bottom: 1px solid #d9d9d9; }", "  &__tab { padding: 0.5rem 1rem; background: none; border: 0; cursor: pointer; }", "  &__tab--active { border-bottom: 2px solid currentColor; font-weight: 600; }", "  &__panel { padding: 1rem 0; }", "  &__panel[hidden] { display: none; }", "}"], "bem_accordion_html": ["<div class=\"${1:accordion}\">", "  <details class=\"${1:accordion}__item\" open>", "    <summary class=\"${1:accordion}__header\">${2:How do I cancel?}</summary>", "    <div class=\"${1:accordion}__body\">${3:Write to us and the seat stops at the end of the month.}</div>", "  </details>", "  <details class=\"${1:accordion}__item\">", "    <summary class=\"${1:accordion}__header\">${4:Do you store my files?}</summary>", "    <div class=\"${1:accordion}__body\">${5:Nothing leaves your machine.}</div>", "  </details>", "</div>"], "bem_accordion_scss": [".${1:accordion} {", "  border: 1px solid #d9d9d9;", "", "  &__item + &__item { border-top: 1px solid #d9d9d9; }", "  &__header { padding: 0.75rem 1rem; font-weight: 600; cursor: pointer; }", "  &__body { padding: 0 1rem 1rem; }", "  &__item[open] &__header { background: #f5f5f5; }", "}"], "bem_alert_html": ["<div class=\"${1:alert} ${1:alert}--warning\" role=\"status\">", "  <span class=\"${1:alert}__icon\" aria-hidden=\"true\">!</span>", "  <p class=\"${1:alert}__text\">${2:Your card expires before the next invoice.}</p>", "  <button class=\"${1:alert}__close\" type=\"button\" aria-label=\"${3:Dismiss}\">&times;</button>", "</div>"], "bem_alert_scss": [".${1:alert} {", "  display: flex;", "  align-items: start;", "  gap: 0.5rem;", "  padding: 0.75rem 1rem;", "  border-inline-start: 4px solid currentColor;", "", "  &--warning { background: #fff4e5; color: #8a5300; }", "  &--danger { background: #fdecea; color: #b3261e; }", "  &--success { background: #e8f5e9; color: #1b5e20; }", "  &__text { margin: 0; }", "  &__close { margin-inline-start: auto; background: none; border: 0; cursor: pointer; }", "}"], "bem_breadcrumb_html": ["<nav class=\"${1:breadcrumb}\" aria-label=\"${2:Breadcrumb}\">", "  <ol class=\"${1:breadcrumb}__list\">", "    <li class=\"${1:breadcrumb}__item\"><a class=\"${1:breadcrumb}__link\" href=\"${3:/}\">${4:Home}</a></li>", "    <li class=\"${1:breadcrumb}__item\"><a class=\"${1:breadcrumb}__link\" href=\"${5:/docs}\">${6:Docs}</a></li>", "    <li class=\"${1:breadcrumb}__item ${1:breadcrumb}__item--current\" aria-current=\"page\">${7:Naming rules}</li>", "  </ol>", "</nav>"], "bem_breadcrumb_scss": [".${1:breadcrumb} {", "  &__list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0; padding: 0; list-style: none; }", "  &__item + &__item::before { content: \"/\"; margin-inline-end: 0.5rem; }", "  &__link { text-decoration: none; }", "  &__item--current { font-weight: 600; }", "}"], "bem_pagination_html": ["<nav class=\"${1:pagination}\" aria-label=\"${2:Pagination}\">", "  <a class=\"${1:pagination}__link ${1:pagination}__link--previous\" href=\"${3:?page=2}\">${4:Previous}</a>", "  <a class=\"${1:pagination}__link ${1:pagination}__link--current\" href=\"${5:?page=3}\" aria-current=\"page\">3</a>", "  <a class=\"${1:pagination}__link\" href=\"${6:?page=4}\">4</a>", "  <a class=\"${1:pagination}__link ${1:pagination}__link--next\" href=\"${7:?page=4}\">${8:Next}</a>", "</nav>"], "bem_pagination_scss": [".${1:pagination} {", "  display: flex;", "  align-items: center;", "  gap: 0.25rem;", "", "  &__link { padding: 0.375rem 0.625rem; border: 1px solid #d9d9d9; text-decoration: none; }", "  &__link--current { border-color: currentColor; font-weight: 600; }", "  &__link--disabled { pointer-events: none; opacity: 0.5; }", "}"], "bem_hero_html": ["<section class=\"${1:hero} ${1:hero}--split\">", "  <div class=\"${1:hero}__content\">", "    <h1 class=\"${1:hero}__title\">${2:Your class names, checked before the review}</h1>", "    <p class=\"${1:hero}__subtitle\">${3:One keystroke turns this markup into a stylesheet shell.}</p>", "    <a class=\"${1:hero}__action\" href=\"${4:/download}\">${5:Download}</a>", "  </div>", "  <img class=\"${1:hero}__media\" src=\"${6:/img/screenshot.png}\" alt=\"${7:The output panel listing findings}\">", "</section>"], "bem_hero_scss": [".${1:hero} {", "  display: grid;", "  gap: 1.5rem;", "  padding: 3rem 1.5rem;", "", "  &--split { grid-template-columns: 1fr 1fr; align-items: center; }", "  &__title { margin: 0; font-size: clamp(1.75rem, 4vw, 3rem); }", "  &__subtitle { margin: 0; max-width: 40ch; }", "  &__action { justify-self: start; padding: 0.75rem 1.5rem; }", "  &__media { width: 100%; height: auto; }", "}"]};

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
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('bem-class-extractor-html');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('bem-class-extractor-html').get('reportFormat')
    || vscode.workspace.getConfiguration('bem-class-extractor-html').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'bem-class-extractor-html-report.' + pick.toLowerCase());
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
  try { lic.pullFeed(ctx, "bem-class-extractor-html").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('bem-class-extractor-html.audit_file', runCurrent);
  reg('bem-class-extractor-html.audit_selection', runSelection);
  reg('bem-class-extractor-html.insert_snippet', insertSnippet);
  reg('bem-class-extractor-html.list_rules', listRules);
  reg('bem-class-extractor-html.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('bem-class-extractor-html.export_report', function () { return exportReport(ctx); });
  reg('bem-class-extractor-html.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('bem-class-extractor-html').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
