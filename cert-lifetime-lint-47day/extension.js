// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking for certificate lifetime assumptions", "done": "Certificate lifetime findings are listed in the output panel.", "nothing_found": "No certificate lifetime assumptions found in this file.", "paste": "Paste a cert-manager Certificate, a Terraform file, a renewal cron line or a runbook page", "check": "Check this file", "need_key": "Full version: scan every file in the repository at once, fail a CI build on a finding, export the audit file, and rewrite the offending durations in place. $29 once - one licence key per person or team seat - 7-day full refund. Hosted certificate monitors bill $17-19 every month for watching certificates after they are issued.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "key_ok": "Licence accepted. The repository scan, CI output, export and rewrite are unlocked.", "key_bad": "That key did not validate. Check it was copied whole, then try again.", "extra_rules": "Extra rules of your own, checked alongside the 24 that ship inside."};
const PAID = ["workspace_scan", "ci_json", "export_report", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Cert Lifetime Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('cert-lifetime-lint-47day').get('min_severity')
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
const RULES = [{"pattern": "duration:\\s*(?:4[89]\\d{2}|[5-9]\\d{3}|\\d{5,})h\\b", "flags": "", "sev": "error", "message": "duration of 4800h (200 days) or more. The public TLS maximum has been 200 days since 2026-03-15 (CA/B SC-081v3) - the CA will refuse this or silently truncate it.", "fix": "duration: 2400h (100 days) is already inside the 2027-03-15 limit", "replace": "duration: 2400h"}, {"pattern": "duration:\\s*(?:2[5-9]\\d{2}|3\\d{3}|4[0-7]\\d{2})h\\b", "flags": "", "sev": "warn", "message": "duration between 100 and 200 days. Legal today, refused from 2027-03-15 when the maximum drops to 100 days (2400h).", "fix": "duration: 2160h (90 days) survives the 2027-03-15 step", "replace": "duration: 2160h"}, {"pattern": "duration:\\s*\\d+d\\b", "flags": "", "sev": "error", "message": "cert-manager duration is a Go duration and accepts only h, m and s - a 'd' suffix is rejected outright. 90 days is 2160h.", "fix": "write the value in hours: 90d becomes 2160h"}, {"pattern": "renewBefore:\\s*(?:2[4-9]\\d{2}|[3-9]\\d{3}|\\d{5,})h\\b", "flags": "", "sev": "error", "message": "renewBefore of 2400h (100 days) or more will exceed the entire certificate lifetime from 2027-03-15, and cert-manager will renew in a loop.", "fix": "renewBefore: 720h (30 days) leaves room at every step of the schedule", "replace": "renewBefore: 720h"}, {"pattern": "validity_period_hours\\s*=\\s*(?:4[89]\\d{2}|[5-9]\\d{3}|\\d{5,})\\b", "flags": "", "sev": "error", "message": "validity_period_hours of 4800 (200 days) or more exceeds the CA/B maximum in force since 2026-03-15.", "fix": "validity_period_hours = 2400", "replace": "validity_period_hours = 2400"}, {"pattern": "early_renewal_hours\\s*=\\s*(?:[1-9]\\d{3,})\\b", "flags": "", "sev": "warn", "message": "early_renewal_hours of 1000+ assumes a long-lived certificate. At 47 days (1128h, from 2029-03-15) this triggers a renewal on nearly every apply.", "fix": "keep early_renewal_hours under one third of the certificate lifetime"}, {"pattern": "-days\\s+(?:[3-9]\\d{2}|\\d{4,})\\b", "flags": "", "sev": "warn", "message": "-days of 300 or more. For a publicly trusted certificate the maximum has been 200 days since 2026-03-15 and drops to 100 on 2027-03-15. (A private root CA may legitimately use a long value.)", "fix": "-days 90 for anything a browser must trust", "replace": "-days 90"}, {"pattern": "\"expiry\"\\s*:\\s*\"(?:4[89]\\d{2}|[5-9]\\d{3}|\\d{5,})h\"", "flags": "", "sev": "error", "message": "cfssl expiry of 4800h (200 days) or more exceeds the CA/B maximum in force since 2026-03-15.", "fix": "\"expiry\": \"2160h\"", "replace": "\"expiry\": \"2160h\""}, {"pattern": "--not-after[= ](?:4[89]\\d{2}|[5-9]\\d{3}|\\d{5,})h\\b", "flags": "", "sev": "warn", "message": "step-ca --not-after of 4800h (200 days) or more exceeds the public maximum in force since 2026-03-15.", "fix": "--not-after=2160h"}, {"pattern": "-validity\\s+(?:[3-9]\\d{2}|\\d{4,})\\b", "flags": "", "sev": "warn", "message": "keytool -validity of 300 days or more. Publicly trusted certificates cap at 200 days since 2026-03-15.", "fix": "-validity 90", "replace": "-validity 90"}, {"pattern": "@(?:yearly|annually)\\b.{0,60}\\b(?:certbot|acme|lego|dehydrated|getssl|cert)\\b", "flags": "i", "sev": "error", "message": "a yearly certificate renewal schedule. No publicly trusted certificate has lasted a year since 2026-03-15 - this leaves the service expired for most of the year.", "fix": "run the renewal daily; ACME clients no-op until renewal is due"}, {"pattern": "@monthly\\b.{0,60}\\b(?:certbot|acme|lego|dehydrated|getssl|cert)\\b", "flags": "i", "sev": "warn", "message": "a monthly renewal schedule. Let's Encrypt's default classic profile drops to 64 days on 2027-02-10 and 45 days on 2028-02-16, which leaves a single monthly run as the only retry.", "fix": "run the renewal daily so a failed attempt has 29 more chances"}, {"pattern": "OnCalendar\\s*=\\s*(?:monthly|yearly|annually)\\b", "flags": "i", "sev": "error", "message": "a systemd timer firing monthly or yearly for certificate renewal. Let's Encrypt's default drops to 64 days on 2027-02-10; the CA/B maximum reaches 47 days on 2029-03-15.", "fix": "OnCalendar=daily with RandomizedDelaySec", "replace": "OnCalendar=daily"}, {"pattern": "(?:let'?s\\s*encrypt|letsencrypt).{0,40}\\b90[\\s-]*day", "flags": "i", "sev": "warn", "message": "Let's Encrypt certificates are not fixed at 90 days. The default classic profile becomes 64 days on 2027-02-10 and 45 days on 2028-02-16, and the shortlived profile is 160 hours.", "fix": "read the lifetime from the issued certificate instead of hardcoding it"}, {"pattern": "probe_ssl_earliest_cert_expiry.{0,60}86400\\s*\\*\\s*(?:[3-9]\\d|\\d{3,})\\b", "flags": "", "sev": "warn", "message": "an expiry alert at 30 days or more remaining. Against a 47-day certificate (from 2029-03-15) that alert is breached for most of the certificate lifetime.", "fix": "alert on renewal failure and on age, not on a fixed days-remaining number"}, {"pattern": "\\b(?:ssl|cert|certificate)[_-]?(?:expiry|expiration|days_left|daysleft)\\b[^\\n]{0,40}\\b(?:30|45|60|90|120)\\b", "flags": "i", "sev": "warn", "message": "a fixed days-remaining threshold. With 100-day certificates (2027-03-15) and 47-day certificates (2029-03-15) a 60 or 90 day threshold is breached the moment the certificate is issued.", "fix": "express the threshold as a fraction of the certificate lifetime"}, {"pattern": "\\b(?:365|398|825)\\s*\\*\\s*24\\s*\\*\\s*(?:60\\s*\\*\\s*60|3600)\\b", "flags": "", "sev": "warn", "message": "a one-year (or old 398/825-day) certificate constant in code. The maximum has been 200 days since 2026-03-15.", "fix": "read notAfter from the certificate rather than computing it"}, {"pattern": "\\b(?:notAfter|not_after|expiresIn|expires_in|validityDays|validity_days|certValidity|cert_validity)\\b\\s*[=:]\\s*(?:2[1-9]\\d|[3-9]\\d{2}|\\d{4,})\\b", "flags": "", "sev": "error", "message": "a hardcoded certificate validity of more than 200 days. The maximum is 200 days now, 100 from 2027-03-15 and 47 from 2029-03-15.", "fix": "set the value to 90 or read it from the issued certificate"}, {"pattern": "\\b825[\\s-]*days?\\b", "flags": "i", "sev": "error", "message": "825 days has not been a valid maximum since 2020-09-01. It is 200 days as of 2026-03-15.", "fix": "replace with 200 days, and note the 2027-03-15 drop to 100"}, {"pattern": "\\b398[\\s-]*days?\\b", "flags": "i", "sev": "error", "message": "398 days stopped being the maximum on 2026-03-15. It is 200 days now, 100 from 2027-03-15 and 47 from 2029-03-15.", "fix": "replace with 200 days and record the next two step dates"}, {"pattern": "\\b(?:valid|validity|lifetime|expires?)\\b[^\\n]{0,30}\\b(?:one|1)\\s*[-\\s]?year\\b", "flags": "i", "sev": "warn", "message": "a one-year certificate lifetime. No publicly trusted certificate has been issuable for a year since 2026-03-15.", "fix": "state 200 days, and the 2027-03-15 drop to 100 days"}, {"pattern": "\\b(?:two|2)\\s*[-\\s]?years?\\b[^\\n]{0,25}\\b(?:cert|ssl|tls)", "flags": "i", "sev": "error", "message": "two-year certificates ended on 2018-03-01. The maximum is 200 days as of 2026-03-15.", "fix": "replace with 200 days"}, {"pattern": "\\bpin-sha256\\b", "flags": "i", "sev": "warn", "message": "HPKP style pinning against certificates that now rotate at least twice a year, and roughly eight times a year from 2029-03-15. Every missed backup pin is an outage.", "fix": "pin to the issuing CA, or drop pinning and rely on CT monitoring"}, {"pattern": "\\b(?:sha256[_-]?fingerprint|certificateFingerprint|CERT_FINGERPRINT|pinned_?certificates?)\\b", "flags": "i", "sev": "warn", "message": "a pinned certificate fingerprint breaks on every renewal - twice a year since 2026-03-15, four times from 2027-03-15 and roughly eight times from 2029-03-15.", "fix": "pin the public key or the issuing CA, not the leaf fingerprint"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('cert-lifetime-lint-47day');
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
  const _c = vscode.workspace.getConfiguration('cert-lifetime-lint-47day');
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
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cert-lifetime-lint-47day-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
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
  const cfgFmt = String(vscode.workspace.getConfiguration('cert-lifetime-lint-47day').get('reportFormat')
    || vscode.workspace.getConfiguration('cert-lifetime-lint-47day').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cert-lifetime-lint-47day-report.' + pick.toLowerCase());
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

function activate(ctx) {
  try { lic.pullFeed(ctx, "cert-lifetime-lint-47day").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('cert-lifetime-lint-47day.audit_file', runCurrent);
  reg('cert-lifetime-lint-47day.show_report', showReport);
  reg('cert-lifetime-lint-47day.list_rules', listRules);
  reg('cert-lifetime-lint-47day.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('cert-lifetime-lint-47day.ci_json', function () { return ciJson(ctx); });
  reg('cert-lifetime-lint-47day.export_report', function () { return exportReport(ctx); });
  reg('cert-lifetime-lint-47day.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('cert-lifetime-lint-47day').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
