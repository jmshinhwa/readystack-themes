// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking this file against EN 301 549…", "check": "Check this file", "paste": "Paste the HTML, JSX, Vue, Svelte, Blade or Twig template you are looking at.", "done": "EN 301 549 check finished.", "nothing_found": "No EN 301 549 finding on these lines. That covers the clauses this linter can see in markup — it does not cover keyboard traps, focus order or anything that needs the page running.", "need_key": "Full version: scans every template in the repository and writes the dated evidence file — file, line and clause — that your accessibility statement has to point at. $29 once · one licence key per person or team seat · 7-day full refund. A manual WCAG audit is quoted at $100–$250 per page (Accessible.org, 2026).", "buy": "Get the full version — $29", "key_ok": "Licence key accepted. Workspace scan, evidence export and CI output are on.", "key_bad": "That key did not validate. Check it was pasted whole, then try again.", "extra_rules": "Your own house rules, checked next to the 28 that ship inside.", "enter_key": "Enter licence key"};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('EN 301 549 Lint — EU Accessibility Act');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('en301549-lint').get('min_severity')
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
const RULES = [{"pattern": "<img(?![^>]*\\salt\\s*=)[^>]*>", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.1.1.1 (in force) — <img> has no alt attribute.", "fix": "<img src=\"…\" alt=\"What the image says\"> — or alt=\"\" if it is decorative."}, {"pattern": "<input(?=[^>]*type\\s*=\\s*[\"\\']image[\"\\'])(?![^>]*\\salt\\s*=)[^>]*>", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.1.1.1 (in force) — <input type=\"image\"> has no alt attribute.", "fix": "<input type=\"image\" src=\"…\" alt=\"Search\">"}, {"pattern": "<area(?![^>]*\\salt\\s*=)[^>]*>", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.1.1.1 (in force) — <area> in an image map has no alt attribute.", "fix": "<area shape=\"rect\" coords=\"…\" href=\"…\" alt=\"Where this region goes\">"}, {"pattern": "<(video|audio)\\b(?![^>]*\\bcontrols\\b)[^>]*>", "flags": "i", "sev": "warn", "message": "EN 301 549 V3.2.1 §9.1.2.2 (in force) — media element with no controls; captions/controls cannot be reached.", "fix": "<video controls><track kind=\"captions\" srclang=\"en\" src=\"captions.vtt\" default></video>"}, {"pattern": "<th(?![^>]*\\sscope\\s*=)[^>]*>", "flags": "i", "sev": "warn", "message": "EN 301 549 V3.2.1 §9.1.3.1 (in force) — <th> has no scope, so the header is not tied to its cells.", "fix": "<th scope=\"col\"> — or scope=\"row\" for a row header."}, {"pattern": "<label(?![^>]*\\sfor\\s*=)[^>]*>", "flags": "i", "sev": "warn", "message": "EN 301 549 V3.2.1 §9.1.3.1 (in force) — <label> has no for=, so it is not programmatically tied to a field.", "fix": "<label for=\"email\">Email</label><input id=\"email\">"}, {"pattern": "<input(?=[^>]*type\\s*=\\s*[\"\\'](email|tel)[\"\\'])(?![^>]*autocomplete)[^>]*>", "flags": "i", "sev": "warn", "message": "EN 301 549 V3.2.1 §9.1.3.5 (in force) — email/tel field has no autocomplete token.", "fix": "<input type=\"email\" autocomplete=\"email\"> · <input type=\"tel\" autocomplete=\"tel\">"}, {"pattern": "autocomplete\\s*=\\s*[\"\\']off[\"\\']", "flags": "i", "sev": "warn", "message": "EN 301 549 V3.2.1 §9.1.3.5 (in force) — autocomplete=\"off\" blocks the identified input purpose on name/address/payment fields.", "fix": "Use the token instead: autocomplete=\"given-name\" | \"postal-code\" | \"cc-number\"."}, {"pattern": "color\\s*:\\s*#(777|888|999|aaa|bbb|ccc)\\b", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.1.4.3 (in force) — grey text on white: #777 = 4.48:1, #888 = 3.54:1, #999 = 2.85:1. AA needs 4.5:1.", "fix": "#767676 is the lightest grey that reaches 4.5:1 on #fff. #666 = 5.74:1."}, {"pattern": "\\btext-(gray|grey|slate|zinc|neutral|stone)-(300|400)\\b", "flags": "", "sev": "error", "message": "EN 301 549 V3.2.1 §9.1.4.3 (in force) — Tailwind text-*-400 on white is about 2.8:1 and text-*-300 is lower. AA needs 4.5:1.", "fix": "text-gray-600 (#4b5563) = 7.5:1 on white. text-gray-500 = 4.8:1 for normal text only."}, {"pattern": "(user-scalable\\s*=\\s*[\"\\']?\\s*no|maximum-scale\\s*=\\s*[\"\\']?\\s*1(\\.0)?\\b)", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.1.4.4 (in force) — the viewport meta blocks zoom; text cannot be resized to 200%.", "fix": "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"}, {"pattern": "<(div|span|li|td|p)\\b[^>]*\\bonclick\\s*=", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.2.1.1 (in force) — a click handler on a non-interactive element: keyboard users cannot reach it.", "fix": "<button type=\"button\" onclick=\"…\"> — a real button is focusable and fires on Enter/Space."}, {"pattern": "role\\s*=\\s*[\"\\']button[\"\\'](?![^>]*tabindex)", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.2.1.1 (in force) — role=\"button\" without tabindex is never reached by Tab.", "fix": "Add tabindex=\"0\" and a keydown handler for Enter and Space — or use <button>."}, {"pattern": "tabindex\\s*=\\s*[\"\\']?[1-9]", "flags": "i", "sev": "warn", "message": "EN 301 549 V3.2.1 §9.2.4.3 (in force) — a positive tabindex overrides DOM order and breaks focus order.", "fix": "tabindex=\"0\" to make it focusable, tabindex=\"-1\" for script focus only."}, {"pattern": "<(marquee|blink)\\b", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.2.2.2 (in force) — moving content that cannot be paused, stopped or hidden.", "fix": "Replace with CSS animation plus a pause control, honouring prefers-reduced-motion."}, {"pattern": "<(video|audio)\\b[^>]*\\bautoplay\\b", "flags": "i", "sev": "warn", "message": "EN 301 549 V3.2.1 §9.2.2.2 (in force) — media autoplays; anything over 5 seconds needs a pause/stop control.", "fix": "Drop autoplay, or keep it muted, under 5s, and give a visible pause button."}, {"pattern": ">\\s*(click here|read more|learn more|more|here|link|this link)\\s*<", "flags": "i", "sev": "warn", "message": "EN 301 549 V3.2.1 §9.2.4.4 (in force) — the link text does not say where it goes when read out of context.", "fix": "<a href=\"/refunds\">Read the refund policy</a>"}, {"pattern": "outline\\s*:\\s*(none|0)\\b", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.2.4.7 (in force) — removing the outline removes the visible focus indicator.", "fix": ":focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }"}, {"pattern": "<html(?![^>]*\\slang\\s*=)[^>]*>", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.3.1.1 (in force) — <html> has no lang, so a screen reader picks the wrong voice.", "fix": "<html lang=\"de\"> — the language actually used on the page."}, {"pattern": "<(input|select|textarea)(?![^>]*\\bid\\s*=)(?![^>]*aria-label)(?![^>]*aria-labelledby)(?![^>]*type\\s*=\\s*[\"\\'](hidden|submit|button|reset|image)[\"\\'])[^>]*>", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.3.3.2 (in force) — field has no id to label, and no aria-label either. A placeholder is not a label.", "fix": "<label for=\"vat\">VAT number</label><input id=\"vat\" name=\"vat\">"}, {"pattern": "<iframe(?![^>]*\\stitle\\s*=)[^>]*>", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.4.1.2 (in force) — <iframe> has no title, so it is announced only as \"frame\".", "fix": "<iframe title=\"Payment form\" src=\"…\">"}, {"pattern": "<(a|button|input|select|textarea)\\b[^>]*aria-hidden\\s*=\\s*[\"\\']true", "flags": "i", "sev": "error", "message": "EN 301 549 V3.2.1 §9.4.1.2 (in force) — a focusable element hidden from the accessibility tree: reachable by Tab, invisible to a screen reader.", "fix": "Remove aria-hidden, or take it out of the tab order too with tabindex=\"-1\"."}, {"pattern": "<button(?![^>]*aria-label)(?![^>]*title\\s*=)[^>]*>\\s*<(svg|i|img)\\b", "flags": "i", "sev": "warn", "message": "EN 301 549 V3.2.1 §9.4.1.2 (in force) — icon-only button with no accessible name.", "fix": "<button aria-label=\"Close dialog\"><svg aria-hidden=\"true\">…</svg></button>"}, {"pattern": "position\\s*:\\s*(sticky|fixed)", "flags": "i", "sev": "info", "message": "EN 301 549 V4.1.1 §9.2.4.11 (WCAG 2.2 — not in force yet; OJ citation expected Oct 2026) — a sticky bar can cover the focused element. Not a violation today.", "fix": "scroll-margin-block on focusable content, or shrink the bar on keyboard focus."}, {"pattern": "<(button|a)\\b[^>]*style\\s*=\\s*[\"\\'][^\"\\']*(width|height)\\s*:\\s*(1?\\d|2[0-3])px", "flags": "i", "sev": "info", "message": "EN 301 549 V4.1.1 §9.2.5.8 (WCAG 2.2 — not in force yet; OJ citation expected Oct 2026) — target smaller than 24 by 24 CSS pixels. Not a violation today.", "fix": "min-width: 24px; min-height: 24px — or leave 24px of clear space around it."}, {"pattern": "onpaste\\s*=\\s*[\"\\']?\\s*(return\\s+false|false)", "flags": "i", "sev": "info", "message": "EN 301 549 V4.1.1 §9.3.3.8 (WCAG 2.2 — not in force yet; OJ citation expected Oct 2026) — blocking paste stops password managers. Not a violation today.", "fix": "Remove the onpaste handler; let the field accept a pasted value."}, {"pattern": "<input(?=[^>]*type\\s*=\\s*[\"\\']password[\"\\'])(?![^>]*autocomplete)[^>]*>", "flags": "i", "sev": "info", "message": "EN 301 549 V4.1.1 §9.3.3.8 (WCAG 2.2 — not in force yet; OJ citation expected Oct 2026) — password field with no autocomplete token. Not a violation today.", "fix": "autocomplete=\"current-password\" on sign-in, \"new-password\" on sign-up."}, {"pattern": "\\b(g-recaptcha|h-captcha|hcaptcha|recaptcha)\\b", "flags": "i", "sev": "info", "message": "EN 301 549 V4.1.1 §9.3.3.8 (WCAG 2.2 — not in force yet; OJ citation expected Oct 2026) — a cognitive function test in authentication needs an alternative. Not a violation today.", "fix": "Offer a non-puzzle route: email link, passkey, or an object-recognition alternative."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('en301549-lint');
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

// ★무료 — ★들어 있는 규칙·스니펫 목록
async function listRules() {
  const c = out(); c.clear();
  c.appendLine('rules ' + RULES.length + ' / snippets ' + Object.keys(SNIPPETS).length);
  for (const r of RULES) { c.appendLine('  ' + r.message); }
  for (const k of Object.keys(SNIPPETS)) { c.appendLine('  + ' + k); }
  c.show(true);
}

// ★s144 — ★역방향 체험(reverse trial): 유료 부분(작업공간 전체 스윕 + 보고서 파일)을
//   ★첫 스윕부터 7일간 키 없이 ★줄이지 않고 그대로 준다. 그 뒤에 키를 묻는다.
//   [검색 2026-09-12] 무료→유료 2~4% ↔ 역방향 체험 8~12% (개발자 도구 체험 중앙값 24%)
//   · 손님이 돈 낼지 정하는 순간은 ★자기 폴더에서 자기 건수를 본 뒤다 (값을 겪은 자리의 문턱 = 설치 자리의 3~5배).
//   ⛔무료 경로(열린 파일·고른 줄 검사)는 이 문을 지나지 않는다 — 어떤 제한도 없다 (8% 법).
const TRIAL_MS = 7 * 24 * 3600 * 1000;
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';
const NEED_KEY = S.need_key;   // ⛔원문을 잡아 둔다 — 아래에서 손님 숫자를 앞에 붙여 덮어쓴다

function today() { return new Date().toISOString().slice(0, 10); }

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
//   낸다: 체험 중이면 { inTrial: true } · 키가 통과하면 { inTrial: false } · 문이 닫히면 null
async function paidGate(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');   // ⛔license.js 가 저장하는 바로 그 이름
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + TRIAL_MS; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    // ★손님 자신의 숫자를 먼저 읽어 준다 (endowment) — 812개 파일에서 37건을 본 그 사람에게.
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found '
      + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  return { inTrial: inTrial, until: until };
}

async function scanWorkspace(ctx) {
  const g = await paidGate(ctx);
  if (!g) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('en301549-lint');
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
  const n = report(rows);
  // ★s144 — 손님 자신의 숫자를 적어 둔다. 체험이 끝난 뒤 문턱 문장이 이것을 그대로 읽는다.
  await ctx.globalState.update('lastSweep', { files: files.length, findings: n, at: today() });
  vscode.window.showInformationMessage(S.done + ' ' + files.length + ' files \u00b7 ' + n
    + ' findings.' + (g.inTrial ? TRIAL_NOTE : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const g = await paidGate(ctx);
  if (!g) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('en301549-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('en301549-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'en301549-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath + (g.inTrial ? TRIAL_NOTE : ''));
}

async function ciJson(ctx) {
  const g = await paidGate(ctx);
  if (!g) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'en301549-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath + (g.inTrial ? TRIAL_NOTE : ''));
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "en301549-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('en301549-lint.audit_file', runCurrent);
  reg('en301549-lint.audit_selection', runSelection);
  reg('en301549-lint.list_rules', listRules);
  reg('en301549-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('en301549-lint.export_report', function () { return exportReport(ctx); });
  reg('en301549-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('en301549-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
