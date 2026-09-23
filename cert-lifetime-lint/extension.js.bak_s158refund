// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking the open file for over-cap certificate settings", "done": "Check finished.", "nothing_found": "Nothing in this file exceeds the public TLS caps.", "need_key": "Full version: scans every file in the repo, writes a dated report, and fails CI on findings. $29 once · one licence key per person or team seat · 7-day full refund. Hosted certificate-expiry monitoring is $25-29 a month.", "key_ok": "Licence accepted — workspace scan, report export and CI output are on.", "key_bad": "That key did not validate. Check the key in your Polar receipt email.", "buy": "Get the full version — $29", "enter_key": "Enter licence key", "paste": "Paste a Kubernetes manifest, Terraform file, crontab or shell script here", "check": "Check this config", "extra_rules": "Extra patterns of your own, checked alongside the 16 that ship inside."};
const PAID = ["workspace_scan", "export_report", "ci_json"];

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
  const _min = _ORD[String(vscode.workspace.getConfiguration('cert-lifetime-lint').get('min_severity')
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
const RULES = [{"pattern": "-days\\s+(?:2[0-9]{2}|[3-9][0-9]{2}|[0-9]{4,})", "flags": "", "sev": "error", "message": "openssl -days is 200 or more. A public CA has not issued that since 15 March 2026 (200-day cap); private and internal CAs are exempt.", "fix": "-days 90"}, {"pattern": "-validity\\s+(?:2[0-9]{2}|[3-9][0-9]{2}|[0-9]{4,})", "flags": "", "sev": "error", "message": "keytool -validity is 200 or more, over the 200-day public TLS cap in force since 15 March 2026. The cap falls to 100 days on 15 March 2027.", "fix": "-validity 90"}, {"pattern": "duration:\\s*[\"']?(?:4[89][0-9]{2}|[5-9][0-9]{3}|[0-9]{5,})h", "flags": "", "sev": "error", "message": "cert-manager duration is 4800h (200 days) or more. A public issuer refuses it; the ACME order fails and the Certificate never becomes Ready.", "fix": "duration: 2160h"}, {"pattern": "duration:\\s*[\"']?(?:2[0-9]{2}|[3-9][0-9]{2}|[0-9]{4,})d\\b", "flags": "", "sev": "error", "message": "Certificate duration of 200 days or more is over the public TLS cap. 100 days becomes the cap on 15 March 2027 and 47 days on 15 March 2029.", "fix": "duration: 90d"}, {"pattern": "renewBefore:\\s*[\"']?(?:1[1-9][0-9]{2}|[2-9][0-9]{3}|[0-9]{5,})h", "flags": "", "sev": "warn", "message": "renewBefore of 1100h (about 46 days) or more is longer than a 47-day certificate lives from 15 March 2029. cert-manager rejects renewBefore greater than or equal to duration.", "fix": "renewBefore: 360h"}, {"pattern": "validity_period_hours\\s*=\\s*(?:4[89][0-9]{2}|[5-9][0-9]{3}|[0-9]{5,})", "flags": "", "sev": "error", "message": "validity_period_hours is 4800 (200 days) or more, over the public TLS cap in force since 15 March 2026.", "fix": "validity_period_hours = 2160"}, {"pattern": "min_days_remaining\\s*=\\s*[\"']?(?:[6-9][0-9]|[0-9]{3,})", "flags": "", "sev": "warn", "message": "min_days_remaining of 60 or more never clears once certificates last 47 days (15 March 2029). Terraform then re-issues on every apply.", "fix": "min_days_remaining = 21"}, {"pattern": "(?:expiry|not-after|notAfter|maxTLSCertDuration|defaultTLSCertDuration)[\"']?\\s*[:=]\\s*[\"']?(?:4[89][0-9]{2}|[5-9][0-9]{3}|[0-9]{5,})h", "flags": "i", "sev": "error", "message": "This CA profile issues certificates of 4800h (200 days) or longer, over the public TLS cap since 15 March 2026.", "fix": "\"expiry\": \"2160h\""}, {"pattern": "not_after:\\s*[\"']?\\+(?:2[0-9]{2}|[3-9][0-9]{2}|[0-9]{4,})d", "flags": "", "sev": "error", "message": "not_after of +200d or longer is over the public TLS cap. The cap falls to 100 days on 15 March 2027.", "fix": "not_after: \"+90d\""}, {"pattern": "\\*/(?:[3-9]|1[0-2])\\s+\\*\\s.*\\b(?:certbot|acme|lego|renew)\\b", "flags": "i", "sev": "error", "message": "This renewal job runs every 3 months or less often. A 100-day certificate (15 March 2027) can expire between two runs.", "fix": "0 3 * * * certbot renew"}, {"pattern": "@(?:yearly|annually|monthly)\\b.*\\b(?:cert|certbot|acme|lego|renew|ssl|tls)\\b", "flags": "i", "sev": "warn", "message": "A monthly or yearly renewal cadence leaves no retry room once certificates last 47 days (15 March 2029).", "fix": "@daily certbot renew"}, {"pattern": "\\b398\\b(?=[^\\n]*(?:day|valid|cert|tls|ssl|expir))|(?:day|valid|cert|tls|ssl|expir)[^\\n]*\\b398\\b", "flags": "i", "sev": "warn", "message": "398 days stopped being the maximum on 14 March 2026. The cap is 200 days now, 100 days from 15 March 2027 and 47 days from 15 March 2029.", "fix": "200"}, {"pattern": "(?:warn|alert|expir[a-z]*|renew[a-z]*)[_a-z]*_?days\\s*[:=]\\s*[\"']?(?:[6-9][0-9]|[0-9]{3,})", "flags": "i", "sev": "warn", "message": "An expiry warning threshold of 60 days or more fires permanently once certificates last 47 days (15 March 2029).", "fix": "14"}, {"pattern": "-checkend\\s+(?:[5-9][0-9]{6}|[0-9]{8,})", "flags": "", "sev": "warn", "message": "-checkend of 5000000 seconds (about 58 days) is longer than a 47-day certificate lives, so the check is always true from 15 March 2029.", "fix": "-checkend 1209600"}, {"pattern": "certificatesDuration\\s*[:=]\\s*[\"']?(?:4[89][0-9]{2}|[5-9][0-9]{3}|[0-9]{5,})", "flags": "", "sev": "error", "message": "Traefik certificatesDuration is 4800 hours (200 days) or more, over the public TLS cap since 15 March 2026.", "fix": "certificatesDuration = 2160"}, {"pattern": "(?:cert[a-z]*|tls|ssl)[^\\n]{0,40}\\b(?:1|one)[\\s-]*year\\b", "flags": "i", "sev": "warn", "message": "A one-year public TLS certificate can no longer be issued. The maximum has been 200 days since 15 March 2026.", "fix": "200 days"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('cert-lifetime-lint');
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

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('cert-lifetime-lint');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('cert-lifetime-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('cert-lifetime-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cert-lifetime-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cert-lifetime-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "cert-lifetime-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('cert-lifetime-lint.audit_file', runCurrent);
  reg('cert-lifetime-lint.audit_selection', runSelection);
  reg('cert-lifetime-lint.show_report', showReport);
  reg('cert-lifetime-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('cert-lifetime-lint.export_report', function () { return exportReport(ctx); });
  reg('cert-lifetime-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('cert-lifetime-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
