// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "License Flip Audit - working.", "done": "Done - findings are in the License Flip Audit panel.", "nothing_found": "Nothing found. Open a manifest (package.json, requirements.txt, go.mod, Dockerfile, docker-compose.yml, pom.xml) and run it again.", "need_key": "Full version: scan every manifest in the workspace, export the report for legal, re-check on save, and write the CI file. 29 USD once, one licence key per person or team seat, 7-day full refund.", "key_ok": "Licence key accepted - the full version is unlocked.", "key_bad": "That licence key was not accepted. Check it against your Polar receipt email.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "paste": "Paste package.json, requirements.txt, go.mod, Dockerfile, docker-compose.yml or pom.xml here", "check": "Check my dependencies", "extra_rules": "Your own banned packages, checked alongside the 30 licence flips that ship inside."};
const PAID = ["workspace_scan", "export_report", "watch_on_save", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('License Flip Audit');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('license-flip-audit').get('min_severity')
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
const RULES = [{"pattern": "hashicorp/terraform:v?(?:1\\.(?:[6-9]|\\d\\d)|[2-9])", "message": "Terraform 1.6+ is BUSL-1.1, not MPL-2.0 (relicensed 2023-08-10; 1.5.7 was the last MPL release). Production use is allowed except in a competing service. OpenTofu is the MPL-2.0 fork.", "sev": "error"}, {"pattern": "hashicorp/vault:v?(?:1\\.(?:1[5-9]|[2-9]\\d)|[2-9])", "message": "Vault 1.15+ is BUSL-1.1 (1.14.1 was the last MPL-2.0 release, 2023-08-10). OpenBao is the MPL-2.0 fork.", "sev": "error"}, {"pattern": "hashicorp/consul:v?(?:1\\.(?:1[7-9]|[2-9]\\d)|[2-9])", "message": "Consul 1.17+ is BUSL-1.1 (1.16.1 was the last MPL-2.0 release, 2023-08-10).", "sev": "error"}, {"pattern": "hashicorp/nomad:v?(?:1\\.(?:[7-9]|\\d\\d)|[2-9])", "message": "Nomad 1.7+ is BUSL-1.1 (1.6.1 was the last MPL-2.0 release, 2023-08-10).", "sev": "error"}, {"pattern": "github\\.com/hashicorp/(?:terraform|vault|consul|nomad|boundary|waypoint|packer|vagrant)(?![\\w-])", "message": "HashiCorp module: every release after 2023-08-10 is BUSL-1.1 (Terraform >=1.6, Vault >=1.15, Consul >=1.17, Nomad >=1.7). Check the version pinned on this line against that boundary.", "sev": "warn"}, {"pattern": "hashicorp/(?:boundary|waypoint|packer|vagrant):", "message": "Boundary, Waypoint, Packer and Vagrant were all relicensed to BUSL-1.1 on 2023-08-10. Only releases cut before that date are MPL-2.0.", "sev": "warn"}, {"pattern": "redis:(?:7\\.[4-9])", "message": "Redis 7.4 through 7.8 is dual RSALv2 / SSPLv1 - source-available, not open source. Redis 7.2.x and earlier are BSD-3-Clause.", "sev": "error"}, {"pattern": "redis:(?:8\\.|9\\.)", "message": "Redis 8.0+ (May 2025) is tri-licensed: AGPLv3 or SSPLv1 or RSALv2. AGPLv3 is OSI-approved but still copyleft - choose one of the three and record which.", "sev": "warn"}, {"pattern": "redis:latest|image:\\s*[\"\\x27]?redis[\"\\x27]?\\s*$", "message": "An unpinned redis tag now pulls Redis 8.x, licensed differently from the 7.2 BSD-3-Clause build. Pin an explicit tag so a docker pull cannot change your licence.", "sev": "warn"}, {"pattern": "elasticsearch:(?:7\\.(?:1[1-9]|[2-9]\\d)|[89]\\.)", "message": "Elasticsearch 7.11+ left Apache-2.0 for SSPL + Elastic License 2.0 (Feb 2021); AGPLv3 was added as a third option from 8.16 (Sept 2024). 7.10.2 was the last Apache-2.0 release.", "sev": "error"}, {"pattern": "kibana:(?:7\\.(?:1[1-9]|[2-9]\\d)|[89]\\.)", "message": "Kibana 7.11+ carries the same change as Elasticsearch: SSPL + Elastic License 2.0 from Feb 2021, AGPLv3 added from 8.16. 7.10.2 was the last Apache-2.0 release.", "sev": "error"}, {"pattern": "docker\\.elastic\\.co/(?:elasticsearch|kibana|logstash)", "message": "Elastic registry image: the 7.11 licence change applies. Confirm the tag on this line is 7.10.x or earlier if your policy requires Apache-2.0.", "sev": "info"}, {"pattern": "(?:docker\\.io/)?bitnami/[a-z0-9._-]+", "message": "Bitnami changed on 2025-08-28: every versioned tag moved to docker.io/bitnamilegacy (no patches, no updates, no support) and docker.io/bitnami keeps only a limited set of hardened latest tags. Move to a maintained source or a paid Bitnami Secure subscription.", "sev": "error"}, {"pattern": "charts\\.bitnami\\.com", "message": "The Bitnami Helm chart index is part of the 2025-08-28 change - charts still point at image tags that were moved to bitnamilegacy. Re-point the image repository before the next deploy.", "sev": "error"}, {"pattern": "image:\\s*[\"\\x27]?(?:docker\\.io/)?(?:library/)?mongo(?:db)?:", "message": "MongoDB Community Server is SSPL-1.0 (since 4.0.3, Oct 2018), not OSI open source; offering it as a service triggers the source-release clause. The MongoDB drivers stay Apache-2.0 - this is about running the server.", "sev": "error"}, {"pattern": "cockroachdb/cockroach", "message": "CockroachDB has not been Apache-2.0 since 19.2: BSL 1.1 from 2019, and the CockroachDB Software License from v24.3 (Nov 2024). Read the tier limits before production use.", "sev": "warn"}, {"pattern": "grafana/(?:grafana|loki|tempo|mimir)", "message": "Grafana moved from Apache-2.0 to AGPLv3 at v8.0 (April 2021); Loki, Tempo and Mimir are AGPLv3 too. Running it is fine - embedding or redistributing is where AGPLv3 bites.", "sev": "warn"}, {"pattern": "minio/minio", "message": "The MinIO server is AGPLv3 (moved from Apache-2.0 in April 2021).", "sev": "warn"}, {"pattern": "getsentry/(?:sentry|snuba|relay)", "message": "Sentry's server code is under the FSL (Functional Source License, Nov 2023; BSL 1.1 before that) - source-available, converting to Apache-2.0 after two years. The client SDKs stay MIT.", "sev": "warn"}, {"pattern": "n8nio/n8n|\"n8n\"\\s*:", "message": "n8n ships under the Sustainable Use License (fair-code), not open source: internal business use is allowed, hosting it for other people is not.", "sev": "warn"}, {"pattern": "\"highcharts[a-z-]*\"\\s*:", "message": "Highcharts is proprietary: free for personal and non-commercial use, paid licence for commercial use. It sits in npm next to MIT chart libraries and is routinely assumed to be one.", "sev": "error"}, {"pattern": "\"(?:@ag-grid-enterprise/[a-z-]+|ag-grid-enterprise|ag-grid-charts-enterprise)\"\\s*:", "message": "ag-grid-enterprise requires a paid AG Grid licence key. Only ag-grid-community is MIT.", "sev": "error"}, {"pattern": "\"@mui/x-[a-z-]*-(?:pro|premium)\"\\s*:", "message": "MUI X Pro and Premium packages are commercial and need a licence key; the non-Pro MUI X packages are MIT.", "sev": "error"}, {"pattern": "\"handsontable\"\\s*:|\"@handsontable/[a-z-]+\"\\s*:", "message": "Handsontable is not MIT: free for non-commercial use, paid licence for commercial use.", "sev": "error"}, {"pattern": "\"tinymce\"\\s*:\\s*\"[\\^~>=v\\s]*(?:[7-9]|[1-9]\\d)\\.", "message": "TinyMCE 7+ (March 2024) is GPL-2.0-or-later or a paid licence; TinyMCE 6 was MIT. GPLv2+ inside a distributed closed-source app is the trap this version bump creates.", "sev": "error"}, {"pattern": "\"@fortawesome/(?:pro-|fontawesome-pro)", "message": "Font Awesome Pro packages require a paid subscription and must not be published in a public repository or a public npm token.", "sev": "error"}, {"pattern": "^\\s*PyQt[56](?![\\w-])", "message": "PyQt is GPL-3.0 or a paid Riverbank commercial licence - a closed-source app that ships PyQt needs the commercial one. PySide (Qt for Python) is LGPL-3.0.", "sev": "error", "flags": "i"}, {"pattern": "^\\s*(?:mysqlclient|mysql-connector-python)(?![\\w-])", "message": "MySQL client libraries are GPL-2.0 with the FOSS Exception, which only covers a listed set of open licences - a closed-source product is not on that list. PyMySQL is MIT.", "sev": "warn", "flags": "i"}, {"pattern": "^\\s*PySimpleGUI(?![\\w-])", "message": "PySimpleGUI 5 was commercial (a 99 USD perpetual licence) from April 2024, then re-released under LGPL-3.0 in 2025 after PySimpleSoft shut down. A copy vendored during 2024 carries the commercial terms, and a policy that still blocks it is out of date.", "sev": "info", "flags": "i"}, {"pattern": "<artifactId>\\s*itext", "message": "iText 5 and 7 are AGPL-3.0 or a paid commercial licence, and AGPL-3.0 is triggered by network use, not only by distribution.", "sev": "error", "flags": "i"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('license-flip-audit');
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
//   ★s144 — ★역방향 체험(유료 맛보기): ★첫 스윕부터 7일은 ★유료 경로(작업공간 전체 스윕 + 보고서 파일)를
//     ★키를 묻지 않고 ★줄이지 않고 그대로 준다. 그 뒤에 ★자기 숫자를 보여주며 키를 묻는다.
//   [검색 2026-09-12] 무료→유료 2~4% ↔ 역방향 체험 8~12% (개발자 도구 체험 중앙값 24%) ·
//     손님이 정하는 순간은 ★자기 폴더에서 발견을 본 뒤다 — 문턱을 그 순간으로 옮긴다.
//   ⛔무료 경로(열린 파일 검사)는 이 문을 지나지 않는다 — 어떤 제한도 없다 (8% 법).
const NEED_KEY = S.need_key;
async function paidGate(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + 7 * 24 * 3600 * 1000; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  paidGate._trial = { inTrial: inTrial, until: until };
  if (inTrial) return true;
  const last = st.get('lastSweep');
  // ⛔NEED_KEY 를 다시 읽는다 — S.need_key 에 덧붙이면 부를 때마다 앞말이 쌓인다.
  S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found '
    + last.findings + ' findings. ') : '') + NEED_KEY;
  return await lic.ensure(vscode, ctx, S);
}

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  const inTrial = !!(paidGate._trial && paidGate._trial.inTrial);
  const st = ctx.globalState;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('license-flip-audit');
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
  // ★손님 자기 숫자를 적어 둔다 — 체험이 끝난 뒤 문턱에서 이 숫자를 되돌려 준다.
  await st.update('lastSweep', { files: files.length, findings: n, at: new Date().toISOString().slice(0, 10) });
  vscode.window.showInformationMessage(S.done
    + (inTrial ? ' The full sweep is free for 7 days from your first sweep.' : ''));
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
  const cfgFmt = String(vscode.workspace.getConfiguration('license-flip-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('license-flip-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'license-flip-audit-report.' + pick.toLowerCase());
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
  const uri = vscode.Uri.joinPath(ws[0].uri, 'license-flip-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "license-flip-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('license-flip-audit.audit_file', runCurrent);
  reg('license-flip-audit.list_rules', listRules);
  reg('license-flip-audit.show_report', showReport);
  reg('license-flip-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('license-flip-audit.export_report', function () { return exportReport(ctx); });
  reg('license-flip-audit.watch_on_save', function () { return watchOnSave(ctx); });
  reg('license-flip-audit.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('license-flip-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
