// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking", "check": "Check this config", "paste": "Paste an openssl command, a Terraform file, a cert-manager Certificate or an nginx block", "done": "Findings are in the TLS Cert Lifetime Lint panel", "nothing_found": "Nothing in this file breaks under the SC-081v3 schedule", "need_key": "Full version: scan every file in the repo, take the findings away as CSV, JSON or HTML, and emit CI JSON so a pull request fails before an over-length certificate reaches production. $29 once - one licence key per person or team seat - 7-day full refund. A certificate lifecycle management platform starts at $50,000-$100,000 a year plus $1-$5 per certificate (Keyfactor Command, 2026 vendor pricing).", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted - the full version is unlocked", "key_bad": "That key did not validate. Check it, or use the 7-day refund window", "extra_rules": "Extra patterns of your own, checked alongside the 12 that ship inside."};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('TLS Cert Lifetime Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('tls-cert-lifetime-lint').get('min_severity')
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
const RULES = [{"id": "openssl-days-over-200", "pattern": "-days[\\s=]+(?:[1-9][0-9]{3,}|[3-9][0-9]{2}|2(?:[1-9][0-9]|0[1-9]))\\b", "flags": "", "sev": "error", "message": "openssl -days is over 200. Since 2026-03-15 a publicly trusted TLS certificate may not exceed 200 days (CA/Browser Forum ballot SC-081v3), and the cap falls to 100 days on 2027-03-15. A public CA will refuse or truncate this request.", "fix": "Use -days 90 and let ACME renew, or keep this key for an internal CA only."}, {"id": "openssl-days-101-200", "pattern": "-days[\\s=]+(?:1(?:[1-9][0-9]|0[1-9])|200)\\b", "flags": "", "sev": "warn", "message": "openssl -days is between 101 and 200. That is inside the 200-day cap in force today but over the 100-day cap that starts 2027-03-15 (SC-081v3). This request stops working on that date.", "fix": "Move to a 90-day ACME renewal before 2027-03-15."}, {"id": "tf-validity-hours-over-4800", "pattern": "validity_period_hours\\s*=\\s*(?:[1-9][0-9]{5,}|[1-9][0-9]{4}|[5-9][0-9]{3}|49[0-9]{2}|48[1-9][0-9]|480[1-9])\\b", "flags": "", "sev": "error", "message": "Terraform validity_period_hours is over 4800 hours (200 days), the public TLS maximum in force since 2026-03-15. On 2027-03-15 the ceiling becomes 2400 hours and on 2029-03-15 it becomes 1128 hours (47 days) - SC-081v3.", "fix": "Set validity_period_hours = 2160 (90 days) and drive renewal from ACME."}, {"id": "certmanager-duration-over-4800h", "pattern": "duration:\\s*\\\"?(?:[1-9][0-9]{5,}|[1-9][0-9]{4}|[5-9][0-9]{3}|49[0-9]{2}|48[1-9][0-9]|480[1-9])h\\b", "flags": "", "sev": "error", "message": "cert-manager duration is over 4800h (200 days). A publicly trusted issuer cannot honour it under SC-081v3; the certificate comes back shorter than the manifest claims, so renewBefore is computed against a lifetime that does not exist.", "fix": "duration: 2160h with renewBefore: 720h, and let the issuer own the schedule."}, {"id": "certmanager-duration-2401-4800h", "pattern": "duration:\\s*\\\"?(?:2(?:[5-9][0-9]{2}|4(?:[1-9][0-9]|0[1-9]))|3[0-9]{3}|4[0-7][0-9]{2}|4800)h\\b", "flags": "", "sev": "warn", "message": "cert-manager duration is between 2401h and 4800h. Legal today, refused from 2027-03-15 when the public TLS maximum drops to 100 days (2400h) - SC-081v3.", "fix": "Set duration: 2160h now so the 2027 change is a no-op."}, {"id": "expiry-alert-too-late", "pattern": "(?:cert(?:ificate)?[_-]?expiry|expiry[_-]?days|days[_-]?(?:until|to|before)[_-]?expir\\w*|expires?[_-]?in[_-]?days)\\D{0,12}\\b(?:[0-9]|1[0-9]|2[01])\\b", "flags": "i", "sev": "warn", "message": "This expiry alert only fires with 21 days or less left. Under a 100-day certificate (2027-03-15) and a 47-day certificate (2029-03-15) the renewal window has already closed by then, so the page arrives after the outage is unavoidable.", "fix": "Alert at one third of the certificate lifetime - 33 days for a 100-day certificate, 15 for a 47-day one."}, {"id": "hpkp-public-key-pins", "pattern": "Public-Key-Pins(?:-Report-Only)?\\b", "flags": "i", "sev": "error", "message": "HTTP Public Key Pinning is being sent. Every major browser removed support for it, and a pin set outlives a certificate that is now re-keyed every 47 to 100 days, so it locks visitors out of the site it was meant to protect.", "fix": "Delete the header; use a CAA record plus Certificate Transparency monitoring instead."}, {"id": "tls-1-0-1-1-enabled", "pattern": "(?:ssl_protocols|SSLProtocol|sslProtocols|ssl_min_version|minimum_protocol_version)\\b[^\\n]*\\bTLSv?1(?:[._]?[01])?(?![.\\d])", "flags": "", "sev": "error", "message": "TLS 1.0 or TLS 1.1 is still enabled. RFC 8996 deprecated both, current browsers refuse them, and PCI DSS forbids them for cardholder data.", "fix": "Leave only TLSv1.2 and TLSv1.3 on this directive."}, {"id": "go-mintls-10-11", "pattern": "tls\\.VersionTLS1[01]\\b", "flags": "", "sev": "error", "replace": "tls.VersionTLS12", "message": "Go tls.Config MinVersion is pinned to TLS 1.0 or 1.1, both deprecated by RFC 8996. Anything negotiating down to them is a downgrade path you are keeping open on purpose.", "fix": "MinVersion: tls.VersionTLS12"}, {"id": "sha1-signature", "pattern": "-sha1\\b", "flags": "", "sev": "error", "replace": "-sha256", "message": "SHA-1 signing is requested. Public CAs stopped signing SHA-1 certificates in 2016 and browsers reject the chain outright, so this certificate cannot be used on a public endpoint.", "fix": "-sha256"}, {"id": "rsa-key-under-2048", "pattern": "\\brsa:(?:512|1024)\\b", "flags": "", "sev": "error", "replace": "rsa:2048", "message": "An RSA key under 2048 bits is being generated. NIST SP 800-131A disallows it and no publicly trusted CA will sign it, so the request fails at issuance rather than at deployment.", "fix": "rsa:2048, or an EC P-256 key with -newkey ec -pkeyopt ec_paramgen_curve:P-256."}, {"id": "stale-max-lifetime-claim", "pattern": "\\b(?:397|398|825)\\b[^\\n]{0,24}\\bdays?\\b|\\bdays?\\b[^\\n]{0,24}\\b(?:397|398|825)\\b", "flags": "i", "sev": "warn", "message": "This text still states the old 397, 398 or 825-day maximum. The public TLS maximum has been 200 days since 2026-03-15, becomes 100 days on 2027-03-15 and 47 days on 2029-03-15 (SC-081v3), so anyone planning a renewal from this line plans it wrong.", "fix": "State the current cap and the two dated step-downs."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('tls-cert-lifetime-lint');
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
//   ★s144 역방향 체험 — ★첫 스윕부터 7일은 ★키 없이 ★전체 스윕과 보고서를 ★줄이지 않고 그대로 준다.
//     [검색 2026-09-12] freemium 2~4% ↔ reverse trial 8~12% · 손님이 정하는 순간은 ★자기 폴더의 숫자를 본 뒤다.
//     ⛔무료 경로(열린 파일·고른 줄)에는 어떤 제한도 두지 않는다 (8% 법).
const BASE_NEED_KEY = S.need_key;                 // ⛔원문을 지킨다 — 앞말이 겹쳐 붙지 않도록
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';
function today() { return new Date().toISOString().slice(0, 10); }

async function paidGate(ctx) {
  const st = ctx.globalState; const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + 7 * 24 * 3600 * 1000; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    // ★체험이 끝나면 ★손님 자신의 숫자로 묻는다 (endowment)
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found ' + last.findings + ' findings. ') : '') + BASE_NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return { ok: false, inTrial: false };
  }
  return { ok: true, inTrial: inTrial };
}

async function scanWorkspace(ctx) {
  const gate = await paidGate(ctx);
  if (!gate.ok) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('tls-cert-lifetime-lint');
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
  const found = report(rows);
  await ctx.globalState.update('lastSweep', { files: files.length, findings: found, at: today() });
  vscode.window.showInformationMessage(S.done + ' \u2014 ' + files.length + ' files, ' + found + ' findings.'
    + (gate.inTrial ? TRIAL_NOTE : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const gate = await paidGate(ctx);
  if (!gate.ok) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('tls-cert-lifetime-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('tls-cert-lifetime-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'tls-cert-lifetime-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath + (gate.inTrial ? TRIAL_NOTE : ''));
}

async function ciJson(ctx) {
  const gate = await paidGate(ctx);
  if (!gate.ok) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'tls-cert-lifetime-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath + (gate.inTrial ? TRIAL_NOTE : ''));
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "tls-cert-lifetime-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('tls-cert-lifetime-lint.audit_file', runCurrent);
  reg('tls-cert-lifetime-lint.audit_selection', runSelection);
  reg('tls-cert-lifetime-lint.list_rules', listRules);
  reg('tls-cert-lifetime-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('tls-cert-lifetime-lint.export_report', function () { return exportReport(ctx); });
  reg('tls-cert-lifetime-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('tls-cert-lifetime-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
