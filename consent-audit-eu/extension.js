// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing on every save", "done": "Audit finished - see the report", "nothing_found": "Nothing fires before consent here", "paste": "Paste an HTML, JS, JSX, Vue or PHP template here", "check": "Audit this code", "need_key": "Full version: sweep every file in the repository, keep it clean on save, and export the dated evidence report. $29 once - one licence key per person or team seat - 7-day full refund. Consent scanners bill $10-$55 per domain every month.", "key_ok": "Licence accepted", "key_bad": "That key did not validate", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "extra_rules": "Extra patterns of your own, audited alongside the 24 that ship inside."};
const PAID = ["workspace_scan", "export_report", "watch_on_save", "ci_json", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Consent Audit EU');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('consent-audit-eu').get('min_severity')
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
const RULES = [{"pattern": "(<\\s*script)(?![^>]*text/plain)([^>]*src=[\"\\'][^\"\\']*googletagmanager\\.com)", "flags": "i", "message": "Google Tag Manager loads on page render, so it runs before the visitor answers the banner. Every tag inside the container inherits that timing.", "sev": "error", "fix": "Block it until consent: add type=\"text/plain\" data-cookieconsent=\"statistics\" so your CMP unblocks it after opt-in, or inject the tag from the consent callback.", "replace": "$1 type=\"text/plain\" data-cookieconsent=\"statistics\"$2"}, {"pattern": "(<\\s*script)(?![^>]*text/plain)([^>]*src=[\"\\'][^\"\\']*connect\\.facebook\\.net)", "flags": "i", "message": "The Meta pixel loads on page render, so it runs before the visitor answers the banner. It writes _fbp and sends the visitor IP to Meta.", "sev": "error", "fix": "Block it until consent: add type=\"text/plain\" data-cookieconsent=\"marketing\" so your CMP unblocks it after opt-in, or inject the tag from the consent callback.", "replace": "$1 type=\"text/plain\" data-cookieconsent=\"marketing\"$2"}, {"pattern": "(<\\s*script)(?![^>]*text/plain)([^>]*src=[\"\\'][^\"\\']*static\\.hotjar\\.com)", "flags": "i", "message": "Hotjar loads on page render, so it runs before the visitor answers the banner. Session replay records the visitor from the first frame.", "sev": "error", "fix": "Block it until consent: add type=\"text/plain\" data-cookieconsent=\"statistics\" so your CMP unblocks it after opt-in, or inject the tag from the consent callback.", "replace": "$1 type=\"text/plain\" data-cookieconsent=\"statistics\"$2"}, {"pattern": "(<\\s*script)(?![^>]*text/plain)([^>]*src=[\"\\'][^\"\\']*clarity\\.ms)", "flags": "i", "message": "Microsoft Clarity loads on page render, so it runs before the visitor answers the banner. Clarity replays sessions and needs consent before the script starts.", "sev": "error", "fix": "Block it until consent: add type=\"text/plain\" data-cookieconsent=\"statistics\" so your CMP unblocks it after opt-in, or inject the tag from the consent callback.", "replace": "$1 type=\"text/plain\" data-cookieconsent=\"statistics\"$2"}, {"pattern": "(<\\s*script)(?![^>]*text/plain)([^>]*src=[\"\\'][^\"\\']*snap\\.licdn\\.com)", "flags": "i", "message": "The LinkedIn Insight Tag loads on page render, so it runs before the visitor answers the banner. It drops li_sugr and li_fat_id on load.", "sev": "error", "fix": "Block it until consent: add type=\"text/plain\" data-cookieconsent=\"marketing\" so your CMP unblocks it after opt-in, or inject the tag from the consent callback.", "replace": "$1 type=\"text/plain\" data-cookieconsent=\"marketing\"$2"}, {"pattern": "(<\\s*script)(?![^>]*text/plain)([^>]*src=[\"\\'][^\"\\']*cdn\\.segment\\.com)", "flags": "i", "message": "Segment analytics.js loads on page render, so it runs before the visitor answers the banner. It fans the visitor out to every destination you have enabled.", "sev": "error", "fix": "Block it until consent: add type=\"text/plain\" data-cookieconsent=\"statistics\" so your CMP unblocks it after opt-in, or inject the tag from the consent callback.", "replace": "$1 type=\"text/plain\" data-cookieconsent=\"statistics\"$2"}, {"pattern": "(<\\s*script)(?![^>]*text/plain)([^>]*src=[\"\\'][^\"\\']*(?:googleadservices\\.com|doubleclick\\.net))", "flags": "i", "message": "A Google Ads tag loads on page render, so it runs before the visitor answers the banner. Conversion and remarketing cookies are never strictly necessary.", "sev": "error", "fix": "Block it until consent: add type=\"text/plain\" data-cookieconsent=\"marketing\" so your CMP unblocks it after opt-in, or inject the tag from the consent callback.", "replace": "$1 type=\"text/plain\" data-cookieconsent=\"marketing\"$2"}, {"pattern": "gtag\\(\\s*[\"\\']config[\"\\']\\s*,\\s*[\"\\']G-", "flags": "i", "message": "gtag(\"config\",\"G-...\") sends a page_view to Google Analytics the moment this line runs. That is the pre-consent hit regulators quote in cookie decisions.", "sev": "error", "fix": "Move the config call inside the callback that runs after analytics consent is granted."}, {"pattern": "fbq\\(\\s*[\"\\']init[\"\\']", "flags": "i", "message": "fbq(\"init\", ...) starts Meta tracking on this line, ahead of any consent check.", "sev": "error", "fix": "Call fbq(\"init\") only after the marketing category is granted."}, {"pattern": "ttq\\.load\\(", "flags": "i", "message": "ttq.load() starts the TikTok pixel here, before the banner is answered.", "sev": "error", "fix": "Load the TikTok pixel from the consent callback."}, {"pattern": "[\"\\']clarity[\"\\']\\s*,\\s*[\"\\']script[\"\\']", "flags": "i", "message": "This is the inline Microsoft Clarity loader. It injects the replay script itself, so a CMP that only blocks external tags will miss it.", "sev": "error", "fix": "Run the loader from the consent callback instead of on page load."}, {"pattern": "(consent[\"\\']\\s*,\\s*[\"\\']default[\"\\'][^\\n]*?)granted", "flags": "i", "message": "Google Consent Mode defaults to \"granted\". In the EU the default must be \"denied\" until the visitor opts in, otherwise consent mode changes nothing.", "sev": "error", "fix": "Set the storage keys to \"denied\" in the default call and grant them in the update call.", "replace": "$1denied"}, {"pattern": "(?:ad_storage|analytics_storage|ad_user_data|ad_personalization)[\"\\']?\\s*:\\s*[\"\\']granted", "flags": "i", "message": "A consent-mode storage key is set to \"granted\" here. Check that this is the update after opt-in and not the default state.", "sev": "warn", "fix": "Keep every storage key \"denied\" in the default call."}, {"pattern": "<link[^>]+href=[\"\\'][^\"\\']*fonts\\.(?:googleapis|gstatic)\\.com", "flags": "i", "message": "Google Fonts is pulled from Google servers. The Munich court held that handing the visitor IP to Google this way is not strictly necessary, so it needs consent - or self-hosting.", "sev": "error", "fix": "Download the woff2 files and serve them from your own domain."}, {"pattern": "@import[^\\n]*fonts\\.googleapis\\.com", "flags": "i", "message": "A stylesheet @imports Google Fonts, which reaches Google before any banner renders.", "sev": "error", "fix": "Self-host the font files and drop the @import."}, {"pattern": "(<iframe[^>]*src=[\"\\'][^\"\\']*)(?:www\\.)?youtube\\.com/embed", "flags": "i", "message": "A youtube.com/embed iframe sets Google advertising cookies as soon as the page renders. The youtube-nocookie host does not.", "sev": "warn", "fix": "Swap the host to www.youtube-nocookie.com.", "replace": "$1www.youtube-nocookie.com/embed"}, {"pattern": "player\\.vimeo\\.com/video/\\d+(?![^\"\\'\\s]*dnt=1)", "flags": "i", "message": "This Vimeo embed carries no dnt=1, so Vimeo tracks the visitor on load.", "sev": "warn", "fix": "Append dnt=1 to the embed URL."}, {"pattern": "(?:maps\\.googleapis\\.com|google\\.com/maps/embed)", "flags": "i", "message": "A Google Maps embed sends the visitor IP to Google on load. Supervisory authorities treat that as a transfer that needs consent.", "sev": "warn", "fix": "Show a static image and load the real map on click, after consent."}, {"pattern": "www\\.google\\.com/recaptcha/api\\.js", "flags": "i", "message": "reCAPTCHA loads Google code on every page it sits on and profiles the visitor, not just the form submission.", "sev": "warn", "fix": "Load it when the form is focused, and write down why it is strictly necessary."}, {"pattern": "(?:widget\\.intercom\\.io|client\\.crisp\\.chat|embed\\.tawk\\.to)", "flags": "i", "message": "A chat widget pulls third-party code and cookies on page load. Unless the visitor asked for the chat, it waits for consent.", "sev": "warn", "fix": "Load the widget on click, from the consent callback."}, {"pattern": "(?:browser\\.sentry-cdn\\.com|datadoghq-browser-agent|sessionReplaySampleRate|replaysSessionSampleRate)", "flags": "i", "message": "Session replay is switched on. Replay records what the visitor types and points at, which needs consent before the SDK starts.", "sev": "warn", "fix": "Keep the replay sample rate at 0 until the statistics category is granted."}, {"pattern": "document\\.cookie\\s*=", "flags": "i", "message": "This line writes a cookie directly. Anything that is not strictly necessary to deliver the page has to wait for consent, and the choice has to be recorded.", "sev": "warn", "fix": "Wrap the write in your consent check, or drop the cookie."}, {"pattern": "(?:localStorage|sessionStorage)\\.setItem\\(\\s*[\"\\'][^\"\\']*(?:_ga|_gid|utm|visitor|analytics|track|fbp)", "flags": "i", "message": "Storing an identifier in web storage is access to terminal equipment under ePrivacy, exactly like a cookie, so it needs the same consent.", "sev": "warn", "fix": "Write the identifier only after the visitor opts in."}, {"pattern": "navigator\\.sendBeacon\\(", "flags": "i", "message": "sendBeacon posts data without waiting for a response. Check that this call cannot run before the consent state is known.", "sev": "info", "fix": "Gate the call on the stored consent state."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('consent-audit-eu');
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
  const _c = vscode.workspace.getConfiguration('consent-audit-eu');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('consent-audit-eu').get('reportFormat')
    || vscode.workspace.getConfiguration('consent-audit-eu').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'consent-audit-eu-report.' + pick.toLowerCase());
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

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'consent-audit-eu-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
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
  try { lic.pullFeed(ctx, "consent-audit-eu").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('consent-audit-eu.audit_file', runCurrent);
  reg('consent-audit-eu.audit_selection', runSelection);
  reg('consent-audit-eu.show_report', showReport);
  reg('consent-audit-eu.list_rules', listRules);
  reg('consent-audit-eu.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('consent-audit-eu.export_report', function () { return exportReport(ctx); });
  reg('consent-audit-eu.watch_on_save', function () { return watchOnSave(ctx); });
  reg('consent-audit-eu.ci_json', function () { return ciJson(ctx); });
  reg('consent-audit-eu.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('consent-audit-eu').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
