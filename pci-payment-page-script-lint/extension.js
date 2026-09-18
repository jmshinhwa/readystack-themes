// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Re-checking this file on every save.", "done": "Findings are in the output panel.", "nothing_found": "No 6.4.3 or 11.6.1 findings in this file.", "need_key": "Full version: Runs the same rules across the whole repository, exports the findings as the CSV, JSON or HTML evidence file an assessor asks for, re-checks on every save, and writes a machine-readable report a CI step can read. $29 once - one licence key per person or team seat - 7-day full refund. Vendor script-monitoring tools for 6.4.3 and 11.6.1 run $99-$999 per month, and 1-5 checkout pages typically cost $10,000-$50,000 a year.", "key_ok": "Licence accepted. The full version is on.", "key_bad": "That licence key was not accepted. Check it against your Polar receipt email.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "paste": "Paste your checkout page here - HTML, JSX, a PHP or Twig template, or your script-inventory JSON.", "check": "Check this page", "extra_rules": "Extra regular-expression rules of your own, checked alongside the ones that ship inside."};
const PAID = ["workspace_scan", "export_report", "watch_on_save", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('PCI 6.4.3 Payment Page Script Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('pci-payment-page-script-lint').get('min_severity')
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
const RULES = [{"pattern": "<script[^>]+src\\s*=\\s*[\"\\']http:", "flags": "i", "sev": "error", "message": "6.4.3 - script loaded over plain HTTP: its content can be altered in transit and no integrity assurance is possible. Serve it over https:// and add an SRI hash."}, {"pattern": "<script(?![^>]*\\bintegrity\\s*=)[^>]*\\bsrc\\s*=\\s*[\"\\']https?://", "flags": "i", "sev": "error", "message": "6.4.3 - external script with no integrity attribute: you cannot show it was not tampered with. Add an SRI sha384 hash, or record the alternative assurance method in your script inventory."}, {"pattern": "<script(?=[^>]*\\bintegrity\\s*=)(?![^>]*\\bcrossorigin)[^>]*>", "flags": "i", "sev": "error", "message": "6.4.3 - integrity is set but crossorigin is missing: the browser silently skips SRI checking for a cross-origin script. Add crossorigin=\"anonymous\"."}, {"pattern": "integrity\\s*=\\s*[\"\\'](?:sha1|md5)-", "flags": "i", "sev": "error", "message": "6.4.3 - SRI digest uses sha1 or md5. Only sha256, sha384 and sha512 are accepted as integrity assurance."}, {"pattern": "src\\s*=\\s*[\"\\'][^\"\\']*(?:cdn\\.jsdelivr\\.net|unpkg\\.com|cdnjs\\.cloudflare\\.com)[^\"\\']*@latest", "flags": "i", "sev": "error", "message": "6.4.3 and 11.6.1 - CDN script pinned to @latest: its content can change without notice, so neither the authorisation nor the change detection can hold. Pin an exact version."}, {"pattern": "googletagmanager\\.com/(?:gtm\\.js|gtag/js)|google-analytics\\.com/analytics\\.js", "flags": "i", "sev": "error", "message": "6.4.3 - a tag manager or analytics loader on a payment page can inject further scripts at run time, so the page script list cannot be inventoried from the source. Move it off the payment page, or inventory and authorise every container tag."}, {"pattern": "(?:intercom|widget\\.drift|zendesk|hotjar|fullstory|optimizely|vwo\\.com|clarity\\.ms|livechatinc|tawk\\.to)", "flags": "i", "sev": "error", "message": "6.4.3 - third-party widget (chat, A/B test or session recorder) on a payment page: each one needs a written business justification and a recorded authorisation, and session recorders can capture cardholder data from the form."}, {"pattern": "document\\.write\\s*\\(", "flags": "", "sev": "error", "message": "6.4.3 - document.write() injects markup at run time, so the injected resource never appears in the page source and cannot be inventoried or authorised."}, {"pattern": "\\beval\\s*\\(|new\\s+Function\\s*\\(", "flags": "", "sev": "error", "message": "6.4.3 - eval() or new Function() executes code that is not in your script inventory, and forces 'unsafe-eval' in the CSP."}, {"pattern": "\\.innerHTML\\s*=", "flags": "", "sev": "warn", "message": "6.4.3 - innerHTML assignment can insert script tags or event handlers that are in no inventory. Use textContent, or sanitise before assigning."}, {"pattern": "(?:script-src|default-src)[^;\\\"']*'unsafe-inline'", "flags": "i", "sev": "error", "message": "6.4.3 - the CSP allows 'unsafe-inline', so any injected inline script still executes and the CSP cannot serve as your authorisation method."}, {"pattern": "(?:script-src|default-src)\\s+[^;\"\\']*\\*(?:\\s|;|\"|\\')", "flags": "i", "sev": "error", "message": "6.4.3 - the CSP script source is a wildcard: every origin is authorised, which is the same as having no authorisation method at all."}, {"pattern": "Content-Security-Policy-Report-Only", "flags": "i", "sev": "warn", "message": "6.4.3 - the CSP is report-only: it records violations and blocks nothing, so on its own it is neither an authorisation nor an integrity control."}, {"pattern": "<script(?![^>]*\\b(?:src|nonce|integrity)\\s*=)[^>]*>", "flags": "i", "sev": "warn", "message": "6.4.3 - inline script block with no nonce: nothing authorises this block. Give it a nonce your CSP names, or move the code into a file that carries an SRI hash."}, {"pattern": "<[a-z][^>]*\\son(?:click|load|error|submit|change|mouseover)\\s*=", "flags": "i", "sev": "warn", "message": "6.4.3 - inline event handler requires 'unsafe-inline' in the CSP, which disables the CSP as an authorisation control. Bind the handler inside an authorised script file."}, {"pattern": "navigator\\.serviceWorker\\.register", "flags": "", "sev": "error", "message": "6.4.3 and 11.6.1 - a service worker can rewrite the payment page after it loads, and the rewritten content never reaches server-side change detection. Keep the worker scope off the payment path."}, {"pattern": "(?:localStorage|sessionStorage)\\.setItem\\s*\\(\\s*[\"\\'][^\"\\']*(?:card|pan|cvv|cvc|track)", "flags": "i", "sev": "error", "message": "3.2.1 and 6.4.3 - card data is being written into browser storage. Cardholder data must not be stored client side, and any script on the page can read it."}, {"pattern": "fetch\\s*\\(\\s*[\"\\']https?://|new\\s+WebSocket\\s*\\(\\s*[\"\\']wss?://", "flags": "i", "sev": "warn", "message": "11.6.1 - the page sends data to an external origin from script. Confirm the destination is authorised and covered by your weekly change detection, or it is an unmonitored exfiltration path."}, {"pattern": "<link(?![^>]*\\bintegrity\\s*=)[^>]*\\brel\\s*=\\s*[\"\\']stylesheet[\"\\'][^>]*\\bhref\\s*=\\s*[\"\\']https?://", "flags": "i", "sev": "warn", "message": "6.4.3 - third-party stylesheet with no integrity attribute. Injected CSS can capture keystrokes on a payment form, so stylesheets need the same integrity assurance as scripts."}, {"pattern": "name\\s*=\\s*[\"\\'](?:cardnumber|card_number|cc-number|card-number|cvc|cvv|securitycode)|autocomplete\\s*=\\s*[\"\\']cc-", "flags": "i", "sev": "info", "message": "In scope - a card data field is on this page, so Requirements 6.4.3 and 11.6.1 apply to every script here."}, {"pattern": "<iframe[^>]+src\\s*=\\s*[\"\\'][^\"\\']*(?:stripe|braintree|adyen|paypal|checkout|payments?)", "flags": "i", "sev": "info", "message": "In scope - even when the card fields sit inside a payment provider iframe, the page that embeds it must still meet 6.4.3 and 11.6.1. Since v4.0.1 this includes SAQ A merchants."}, {"sev": "error", "message": "6.4.3 - this inventory has no scripts list, so nothing is inventoried.", "json": {"kind": "doc", "paths": ["scripts", "inventory", "payment_page_scripts"]}}, {"sev": "error", "message": "6.4.3 - the inventory does not name which payment pages it covers.", "json": {"kind": "doc", "paths": ["payment_pages", "pages", "urls", "scope"]}}, {"sev": "error", "message": "11.6.1 - the inventory records no review date, so there is no evidence of the weekly check.", "json": {"kind": "doc", "paths": ["last_reviewed", "reviewed_at", "last_review", "reviewed"]}}, {"sev": "error", "message": "6.4.3 - inventory entries with no script URL or source recorded", "json": {"kind": "each", "list": "scripts", "paths": ["url", "src", "source"]}}, {"sev": "error", "message": "6.4.3 - inventory entries with no written business justification", "json": {"kind": "each", "list": "scripts", "paths": ["justification", "business_justification", "reason"]}}, {"sev": "error", "message": "6.4.3 - inventory entries with no recorded authorisation", "json": {"kind": "each", "list": "scripts", "paths": ["authorized_by", "authorised_by", "approved_by"]}}, {"sev": "error", "message": "6.4.3 - inventory entries with no integrity assurance method recorded", "json": {"kind": "each", "list": "scripts", "paths": ["integrity", "sri", "hash", "integrity_method"]}}, {"sev": "warn", "message": "6.4.3 - the justification is a placeholder, not a business reason", "json": {"kind": "each_bad", "list": "scripts", "path": "justification", "bad": ["n/a", "na", "tbd", "todo", "none", "-", "unknown", "required", "needed", "tbc", "?"]}}];

// ★JSON 구조 검사 (s138) — ⛔줄 정규식이 ★못 보는 것을 본다: 문서 전체의 빠진 칸 · 목록 각 칸의 빠진 칸.
//   ★어휘 넷뿐이다: doc(문서에 이 칸이 있나) · ver(판 번호가 기준 이상인가)
//                  each(목록의 각 칸에 이 칸이 있나) · each_bad(값이 쓸모없는 값인가)
var JRULES = [{"sev": "error", "message": "6.4.3 - this inventory has no scripts list, so nothing is inventoried.", "json": {"kind": "doc", "paths": ["scripts", "inventory", "payment_page_scripts"]}}, {"sev": "error", "message": "6.4.3 - the inventory does not name which payment pages it covers.", "json": {"kind": "doc", "paths": ["payment_pages", "pages", "urls", "scope"]}}, {"sev": "error", "message": "11.6.1 - the inventory records no review date, so there is no evidence of the weekly check.", "json": {"kind": "doc", "paths": ["last_reviewed", "reviewed_at", "last_review", "reviewed"]}}, {"sev": "error", "message": "6.4.3 - inventory entries with no script URL or source recorded", "json": {"kind": "each", "list": "scripts", "paths": ["url", "src", "source"]}}, {"sev": "error", "message": "6.4.3 - inventory entries with no written business justification", "json": {"kind": "each", "list": "scripts", "paths": ["justification", "business_justification", "reason"]}}, {"sev": "error", "message": "6.4.3 - inventory entries with no recorded authorisation", "json": {"kind": "each", "list": "scripts", "paths": ["authorized_by", "authorised_by", "approved_by"]}}, {"sev": "error", "message": "6.4.3 - inventory entries with no integrity assurance method recorded", "json": {"kind": "each", "list": "scripts", "paths": ["integrity", "sri", "hash", "integrity_method"]}}, {"sev": "warn", "message": "6.4.3 - the justification is a placeholder, not a business reason", "json": {"kind": "each_bad", "list": "scripts", "path": "justification", "bad": ["n/a", "na", "tbd", "todo", "none", "-", "unknown", "required", "needed", "tbc", "?"]}}];
function jHas(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}
function jVal(o, p) {
  var parts = String(p).split('.'), cur = o, i, k, got;
  for (i = 0; i < parts.length; i++) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {                       // ★목록을 만나면 ★남은 길을 각 칸에 물어본다
      for (k = 0; k < cur.length; k++) {
        got = jVal(cur[k], parts.slice(i).join('.'));
        if (jHas(got)) return got;
      }
      return undefined;
    }
    if (typeof cur !== 'object') return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}
function jAny(o, paths) {
  for (var i = 0; i < (paths || []).length; i++) { if (jHas(jVal(o, paths[i]))) return true; }
  return false;
}
function jNum(s) {
  var m = String(s === undefined || s === null ? '' : s).match(/(\d+(?:\.\d+)*)/);
  return m ? m[1].split('.').map(Number) : null;
}
function jCmp(a, b) {
  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    var x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function jWhen(doc, w) {
  if (!w) return true;
  var v = jVal(doc, w.path);
  if (w.eq !== undefined) return String(jHas(v) ? v : '').toLowerCase() === String(w.eq).toLowerCase();
  if (w.has !== undefined) {
    var s = Array.isArray(v) ? v.join(' ') : String(jHas(v) ? v : '');
    return s.toLowerCase().indexOf(String(w.has).toLowerCase()) >= 0;
  }
  return jHas(v);
}
function jList(doc, j) {
  var arr = jVal(doc, j.list);
  if (!Array.isArray(arr)) return [];
  if (!j.filter) return arr;
  return arr.filter(function (e) {
    var v = jVal(e, j.filter.path);
    var s = Array.isArray(v) ? v.join(' ') : String(jHas(v) ? v : '');
    return s.toLowerCase().indexOf(String(j.filter.has).toLowerCase()) >= 0;
  });
}
function jLine(raw, needle) {
  if (!needle) return 1;
  var s = String(raw), i = s.indexOf(JSON.stringify(String(needle)));
  if (i < 0) i = s.indexOf(String(needle));
  if (i < 0) return 1;
  return s.slice(0, i).split(/\r?\n/).length;
}
function jName(e) {
  if (!e || typeof e !== 'object') return '';
  return String(e.name || e.packageName || e['bom-ref'] || e.bomRef || e.SPDXID || e.spdxId || '');
}
// ⇒ ★JSON 이 아니면 null 을 돌려준다 (그러면 ★줄 규칙만 돈다)
function analyzeJson(raw) {
  var doc;
  try { doc = JSON.parse(raw); } catch (e) { return null; }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  var hits = [], i, r, j;
  for (i = 0; i < JRULES.length; i++) {
    r = JRULES[i]; j = r.json || {};
    if (!jWhen(doc, j.when)) continue;
    if (j.kind === 'doc') {
      if (!jAny(doc, j.paths)) hits.push({ line: 1, msg: r.message, sev: r.sev || 'warn' });
    } else if (j.kind === 'ver') {
      var got = jNum(jVal(doc, j.path)), min = jNum(j.min);
      if (!got) hits.push({ line: 1, msg: r.message + ' — found: none', sev: r.sev || 'error' });
      else if (jCmp(got, min) < 0) hits.push({ line: jLine(raw, j.path),
        msg: r.message + ' — found: ' + got.join('.'), sev: r.sev || 'error' });
    } else if (j.kind === 'each' || j.kind === 'each_bad') {
      var arr = jList(doc, j), miss = [], k, e, v, sv;
      for (k = 0; k < arr.length; k++) {
        e = arr[k];
        if (j.kind === 'each') { if (!jAny(e, j.paths)) miss.push(e); }
        else {
          v = jVal(e, j.path);
          sv = jHas(v) ? String(v).trim().toLowerCase() : '';
          if ((j.bad || []).indexOf(sv) >= 0) miss.push(e);
        }
      }
      if (miss.length) {
        var ex = miss.slice(0, 4).map(jName).filter(Boolean);
        hits.push({ line: jLine(raw, jName(miss[0])),
          msg: r.message + ' — ' + miss.length + ' of ' + arr.length
               + (ex.length ? ' (e.g. ' + ex.join(', ') + ')' : ''),
          sev: r.sev || 'error' });
      }
    }
  }
  return hits;
}

function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('pci-payment-page-script-lint');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  // ★s138 — ★구조 규칙을 ★먼저. ⛔JSON 이 아니면 null 이라 ★줄 규칙만 돈다.
  const hits = (JRULES.length ? (analyzeJson(text) || []) : []);
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      if (!r || !r.pattern) continue;   // ★s138 — ★구조 규칙은 ★정규식이 없다. ⛔건너뛴다.
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
  const _c = vscode.workspace.getConfiguration('pci-payment-page-script-lint');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('pci-payment-page-script-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('pci-payment-page-script-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'pci-payment-page-script-lint-report.' + pick.toLowerCase());
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
  const uri = vscode.Uri.joinPath(ws[0].uri, 'pci-payment-page-script-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "pci-payment-page-script-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('pci-payment-page-script-lint.audit_file', runCurrent);
  reg('pci-payment-page-script-lint.audit_selection', runSelection);
  reg('pci-payment-page-script-lint.list_rules', listRules);
  reg('pci-payment-page-script-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('pci-payment-page-script-lint.export_report', function () { return exportReport(ctx); });
  reg('pci-payment-page-script-lint.watch_on_save', function () { return watchOnSave(ctx); });
  reg('pci-payment-page-script-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('pci-payment-page-script-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
