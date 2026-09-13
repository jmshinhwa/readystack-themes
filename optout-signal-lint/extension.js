// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing for opt-out leaks", "done": "Audit finished.", "nothing_found": "No opt-out leak found in this file.", "paste": "Paste a tag, analytics or consent file here", "check": "Audit this file", "need_key": "Full version: Sweeps the whole workspace, writes the finding list to CSV, JSON or HTML, and returns a CI exit code so the same leak cannot merge twice. $29 once · one licence key per person or team seat · 7-day full refund. Osano, the nearest hosted consent platform, starts at $199/month.", "buy": "Get the full version — $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted. The workspace scan, export and CI output are open.", "key_bad": "That key did not validate. Check it in your Polar customer portal."};
const PAID = ["workspace_scan", "export_report", "ci_json"];
// ★역방향 체험 — ★첫 스윕부터 7일. ⛔기본 유료 문장은 한 번만 붙잡아 둔다 (안내가 겹쳐 쌓이지 않게)
const NEED_KEY = S.need_key;
const TRIAL_MS = 7 * 24 * 3600 * 1000;
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Opt-Out Signal Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('optout-signal-lint').get('min_severity')
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
const RULES = [{"pattern": "navigator\\.doNotTrack|window\\.doNotTrack|msDoNotTrack", "flags": "", "sev": "error", "message": "Do Not Track is not an opt-out preference signal under any US state privacy law. The twelve states that require a universal signal recognise Global Privacy Control, not DNT.", "fix": "navigator.globalPrivacyControl === true"}, {"pattern": "globalPrivacyControl\\s*[=!]==?\\s*[\\'\"]", "flags": "", "sev": "error", "message": "navigator.globalPrivacyControl is a boolean. Comparing it to a string is always false, so this opt-out branch never runs.", "fix": "navigator.globalPrivacyControl === true"}, {"pattern": "sec-gpc[\\'\"\\]\\s]*[=!]==?\\s*[\\'\"](true|yes|on)[\\'\"]", "flags": "i", "sev": "error", "message": "The Sec-GPC request header carries the value 1, never the string \"true\", so this server-side opt-out never fires.", "fix": "req.headers['sec-gpc'] === '1'"}, {"pattern": "fbq\\s*\\(\\s*[\\'\"]init[\\'\"]", "flags": "", "sev": "error", "message": "Meta Pixel init sends identifiers to Meta for cross-context behavioural advertising, which is a sale or share. It must not run for a visitor whose browser sent Global Privacy Control.", "fix": "if (!optedOut) fbq('init', id)"}, {"pattern": "ttq\\.(load|page|track)\\s*\\(", "flags": "", "sev": "error", "message": "The TikTok pixel is cross-context behavioural advertising. A visitor in the twelve opt-out-signal states who sent GPC must not have it loaded at all.", "fix": "load ttq only after the signal check passes"}, {"pattern": "gtag\\s*\\(\\s*[\\'\"]config[\\'\"]\\s*,\\s*[\\'\"]AW-", "flags": "", "sev": "error", "message": "A Google Ads (AW-) tag is a share for cross-context advertising. It has to be gated on the opt-out signal, not only on an EU cookie banner.", "fix": "gate the AW- config on the GPC check"}, {"pattern": "[\\'\"]?(ad_storage|ad_user_data|ad_personalization)[\\'\"]?\\s*:\\s*[\\'\"]granted[\\'\"]", "flags": "", "sev": "error", "message": "Advertising storage defaults to granted, so a GPC visitor is already shared on the very first page load, before any banner logic runs.", "fix": "default these to 'denied' and update only after reading the signal"}, {"pattern": "(allow_google_signals|allow_ad_personalization_signals)\\s*:\\s*true", "flags": "", "sev": "error", "message": "Google Signals turns Analytics data into cross-context advertising audiences. That is a share you must stop for a GPC visitor.", "fix": "allow_google_signals: false when the signal is present"}, {"pattern": "\\b(em|ph)\\s*:\\s*[\\w.$\\[\\]]*(email|phone|mail|tel|number)\\b", "flags": "i", "sev": "error", "message": "Advanced matching is passing a raw email or phone number to an ad platform. That is a sale of an identifier, and the field must be SHA-256 hashed even for a visitor who has not opted out.", "fix": "em: sha256(normalise(user.email))"}, {"pattern": "(acceptAll|acceptAllCookies|grantAllConsent|grantAll)\\s*\\(\\s*\\)", "flags": "", "sev": "error", "message": "Auto-accepting on load overwrites the opt-out a GPC visitor already sent, and asymmetric accept/reject is the dark pattern the CPPA regulations name.", "fix": "never call acceptAll() without an affirmative click"}, {"pattern": "(region|state|geo|country|jurisdiction)\\s*[=!]==?\\s*[\\'\"](CA|California)[\\'\"]", "flags": "i", "sev": "error", "message": "Honouring the signal for California alone misses the other eleven states that require it as of 1 January 2026.", "fix": "OPT_OUT_STATES.has(region) over all twelve states"}, {"pattern": "\\b(isEU|inEEA|isEEA|gdprApplies|isGdpr|gdprRegion)\\b", "flags": "", "sev": "warn", "message": "An EU-only gate leaves US visitors ungated. The opt-out signal has to be honoured whether or not the EU check is true.", "fix": "check the signal before, and independently of, the EU branch"}, {"pattern": "Do Not Sell My Personal Information", "flags": "i", "sev": "warn", "message": "Since CPRA the required wording is \"Do Not Sell or Share My Personal Information\", or the single combined link titled \"Your Privacy Choices\".", "fix": "Your Privacy Choices"}, {"pattern": "(hotjar|fullstory|logrocket|smartlook|mouseflow|clarity)\\s*[.(]", "flags": "i", "sev": "warn", "message": "Session-replay scripts capture form input. Running one for a GPC visitor is both a share and the fact pattern behind the CIPA wiretapping suits.", "fix": "start replay only after the signal check passes"}, {"pattern": "\\b(rdt|snaptr|pintrk|twq|lintrk)\\s*\\(|_linkedin_partner_id", "flags": "", "sev": "warn", "message": "Reddit, Snap, Pinterest, X and LinkedIn pixels are all cross-context advertising shares and need the same gate as the Meta and Google tags.", "fix": "gate every ad pixel on one shared optedOut flag"}, {"pattern": "(analytics|rudderanalytics)\\.(load|initialize)\\s*\\(", "flags": "", "sev": "warn", "message": "Loading a CDP fans the visitor out to every enabled destination, ad destinations included, so gating individual tags downstream proves nothing.", "fix": "load the CDP after the signal check, or disable ad destinations"}, {"pattern": "googletagmanager\\.com/gtm\\.js|[\\'\"]GTM-[A-Z0-9]{4,}", "flags": "", "sev": "warn", "message": "The GTM container loads whatever tags it holds, so gating your own tags proves nothing. The container itself must be gated on the signal.", "fix": "gate the container, not only the tags inside it"}, {"pattern": "dataLayer\\.push\\s*\\([^)]*\\b(email|user_id|userId|phone|customerId)\\b", "flags": "i", "sev": "warn", "message": "Pushing an identifier into the dataLayer hands it to every tag in the container, including the advertising tags.", "fix": "push a hashed or pseudonymous id, and only when not opted out"}, {"pattern": "(defaultConsent|consentDefault|initialConsent|consentState)\\s*[:=]\\s*[\\'\"]?(true|granted|all|accepted|opted_in)", "flags": "i", "sev": "warn", "message": "Consent state starts as opted in. In an opt-out state that is defensible only until a GPC signal arrives, and this code never looks.", "fix": "start from the signal, not from a hard-coded default"}, {"pattern": "getCurrentPosition\\s*\\(|watchPosition\\s*\\(", "flags": "", "sev": "info", "message": "Precise geolocation is sensitive personal information, which triggers the limit-the-use right and the combined \"Your Privacy Choices\" link.", "fix": "coarsen to city level, or add the limit-use control"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('optout-signal-lint');
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

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
//   ★체험 중(inTrial)이면 ⛔키를 묻지 않고 ★전체 스윕과 보고서를 ★줄이지 않고 그대로 준다.
//   ★7일이 지난 뒤 물을 때는 ★지난 스윕이 본 숫자를 먼저 보여준다.
async function paidGate(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + TRIAL_MS; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    const last = st.get('lastSweep');
    S.need_key = (last && last.files
      ? ('Your trial sweep covered ' + last.files + ' files and found ' + last.findings + ' findings. ')
      : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  return { inTrial: inTrial };
}

async function scanWorkspace(ctx) {
  const g = await paidGate(ctx);
  if (!g) return;
  const st = ctx.globalState;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('optout-signal-lint');
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
  await st.update('lastSweep', { files: files.length, findings: n, at: new Date().toISOString().slice(0, 10) });
  vscode.window.showInformationMessage(
    (n ? S.done : S.nothing_found) + ' ' + files.length + ' files, ' + n + ' findings.'
    + (g.inTrial ? TRIAL_NOTE : ''));
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
  const cfgFmt = String(vscode.workspace.getConfiguration('optout-signal-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('optout-signal-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'optout-signal-lint-report.' + pick.toLowerCase());
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
  const uri = vscode.Uri.joinPath(ws[0].uri, 'optout-signal-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath + (g.inTrial ? TRIAL_NOTE : ''));
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "optout-signal-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('optout-signal-lint.audit_file', runCurrent);
  reg('optout-signal-lint.audit_selection', runSelection);
  reg('optout-signal-lint.list_rules', listRules);
  reg('optout-signal-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('optout-signal-lint.export_report', function () { return exportReport(ctx); });
  reg('optout-signal-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('optout-signal-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
