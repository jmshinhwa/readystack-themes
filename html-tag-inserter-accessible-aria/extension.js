// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking this file against the 20 built-in WCAG 2.2 rules.", "done": "Check finished. Every finding is listed in the output panel with its file name and line number.", "nothing_found": "No built-in rule matched anything in this file.", "need_key": "This is a paid command. Enter your licence key to unlock it.", "key_ok": "Licence key accepted. The paid commands are unlocked on this machine.", "key_bad": "That licence key was not accepted. Check for extra spaces at the ends and try again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "quick_fix", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('HTML Tag Inserter: Accessible ARIA + WCAG 2.2');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('html-tag-inserter-accessible-aria').get('min_severity')
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
const RULES = [{"pattern": "<img(?![^>]*\\balt=)[^>]*>", "flags": "i", "message": "Image with no alt attribute: a screen reader reads the file name instead. Write alt=\"...\" for a meaningful image, or alt=\"\" for a decorative one (WCAG 2.2, 1.1.1 Non-text Content)."}, {"pattern": "<html(?![^>]*\\blang=)[^>]*>", "flags": "i", "message": "The html element has no lang attribute, so the screen reader guesses the pronunciation of the whole page (WCAG 2.2, 3.1.1 Language of Page).", "fix": "<html lang=\"en\">"}, {"pattern": ">\\s*(click here|read more|learn more|more|here|link)\\s*</a>", "flags": "i", "message": "Link text that means nothing out of context. Screen reader users list links on their own, where this reads as one word. Name the destination instead (WCAG 2.2, 2.4.4 Link Purpose)."}, {"pattern": "target=[\"']_blank[\"'](?![^>]*rel=)", "flags": "i", "message": "A link opening in a new tab with no rel: add rel=\"noopener noreferrer\", and say in the link text that it opens in a new tab (WCAG 2.2, 3.2.5 Change on Request).", "fix": "target=\"_blank\" rel=\"noopener noreferrer\""}, {"pattern": "<iframe(?![^>]*\\btitle=)[^>]*>", "flags": "i", "message": "Frame with no title attribute: it is announced only as 'frame', with nothing to say what is inside (WCAG 2.2, 4.1.2 Name, Role, Value)."}, {"pattern": "tabindex=[\"']\\s*[1-9][0-9]*\\s*[\"']", "flags": "i", "message": "A positive tabindex pulls this element out of the reading order and breaks the tab sequence for the whole page. Use tabindex=\"0\" and fix the source order (WCAG 2.2, 2.4.3 Focus Order).", "fix": "tabindex=\"0\""}, {"pattern": "<(div|span|li|td|p)\\b[^>]*\\bonclick=", "flags": "i", "message": "A click handler on an element that cannot be reached with the keyboard. Use a button, or add role, tabindex=\"0\" and a key handler (WCAG 2.2, 2.1.1 Keyboard)."}, {"pattern": "<input(?![^>]*\\btype=[\"'](hidden|submit|button|reset|image)[\"'])(?![^>]*\\b(id|aria-label|aria-labelledby)=)[^>]*>", "flags": "i", "message": "Input with no id, aria-label or aria-labelledby: nothing can name this field, so it is announced as 'edit blank' (WCAG 2.2, 3.3.2 Labels or Instructions)."}, {"pattern": "<button(?![^>]*\\b(aria-label|aria-labelledby|title)=)[^>]*>\\s*<(svg|i)\\b", "flags": "i", "message": "Icon-only button with no accessible name. Put aria-label on the button and aria-hidden=\"true\" on the icon (WCAG 2.2, 4.1.2 Name, Role, Value)."}, {"pattern": "<(a|button|input|select|textarea|summary)\\b[^>]*\\baria-hidden=[\"']true[\"']", "flags": "i", "message": "aria-hidden=\"true\" on something the keyboard can still focus: the user lands on an element the screen reader refuses to announce (WCAG 2.2, 4.1.2 Name, Role, Value)."}, {"pattern": "<meta[^>]*viewport[^>]*(user-scalable\\s*=\\s*no|maximum-scale\\s*=\\s*1)", "flags": "i", "message": "The viewport meta tag blocks pinch zoom, which people with low vision rely on (WCAG 2.2, 1.4.4 Resize Text).", "fix": "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"}, {"pattern": "<th(?![^>]*\\b(scope|headers)=)[^>]*>", "flags": "i", "message": "Table header cell with no scope: nothing ties this header to its column or row, so cells are read without their heading (WCAG 2.2, 1.3.1 Info and Relationships)."}, {"pattern": "<video(?![^>]*\\bcontrols)[^>]*>", "flags": "i", "message": "Video with no controls attribute: it cannot be paused or stopped from the keyboard, and captions cannot be switched on (WCAG 2.2, 1.2.2 Captions and 2.2.2 Pause, Stop, Hide)."}, {"pattern": "<input(?![^>]*\\b(aria-label|aria-labelledby)=)[^>]*\\bplaceholder=", "flags": "i", "message": "Placeholder text used in place of a label: it disappears as soon as the user types, and many screen readers never announce it. Add a visible label bound with for and id (WCAG 2.2, 3.3.2 Labels or Instructions)."}, {"pattern": "<(center|font|marquee|blink|big)\\b", "flags": "i", "message": "Presentational tag with no meaning in the accessibility tree, and moving text that cannot be stopped. Use CSS and a semantic element (WCAG 2.2, 1.3.1 Info and Relationships)."}, {"pattern": "\\balt=[\"'](image|photo|picture|img|graphic|icon|logo)[\"']", "flags": "i", "message": "Alt text that repeats what the element already is. Say what the image shows, or name the company for a logo (WCAG 2.2, 1.1.1 Non-text Content)."}, {"pattern": "<(div|span)\\b[^>]*role=[\"']button[\"'](?![^>]*tabindex=)", "flags": "i", "message": "role=\"button\" on an element with no tabindex: it is announced as a button but the keyboard can never reach it. Use a real button element (WCAG 2.2, 2.1.1 Keyboard)."}, {"pattern": "<a\\b(?![^>]*\\bhref=)[^>]*>", "flags": "i", "message": "Anchor with no href is not a link and is not focusable. Use a button for an action, or give the link a real destination (WCAG 2.2, 4.1.2 Name, Role, Value)."}, {"pattern": "<(div|span)\\b(?![^>]*\\brole=)[^>]*\\baria-label=", "flags": "i", "message": "aria-label on a plain div or span: elements with no role take no accessible name, so this label is dropped. Move it to an interactive element or add a role (WCAG 2.2, 4.1.2 Name, Role, Value)."}, {"pattern": "<i\\b[^>]*\\bclass=[\"'][^\"']*\\b(fa|fas|far|fab|bi|icon)\\b[^\"']*[\"'](?![^>]*aria-hidden)", "flags": "i", "message": "Icon font with no aria-hidden=\"true\": some screen readers read the glyph as a stray character in the middle of your sentence (WCAG 2.2, 1.1.1 Non-text Content)."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('html-tag-inserter-accessible-aria');
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

const SNIPPETS = {"page_skeleton": ["<!doctype html>", "<html lang=\"${1:en}\">", "<head>", "  <meta charset=\"utf-8\">", "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">", "  <title>${2:Page title} - ${3:Site name}</title>", "</head>", "<body>", "  <a class=\"skip-link\" href=\"#main\">Skip to main content</a>", "  <header>", "    <nav aria-label=\"Primary\">", "      <ul>", "        <li><a href=\"${4:/}\" aria-current=\"page\">${5:Home}</a></li>", "      </ul>", "    </nav>", "  </header>", "  <main id=\"main\" tabindex=\"-1\">", "    <h1>${6:Page heading}</h1>", "  </main>", "  <footer>", "    <p>${7:Company name, postal address, contact email}</p>", "  </footer>", "</body>", "</html>"], "skip_link": ["<a class=\"skip-link\" href=\"#${1:main}\">Skip to main content</a>", "<!-- The target needs an id and tabindex=\"-1\", for example <main id=\"main\" tabindex=\"-1\"> -->"], "header_banner": ["<header>", "  <a href=\"/\">", "    <img src=\"${1:/images/logo.svg}\" alt=\"${2:Company name} home\" width=\"${3:160}\" height=\"${4:40}\">", "  </a>", "</header>"], "nav_main": ["<nav aria-label=\"${1:Primary}\">", "  <ul>", "    <li><a href=\"${2:/}\" aria-current=\"page\">${3:Home}</a></li>", "    <li><a href=\"${4:/pricing}\">${5:Pricing}</a></li>", "    <li><a href=\"${6:/contact}\">${7:Contact}</a></li>", "  </ul>", "</nav>"], "breadcrumb": ["<nav aria-label=\"Breadcrumb\">", "  <ol>", "    <li><a href=\"/\">${1:Home}</a></li>", "    <li><a href=\"${2:/guides}\">${3:Guides}</a></li>", "    <li><a href=\"${4:/guides/forms}\" aria-current=\"page\">${5:Accessible forms}</a></li>", "  </ol>", "</nav>"], "main_landmark": ["<main id=\"main\" tabindex=\"-1\">", "  <h1>${1:Page heading}</h1>", "  <p>${2:First paragraph of the page.}</p>", "</main>"], "section_labelled": ["<section aria-labelledby=\"${1:pricing}-heading\">", "  <h2 id=\"${1:pricing}-heading\">${2:Pricing}</h2>", "  <p>${3:What this section covers.}</p>", "</section>"], "aside_related": ["<aside aria-labelledby=\"${1:related}-heading\">", "  <h2 id=\"${1:related}-heading\">${2:Related articles}</h2>", "  <ul>", "    <li><a href=\"${3:/articles/contrast}\">${4:Contrast ratios explained}</a></li>", "  </ul>", "</aside>"], "footer_info": ["<footer>", "  <h2 class=\"visually-hidden\">${1:Site information}</h2>", "  <p>${2:Company name, postal address}</p>", "  <p><a href=\"${3:/accessibility}\">${4:Accessibility statement}</a></p>", "</footer>"], "search_landmark": ["<form role=\"search\" action=\"${1:/search}\" method=\"get\">", "  <label for=\"site-search\">${2:Search this site}</label>", "  <input type=\"search\" id=\"site-search\" name=\"q\">", "  <button type=\"submit\">${3:Search}</button>", "</form>"], "input_label": ["<div class=\"field\">", "  <label for=\"${1:company}\">${2:Company name}</label>", "  <input type=\"text\" id=\"${1:company}\" name=\"${1:company}\" aria-describedby=\"${1:company}-hint\">", "  <p id=\"${1:company}-hint\">${3:As it appears on your invoice.}</p>", "</div>"], "input_error": ["<div class=\"field\">", "  <label for=\"${1:email}\">${2:Email address}</label>", "  <input type=\"email\" id=\"${1:email}\" name=\"${1:email}\" aria-invalid=\"true\" aria-describedby=\"${1:email}-error\">", "  <p id=\"${1:email}-error\" role=\"alert\">${3:Enter an email address that includes an @ sign.}</p>", "</div>"], "required_field": ["<div class=\"field\">", "  <label for=\"${1:vat}\">${2:VAT number} <span aria-hidden=\"true\">*</span> <span class=\"visually-hidden\">(required)</span></label>", "  <input type=\"text\" id=\"${1:vat}\" name=\"${1:vat}\" required aria-required=\"true\">", "</div>"], "radio_group": ["<fieldset>", "  <legend>${1:How should we contact you?}</legend>", "  <div>", "    <input type=\"radio\" id=\"contact-email\" name=\"contact\" value=\"email\" checked>", "    <label for=\"contact-email\">${2:Email}</label>", "  </div>", "  <div>", "    <input type=\"radio\" id=\"contact-phone\" name=\"contact\" value=\"phone\">", "    <label for=\"contact-phone\">${3:Phone}</label>", "  </div>", "</fieldset>"], "checkbox_group": ["<fieldset>", "  <legend>${1:Which report formats do you need?}</legend>", "  <div>", "    <input type=\"checkbox\" id=\"report-csv\" name=\"report\" value=\"csv\">", "    <label for=\"report-csv\">${2:CSV}</label>", "  </div>", "  <div>", "    <input type=\"checkbox\" id=\"report-html\" name=\"report\" value=\"html\">", "    <label for=\"report-html\">${3:HTML}</label>", "  </div>", "</fieldset>"], "select_labelled": ["<div class=\"field\">", "  <label for=\"${1:country}\">${2:Country}</label>", "  <select id=\"${1:country}\" name=\"${1:country}\" autocomplete=\"country\">", "    <option value=\"\">${3:Choose a country}</option>", "    <option value=\"${4:de}\">${5:Germany}</option>", "  </select>", "</div>"], "textarea_hint": ["<div class=\"field\">", "  <label for=\"${1:message}\">${2:Your message}</label>", "  <textarea id=\"${1:message}\" name=\"${1:message}\" rows=\"6\" aria-describedby=\"${1:message}-hint\"></textarea>", "  <p id=\"${1:message}-hint\">${3:Tell us the page address where the problem happens.}</p>", "</div>"], "autocomplete_contact": ["<div class=\"field\"><label for=\"name\">${1:Full name}</label><input type=\"text\" id=\"name\" name=\"name\" autocomplete=\"name\"></div>", "<div class=\"field\"><label for=\"email\">${2:Email address}</label><input type=\"email\" id=\"email\" name=\"email\" autocomplete=\"email\"></div>", "<div class=\"field\"><label for=\"tel\">${3:Telephone}</label><input type=\"tel\" id=\"tel\" name=\"tel\" autocomplete=\"tel\"></div>", "<div class=\"field\"><label for=\"postal-code\">${4:Postcode}</label><input type=\"text\" id=\"postal-code\" name=\"postal-code\" autocomplete=\"postal-code\"></div>"], "error_summary": ["<div role=\"alert\" tabindex=\"-1\" id=\"error-summary\">", "  <h2>${1:There is a problem}</h2>", "  <ul>", "    <li><a href=\"#${2:email}\">${3:Enter an email address that includes an @ sign}</a></li>", "  </ul>", "</div>"], "toggle_button": ["<button type=\"button\" aria-pressed=\"false\">${1:Mute notifications}</button>", "<!-- Set aria-pressed to \"true\" while the button is on -->"], "disclosure": ["<button type=\"button\" aria-expanded=\"false\" aria-controls=\"${1:delivery-details}\">${2:Show delivery details}</button>", "<div id=\"${1:delivery-details}\" hidden>", "  <p>${3:Delivery takes two working days.}</p>", "</div>"], "accordion": ["<h3>", "  <button type=\"button\" id=\"${1:panel-1}-button\" aria-expanded=\"false\" aria-controls=\"${1:panel-1}\">${2:Do you keep my data?}</button>", "</h3>", "<div id=\"${1:panel-1}\" role=\"region\" aria-labelledby=\"${1:panel-1}-button\" hidden>", "  <p>${3:No. The check runs on your own machine.}</p>", "</div>"], "dialog_modal": ["<dialog id=\"${1:confirm}\" aria-labelledby=\"${1:confirm}-title\">", "  <h2 id=\"${1:confirm}-title\">${2:Delete this report?}</h2>", "  <p>${3:This cannot be undone.}</p>", "  <form method=\"dialog\">", "    <button value=\"cancel\">${4:Cancel}</button>", "    <button value=\"confirm\">${5:Delete}</button>", "  </form>", "</dialog>"], "tabs": ["<div class=\"tabs\">", "  <div role=\"tablist\" aria-label=\"${1:Report formats}\">", "    <button type=\"button\" role=\"tab\" id=\"tab-csv\" aria-selected=\"true\" aria-controls=\"panel-csv\">${2:CSV}</button>", "    <button type=\"button\" role=\"tab\" id=\"tab-json\" aria-selected=\"false\" aria-controls=\"panel-json\" tabindex=\"-1\">${3:JSON}</button>", "  </div>", "  <div role=\"tabpanel\" id=\"panel-csv\" aria-labelledby=\"tab-csv\" tabindex=\"0\">", "    <p>${4:One row per finding.}</p>", "  </div>", "  <div role=\"tabpanel\" id=\"panel-json\" aria-labelledby=\"tab-json\" tabindex=\"0\" hidden>", "    <p>${5:One object per finding.}</p>", "  </div>", "</div>"], "menu_button": ["<button type=\"button\" id=\"${1:account}-button\" aria-expanded=\"false\" aria-haspopup=\"true\" aria-controls=\"${1:account}-menu\">${2:Account}</button>", "<ul id=\"${1:account}-menu\" aria-labelledby=\"${1:account}-button\" hidden>", "  <li><a href=\"${3:/settings}\">${4:Settings}</a></li>", "  <li><a href=\"${5:/sign-out}\">${6:Sign out}</a></li>", "</ul>"], "live_alert": ["<div role=\"alert\">${1:Your changes could not be saved.}</div>", "<!-- role=\"alert\" interrupts the screen reader. Use it for errors only. -->"], "live_status": ["<div role=\"status\" aria-live=\"polite\">${1:Your settings were saved.}</div>"], "img_meaningful": ["<img src=\"${1:/images/team.jpg}\" alt=\"${2:Two engineers reviewing a report on a laptop}\" width=\"${3:800}\" height=\"${4:600}\" loading=\"lazy\">"], "img_decorative": ["<img src=\"${1:/images/divider.svg}\" alt=\"\" role=\"presentation\" width=\"${2:1200}\" height=\"${3:8}\">"], "figure_caption": ["<figure>", "  <img src=\"${1:/images/chart.png}\" alt=\"${2:Bar chart: findings per file, highest in checkout.html}\" width=\"${3:800}\" height=\"${4:450}\">", "  <figcaption>${5:Findings per file after the first workspace audit.}</figcaption>", "</figure>"], "video_captions": ["<video controls preload=\"metadata\" width=\"${1:800}\" height=\"${2:450}\">", "  <source src=\"${3:/media/demo.mp4}\" type=\"video/mp4\">", "  <track kind=\"captions\" src=\"${4:/media/demo-en.vtt}\" srclang=\"en\" label=\"English\" default>", "  <track kind=\"descriptions\" src=\"${5:/media/demo-descriptions.vtt}\" srclang=\"en\" label=\"English descriptions\">", "  <p><a href=\"${6:/media/demo-transcript.html}\">${7:Read the transcript}</a></p>", "</video>"], "table_data": ["<table>", "  <caption>${1:Findings by file}</caption>", "  <thead>", "    <tr>", "      <th scope=\"col\">${2:File}</th>", "      <th scope=\"col\">${3:Findings}</th>", "    </tr>", "  </thead>", "  <tbody>", "    <tr>", "      <th scope=\"row\">${4:checkout.html}</th>", "      <td>${5:7}</td>", "    </tr>", "  </tbody>", "</table>"], "iframe_title": ["<iframe src=\"${1:/embed/pricing}\" title=\"${2:Pricing table}\" width=\"${3:800}\" height=\"${4:450}\" loading=\"lazy\"></iframe>"], "svg_icon_button": ["<button type=\"button\" aria-label=\"${1:Close}\">", "  <svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\">", "    <path d=\"M2 2 L14 14 M14 2 L2 14\" stroke=\"currentColor\" stroke-width=\"2\" fill=\"none\"></path>", "  </svg>", "</button>"], "link_new_tab": ["<a href=\"${1:/reports/accessibility-statement.pdf}\" target=\"_blank\" rel=\"noopener noreferrer\">${2:Accessibility statement} <span class=\"visually-hidden\">(opens in a new tab)</span></a>"], "visually_hidden_css": ["<style>", ".visually-hidden {", "  position: absolute;", "  width: 1px;", "  height: 1px;", "  margin: -1px;", "  padding: 0;", "  overflow: hidden;", "  clip: rect(0 0 0 0);", "  clip-path: inset(50%);", "  white-space: nowrap;", "  border: 0;", "}", ".skip-link {", "  position: absolute;", "  left: -9999px;", "}", ".skip-link:focus {", "  left: 0;", "  top: 0;", "  padding: 0.5rem 1rem;", "  background: #ffffff;", "  color: #000000;", "}", "</style>"]};

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
  const _c = vscode.workspace.getConfiguration('html-tag-inserter-accessible-aria');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('html-tag-inserter-accessible-aria').get('reportFormat')
    || vscode.workspace.getConfiguration('html-tag-inserter-accessible-aria').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'html-tag-inserter-accessible-aria-report.' + pick.toLowerCase());
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
  try { lic.pullFeed(ctx, "html-tag-inserter-accessible-aria").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('html-tag-inserter-accessible-aria.audit_file', runCurrent);
  reg('html-tag-inserter-accessible-aria.insert_snippet', insertSnippet);
  reg('html-tag-inserter-accessible-aria.list_rules', listRules);
  reg('html-tag-inserter-accessible-aria.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('html-tag-inserter-accessible-aria.export_report', function () { return exportReport(ctx); });
  reg('html-tag-inserter-accessible-aria.quick_fix', function () { return quickFix(ctx); });
  reg('html-tag-inserter-accessible-aria.watch_on_save', function () { return watchOnSave(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('html-tag-inserter-accessible-aria').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
