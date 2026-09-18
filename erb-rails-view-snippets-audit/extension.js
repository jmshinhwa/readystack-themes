// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing the open ERB view", "done": "ERB audit finished. Every finding is listed in the Output panel with its file and line.", "nothing_found": "No escaping, CSRF or view-query problems found in these lines.", "need_key": "Workspace audit, quick fix and report export need a licence key. Paste the key from your purchase confirmation.", "key_ok": "Licence key accepted. Workspace audit, quick fix and report export are unlocked on this machine.", "key_bad": "That licence key was not accepted. Check for a space at the end and paste it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "export_report"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('ERB Snippets + View Audit for Rails');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('erb-rails-view-snippets-audit').get('min_severity')
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
const RULES = [{"pattern": "<%=\\s*raw\\s", "flags": "i", "message": "raw() prints the string without escaping. If any part of it came from a user, this line is a stored XSS. Wrap the value in sanitize() with an allow-list of tags.", "fix": "<%= sanitize "}, {"pattern": "\\.html_safe\\b", "flags": "i", "message": "html_safe sanitises nothing; it only marks the string as already trusted. Escape the user-supplied part first, or build the markup with tag helpers."}, {"pattern": "<%==", "flags": "i", "message": "<%== prints unescaped output, exactly like raw(). Use <%= so Rails escapes the value.", "fix": "<%="}, {"pattern": "<%=\\s*params\\[", "flags": "i", "message": "Printing params straight into the page puts request data in the markup, often inside an attribute where escaping differs. Read it into a permitted local in the controller first."}, {"pattern": "<%=\\s*(session|cookies)\\[", "flags": "i", "message": "Session and cookie values do not belong in rendered markup; anything in the HTML is readable by every script on the page."}, {"pattern": "<%=\\s*ENV\\[", "flags": "i", "message": "ENV values are configuration secrets. Rendering one leaks it into the HTML source, the browser cache and any CDN in front of the app."}, {"pattern": "Rails\\.application\\.(credentials|secrets)", "flags": "i", "message": "Credentials rendered into a view are shipped to the browser. Pass down only the single public value that the page actually needs."}, {"pattern": "render\\s+params\\[", "flags": "i", "message": "render with a user-controlled name lets the request choose which template is rendered. Map the value through a fixed allow-list of template names."}, {"pattern": "<%=\\s*debug\\(", "flags": "i", "message": "debug() dumps the whole object, including attributes never meant to be published. Remove it before this view is merged."}, {"pattern": "<%=\\s*[@\\w\\.]+\\.to_json\\s*%>", "flags": "i", "message": "Rails escapes this output, so the JSON reaches the browser as &quot; and JSON.parse throws. Put the data in a script tag of type application/json and parse it from there."}, {"pattern": "on(click|change|submit|load|error)\\s*=\\s*[\"'][^\"']*<%=", "flags": "i", "message": "An inline event handler built from ERB interpolates into JavaScript and is blocked by a strict Content-Security-Policy. Move the value to a data- attribute and read it from a Stimulus controller."}, {"pattern": "style\\s*=\\s*[\"'][^\"']*<%=", "flags": "i", "message": "Interpolating into a style attribute is not escaped for CSS and is blocked by a strict Content-Security-Policy. Use a class, or a CSS custom property set on the element."}, {"pattern": "href\\s*=\\s*[\"']javascript:", "flags": "i", "message": "A javascript: URL runs code on click and is blocked by a strict Content-Security-Policy. Use a button_to, or a button with a Stimulus action."}, {"pattern": "target:\\s*[\"']_blank[\"']", "flags": "i", "message": "target _blank without rel noopener gives the opened page a handle back to yours through window.opener. Add rel: noopener noreferrer."}, {"pattern": "<form[\\s>]", "flags": "i", "message": "A hand-written form tag carries no CSRF token, so Rails rejects the POST with InvalidAuthenticityToken. Use form_with, or add hidden_field_tag :authenticity_token, form_authenticity_token."}, {"pattern": "\\bform_for\\b", "flags": "i", "message": "form_for was soft-deprecated in Rails 5.1. form_with model: covers the same case and emits the Turbo attributes."}, {"pattern": "\\bform_tag\\b", "flags": "i", "message": "form_tag was soft-deprecated in Rails 5.1. Use form_with url: instead."}, {"pattern": "local:\\s*(true|false)", "flags": "i", "message": "local: is a Rails 6 UJS option and is ignored under Turbo, so the form still submits over Turbo Drive. Remove it, or use data: { turbo: false }."}, {"pattern": "Time\\.now\\b", "flags": "i", "message": "Time.now uses the server time zone rather than the application one, so the rendered timestamp is wrong for every user in another zone. Use Time.current.", "fix": "Time.current"}, {"pattern": "<%=\\s*@\\w+\\s*%>", "flags": "i", "message": "Printing the model itself renders the inspect form on the page. Print an attribute, or a to_s you defined on the model."}, {"pattern": "<%\\s*[@\\w]+\\.(all|where|find_by|order|includes)\\b", "flags": "i", "message": "A database query inside the view runs on every render, hides itself from the controller test and multiplies inside a loop. Load it in the controller."}, {"pattern": "t\\([\"'][^\"']*_html[\"']", "flags": "i", "message": "A translation key ending in _html is inserted unescaped by design. Every value interpolated into it has to be escaped before it is passed in."}, {"pattern": "<%-\\s", "flags": "i", "message": "<%- is legacy ERB trim syntax. Erubi, the engine Rails uses, handles whitespace with plain <% and -%>.", "fix": "<% "}, {"pattern": "(javascript_include_tag|stylesheet_link_tag)\\s+[\"']https?://", "flags": "i", "message": "A third-party asset loaded without an integrity hash means their next deploy runs in your users' browsers. Add integrity: and crossorigin:, or vendor the file."}, {"pattern": "<%=\\s*image_tag\\s+[\"'][^\"']+[\"']\\s*%>", "flags": "i", "message": "image_tag without alt: leaves a screen reader announcing the file name. Add alt: with real text, or alt: with an empty string when the image is decorative."}, {"pattern": "<%=\\s*url_for\\s*\\(?\\s*params", "flags": "i", "message": "url_for(params) rebuilds the URL out of user input, which is how an open redirect ships. Name the parameters the link actually needs."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('erb-rails-view-snippets-audit');
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

const SNIPPETS = {"erb_if": ["<% if ${1:@invoice.overdue?} %>", "  ${2:<span class=\"badge badge--warn\">Overdue</span>}", "<% end %>"], "erb_if_else": ["<% if ${1:current_user.admin?} %>", "  ${2:<%= link_to \"Edit\", edit_invoice_path(@invoice) %>}", "<% else %>", "  ${3:<p>Ask an administrator to change this invoice.</p>}", "<% end %>"], "erb_unless": ["<% unless ${1:@invoice.paid?} %>", "  ${2:<%= button_to \"Pay now\", invoice_payments_path(@invoice) %>}", "<% end %>"], "erb_each": ["<% ${1:@invoices}.each do |${2:invoice}| %>", "  <li><%= ${2:invoice}.${3:number} %></li>", "<% end %>"], "erb_render_collection": ["<%= render partial: \"${1:invoices/invoice}\", collection: ${2:@invoices}, as: :${3:invoice} %>"], "erb_case": ["<% case ${1:@invoice.state} %>", "<% when \"draft\" %>", "  ${2:<span class=\"badge\">Draft</span>}", "<% when \"sent\" %>", "  ${3:<span class=\"badge badge--info\">Sent</span>}", "<% else %>", "  ${4:<span class=\"badge badge--ok\">Paid</span>}", "<% end %>"], "erb_comment": ["<%# ${1:Rendered by InvoicesController#show} %>"], "erb_empty_state": ["<% if ${1:@invoices}.any? %>", "  <%= render partial: \"${2:invoices/invoice}\", collection: ${1:@invoices} %>", "<% else %>", "  <p class=\"empty\"><%= t(\".empty\", default: \"No invoices yet.\") %></p>", "<% end %>"], "erb_form_with": ["<%= form_with model: ${1:@invoice}, class: \"form\" do |f| %>", "  <%= render \"shared/error_summary\", record: ${1:@invoice} %>", "  ${2:<div class=\"field\">}", "  ${3:</div>}", "  <%= f.submit t(\".submit\", default: \"Save\"), data: { turbo_submits_with: \"Saving\" } %>", "<% end %>"], "erb_field_text": ["<div class=\"field\">", "  <%= f.label :${1:reference} %>", "  <%= f.text_field :${1:reference}, required: true, autocomplete: \"off\" %>", "  <% ${2:@invoice}.errors.full_messages_for(:${1:reference}).each do |message| %>", "    <span class=\"field__error\"><%= message %></span>", "  <% end %>", "</div>"], "erb_field_select": ["<div class=\"field\">", "  <%= f.label :${1:customer_id} %>", "  <%= f.collection_select :${1:customer_id}, ${2:@customers}, :id, :${3:name}, { include_blank: t(\".choose\", default: \"Choose one\") }, { required: true } %>", "</div>"], "erb_field_checkbox": ["<div class=\"field field--inline\">", "  <%= f.check_box :${1:send_copy} %>", "  <%= f.label :${1:send_copy}, t(\".send_copy\", default: \"Send me a copy\") %>", "</div>"], "erb_field_file": ["<div class=\"field\">", "  <%= f.label :${1:attachment} %>", "  <%= f.file_field :${1:attachment}, direct_upload: true, accept: \"application/pdf,image/png\" %>", "</div>"], "erb_error_summary": ["<% if ${1:record}.errors.any? %>", "  <div class=\"errors\" role=\"alert\">", "    <h2><%= t(\".error_title\", count: ${1:record}.errors.count, default: \"Please correct the fields below\") %></h2>", "    <ul>", "      <% ${1:record}.errors.full_messages.each do |message| %>", "        <li><%= message %></li>", "      <% end %>", "    </ul>", "  </div>", "<% end %>"], "erb_submit_button": ["<%= f.submit t(\".submit\", default: \"${1:Save invoice}\"), class: \"btn btn--primary\", data: { turbo_submits_with: t(\".submitting\", default: \"Saving\") } %>"], "erb_link_delete": ["<%= button_to t(\".delete\", default: \"Delete\"), ${1:invoice_path(invoice)}, method: :delete, class: \"btn btn--danger\", form: { data: { turbo_confirm: t(\".confirm\", default: \"Delete this invoice permanently?\") } } %>"], "erb_table": ["<table class=\"table\">", "  <thead>", "    <tr>", "      <th scope=\"col\"><%= ${1:Invoice}.human_attribute_name(:${2:number}) %></th>", "      <th scope=\"col\"><%= ${1:Invoice}.human_attribute_name(:${3:total}) %></th>", "    </tr>", "  </thead>", "  <tbody>", "    <% ${4:@invoices}.each do |${5:invoice}| %>", "      <tr>", "        <td><%= ${5:invoice}.${2:number} %></td>", "        <td><%= number_to_currency(${5:invoice}.${3:total}) %></td>", "      </tr>", "    <% end %>", "  </tbody>", "</table>"], "erb_render_partial": ["<%= render \"${1:invoices/summary}\", ${2:invoice}: ${3:@invoice} %>"], "erb_partial_locals_guard": ["<%# locals: (${1:invoice}:, ${2:show_actions}: false) %>"], "erb_content_for": ["<% content_for :${1:page_title} do %>", "  ${2:Invoice <%= @invoice.number %>}", "<% end %>"], "erb_yield_with_default": ["<%= content_for?(:${1:page_title}) ? yield(:${1:page_title}) : t(\"${2:app.default_title}\", default: \"${3:Billing}\") %>"], "erb_turbo_frame": ["<%= turbo_frame_tag ${1:invoice} do %>", "  ${2:<%= render \"invoices/summary\", invoice: invoice %>}", "<% end %>"], "erb_turbo_stream_from": ["<%= turbo_stream_from ${1:@invoice} %>", "<div id=\"<%= dom_id(${1:@invoice}, :state) %>\">", "  ${2:<%= @invoice.state %>}", "</div>"], "erb_turbo_stream_replace": ["<%= turbo_stream.replace dom_id(${1:@invoice}) do %>", "  <%= render \"${2:invoices/invoice}\", ${3:invoice}: ${1:@invoice} %>", "<% end %>", "<%= turbo_stream.update \"flash\" do %>", "  <%= render \"shared/flash\" %>", "<% end %>"], "erb_flash_messages": ["<div id=\"flash\">", "  <% flash.each do |type, message| %>", "    <div class=\"flash flash--<%= type %>\" role=\"status\"><%= message %></div>", "  <% end %>", "</div>"], "erb_translate": ["<%= t(\".${1:heading}\", default: \"${2:Invoices}\") %>"], "erb_localized_date": ["<%= l(${1:@invoice.due_on}, format: :${2:long}) %>"], "erb_currency": ["<%= number_to_currency(${1:@invoice.total}, unit: ${2:@invoice.currency_symbol}) %>"], "erb_pagination_links": ["<nav class=\"pager\" aria-label=\"<%= t(\".pagination\", default: \"Pagination\") %>\">", "  <% if ${1:@page} > 1 %>", "    <%= link_to t(\".previous\", default: \"Previous\"), url_for(page: ${1:@page} - 1), rel: \"prev\" %>", "  <% end %>", "  <% if ${2:@has_next} %>", "    <%= link_to t(\".next\", default: \"Next\"), url_for(page: ${1:@page} + 1), rel: \"next\" %>", "  <% end %>", "</nav>"], "erb_sanitize_allowlist": ["<%= sanitize ${1:@article.body_html}, tags: %w[p br strong em ul ol li a], attributes: %w[href title] %>"], "erb_json_script_tag": ["<script type=\"application/json\" id=\"${1:invoice-data}\">", "  <%= raw json_escape(${2:@invoice}.to_json) %>", "</script>", "<div data-controller=\"${3:invoice}\" data-${3:invoice}-source-value=\"#${1:invoice-data}\"></div>"], "erb_image_alt": ["<%= image_tag \"${1:logo.svg}\", alt: \"${2:Acme Billing}\", loading: \"lazy\", width: ${3:160}, height: ${4:40} %>"], "erb_head_csrf_csp": ["<%= csrf_meta_tags %>", "<%= csp_meta_tag %>", "<%= stylesheet_link_tag \"application\", \"data-turbo-track\": \"reload\" %>", "<%= javascript_importmap_tags %>"], "erb_cache_block": ["<% cache [${1:invoice}, \"${2:v1}\"] do %>", "  ${3:<%= render \"invoices/summary\", invoice: invoice %>}", "<% end %>"], "erb_js_response": ["document.querySelector(\"#${1:invoice-list}\").insertAdjacentHTML(\"beforeend\", \"<%= escape_javascript(render(partial: \"${2:invoices/invoice}\", locals: { ${3:invoice}: ${4:@invoice} })) %>\");"], "erb_time_tag": ["<time datetime=\"<%= ${1:@invoice.created_at}.iso8601 %>\"><%= l(${1:@invoice.created_at}, format: :short) %></time>"]};

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
  const _c = vscode.workspace.getConfiguration('erb-rails-view-snippets-audit');
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
      // ★s135 2026-09-08 — ⛔`replace` 칸은 ★어느 규칙에도 없어서 ★유료 기능이 ★죽어 있었다
      //   [실측] 26개 규칙 중 replace 0개 · fix 4개 ⇒ quick_fix 가 ★항상 "0 applied" 였다.
      //   ★고침: `replace` 가 없으면 ★`fix` 를 쓴다. ⛔줄 전체가 아니라 ★맞은 부분만 바꾸는 것은 그대로다.
      const rep = (r && typeof r.replace === 'string') ? r.replace
                : (r && typeof r.fix === 'string') ? r.fix : null;
      if (rep === null) { manual++; continue; }
      const ln = ed.document.lineAt(h.line - 1);
      const re = new RegExp(r.pattern, r.flags || '');
      const m = re.exec(ln.text);
      if (!m) { manual++; continue; }
      const start = new vscode.Position(h.line - 1, m.index), end = new vscode.Position(h.line - 1, m.index + m[0].length);
      b.replace(new vscode.Range(start, end), m[0].replace(re, rep)); applied++;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('erb-rails-view-snippets-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('erb-rails-view-snippets-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'erb-rails-view-snippets-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "erb-rails-view-snippets-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('erb-rails-view-snippets-audit.audit_file', runCurrent);
  reg('erb-rails-view-snippets-audit.audit_selection', runSelection);
  reg('erb-rails-view-snippets-audit.insert_snippet', insertSnippet);
  reg('erb-rails-view-snippets-audit.list_rules', listRules);
  reg('erb-rails-view-snippets-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('erb-rails-view-snippets-audit.quick_fix', function () { return quickFix(ctx); });
  reg('erb-rails-view-snippets-audit.export_report', function () { return exportReport(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('erb-rails-view-snippets-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
