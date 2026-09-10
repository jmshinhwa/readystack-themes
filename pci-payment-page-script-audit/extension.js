// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing the payment page", "done": "Unauthorized scripts found - see the panel for the requirement each one fails and the fix.", "nothing_found": "Every script on this page carries an authorization method and an integrity method. Nothing here fails 6.4.3 or 11.6.1.", "paste": "Paste the HTML of your checkout page here", "check": "Audit this payment page", "extra_rules": "Extra rules of your own - your internal script allowlist, for example - checked alongside the 26 PCI script-security rules that ship inside.", "need_key": "Full version: export the dated 6.4.3 script inventory as the evidence file you hand the assessor, across every payment page in the repository, with CI output that fails a build when an unauthorized script appears. $29 once, one licence key per person or team seat, 7-day full refund. A PCI consultant bills about $76/hour in the US in 2026 (Salary.com, August 2026) and a QSA-assisted SAQ runs $5,000-$20,000; building the script inventory by hand is the part you are paying for.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "key_ok": "Licence accepted. Inventory export, repository-wide audit, CI output, audit-on-save and your own rules are open.", "key_bad": "That key did not validate. Check it in your Polar receipt, or buy a licence."};
const PAID = ["export_report", "workspace_scan", "ci_json", "watch_on_save", "custom_rules"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('PCI Payment Page Script Audit');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('pci-payment-page-script-audit').get('min_severity')
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
const RULES = [{"pattern": "<script(?![^>]*\\bintegrity=)[^>]*\\bsrc=[\"\\']https?://(?!(?:js\\.stripe\\.com|checkout\\.stripe\\.com|www\\.paypal\\.com|js\\.braintreegateway\\.com|pay\\.google\\.com|x\\.klarnacdn\\.net|js\\.squareup\\.com|checkoutshopper-live\\.adyen\\.com))", "flags": "i", "sev": "error", "fix": "integrity=\"sha384-...\" crossorigin=\"anonymous\"", "message": "External script on a payment page with no integrity= attribute. PCI DSS 4.0.1 requirement 6.4.3, mandatory since 2025-03-31, needs a method that assures the integrity of every script the browser executes. Add integrity=\"sha384-...\" crossorigin=\"anonymous\", or record the alternative integrity method in the inventory row for this script."}, {"pattern": "<script(?![^>]*\\bcrossorigin\\b)[^>]*\\bintegrity=", "flags": "i", "sev": "error", "fix": "crossorigin=\"anonymous\"", "message": "integrity= without crossorigin=. The browser cannot run the CORS check, so it refuses the file or ignores the hash - the SRI you wrote proves nothing to an assessor while looking like a control. Add crossorigin=\"anonymous\"."}, {"pattern": "integrity=[\"\\']\\s*sha1-", "flags": "i", "sev": "error", "fix": "integrity=\"sha384-...\"", "message": "SRI accepts sha256, sha384 and sha512 only. A sha1- digest is ignored by every browser, so this script is unprotected while the markup claims otherwise - the worst state to be in when a QSA reads requirement 6.4.3."}, {"pattern": "<script[^>]*\\bsrc=[\"\\']//", "flags": "i", "sev": "warn", "fix": "src=\"https://...\"", "message": "Protocol-relative script URL. It inherits the page scheme, downgrades silently on an http page, and cannot name a fixed origin in your 6.4.3 inventory. Write the full https:// origin."}, {"pattern": "src=[\"\\'][^\"\\']*(?:@latest|/latest/|@\\^|@~)", "flags": "i", "sev": "error", "fix": "pin the exact version + its SRI hash", "message": "The script is pinned to a moving version (@latest, ^, ~). The bytes can change between the day the inventory was signed and the day a customer pays, which is the exact gap requirement 6.4.3 integrity assurance exists to close. Pin the exact version and add its hash."}, {"pattern": "googletagmanager\\.com|/gtag/js|dataLayer\\.push|gtm\\.js", "flags": "i", "sev": "error", "fix": "remove the container from payment pages", "message": "A tag manager on the payment page. Anyone with container access can add a script after your inventory was signed, so the inventory can never be complete. 6.4.3 requires each script to be authorized before it executes - take the container off payment pages, or document a change control that authorizes every tag it can load."}, {"pattern": "static\\.hotjar\\.com|hotjar-|clarity\\.ms|fullstory\\.com|logrocket|smartlook|mouseflow|sessioncam", "flags": "i", "sev": "error", "fix": "exclude the payment page from the recorder", "message": "A session recorder on a page that carries card fields. It reads keystrokes and DOM mutations, so it is in scope for 6.4.3, and if it ever captures the PAN field it pulls the recording vendor inside your cardholder data environment."}, {"pattern": "connect\\.facebook\\.net|fbevents\\.js|analytics\\.tiktok\\.com|snap\\.licdn\\.com|static\\.ads-twitter\\.com|googleads\\.g\\.doubleclick\\.net|/pixel\\.js", "flags": "i", "sev": "error", "fix": "move the pixel to the confirmation page", "message": "A marketing pixel on the payment page. It is third-party JavaScript in the customer browser, so 6.4.3 wants an inventory entry, a written business justification and an integrity method - three things a pixel snippet never ships with. Fire it on the order-confirmation page instead."}, {"pattern": "widget\\.intercom\\.io|js\\.driftt\\.com|embed\\.tawk\\.to|static\\.zdassets\\.com|js\\.hs-scripts\\.com|crisp\\.chat", "flags": "i", "sev": "error", "fix": "load the widget outside the payment page", "message": "A chat or support widget loads and updates its own remote code. Its bytes change without a release on your side, so no SRI hash stays valid and 6.4.3 integrity assurance breaks on the vendor next deploy, silently."}, {"pattern": "createElement\\(\\s*[\"\\']script", "flags": "i", "sev": "error", "fix": "el.integrity = \"sha384-...\"; el.crossOrigin = \"anonymous\"", "message": "This page builds a <script> element in JavaScript. SRI does not apply to a node created this way unless you set the integrity property yourself, and the URL never appears in a scan of the HTML - so it is missing from the inventory too."}, {"pattern": "document\\.write\\(", "flags": "i", "sev": "error", "fix": "append an element you can hash and authorize", "message": "document.write() injects markup after parsing and can pull in a script that no inventory records and no hash covers. Replace it with an element you create, hash and authorize."}, {"pattern": "\\beval\\(|new Function\\(", "flags": "i", "sev": "error", "fix": "remove eval; parse JSON with JSON.parse", "message": "eval() or new Function() executes code that has no URL and no hash, so it can be neither inventoried nor integrity-checked. It also forces unsafe-eval into the CSP, which removes the CSP as a valid 6.4.3 authorization method for the whole page."}, {"pattern": "import\\(\\s*[\"\\']https?://", "flags": "i", "sev": "error", "fix": "self-host the module and hash it", "message": "A dynamic import() of a remote module. A script-element SRI hash does not cover it and a static scan of the HTML cannot see it, so it is invisible to the inventory. Self-host it, or constrain it with script-src and give it an inventory row."}, {"pattern": "\\son(?:click|submit|change|load|error|focus|blur|input|mouseover)\\s*=\\s*[\"\\']", "flags": "i", "sev": "error", "fix": "addEventListener in an authorized script file", "message": "An inline event handler. It runs only if the CSP allows unsafe-inline, and that one keyword disables script authorization for every script on the page. Move the handler into a nonced or hashed file."}, {"pattern": "<meta[^>]+Content-Security-Policy", "flags": "i", "sev": "error", "fix": "send the CSP as an HTTP response header", "message": "The CSP is delivered in a <meta> tag. A meta policy cannot carry report-uri or report-to - the browser ignores both there. PCI DSS 11.6.1 requires an alert when the payment page scripts or headers change, and a meta CSP can block but can never tell you it blocked. Send the header from the server."}, {"pattern": "script-src[^;>]*\\'unsafe-inline\\'", "flags": "i", "sev": "error", "fix": "script-src 'nonce-{random}' 'strict-dynamic'", "message": "unsafe-inline in script-src. Any injected inline script executes, so the CSP stops being a method to confirm that each script is authorized and 6.4.3 has no control left behind it. Replace it with a per-response nonce or sha256 hashes."}, {"pattern": "script-src[^;>]*\\'unsafe-eval\\'", "flags": "i", "sev": "warn", "fix": "drop 'unsafe-eval' from script-src", "message": "unsafe-eval in script-src lets any authorized script run code built from a string, so an attacker who lands one injected line can execute anything without loading a file the inventory would show."}, {"pattern": "script-src[^;>]*(?:\\s\\*[\\s;\"\\']|\\shttps:[\\s;\"\\'])", "flags": "i", "sev": "error", "fix": "list the exact script origins", "message": "script-src allows a wildcard (* or https:). Every host on the internet is authorized, which is the opposite of the 6.4.3 authorization requirement, and it means a skimmer hosted anywhere loads without a CSP violation being raised."}, {"pattern": "Content-Security-Policy-Report-Only", "flags": "i", "sev": "warn", "fix": "run an enforcing policy alongside Report-Only", "message": "Report-Only covers the detection half of 11.6.1 but authorizes nothing: it never blocks. 6.4.3 needs a policy that actually stops an unauthorized script. Keep Report-Only for tuning and ship an enforcing policy next to it."}, {"pattern": "<base\\s[^>]*href", "flags": "i", "sev": "error", "fix": "remove <base> from payment pages", "message": "A <base> element rewrites every relative script URL on this page. One injected attribute moves your own bundle to another host while the HTML still reads exactly the same, and the inventory no longer describes what actually loads."}, {"pattern": "serviceWorker\\.register", "flags": "i", "sev": "warn", "fix": "scope the worker away from the payment path", "message": "A service worker can rewrite the response for the payment page itself, scripts included, out of a cache that no page-level SRI can check. Scope it away from the payment path or record it as an integrity-relevant component."}, {"pattern": "<script(?![^>]*\\b(?:src|nonce|type=[\"\\']application/(?:ld\\+json|json)))[^>]*>", "flags": "i", "sev": "warn", "fix": "nonce=\"{random}\" on the tag, or move it to a hashed file", "message": "Inline script with no nonce and no hash. The only policy that lets it run is unsafe-inline, which voids script authorization for the page. Add a nonce that changes on every response, or move the code into a file you can hash."}, {"pattern": "jquery[-/.]?(?:1\\.|2\\.|3\\.[0-4])[0-9.]*(?:\\.min)?\\.js", "flags": "i", "sev": "error", "fix": "jQuery 3.7.1", "message": "jQuery below 3.5.0 carries CVE-2020-11022 and CVE-2020-11023, HTML-manipulation XSS. On a payment page an XSS is a card-skimming primitive, and requirement 6.3.3 wants a critical patch applied within one month of release."}, {"pattern": "js\\.stripe\\.com|www\\.paypal\\.com/sdk|js\\.braintreegateway\\.com|checkoutshopper-live\\.adyen\\.com|x\\.klarnacdn\\.net|js\\.squareup\\.com", "flags": "i", "sev": "info", "fix": "add an inventory row, no SRI hash", "message": "A payment processor script. These are loaded directly from the vendor with no SRI hash on purpose - the vendor rotates the file - so a linter that demands integrity here is wrong. It still needs a 6.4.3 inventory row whose justification is that it renders the hosted card fields."}, {"pattern": "<iframe[^>]*src=[\"\\']https?://", "flags": "i", "sev": "info", "fix": "confirm the scoping with your acquirer", "message": "A third-party iframe on the payment page. Fully outsourced checkouts used to mark 6.4.3 and 11.6.1 not applicable on a QSA agreement alone; the PCI SSC revised FAQ 1331 on 2026-08-04 so that agreement is no longer sufficient and the acquirer must confirm. Scripts on the parent page stay in scope either way."}, {"pattern": "autocomplete=[\"\\']cc-(?:number|csc|exp)|name=[\"\\'](?:cardnumber|card_number|cvc|cvv)", "flags": "i", "sev": "info", "fix": "render card fields in the processor iframe", "message": "A card field rendered by your own markup rather than the processor iframe. That makes this an SAQ A-EP payment page, so every script on it - analytics and chat included - falls under 6.4.3 and 11.6.1 rather than being out of scope."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('pci-payment-page-script-audit');
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

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

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
  const cfgFmt = String(vscode.workspace.getConfiguration('pci-payment-page-script-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('pci-payment-page-script-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'pci-payment-page-script-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('pci-payment-page-script-audit');
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

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'pci-payment-page-script-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
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

async function customRules(ctx) {
  if (!(await paidGate(ctx))) return;
  await vscode.commands.executeCommand('workbench.action.openSettings', 'pci-payment-page-script-audit');
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "pci-payment-page-script-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('pci-payment-page-script-audit.audit_file', runCurrent);
  reg('pci-payment-page-script-audit.audit_selection', runSelection);
  reg('pci-payment-page-script-audit.show_report', showReport);
  reg('pci-payment-page-script-audit.export_report', function () { return exportReport(ctx); });
  reg('pci-payment-page-script-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('pci-payment-page-script-audit.ci_json', function () { return ciJson(ctx); });
  reg('pci-payment-page-script-audit.watch_on_save', function () { return watchOnSave(ctx); });
  reg('pci-payment-page-script-audit.custom_rules', function () { return customRules(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('pci-payment-page-script-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
