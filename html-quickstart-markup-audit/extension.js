// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking the markup against 30 rules.", "done": "Check finished. Every finding is listed with its file name and line number in the output panel.", "nothing_found": "Nothing here matched any of the 30 markup and accessibility rules.", "need_key": "This is a paid command. Paste your licence key to unlock the workspace check, the findings export and the quick fix.", "key_ok": "Licence key accepted. The workspace check, the findings export and the quick fix are unlocked on this machine.", "key_bad": "That licence key was not accepted. Check for a missing character, or reply to your purchase receipt and we will send it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('HTML Quickstart & Markup Audit — 8 Packs');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('html-quickstart-markup-audit').get('min_severity')
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
const RULES = [{"pattern": "<img\\b(?![^>]*\\balt\\s*=)[^>]*>", "flags": "i", "message": "This <img> has no alt attribute. WCAG 2.2 success criterion 1.1.1 requires a text alternative; write alt=\"\" only when the image carries no information."}, {"pattern": "<html\\b(?![^>]*\\blang\\s*=)[^>]*>", "flags": "i", "message": "<html> has no lang attribute, so a screen reader picks the wrong pronunciation. WCAG 2.2 success criterion 3.1.1.", "fix": "<html lang=\"en\">"}, {"pattern": "<img\\b(?![^>]*\\bwidth\\s*=)[^>]*>", "flags": "i", "message": "This <img> has no width and height, so the page reflows while it loads. Google's published Core Web Vitals threshold for CLS is 0.1."}, {"pattern": "<a\\b[^>]*target\\s*=\\s*[\"']?_blank[\"']?(?![^>]*\\brel\\s*=)[^>]*>", "flags": "i", "message": "target=\"_blank\" without rel gives the opened page a handle back to yours. Add rel=\"noopener noreferrer\"."}, {"pattern": "<button\\b(?![^>]*\\btype\\s*=)[^>]*>", "flags": "i", "message": "A <button> with no type defaults to submit, so inside a form this button posts the form when it was meant to do something else."}, {"pattern": "\\son(?:click|change|load|error|submit|mouseover|keydown)\\s*=\\s*[\"']", "flags": "i", "message": "An inline event handler sits in the markup. It cannot be removed, it breaks a strict Content-Security-Policy, and it is invisible to the component that owns this element."}, {"pattern": "tabindex\\s*=\\s*[\"']?[1-9]", "flags": "i", "message": "A positive tabindex pulls this element ahead of everything else in the tab order, so keyboard focus jumps around the page."}, {"pattern": "<iframe\\b(?![^>]*\\btitle\\s*=)[^>]*>", "flags": "i", "message": "This <iframe> has no title, so a screen reader announces it as an unnamed frame. WCAG 2.2 success criterion 4.1.2."}, {"pattern": "<(?:center|font|marquee|blink|big|strike|tt)\\b", "flags": "i", "message": "This element was removed from the HTML standard. Browsers still render it, but validators and reviewers flag it."}, {"pattern": "<th\\b(?![^>]*\\bscope\\s*=)[^>]*>", "flags": "i", "message": "This <th> has no scope, so a screen reader cannot tell which cells the header belongs to. WCAG 2.2 success criterion 1.3.1."}, {"pattern": "<input\\b(?![^>]*\\btype\\s*=\\s*[\"']?(?:hidden|submit|button|reset))(?![^>]*\\b(?:id|aria-label|aria-labelledby)\\s*=)[^>]*>", "flags": "i", "message": "This <input> has no id to attach a label to and no aria-label, so it is announced with no name. WCAG 2.2 success criterion 4.1.2."}, {"pattern": "<picture\\b(?:(?!<img)[\\s\\S])*?</picture>", "flags": "i", "message": "This <picture> has no <img> inside it. The <img> is the element that actually renders; without it nothing is shown and there is no alt text."}, {"pattern": "<img\\b[^>]*\\bsrcset\\s*=(?![^>]*\\bsizes\\s*=)[^>]*>", "flags": "i", "message": "srcset is set but sizes is not, so the browser assumes the image is the full viewport width and downloads a larger file than it needs."}, {"pattern": "<video\\b[^>]*\\bautoplay\\b(?![^>]*\\bmuted\\b)[^>]*>", "flags": "i", "message": "An autoplaying video that is not muted is blocked by every current browser, so this video silently never starts."}, {"pattern": "<script\\b(?![^>]*\\b(?:defer|async|type\\s*=\\s*[\"']module)\\b)[^>]*\\bsrc\\s*=[^>]*>", "flags": "i", "message": "This external script blocks parsing until it has downloaded and run. Add defer, or make it type=\"module\"."}, {"pattern": "<meta\\b[^>]*viewport[^>]*user-scalable\\s*=\\s*[\"']?no", "flags": "i", "message": "user-scalable=no stops the page being zoomed. WCAG 2.2 success criterion 1.4.4 requires text to be resizable.", "fix": "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"}, {"pattern": "<meta\\b[^>]*charset\\s*=\\s*[\"']?(?!utf-8)(?!UTF-8)[A-Za-z0-9-]+", "flags": "", "message": "The declared character set is not UTF-8, so every accented character and every emoji in this page is at risk of rendering as mojibake.", "fix": "<meta charset=\"utf-8\">"}, {"pattern": "</\\s*(?:br|img|input|hr|meta|link|source|track|wbr|area|col|embed|param)\\s*>", "flags": "i", "message": "This is a closing tag for a void element, which has no closing tag. The parser drops it, and an XML parser rejects the document."}, {"pattern": "</[A-Za-z][A-Za-z0-9-]*\\s+[^>]*>", "flags": "", "message": "This closing tag carries attributes. A closing tag takes none, so the element is malformed and the tree closes in the wrong place."}, {"pattern": "<h[1-6][^>]*>\\s*</h[1-6]>", "flags": "i", "message": "This heading is empty. It still appears in the document outline and in the screen reader heading list as a blank entry."}, {"pattern": "<a\\b[^>]*>\\s*(?:click here|here|read more|more|link)\\s*</a>", "flags": "i", "message": "Link text that reads only \"click here\" or \"read more\" says nothing when the links are listed out of context. WCAG 2.2 success criterion 2.4.4."}, {"pattern": "<div\\b[^>]*\\brole\\s*=\\s*[\"']button[\"'](?![^>]*\\btabindex\\s*=)[^>]*>", "flags": "i", "message": "A div with role=\"button\" and no tabindex cannot be reached by keyboard. WCAG 2.2 success criterion 2.1.1. A real <button> avoids all of this."}, {"pattern": "href\\s*=\\s*[\"']javascript:", "flags": "i", "message": "A javascript: URL runs on middle-click and on \"open in new tab\" in ways you did not plan, and a strict Content-Security-Policy blocks it outright."}, {"pattern": "<!DOCTYPE\\s+HTML\\s+PUBLIC", "flags": "i", "message": "This is a legacy doctype. It puts some browsers into a compatibility mode where the box model differs from every modern layout you write.", "fix": "<!DOCTYPE html>"}, {"pattern": "<meta\\b[^>]*http-equiv\\s*=\\s*[\"']X-UA-Compatible[\"'][^>]*>", "flags": "i", "message": "This tag only ever affected Internet Explorer. It is dead weight in the head of the document.", "fix": "<!-- X-UA-Compatible removed: it only affected Internet Explorer -->"}, {"pattern": "<link\\b[^>]*rel\\s*=\\s*[\"']shortcut icon[\"'][^>]*>", "flags": "i", "message": "rel=\"shortcut icon\" is a legacy spelling. rel=\"icon\" is the standard one and every browser honours it.", "fix": "<link rel=\"icon\" href=\"/favicon.ico\" sizes=\"any\">"}, {"pattern": "@(?:click|input|change|submit|keydown)\\s*=\\s*[\"'][^$]", "flags": "", "message": "In a lit-html template an event binding must be written @click=${this.handler}. A quoted string is copied through as a literal attribute and the handler never fires."}, {"pattern": "unsafeHTML\\s*\\(", "flags": "", "message": "unsafeHTML bypasses the escaping lit-html does for you. Anything interpolated here that came from a user is injected into the page as markup."}, {"pattern": "<[^>]*\\*ngIf[^>]*\\*ngFor[^>]*>", "flags": "", "message": "Two structural directives on one element: Angular throws at template compile time. Wrap one of them in an <ng-container>, or use the built-in @if and @for blocks."}, {"pattern": "\\[\\(ngModel\\)\\]\\s*=\\s*[\"'][^\"']+[\"'](?![^>]*\\b(?:name|ngModelOptions)\\s*=)", "flags": "", "message": "[(ngModel)] inside a form needs a name attribute, or Angular throws at runtime. Add name, or set [ngModelOptions]=\"{standalone: true}\"."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('html-quickstart-markup-audit');
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

const SNIPPETS = {"html5_quickstart_page": ["<!DOCTYPE html>", "<html lang=\"${1:en}\">", "<head>", "\t<meta charset=\"utf-8\">", "\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">", "\t<title>${2:Page title}</title>", "\t<meta name=\"description\" content=\"${3:One sentence a search result can show.}\">", "\t<link rel=\"icon\" href=\"/favicon.ico\" sizes=\"any\">", "\t<link rel=\"stylesheet\" href=\"${4:/styles.css}\">", "</head>", "<body>", "\t<a class=\"skip-link\" href=\"#main\">Skip to content</a>", "\t<header><!-- site header --></header>", "\t<main id=\"main\">", "\t\t<h1>${5:Heading}</h1>", "\t</main>", "\t<footer><!-- site footer --></footer>", "</body>", "</html>"], "html5_quickstart_landing": ["<main id=\"main\">", "\t<section class=\"hero\" aria-labelledby=\"hero-title\">", "\t\t<h1 id=\"hero-title\">${1:What this does, in one line}</h1>", "\t\t<p>${2:Who it is for and what changes for them.}</p>", "\t\t<a class=\"button\" href=\"#${3:pricing}\">${4:See the price}</a>", "\t</section>", "", "\t<section aria-labelledby=\"features-title\">", "\t\t<h2 id=\"features-title\">${5:What you get}</h2>", "\t\t<ul>", "\t\t\t<li>${6:First thing}</li>", "\t\t\t<li>${7:Second thing}</li>", "\t\t</ul>", "\t</section>", "", "\t<section id=\"${3:pricing}\" aria-labelledby=\"pricing-title\">", "\t\t<h2 id=\"pricing-title\">${8:Price}</h2>", "\t</section>", "</main>"], "html5_quickstart_article": ["<article>", "\t<header>", "\t\t<h1>${1:Article title}</h1>", "\t\t<p>By <a rel=\"author\" href=\"${2:/about}\">${3:Author name}</a> on", "\t\t\t<time datetime=\"${4:2026-09-06}\">${5:6 September 2026}</time>", "\t\t</p>", "\t</header>", "", "\t<p>${6:First paragraph.}</p>", "", "\t<footer>", "\t\t<nav aria-label=\"Article\">", "\t\t\t<a href=\"${7:/previous}\">Previous article</a>", "\t\t</nav>", "\t</footer>", "</article>"], "html5_quickstart_form_page": ["<form action=\"${1:/subscribe}\" method=\"post\" novalidate>", "\t<fieldset>", "\t\t<legend>${2:Your details}</legend>", "", "\t\t<label for=\"name\">Name</label>", "\t\t<input id=\"name\" name=\"name\" type=\"text\" autocomplete=\"name\" required>", "", "\t\t<label for=\"email\">Email</label>", "\t\t<input id=\"email\" name=\"email\" type=\"email\" autocomplete=\"email\" required aria-describedby=\"email-hint\">", "\t\t<p id=\"email-hint\">${3:We reply to this address only.}</p>", "\t</fieldset>", "", "\t<button type=\"submit\">${4:Send}</button>", "</form>"], "html5_quickstart_dashboard": ["<div class=\"layout\">", "\t<header class=\"layout__header\">", "\t\t<h1>${1:Dashboard}</h1>", "\t</header>", "", "\t<nav class=\"layout__nav\" aria-label=\"Sections\">", "\t\t<ul>", "\t\t\t<li><a href=\"#overview\" aria-current=\"page\">${2:Overview}</a></li>", "\t\t\t<li><a href=\"#reports\">${3:Reports}</a></li>", "\t\t</ul>", "\t</nav>", "", "\t<main class=\"layout__main\" id=\"main\">", "\t\t<section id=\"overview\" aria-labelledby=\"overview-title\">", "\t\t\t<h2 id=\"overview-title\">${2:Overview}</h2>", "\t\t</section>", "\t</main>", "", "\t<aside class=\"layout__aside\" aria-label=\"${4:Activity}\"></aside>", "</div>"], "tag_nav_landmark": ["<nav aria-label=\"${1:Main}\">", "\t<ul>", "\t\t<li><a href=\"${2:/}\" aria-current=\"page\">${3:Home}</a></li>", "\t\t<li><a href=\"${4:/pricing}\">${5:Pricing}</a></li>", "\t\t<li><a href=\"${6:/contact}\">${7:Contact}</a></li>", "\t</ul>", "</nav>"], "tag_dialog_modal": ["<dialog id=\"${1:confirm}\" aria-labelledby=\"${1:confirm}-title\">", "\t<form method=\"dialog\">", "\t\t<h2 id=\"${1:confirm}-title\">${2:Delete this item?}</h2>", "\t\t<p>${3:This cannot be undone.}</p>", "\t\t<button type=\"submit\" value=\"cancel\">${4:Cancel}</button>", "\t\t<button type=\"submit\" value=\"confirm\">${5:Delete}</button>", "\t</form>", "</dialog>"], "tag_details_accordion": ["<details name=\"${1:faq}\">", "\t<summary>${2:Question}</summary>", "\t<p>${3:Answer.}</p>", "</details>", "<details name=\"${1:faq}\">", "\t<summary>${4:Second question}</summary>", "\t<p>${5:Answer.}</p>", "</details>"], "tag_table_accessible": ["<table>", "\t<caption>${1:What this table shows}</caption>", "\t<thead>", "\t\t<tr>", "\t\t\t<th scope=\"col\">${2:Item}</th>", "\t\t\t<th scope=\"col\">${3:Amount}</th>", "\t\t</tr>", "\t</thead>", "\t<tbody>", "\t\t<tr>", "\t\t\t<th scope=\"row\">${4:First row}</th>", "\t\t\t<td>${5:0}</td>", "\t\t</tr>", "\t</tbody>", "</table>"], "tag_figure_caption": ["<figure>", "\t<img src=\"${1:/images/chart.png}\" alt=\"${2:What the chart shows, in one sentence}\" width=\"${3:960}\" height=\"${4:540}\">", "\t<figcaption>${5:Source and date}</figcaption>", "</figure>"], "bem_block_html": ["<article class=\"${1:card}\">", "\t<h3 class=\"${1:card}__title\">${2:Title}</h3>", "\t<p class=\"${1:card}__body\">${3:Body text.}</p>", "\t<a class=\"${1:card}__link ${1:card}__link--primary\" href=\"${4:/details}\">${5:Read the details}</a>", "</article>"], "bem_block_css": [".${1:card} {", "\tdisplay: grid;", "\tgap: 0.5rem;", "}", "", ".${1:card}__title {", "\tfont-size: 1.125rem;", "}", "", ".${1:card}__body {", "\tcolor: var(--color-text-muted);", "}", "", ".${1:card}__link--primary {", "\tfont-weight: 600;", "}"], "css_custom_props": [":root {", "\t--color-text: #14181f;", "\t--color-text-muted: #566072;", "\t--color-surface: #ffffff;", "\t--color-accent: #1d4ed8;", "\t--space-1: 0.25rem;", "\t--space-2: 0.5rem;", "\t--space-4: 1rem;", "\t--radius: 0.5rem;", "}", "", "@media (prefers-color-scheme: dark) {", "\t:root {", "\t\t--color-text: #f2f4f8;", "\t\t--color-surface: #10141b;", "\t}", "}"], "css_component_layer": ["@layer reset, base, components, utilities;", "", "@layer components {", "\t.${1:button} {", "\t\tbackground: var(--color-accent);", "\t\tcolor: var(--color-surface);", "\t\tpadding: var(--space-2) var(--space-4);", "\t\tborder-radius: var(--radius);", "\t}", "}"], "picture_art_direction": ["<picture>", "\t<source media=\"(min-width: 60rem)\" srcset=\"${1:/images/hero-wide.avif}\" type=\"image/avif\">", "\t<source media=\"(min-width: 60rem)\" srcset=\"${2:/images/hero-wide.jpg}\">", "\t<img src=\"${3:/images/hero-tall.jpg}\" alt=\"${4:What the picture shows}\" width=\"${5:1200}\" height=\"${6:900}\">", "</picture>"], "picture_avif_webp_fallback": ["<picture>", "\t<source srcset=\"${1:/images/photo.avif}\" type=\"image/avif\">", "\t<source srcset=\"${2:/images/photo.webp}\" type=\"image/webp\">", "\t<img src=\"${3:/images/photo.jpg}\" alt=\"${4:What the photo shows}\" width=\"${5:1600}\" height=\"${6:900}\" loading=\"lazy\" decoding=\"async\">", "</picture>"], "img_srcset_sizes": ["<img", "\tsrc=\"${1:/images/photo-800.jpg}\"", "\tsrcset=\"${1:/images/photo-800.jpg} 800w, ${2:/images/photo-1200.jpg} 1200w, ${3:/images/photo-1600.jpg} 1600w\"", "\tsizes=\"(min-width: 60rem) 50vw, 100vw\"", "\talt=\"${4:What the photo shows}\"", "\twidth=\"${5:1600}\" height=\"${6:900}\">"], "picture_lazy_dimensions": ["<img src=\"${1:/images/thumb.jpg}\" alt=\"${2:What the image shows}\" width=\"${3:400}\" height=\"${4:300}\" loading=\"lazy\" decoding=\"async\">"], "img_lcp_priority": ["<link rel=\"preload\" as=\"image\" href=\"${1:/images/hero.avif}\" type=\"image/avif\">", "<img src=\"${1:/images/hero.avif}\" alt=\"${2:What the hero image shows}\" width=\"${3:1600}\" height=\"${4:900}\" fetchpriority=\"high\" loading=\"eager\" decoding=\"sync\">"], "lit_element_component": ["import { LitElement, html, css } from 'lit';", "", "export class ${1:MyPanel} extends LitElement {", "\tstatic styles = css`", "\t\t:host { display: block; }", "\t`;", "", "\tstatic properties = { ${2:label}: { type: String } };", "", "\tconstructor() {", "\t\tsuper();", "\t\tthis.${2:label} = '';", "\t}", "", "\trender() {", "\t\treturn html`<h2>\\${this.${2:label}}</h2><slot></slot>`;", "\t}", "}", "", "customElements.define('${3:my-panel}', ${1:MyPanel});"], "lit_template_list": ["render() {", "\treturn html`", "\t\t<ul>", "\t\t\t\\${this.${1:items}.map((item) => html`<li>\\${item.${2:name}}</li>`)}", "\t\t</ul>", "\t`;", "}"], "lit_conditional_template": ["render() {", "\treturn html`\\${this.${1:loading}", "\t\t? html`<p role=\"status\">${2:Loading}</p>`", "\t\t: html`<slot></slot>`", "\t}`;", "}"], "lit_event_binding": ["render() {", "\treturn html`<button type=\"button\" @click=\\${this.${1:onSave}}>${2:Save}</button>`;", "}", "", "${1:onSave}() {", "\tthis.dispatchEvent(new CustomEvent('${3:save}', { bubbles: true, composed: true }));", "}"], "lit_property_reactive": ["static properties = {", "\t${1:count}: { type: Number },", "\t${2:open}: { type: Boolean, reflect: true },", "\t${3:rows}: { type: Array }", "};", "", "constructor() {", "\tsuper();", "\tthis.${1:count} = 0;", "\tthis.${2:open} = false;", "\tthis.${3:rows} = [];", "}"], "standalone_page_inline_css": ["<!DOCTYPE html>", "<html lang=\"${1:en}\">", "<head>", "\t<meta charset=\"utf-8\">", "\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">", "\t<title>${2:Preview}</title>", "\t<style>", "\t\tbody { font: 16px/1.5 system-ui, sans-serif; margin: 2rem auto; max-width: 44rem; }", "\t</style>", "</head>", "<body>", "\t<h1>${3:Heading}</h1>", "\t<p>${4:This file opens straight in a browser with no server and no build step.}</p>", "</body>", "</html>"], "printable_page_css": ["@media print {", "\tnav, footer, .skip-link { display: none; }", "", "\tbody { font-size: 11pt; color: #000; }", "", "\ta[href^=\"http\"]::after { content: \" (\" attr(href) \")\"; font-size: 9pt; }", "", "\th2, h3 { break-after: avoid; }", "}"], "no_build_module_page": ["<script type=\"module\">", "\timport { ${1:render} } from '${2:./app.js}';", "\t${1:render}(document.querySelector('#${3:app}'));", "</script>", "<div id=\"${3:app}\"></div>"], "og_preview_meta": ["<meta property=\"og:title\" content=\"${1:Page title}\">", "<meta property=\"og:description\" content=\"${2:One sentence for the link preview.}\">", "<meta property=\"og:type\" content=\"website\">", "<meta property=\"og:url\" content=\"${3:https://your-domain/page}\">", "<meta property=\"og:image\" content=\"${4:https://your-domain/images/preview.png}\">", "<meta name=\"twitter:card\" content=\"summary_large_image\">"], "svg_inline_accessible": ["<svg role=\"img\" aria-labelledby=\"${1:icon}-title\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">", "\t<title id=\"${1:icon}-title\">${2:What this icon means}</title>", "\t<path d=\"M5 12h14M13 6l6 6-6 6\" />", "</svg>"], "xml_sitemap_urlset": ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">", "\t<url>", "\t\t<loc>${1:https://your-domain/}</loc>", "\t\t<lastmod>${2:2026-09-06}</lastmod>", "\t\t<changefreq>weekly</changefreq>", "\t\t<priority>1.0</priority>", "\t</url>", "</urlset>"], "xml_rss_item": ["<item>", "\t<title>${1:Post title}</title>", "\t<link>${2:https://your-domain/posts/first}</link>", "\t<guid isPermaLink=\"true\">${2:https://your-domain/posts/first}</guid>", "\t<pubDate>${3:Sat, 06 Sep 2026 09:00:00 +0000}</pubDate>", "\t<description><![CDATA[${4:Summary of the post.}]]></description>", "</item>"], "ng_control_flow": ["@if (${1:user()}) {", "\t<p>{{ ${1:user()}.name }}</p>", "} @else {", "\t<p>${2:Not signed in.}</p>", "}", "", "<ul>", "\t@for (item of ${3:items()}; track item.id) {", "\t\t<li>{{ item.${4:name} }}</li>", "\t} @empty {", "\t\t<li>${5:Nothing to show yet.}</li>", "\t}", "</ul>"], "ng_reactive_form_field": ["<div class=\"field\">", "\t<label for=\"${1:email}\">${2:Email}</label>", "\t<input", "\t\tid=\"${1:email}\"", "\t\ttype=\"email\"", "\t\tformControlName=\"${1:email}\"", "\t\taria-describedby=\"${1:email}-error\">", "\t<p id=\"${1:email}-error\" role=\"alert\" *ngIf=\"${3:form}.controls.${1:email}.touched && ${3:form}.controls.${1:email}.invalid\">", "\t\t${4:Enter a valid email address.}", "\t</p>", "</div>"], "ng_async_pipe_list": ["<ul>", "\t<li *ngFor=\"let ${1:item} of ${2:items} | async; trackBy: ${3:trackById}\">", "\t\t{{ ${1:item}.${4:name} }}", "\t</li>", "</ul>"]};

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
  const _c = vscode.workspace.getConfiguration('html-quickstart-markup-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('html-quickstart-markup-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('html-quickstart-markup-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'html-quickstart-markup-audit-report.' + pick.toLowerCase());
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
  try { lic.pullFeed(ctx, "html-quickstart-markup-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('html-quickstart-markup-audit.audit_file', runCurrent);
  reg('html-quickstart-markup-audit.audit_selection', runSelection);
  reg('html-quickstart-markup-audit.insert_snippet', insertSnippet);
  reg('html-quickstart-markup-audit.list_rules', listRules);
  reg('html-quickstart-markup-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('html-quickstart-markup-audit.export_report', function () { return exportReport(ctx); });
  reg('html-quickstart-markup-audit.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('html-quickstart-markup-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
