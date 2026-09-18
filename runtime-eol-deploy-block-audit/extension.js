// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Watching this file for end-of-life runtimes", "done": "End-of-life and deploy-block findings below.", "nothing_found": "No end-of-life runtimes found here. Every version in this file is still supported.", "need_key": "Full version: scans every Dockerfile, workflow, Lambda config and manifest in the workspace at once and exports the dated audit report. $29 once · one licence key per person or team seat · 7-day full refund. A US platform engineer averages $63.95/hour (ZipRecruiter, September 2026).", "key_ok": "Licence accepted — workspace scan, export, CI output, watch-on-save and custom rules are on.", "key_bad": "That key did not validate. Check for a typo, or use the buy link to get one.", "enter_key": "Enter licence key", "buy": "Get the full version — $29", "paste": "Paste a Dockerfile, a GitHub Actions workflow, serverless.yml, requirements.txt, a .csproj or a Gemfile here", "check": "Check this file"};
const PAID = ["workspace_scan", "export_report", "ci_json", "watch_on_save", "custom_rules"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Runtime EOL Guard');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('runtime-eol-deploy-block-audit').get('min_severity')
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
const RULES = [{"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*node:(?:14|16|18)(?:[.\\-]|\\s|$)", "flags": "i", "message": "Node.js 18 went EOL 2025-04-30 (16: 2023-09-11, 14: 2023-04-30). No upstream security patches exist for this image.", "fix": "node:24", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*node:20(?:[.\\-]|\\s|$)", "flags": "i", "message": "Node.js 20 went EOL 2026-04-30 — it is past end-of-life as of today. This is the version most AI assistants still suggest.", "fix": "node:24", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*node:22(?:[.\\-]|\\s|$)", "flags": "i", "message": "Node.js 22 is in maintenance only; EOL 2027-04-30. Safe today, but plan the move.", "fix": "node:24", "sev": "info"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*python:3\\.(?:6|7|8|9)(?:[.\\-]|\\s|$)", "flags": "i", "message": "Python 3.9 went EOL 2025-10-31 (3.8: 2024-10-07, 3.7: 2023-06-27). No security fixes are published for this image.", "fix": "python:3.13", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*python:3\\.10(?:[.\\-]|\\s|$)", "flags": "i", "message": "Python 3.10 reaches EOL 2026-10-31 — under two months away.", "fix": "python:3.13", "sev": "warn"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*python:3\\.11(?:[.\\-]|\\s|$)", "flags": "i", "message": "Python 3.11 reaches EOL 2027-10-31.", "fix": "python:3.13", "sev": "info"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*php:8\\.(?:0|1)(?:[.\\-]|\\s|$)", "flags": "i", "message": "PHP 8.1 reached EOL 2025-12-31 (8.0: 2023-11-26). Security support has ended.", "fix": "php:8.4", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*php:8\\.2(?:[.\\-]|\\s|$)", "flags": "i", "message": "PHP 8.2 reaches EOL 2026-12-31.", "fix": "php:8.4", "sev": "warn"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*ubuntu:(?:20\\.04|focal)", "flags": "i", "message": "Ubuntu 20.04 LTS reached EOL 2025-05-31. Standard security updates have stopped.", "fix": "ubuntu:24.04", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*ubuntu:(?:22\\.04|jammy)", "flags": "i", "message": "Ubuntu 22.04 standard support ended 2024-09-30; full EOL 2027-06-01.", "fix": "ubuntu:24.04", "sev": "warn"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*debian:(?:11|bullseye)", "flags": "i", "message": "Debian 11 reached EOL 2026-08-31 — nine days ago as of this build.", "fix": "debian:13", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*debian:(?:10|buster|9|stretch)", "flags": "i", "message": "Debian 10 reached EOL 2024-06-30 (9: 2022-07-01).", "fix": "debian:13", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*debian:(?:12|bookworm)", "flags": "i", "message": "Debian 12 passed its LTS handover 2026-07-11; full EOL 2028-06-30.", "fix": "debian:13", "sev": "info"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*alpine:3\\.(?:1[5-9]|20)(?:[.\\-]|\\s|$)", "flags": "i", "message": "Alpine 3.20 reached EOL 2026-04-01 (3.19: 2025-11-01, 3.18: 2025-05-09).", "fix": "alpine:3.23", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*alpine:3\\.21(?:[.\\-]|\\s|$)", "flags": "i", "message": "Alpine 3.21 reaches EOL 2026-11-01.", "fix": "alpine:3.23", "sev": "warn"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*postgres:(?:9|10|11|12|13)(?:[.\\-]|\\s|$)", "flags": "i", "message": "PostgreSQL 13 reached EOL 2025-11-13 (12: 2024-11-21, 11: 2023-11-09). No further security releases.", "fix": "postgres:17", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*postgres:14(?:[.\\-]|\\s|$)", "flags": "i", "message": "PostgreSQL 14 reaches EOL 2026-11-12.", "fix": "postgres:17", "sev": "warn"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*golang:1\\.(?:1[0-9]|2[0-5])(?:[.\\-]|\\s|$)", "flags": "i", "message": "Go 1.25 reached EOL 2026-08-19 (1.24: 2026-02-10). Go supports only the two most recent releases.", "fix": "golang:1.27", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*amazonlinux:2(?:[.\\-]|\\s|$)", "flags": "i", "message": "Amazon Linux 2 reached EOL 2026-06-30.", "fix": "amazonlinux:2023", "sev": "error"}, {"pattern": "^\\s*FROM\\s+.*dotnet/(?:aspnet|sdk|runtime):(?:6|7)\\.0", "flags": "i", "message": ".NET 6 reached EOL 2024-11-12 and .NET 7 reached EOL 2024-05-14.", "fix": "dotnet/aspnet:10.0", "sev": "error"}, {"pattern": "^\\s*FROM\\s+.*dotnet/(?:aspnet|sdk|runtime):(?:8|9)\\.0", "flags": "i", "message": ".NET 8 and .NET 9 both reach EOL 2026-11-10 — the LTS and the STS end on the same day.", "fix": "dotnet/aspnet:10.0", "sev": "warn"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*ruby:3\\.(?:0|1|2)(?:[.\\-]|\\s|$)", "flags": "i", "message": "Ruby 3.2 reached EOL 2026-03-31 (3.1: 2025-03-26, 3.0: 2024-04-23).", "fix": "ruby:3.4", "sev": "error"}, {"pattern": "^\\s*FROM\\s+(?:--\\S+\\s+)?\\S*mongo:(?:6|7|8\\.1|8\\.2)(?:[.\\-]|\\s|$)", "flags": "i", "message": "MongoDB 8.2 reached EOL 2026-07-31 (8.1: 2025-09-30). Rapid releases expire fast; 8.0 runs to 2029-10-31.", "fix": "mongo:8.0", "sev": "error"}, {"pattern": "nodejs20\\.x", "flags": "i", "message": "AWS Lambda nodejs20.x was deprecated 2026-04-30. Lambda blocks NEW function create on 2027-02-01 and blocks UPDATES to existing functions on 2027-03-03 — after that you cannot ship a hotfix to this function.", "fix": "nodejs24.x", "sev": "error"}, {"pattern": "nodejs18\\.x", "flags": "i", "message": "AWS Lambda nodejs18.x was deprecated 2025-09-01. Block function create 2027-02-01; block function update 2027-03-03.", "fix": "nodejs24.x", "sev": "error"}, {"pattern": "nodejs(?:12|14|16)\\.x", "flags": "i", "message": "This AWS Lambda Node.js runtime is deprecated. Block function update is 2027-03-03 for nodejs16.x.", "fix": "nodejs24.x", "sev": "error"}, {"pattern": "[\"\\':= ]python3\\.9\\b", "flags": "i", "message": "AWS Lambda python3.9 was deprecated 2025-12-15. Block function create 2027-02-01; block function update 2027-03-03.", "fix": "python3.13", "sev": "error"}, {"pattern": "[\"\\':= ]python3\\.10\\b", "flags": "i", "message": "AWS Lambda python3.10 deprecates 2026-10-31. Block function create 2027-02-01; block function update 2027-03-03.", "fix": "python3.13", "sev": "warn"}, {"pattern": "[\"\\':= ]python3\\.(?:6|7|8)\\b", "flags": "i", "message": "This AWS Lambda Python runtime is deprecated (3.8: 2024-10-14). Block function update 2027-03-03.", "fix": "python3.13", "sev": "error"}, {"pattern": "[Rr]untime\\s*[:=]\\s*[\"\\']?dotnet(?:6|7)\\b", "flags": "i", "message": "AWS Lambda dotnet6 was deprecated 2024-12-20 (dotnet7: 2024-05-14). Block function update 2027-03-03.", "fix": "dotnet10", "sev": "error"}, {"pattern": "[Rr]untime\\s*[:=]\\s*[\"\\']?dotnet8\\b", "flags": "i", "message": "AWS Lambda dotnet8 deprecates 2026-11-10. Block function create 2027-02-01; block function update 2027-03-03.", "fix": "dotnet10", "sev": "warn"}, {"pattern": "[Rr]untime\\s*[:=]\\s*[\"\\']?ruby3\\.2\\b", "flags": "i", "message": "AWS Lambda ruby3.2 was deprecated 2026-03-31. Block function create 2027-02-01; block function update 2027-03-03.", "fix": "ruby3.4", "sev": "error"}, {"pattern": "[\"\\':= ]go1\\.x\\b", "flags": "i", "message": "AWS Lambda go1.x was deprecated 2024-01-08. Block function update 2027-03-03. Move to provided.al2023 with a custom runtime.", "fix": "provided.al2023", "sev": "error"}, {"pattern": "provided\\.al2(?![0-9])", "flags": "i", "message": "AWS Lambda provided.al2 was deprecated 2026-07-31. Block function create 2027-02-01; block function update 2027-03-03.", "fix": "provided.al2023", "sev": "error"}, {"pattern": "[Rr]untime\\s*[:=]\\s*[\"\\']?(?:java8\\.al2|java11|java17)(?!\\.al2023)\\b", "flags": "i", "message": "This AWS Lambda Java runtime sits on Amazon Linux 2 and deprecates 2027-06-30. The .al2023 variants run to 2029-06-30.", "fix": "java21", "sev": "warn"}, {"pattern": "[Rr]untime\\s*[:=]\\s*[\"\\']?python3\\.11\\b", "flags": "i", "message": "AWS Lambda python3.11 sits on Amazon Linux 2 and deprecates 2027-06-30.", "fix": "python3.13", "sev": "info"}, {"pattern": "runs-on:.*ubuntu-20\\.04", "flags": "i", "message": "The ubuntu-20.04 runner image became fully unsupported 2025-04-15. Jobs on this label fail.", "fix": "ubuntu-24.04", "sev": "error"}, {"pattern": "runs-on:.*ubuntu-22\\.04", "flags": "i", "message": "GitHub begins deprecating the ubuntu-22.04 runner image on 2026-09-17. Brownouts that FAIL jobs run 2027-03-23, 2027-03-30, 2027-04-06 and 2027-04-13; fully unsupported 2027-04-17.", "fix": "ubuntu-24.04", "sev": "warn"}, {"pattern": "runs-on:.*macos-1[123](?![0-9])", "flags": "i", "message": "The macOS 13 runner image was retired 2025-12-04; macOS 12 and 11 are already gone.", "fix": "macos-15", "sev": "error"}, {"pattern": "runs-on:.*windows-2019", "flags": "i", "message": "The windows-2019 runner image became fully unsupported 2025-06-30.", "fix": "windows-2025", "sev": "error"}, {"pattern": "node-version:\\s*[\"\\']?(?:14|16|18|20)(?:[\"\\'\\s.x]|$)", "flags": "i", "message": "actions/setup-node is pinned to an end-of-life Node.js line (20 EOL 2026-04-30, 18 EOL 2025-04-30).", "fix": "node-version: 24", "sev": "error"}, {"pattern": "python-version:\\s*[\"\\']?3\\.(?:7|8|9)(?:[\"\\'\\s.]|$)", "flags": "i", "message": "actions/setup-python is pinned to an end-of-life Python (3.9 EOL 2025-10-31).", "fix": "python-version: \"3.13\"", "sev": "error"}, {"pattern": "python-version:\\s*[\"\\']?3\\.10(?:[\"\\'\\s.]|$)", "flags": "i", "message": "actions/setup-python is pinned to Python 3.10, which reaches EOL 2026-10-31.", "fix": "python-version: \"3.13\"", "sev": "warn"}, {"pattern": "dotnet-version:\\s*[\"\\']?(?:6|7)\\.", "flags": "i", "message": "actions/setup-dotnet is pinned to .NET 6 (EOL 2024-11-12) or .NET 7 (EOL 2024-05-14).", "fix": "dotnet-version: 10.0.x", "sev": "error"}, {"pattern": "\"node\"\\s*:\\s*\"[^\"]*(?:1[468]|20)(?:\\.|\\s|\"|\\})", "flags": "i", "message": "package.json engines.node allows an end-of-life Node.js line (20 EOL 2026-04-30).", "fix": "\"node\": \">=22\"", "sev": "warn"}, {"pattern": "<TargetFramework[s]?>\\s*net(?:6|7)\\.0", "flags": "i", "message": ".NET 6 reached EOL 2024-11-12 and .NET 7 reached EOL 2024-05-14. Builds still work; security patches do not exist.", "fix": "<TargetFramework>net10.0", "sev": "error"}, {"pattern": "<TargetFramework[s]?>\\s*net(?:8|9)\\.0", "flags": "i", "message": ".NET 8 and .NET 9 both reach EOL 2026-11-10.", "fix": "<TargetFramework>net10.0", "sev": "warn"}, {"pattern": "python_requires\\s*=\\s*[\"\\'][^\"\\']*3\\.(?:7|8|9)", "flags": "i", "message": "python_requires still admits an end-of-life Python (3.9 EOL 2025-10-31).", "fix": "python_requires=\">=3.11\"", "sev": "warn"}, {"pattern": "^\\s*[Dd]jango\\s*[=~<>!]=\\s*(?:4\\.2|5\\.0|5\\.1)", "flags": "i", "message": "Django 4.2 LTS reached EOL 2026-04-07 (5.1: 2025-12-03, 5.0: 2025-04-02). Django 5.2 LTS runs to 2028-04-30.", "fix": "Django>=5.2,<6.0", "sev": "error"}, {"pattern": "^\\s*gem\\s+[\"\\']rails[\"\\']\\s*,\\s*[\"\\'][^\"\\']*(?:7\\.0|7\\.1|7\\.2)", "flags": "i", "message": "Rails 7.2 reached EOL 2026-08-09 (7.1: 2025-10-01, 7.0: 2025-04-01).", "fix": "'~> 8.0'", "sev": "error"}, {"pattern": "^\\s*ruby\\s+[\"\\']3\\.(?:0|1|2)", "flags": "i", "message": "The Gemfile pins an end-of-life Ruby (3.2 EOL 2026-03-31, 3.1 EOL 2025-03-26).", "fix": "ruby '3.4'", "sev": "error"}, {"pattern": "spring-boot[^>\\n]*>\\s*3\\.(?:[0-5])\\.", "flags": "i", "message": "Spring Boot 3.5 OSS support ended 2026-06-30 (3.4: 2025-12-31, 3.3: 2025-06-30). 4.0 runs to 2026-12-31.", "fix": "4.1.x", "sev": "error"}, {"pattern": "(?:cluster_version|kubernetesVersion|k8s_version|kubernetes_version)\\s*[:=]\\s*[\"\\']?1\\.(?:2[4-9]|3[0-3])\\b", "flags": "i", "message": "Kubernetes 1.33 reached EOL 2026-06-28 (1.32: 2026-02-28, 1.31: 2025-11-11). Control planes past EOL stop getting patches.", "fix": "1.34", "sev": "error"}, {"pattern": "(?:cluster_version|kubernetesVersion|k8s_version|kubernetes_version)\\s*[:=]\\s*[\"\\']?1\\.34\\b", "flags": "i", "message": "Kubernetes 1.34 reaches EOL 2026-10-27.", "fix": "1.36", "sev": "warn"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('runtime-eol-deploy-block-audit');
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

// ★s144 — reverse trial (paid taste): ★작업공간 전체 스윕 + 보고서를 ★첫 스윕부터 7일간 키 없이 ★줄이지 않고 준다.
//   [검색 2026-09-12] freemium 2~4% ↔ reverse trial 8~12% (개발자 도구 체험 중앙값 24%)
//   · 손님이 돈 낼지 정하는 순간은 ★자기 폴더에서 자기 숫자를 본 뒤다 ⇒ 문턱을 ★그 뒤로 옮긴다 (endowment).
//   ⛔무료 경로(열린 파일 검사)에는 어떤 제한도 두지 않는다 (8% 법).
const NEED_KEY = S.need_key;              // ⛔원문을 잡아 둔다 — 문턱 문장을 ★덧칠하지 않도록
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';
async function sweepTrial(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + 7 * 24 * 3600 * 1000; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    // ★체험이 끝난 뒤에야 키를 묻는다 — ★손님 자기 숫자를 먼저 부른다
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found '
      + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  return { inTrial: inTrial, until: until };
}

async function scanWorkspace(ctx) {
  const trial = await sweepTrial(ctx);
  if (!trial) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('runtime-eol-deploy-block-audit');
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
  // ★스윕한 숫자를 남긴다 — 체험이 끝나면 ★이 숫자가 문턱 문장을 연다
  await ctx.globalState.update('lastSweep',
    { files: files.length, findings: n, at: new Date().toISOString().slice(0, 10) });
  vscode.window.showInformationMessage(S.done + ' ' + files.length + ' files \u00b7 ' + n + ' findings.'
    + (trial.inTrial ? TRIAL_NOTE : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const trial = await sweepTrial(ctx);
  if (!trial) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('runtime-eol-deploy-block-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('runtime-eol-deploy-block-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'runtime-eol-deploy-block-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath + (trial.inTrial ? TRIAL_NOTE : ''));
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'runtime-eol-deploy-block-audit-report.json');
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
  await vscode.commands.executeCommand('workbench.action.openSettings', 'runtime-eol-deploy-block-audit');
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "runtime-eol-deploy-block-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('runtime-eol-deploy-block-audit.audit_file', runCurrent);
  reg('runtime-eol-deploy-block-audit.audit_selection', runSelection);
  reg('runtime-eol-deploy-block-audit.show_report', showReport);
  reg('runtime-eol-deploy-block-audit.list_rules', listRules);
  reg('runtime-eol-deploy-block-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('runtime-eol-deploy-block-audit.export_report', function () { return exportReport(ctx); });
  reg('runtime-eol-deploy-block-audit.ci_json', function () { return ciJson(ctx); });
  reg('runtime-eol-deploy-block-audit.watch_on_save', function () { return watchOnSave(ctx); });
  reg('runtime-eol-deploy-block-audit.custom_rules', function () { return customRules(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('runtime-eol-deploy-block-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
