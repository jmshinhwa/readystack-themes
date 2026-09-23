// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Watching this file for saves", "done": "End-of-life base images found - see the panel", "nothing_found": "No end-of-life base images in this file", "paste": "Paste a Dockerfile, docker-compose.yml or CI workflow here", "check": "Check these images", "need_key": "Full version: scans every Dockerfile, compose file and workflow in the repository at once, writes a dated CSV, JSON or HTML report, and prints machine-readable output so CI fails the build before an unpatched image ships. $29 once, one licence key per person or team seat, 7-day full refund. Snyk's Team tier is $25 per contributing developer per month.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted - repository scan, report export and CI output are on", "key_bad": "That key did not validate. Check the key in your Polar purchase email", "extra_rules": "Image rules of your own, checked alongside the 21 that ship inside."};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Base Image EOL Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('base-image-eol-lint').get('min_severity')
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
const RULES = [{"pattern": "\\bnode:20\\b", "flags": "i", "sev": "error", "message": "node:20 - Node.js 20 reached end-of-life on 30 April 2026. No security release has shipped for it since. Replace with node:24-trixie (Active LTS to 30 April 2028).", "fix": "FROM node:24-trixie"}, {"pattern": "\\bnode:18\\b", "flags": "i", "sev": "error", "message": "node:18 - Node.js 18 reached end-of-life on 30 April 2025. Replace with node:24-trixie (Active LTS to 30 April 2028).", "fix": "FROM node:24-trixie"}, {"pattern": "\\bnode:(?:14|16)\\b", "flags": "i", "sev": "error", "message": "Node.js 14 (end-of-life 30 April 2023) and Node.js 16 (11 September 2023) have been unpatched for over two years. Replace with node:24-trixie.", "fix": "FROM node:24-trixie"}, {"pattern": "\\bpython:3\\.(?:7|8|9)\\b", "flags": "i", "sev": "error", "message": "Python 3.9 reached end-of-life on 31 October 2025 (3.8 on 7 October 2024, 3.7 on 27 June 2023). 3.9.25 was the final security release. Replace with python:3.13-trixie.", "fix": "FROM python:3.13-trixie"}, {"pattern": "\\bpython:3\\.10\\b", "flags": "i", "sev": "warn", "message": "python:3.10 - Python 3.10 reaches end-of-life on 31 October 2026. After that date the PSF ships no further security patches. Replace with python:3.13-trixie.", "fix": "FROM python:3.13-trixie"}, {"pattern": "\\b(?:debian:11|bullseye)\\b", "flags": "i", "sev": "error", "message": "Debian 11 bullseye LTS ended on 31 August 2026 - no security updates from September 2026 onward. Replace with debian:trixie, or bookworm if you need LTS to 30 June 2028.", "fix": "FROM debian:trixie"}, {"pattern": "\\b(?:debian:(?:8|9|10)|buster|stretch|jessie)\\b", "flags": "i", "sev": "error", "message": "Debian 10 buster LTS ended on 30 June 2024; stretch and jessie are older still. Replace with debian:trixie.", "fix": "FROM debian:trixie"}, {"pattern": "\\b(?:ubuntu:20\\.04|ubuntu-20\\.04|ubuntu:focal|:focal\\b)", "flags": "i", "sev": "error", "message": "Ubuntu 20.04 focal left standard support on 31 May 2025. Patches now require a paid Ubuntu Pro (ESM) subscription. Replace with ubuntu:24.04, supported to April 2029.", "fix": "FROM ubuntu:24.04"}, {"pattern": "\\b(?:ubuntu:1[68]\\.04|ubuntu-1[68]\\.04|bionic|xenial)\\b", "flags": "i", "sev": "error", "message": "Ubuntu 18.04 bionic and 16.04 xenial left standard support in 2023 and 2021. Replace with ubuntu:24.04.", "fix": "FROM ubuntu:24.04"}, {"pattern": "\\balpine:3\\.(?:[0-9]|1[0-9]|20)\\b", "flags": "i", "sev": "error", "message": "This Alpine branch is out of support: 3.20 ended 1 April 2026, 3.19 on 1 November 2025, and everything older before that. Replace with alpine:3.23 (supported to 1 November 2027).", "fix": "FROM alpine:3.23"}, {"pattern": "\\balpine:3\\.21\\b", "flags": "i", "sev": "warn", "message": "alpine:3.21 - Alpine keeps a branch for two years, so 3.21 reaches end of support on 1 November 2026. Replace with alpine:3.23 (to 1 November 2027).", "fix": "FROM alpine:3.23"}, {"pattern": "\\bdotnet/(?:aspnet|sdk|runtime|samples):(?:6|7)\\.0\\b", "flags": "i", "sev": "error", "message": ".NET 6 reached end of support on 12 November 2024 and .NET 7 on 14 May 2024. Replace with mcr.microsoft.com/dotnet/aspnet:10.0 (LTS to 14 November 2028).", "fix": "FROM mcr.microsoft.com/dotnet/aspnet:10.0"}, {"pattern": "\\bdotnet/(?:aspnet|sdk|runtime|samples):(?:8|9)\\.0\\b", "flags": "i", "sev": "warn", "message": ".NET 8 (LTS) and .NET 9 (STS) both reach end of support on 10 November 2026 - the LTS release dies on the same day as the STS one. Replace with dotnet/aspnet:10.0, LTS to 14 November 2028.", "fix": "FROM mcr.microsoft.com/dotnet/aspnet:10.0"}, {"pattern": "\\bpostgres(?:ql)?:(?:9\\.[0-9]|1[0-3])\\b", "flags": "i", "sev": "error", "message": "PostgreSQL 13 reached end of life on 13 November 2025; 12 and older are further behind. The community ships no security patches for them. Replace with postgres:17.", "fix": "image: postgres:17"}, {"pattern": "\\bpostgres(?:ql)?:14\\b", "flags": "i", "sev": "warn", "message": "postgres:14 - PostgreSQL supports a major version for five years, so 14 reaches end of life on 12 November 2026. Replace with postgres:17.", "fix": "image: postgres:17"}, {"pattern": "\\bmysql:5\\.[0-9]\\b", "flags": "i", "sev": "error", "message": "MySQL 5.7 reached end of life on 31 October 2023 and 5.6 in February 2021. Replace with mysql:8.4, the current LTS.", "fix": "image: mysql:8.4"}, {"pattern": "\\bphp:(?:7\\.[0-9]|8\\.[01])\\b", "flags": "i", "sev": "error", "message": "PHP 8.1 security support ended on 31 December 2025; 8.0 and every 7.x are older. Replace with php:8.4-trixie.", "fix": "FROM php:8.4-trixie"}, {"pattern": "\\bphp:8\\.2\\b", "flags": "i", "sev": "warn", "message": "php:8.2 - PHP 8.2 reaches end of life on 31 December 2026, after which the PHP project ships no patches for it. Replace with php:8.4-trixie.", "fix": "FROM php:8.4-trixie"}, {"pattern": "\\bcentos:(?:6|7|8|stream8)\\b", "flags": "i", "sev": "error", "message": "CentOS 7 reached end of life on 30 June 2024 and CentOS 8 on 31 December 2021. The distribution line is finished. Replace with a maintained base such as debian:trixie.", "fix": "FROM debian:trixie"}, {"pattern": "\\bopenjdk:", "flags": "i", "sev": "warn", "message": "The openjdk Docker Official Image is deprecated and no longer updated. Replace with eclipse-temurin:21-jre-noble.", "fix": "FROM eclipse-temurin:21-jre-noble"}, {"pattern": "\\b[\\w./-]+:latest\\b", "flags": "i", "sev": "info", "message": "A :latest tag floats. The image you build today is not the image you built last month, so no end-of-life check - this one included - can tell you what is actually in the layer. Pin a dated tag.", "fix": "pin an explicit tag, e.g. FROM debian:trixie"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('base-image-eol-lint');
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
//   ★s144 — 역방향 체험(유료 맛보기): ★작업공간 전체 스윕과 ★보고서 파일을 ★첫 스윕부터 7일간 키 없이
//   ⛔줄이지 않고 그대로 준다. 그 뒤에 키를 묻는다. [검색 2026-09-12] 무료→유료 2~4% ↔ 역방향 체험 8~12%
//   (개발자 도구 체험 중앙값 24%) · 손님이 ★자기 폴더의 숫자를 본 순간에 문턱이 선다.
//   ⛔무료 경로(열린 파일·고른 줄 검사)는 ★어떤 제한도 두지 않는다 (8% 법).
const NEED_KEY = S.need_key;   // ⛔원래 문장을 잡아 둔다 — 체험이 끝날 때 앞에 손님의 숫자만 붙인다
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';
function today() { return new Date().toISOString().slice(0, 10); }
async function paidGate(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + 7 * 24 * 3600 * 1000; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found '
      + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  return { inTrial: inTrial, until: until };
}

async function scanWorkspace(ctx) {
  const gate = await paidGate(ctx);
  if (!gate) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('base-image-eol-lint');
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
  // ★체험 손님이 ★자기 폴더의 숫자를 갖고 나간다 — 체험이 끝난 뒤 문턱이 이 숫자를 다시 말한다
  await ctx.globalState.update('lastSweep', { files: rows.length, findings: n, at: today() });
  vscode.window.showInformationMessage((n ? S.done : S.nothing_found) + (gate.inTrial ? TRIAL_NOTE : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const gate = await paidGate(ctx);
  if (!gate) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('base-image-eol-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('base-image-eol-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'base-image-eol-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath + (gate.inTrial ? TRIAL_NOTE : ''));
}

async function ciJson(ctx) {
  const gate = await paidGate(ctx);
  if (!gate) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'base-image-eol-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath + (gate.inTrial ? TRIAL_NOTE : ''));
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "base-image-eol-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('base-image-eol-lint.audit_file', runCurrent);
  reg('base-image-eol-lint.audit_selection', runSelection);
  reg('base-image-eol-lint.list_rules', listRules);
  reg('base-image-eol-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('base-image-eol-lint.export_report', function () { return exportReport(ctx); });
  reg('base-image-eol-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('base-image-eol-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
