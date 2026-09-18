// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Pick a format for the inventory file", "done": "Payment page audit finished - findings are listed above.", "nothing_found": "No payment-page script findings in this file. This reads the page source, so it cannot see scripts a tag manager injects at run time.", "need_key": "Full version: scan every template in the repository and write the script inventory to a file you can hand to your assessor.", "key_ok": "Licence accepted - repository scan, inventory export and CI output are unlocked.", "key_bad": "That key did not validate. Check for a stray space, or reopen the link in your licence email.", "buy": "Get the full version - $49", "enter_key": "Enter licence key", "paste": "Paste your checkout page HTML, or the template that renders it, here", "check": "Audit this payment page", "extra_rules": "Extra patterns of your own, checked alongside the 22 that ship inside."};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Payment Page Script Audit (PCI 6.4.3)');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('payment-page-script-audit').get('min_severity')
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
const RULES = [{"pattern": "<script(?=[^>]*\\ssrc=[\"\\']https?://)(?![^>]*\\sintegrity=)[^>]*>", "flags": "i", "sev": "error", "message": "6.4.3 integrity: third-party script loaded with no integrity attribute. Nothing assures this file is the file you reviewed. Add an SRI hash (integrity=\"sha384-...\") or self-host it.", "fix": "add integrity=\"sha384-...\" crossorigin=\"anonymous\""}, {"pattern": "<script(?=[^>]*\\sintegrity=)(?=[^>]*\\ssrc=[\"\\']https?://)(?![^>]*\\scrossorigin)[^>]*>", "flags": "i", "sev": "error", "message": "6.4.3 integrity: the integrity attribute is IGNORED on a cross-origin script that has no crossorigin attribute. The SRI hash here is decorative - the browser does not enforce it.", "fix": "add crossorigin=\"anonymous\""}, {"pattern": "integrity=[\"\\'](?:sha1|md5)-", "flags": "i", "sev": "error", "message": "6.4.3 integrity: sha1/md5 is not a valid SRI algorithm. Browsers reject the attribute and load the script unchecked. SRI accepts sha256, sha384 or sha512 only.", "fix": "use sha384"}, {"pattern": "integrity=[\"\\']\\s*[\"\\']", "flags": "i", "sev": "error", "message": "6.4.3 integrity: empty integrity attribute. It reads as if SRI is in place while nothing at all is verified."}, {"pattern": "<script[^>]+src=[\"\\']http://", "flags": "i", "sev": "error", "message": "6.4.3 integrity: script fetched over plain http on a payment page. It can be rewritten in transit, so its integrity is not assured, and browsers block it as mixed content."}, {"pattern": "<link(?=[^>]*rel=[\"\\'](?:preload|modulepreload)[\"\\'])(?=[^>]*\\sas=[\"\\']script[\"\\'])(?![^>]*\\sintegrity=)[^>]*>", "flags": "i", "sev": "warn", "message": "6.4.3 inventory: a preloaded script with no integrity attribute. It is easy to miss because it is a <link>, not a <script>, but it is executed like any other script."}, {"pattern": "<script[^>]+src=[\"\\'][^\"\\']*(?:@latest|/latest/|/master/|/main/|\\?ver=)", "flags": "i", "sev": "error", "message": "6.4.3 authorisation: script pinned to a moving target (@latest, /main/, ?ver=). The file can change without you changing anything, so neither the authorisation nor the inventory stays true.", "fix": "pin an exact version"}, {"pattern": "<script(?![^>]*\\ssrc=)(?![^>]*\\snonce=)(?![^>]*\\stype=[\"\\'](?:application/json|application/ld\\+json|text/template))[^>]*>", "flags": "i", "sev": "warn", "message": "6.4.3 authorisation: inline script with no nonce. A CSP allowlist cannot cover it, so no method confirms it is the authorised script rather than an injected one."}, {"pattern": "script-src[^;\"]*'unsafe-inline'", "flags": "i", "sev": "error", "message": "6.4.3 authorisation: CSP script-src allows 'unsafe-inline', which authorises any inline script an attacker manages to inject. The control 6.4.3 leans on is switched off."}, {"pattern": "script-src[^;\"]*'unsafe-eval'", "flags": "i", "sev": "warn", "message": "6.4.3 authorisation: CSP script-src allows 'unsafe-eval', so authorised script can still execute strings that were never reviewed."}, {"pattern": "script-src[^;\"]*\\*", "flags": "i", "sev": "error", "message": "6.4.3 authorisation: CSP script-src contains a wildcard, so any host may serve script to the payment page. A wildcard is not a method of confirming each script is authorised."}, {"pattern": "Content-Security-Policy-Report-Only", "flags": "i", "sev": "warn", "message": "6.4.3 authorisation: this CSP is report-only. It records violations and blocks nothing, so on its own it is not an authorisation method."}, {"pattern": "<base[^>]+href=", "flags": "i", "sev": "warn", "message": "6.4.3 inventory: a <base> tag repoints every relative script URL on the page, so the script that actually loads may not be the script listed in your inventory."}, {"pattern": "googletagmanager\\.com|/gtm\\.js|/gtag/js", "flags": "i", "sev": "error", "message": "6.4.3 inventory: a tag manager on a payment page injects further scripts at run time, so a source-level inventory can never be complete. PCI guidance is to keep tag managers off the payment page."}, {"pattern": "hotjar|fullstory|mouseflow|clarity\\.ms|luckyorange|smartlook|logrocket|sessioncam", "flags": "i", "sev": "error", "message": "6.4.3 justification: a session-recording script on a payment page can capture card fields as they are typed. This is a standard assessor finding and needs a written justification, or removal."}, {"pattern": "createElement\\(\\s*[\"\\']script[\"\\']", "flags": "i", "sev": "warn", "message": "6.4.3 inventory: a script element built at run time never appears in the page source, so it is invisible to a source-level inventory unless you add it by hand."}, {"pattern": "document\\.write\\s*\\(", "flags": "i", "sev": "warn", "message": "6.4.3 inventory: document.write on a payment page can inject unreviewed markup and script after load, defeating the inventory."}, {"pattern": "\\beval\\s*\\(|new\\s+Function\\s*\\(", "flags": "", "sev": "error", "message": "6.4.3 integrity: code built and executed from a string on a payment page is in no inventory and carries no integrity check."}, {"pattern": "serviceWorker\\.register\\s*\\(", "flags": "", "sev": "warn", "message": "11.6.1 tamper detection: a service worker can rewrite the payment page after it was served. That is precisely the change 11.6.1 exists to detect, so it needs a justification and monitoring."}, {"pattern": "postMessage\\([^)]*,\\s*[\"\\']\\*[\"\\']", "flags": "", "sev": "warn", "message": "Payment page: postMessage with a \"*\" target origin will deliver its data to any frame on the page, including one that was injected."}, {"pattern": "<input[^>]+(?:name|id)=[\"\\'][^\"\\']*(?:cardnumber|card_number|card-number|cc-?num|creditcard|\\bpan\\b|cvv|cvc|securitycode|security-code|expiry|exp-?date)", "flags": "i", "sev": "error", "message": "SAQ eligibility: a card-data field is served by your own page. SAQ A eligibility requires ALL card fields to come from the payment provider (iframe or redirect), so SAQ A-EP or SAQ D applies and 6.4.3 and 11.6.1 apply in full."}, {"pattern": "<iframe[^>]+src=[\"\\'][^\"\\']*(?:js\\.stripe\\.com|checkout\\.stripe\\.com|adyen|braintree|paypal|worldpay|squareup|checkout\\.)", "flags": "i", "sev": "info", "message": "Hosted payment iframe found. Useful, but note 6.4.3 covers the page that HOSTS the iframe, not only the iframe: every script on this page is still in scope."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('payment-page-script-audit');
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
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('payment-page-script-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('payment-page-script-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('payment-page-script-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'payment-page-script-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'payment-page-script-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "payment-page-script-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('payment-page-script-audit.audit_file', runCurrent);
  reg('payment-page-script-audit.audit_selection', runSelection);
  reg('payment-page-script-audit.list_rules', listRules);
  reg('payment-page-script-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('payment-page-script-audit.export_report', function () { return exportReport(ctx); });
  reg('payment-page-script-audit.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('payment-page-script-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
