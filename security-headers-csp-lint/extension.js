// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Check this file's security headers", "check": "Check", "paste": "Paste your _headers, netlify.toml, nginx.conf or the <meta http-equiv> line here", "done": "Check complete - findings are listed below.", "nothing_found": "No dead or silently-ignored security header lines found in this file.", "extra_rules": "Extra rules of your own, checked alongside the 28 that ship inside.", "need_key": "Full version: scan every config file in the workspace, export the report as CSV, JSON or HTML for a PCI evidence pack, fail CI on errors, add your own house rules, re-check on save, and apply the safe fixes. $29 once - one licence key per person or team seat - 7-day full refund. Application security consultants doing secure code review bill roughly $120 to $275 an hour, and a security-header and CSP review is a one-to-two hour job per site.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted - workspace scan, export, CI output, custom rules, watch and quick fix are on.", "key_bad": "That licence key was not accepted. Check for stray spaces, or paste the key exactly as it arrived by email."};
const PAID = ["workspace_scan", "export_report", "ci_json", "custom_rules", "watch_on_save", "quick_fix"];
const NEED_KEY = S.need_key;   // ★원문을 붙잡아 둔다 — 두 번 물어도 문장이 겹치지 않는다
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Security Headers Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('security-headers-csp-lint').get('min_severity')
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
const RULES = [{"pattern": "X-XSS-Protection", "sev": "error", "message": "Dead header. Chrome removed the XSS Auditor in 2019, Edge followed, and Firefox never shipped it, so this line changes nothing in any browser you can install today. The value 1; mode=block was itself exploitable for cross-site info leaks, which is why it was removed. Delete it and let Content-Security-Policy do the work.", "flags": "i", "fix": "# delete this line - Content-Security-Policy replaces it"}, {"pattern": "Public-Key-Pins", "sev": "error", "message": "HTTP Public Key Pinning is gone. Chrome removed it in 2019 and Firefox followed, so no current browser reads this header and it protects nothing. It was removed because a stale or lost pin bricks your own domain for the whole pin lifetime. Certificate Transparency monitoring plus a CAA record is the live replacement.", "flags": "i", "fix": "# delete - use CAA records and CT monitoring"}, {"pattern": "Expect-CT", "sev": "error", "message": "Expect-CT is obsolete and Chrome stopped enforcing it in 2022. Certificate Transparency is now required unconditionally for every publicly trusted certificate, so the header has nothing left to opt into and is ignored wherever it is sent.", "flags": "i", "fix": "# delete - CT is enforced unconditionally now"}, {"pattern": "X-(?:Content-Security-Policy|WebKit-CSP)", "sev": "error", "message": "Vendor-prefixed CSP header from the IE10 and old-WebKit era. Nothing released this decade reads it, so every directive on this line is inert - the page has no policy at all while the config looks like it does. The header name is Content-Security-Policy, with no prefix.", "flags": "i", "fix": "Content-Security-Policy: ..."}, {"pattern": "X-Frame-Options\\s*[:=]\\s*[\"\\']?\\s*ALLOW-FROM", "sev": "error", "message": "ALLOW-FROM was only ever implemented by IE and old Firefox. Chrome and Safari have never supported it and treat the whole header as invalid, which can leave the page framable by anyone at all - the opposite of what this line intends. CSP frame-ancestors is the specified replacement and it takes a source list.", "flags": "i", "fix": "Content-Security-Policy: frame-ancestors 'self' https://partner.example;"}, {"pattern": "Feature-Policy\\s*[:=]", "sev": "error", "message": "Feature-Policy was renamed to Permissions-Policy and Chrome dropped the old name. The syntax changed with it: Feature-Policy wrote geolocation 'none', Permissions-Policy writes geolocation=(). Copying the old header across keeps none of its restrictions, so every feature stays at its permissive default.", "flags": "i", "fix": "Permissions-Policy: geolocation=(), camera=(), microphone=()"}, {"pattern": "(Permissions-Policy[^\\n]*?\\b(?:geolocation|camera|microphone|payment|fullscreen|autoplay|usb|midi|display-capture|screen-wake-lock|accelerometer|gyroscope))\\s+[\"\\'](?:none|self)[\"\\']", "sev": "error", "message": "Permissions-Policy is a structured field: you write geolocation=() for nobody and geolocation=(self) for your own origin. The quoted Feature-Policy spelling is a parse error, and a browser that cannot parse a structured header discards the entire header - so every permission listed on this line, not just this one, goes back to its default.", "flags": "i", "fix": "Permissions-Policy: geolocation=(), camera=(self)"}, {"pattern": "((?:[a-z]+-src|Content-Security-Policy|frame-ancestors|form-action|base-uri)[^\\n]*?[^\\'\"a-zA-Z0-9_-])(unsafe-inline|unsafe-eval|unsafe-hashes|strict-dynamic|self|none)([^\\'\"a-zA-Z0-9_-]|$)", "sev": "error", "message": "CSP keywords are only keywords inside single quotes. Written bare, self, none, unsafe-inline and strict-dynamic are parsed as host names, so the browser goes looking for a server literally called self and the restriction you meant to set is simply absent. Nothing is logged, the policy still applies, and it applies wrongly.", "fix": "script-src 'self'", "replace": "$1'$2'$3"}, {"pattern": "'nonce-[A-Za-z0-9+/=_-]{6,}'", "sev": "error", "message": "A hard-coded nonce is exactly as weak as 'unsafe-inline'. The value must be unpredictable and regenerated for every response; one that sits in a config file or a checked-in page is known to anyone who reads it, so an injected script simply carries the same nonce. Generate it per request, or move to hashes.", "fix": "'nonce-{{ generated per request }}'"}, {"pattern": "<meta[^>]*http-equiv=[\"\\']?Content-Security-Policy[^>]*\\b(?:frame-ancestors|sandbox)\\b", "sev": "error", "message": "frame-ancestors and sandbox are discarded when the policy arrives in a meta tag - the specification requires browsers to drop them, because both must apply before the document starts parsing. The rest of the policy still works, so the page looks protected while it stays framable. Send these two as a real HTTP response header.", "flags": "i", "fix": "Content-Security-Policy: frame-ancestors 'none'   (HTTP header, not meta)"}, {"pattern": "<meta[^>]*http-equiv=[\"\\']?X-Frame-Options", "sev": "error", "message": "X-Frame-Options is only honoured as an HTTP response header; in a meta tag browsers ignore it outright, so this page is framable. Use a real header, and prefer CSP frame-ancestors, which is the specified successor and the one that covers nested frames.", "flags": "i", "fix": "Content-Security-Policy: frame-ancestors 'none'   (HTTP header)"}, {"pattern": "script-src[^;\\n]*[\\s\"\\']data:", "sev": "error", "message": "data: inside script-src is a documented full bypass, not a convenience. An injected script tag pointing at a data: URL inherits the permission and runs, so the policy stops nothing it was written to stop. If one library needs it, isolate that page rather than opening the whole policy.", "flags": "i"}, {"pattern": "Strict-Transport-Security[^\\n]*max-age\\s*=\\s*0\\b", "sev": "error", "message": "max-age=0 switches HSTS off and instructs browsers to forget this domain immediately. If it was left in as a placeholder from testing, every returning visitor silently loses HTTPS enforcement and becomes downgradeable again.", "flags": "i", "fix": "Strict-Transport-Security: max-age=31536000; includeSubDomains"}, {"pattern": "Strict-Transport-Security(?![^\\n]*includeSubDomains)[^\\n]*preload", "sev": "error", "message": "The preload list requires all three of max-age at least 31536000, includeSubDomains, and preload. Without includeSubDomains the submission is refused, or an existing entry is removed at the next check - and you keep shipping the token believing you are preloaded.", "flags": "i", "fix": "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"}, {"pattern": "Strict-Transport-Security(?=[^\\n]*preload)[^\\n]*max-age\\s*=\\s*\\d{1,7}(?!\\d)", "sev": "error", "message": "A preload submission needs max-age of at least 31536000 seconds, one year. This value is below that, so hstspreload.org refuses the domain or drops it at the next check while the header keeps claiming preload.", "flags": "i", "fix": "max-age=31536000"}, {"pattern": "(X-Content-Type-Options\\s*[:=]\\s*[\"\\']?)(?!nosniff)([A-Za-z][\\w-]*)", "sev": "error", "message": "nosniff is the only value this header defines; anything else leaves MIME sniffing switched on. That matters most where users upload files: a document served with the wrong Content-Type can still be sniffed into script and executed on your origin.", "flags": "i", "fix": "X-Content-Type-Options: nosniff", "replace": "$1nosniff"}, {"pattern": "'strict-dynamic'", "sev": "warn", "message": "With 'strict-dynamic' a supporting browser ignores every host allowlist in this same directive, and 'self' and 'unsafe-inline' with them - trust comes only from the nonce or hash. So any domain list kept here is dead weight for modern browsers and survives only as a fallback for CSP1-era ones. Confirm a nonce or hash is actually present, or nothing loads."}, {"pattern": "(?:'(?:nonce-|sha(?:256|384|512)-)[^;\\n]*'unsafe-inline'|'unsafe-inline'[^;\\n]*'(?:nonce-|sha(?:256|384|512)-))", "sev": "warn", "message": "'unsafe-inline' is ignored by every CSP2 and later browser when a nonce or hash appears in the same directive; it only takes effect where neither is understood. Keeping it as a deliberate fallback is fine, but if it was added to make something work today then the real cause is elsewhere and this policy is weaker than it reads."}, {"pattern": "script-src[^;\\n]*[\\s\"\\'](?:\\*|https:)(?=[\\s;\"\\']|$)", "sev": "warn", "message": "script-src * or https: permits script from any host on the web, which is not a meaningful restriction - one uploadable or open-redirect host anywhere is enough to defeat it. Host allowlists were found bypassable on the large majority of real policies; nonce or hash based policies with 'strict-dynamic' are the recommended shape.", "flags": "i"}, {"pattern": "block-all-mixed-content", "sev": "warn", "message": "Obsolete directive, removed from the specification. Browsers now upgrade or block mixed content unconditionally, so this line does nothing. It is harmless in itself, but it hides the fact that nothing here is actually controlling mixed content.", "flags": "i"}, {"pattern": "prefetch-src", "sev": "warn", "message": "prefetch-src was removed from CSP and dropped by Chrome; no shipping browser enforces it. Prefetches fall under default-src instead, so if you meant to restrict them, set default-src.", "flags": "i"}, {"pattern": "plugin-types", "sev": "warn", "message": "plugin-types was removed from CSP Level 3, and from Chrome along with plugin support itself. It restricts nothing today. object-src 'none' is the directive that still matters for embedded content.", "flags": "i"}, {"pattern": "(?:Content-Security-Policy|-src)[^\\n]*[;\\s]referrer\\s+(?:no-referrer|origin|unsafe-url|none|default|same-origin)", "sev": "warn", "message": "referrer was an experimental CSP1-era directive and was removed; it is not part of CSP and browsers ignore it inside this header. Referrer control has its own header, Referrer-Policy, and the values are not spelled the same.", "flags": "i", "fix": "Referrer-Policy: strict-origin-when-cross-origin"}, {"pattern": "report-uri", "sev": "warn", "message": "report-uri is deprecated, and a browser that supports report-to ignores report-uri entirely - so violation reports quietly stop arriving while the dashboard still looks alive. During a migration keep both: report-uri for older browsers, report-to plus a Reporting-Endpoints header for current ones.", "flags": "i", "fix": "report-to csp-endpoint"}, {"pattern": "[;\\s]report-to\\s+[A-Za-z]", "sev": "info", "message": "report-to names a reporting group, not a URL. That group has to be defined by a Reporting-Endpoints header on the same response; without it nothing is ever sent, and the policy looks monitored when it is not. Check that Reporting-Endpoints is set alongside this header.", "flags": "i", "fix": "Reporting-Endpoints: csp-endpoint=\"https://example.com/csp-reports\""}, {"pattern": "Content-Security-Policy-Report-Only", "sev": "info", "message": "Report-Only enforces nothing - it records violations and lets every one of them through. That is the right way to trial a policy, but it is not protection, and a site that only ever ships this header has no CSP in force.", "flags": "i"}, {"pattern": "^(?:(?![^\\n]*base-uri)|(?![^\\n]*form-action))[^\\n]*default-src", "sev": "info", "message": "default-src does not cover base-uri, form-action, frame-ancestors, sandbox or the reporting directives - those fall back to nothing, not to default-src. This line sets default-src but not both base-uri and form-action, so unless they appear elsewhere in the policy, an injected base tag or a rewritten form action still exfiltrates under an otherwise strict default-src.", "flags": "i", "fix": "base-uri 'self'; form-action 'self';"}, {"pattern": "'unsafe-eval'", "sev": "info", "message": "'unsafe-eval' re-enables eval, new Function and string timers, which is a large part of what CSP exists to stop. It is usually dragged in by a single dependency rather than your own code, so it is worth finding which one - most current build setups no longer need it."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('security-headers-csp-lint');
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

// ★무료 — ★마지막 결과 패널을 다시 연다
async function showReport() { out().show(true); }

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

// ★유료 — ★역방향 체험. ★첫 스윕부터 7일간 키 없이 ★전체 스윕과 보고서를 ★줄이지 않고 그대로 준다.
//   ⛔그 뒤에야 키를 묻는다 — 그때는 손님이 ★자기 폴더에서 본 숫자를 안내 문장에 실어 보낸다.
//   ★막히면 null, 지나가면 { inTrial, st }.
async function trialGate(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + 7 * 24 * 3600 * 1000; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found ' + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  return { inTrial: inTrial, st: st };
}

async function scanWorkspace(ctx) {
  const t = await trialGate(ctx);
  if (!t) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('security-headers-csp-lint');
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
  // ★손님이 자기 폴더에서 본 숫자를 적어 둔다 — 체험이 끝난 뒤 키를 물을 때 이 숫자로 묻는다.
  await t.st.update('lastSweep', { files: files.length, findings: n, at: new Date().toISOString().slice(0, 10) });
  vscode.window.showInformationMessage((n ? S.done : S.nothing_found) + (t.inTrial ? TRIAL_NOTE : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const t = await trialGate(ctx);
  if (!t) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('security-headers-csp-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('security-headers-csp-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'security-headers-csp-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath + (t.inTrial ? TRIAL_NOTE : ''));
}

async function ciJson(ctx) {
  const t = await trialGate(ctx);
  if (!t) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'security-headers-csp-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath + (t.inTrial ? TRIAL_NOTE : ''));
}

async function customRules(ctx) {
  if (!(await paidGate(ctx))) return;
  await vscode.commands.executeCommand('workbench.action.openSettings', 'security-headers-csp-lint');
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
  try { lic.pullFeed(ctx, "security-headers-csp-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('security-headers-csp-lint.audit_file', runCurrent);
  reg('security-headers-csp-lint.audit_selection', runSelection);
  reg('security-headers-csp-lint.list_rules', listRules);
  reg('security-headers-csp-lint.show_report', showReport);
  reg('security-headers-csp-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('security-headers-csp-lint.export_report', function () { return exportReport(ctx); });
  reg('security-headers-csp-lint.ci_json', function () { return ciJson(ctx); });
  reg('security-headers-csp-lint.custom_rules', function () { return customRules(ctx); });
  reg('security-headers-csp-lint.watch_on_save', function () { return watchOnSave(ctx); });
  reg('security-headers-csp-lint.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('security-headers-csp-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
