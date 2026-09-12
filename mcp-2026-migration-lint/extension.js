// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking against MCP 2026-07-28", "check": "Check this against MCP 2026-07-28", "paste": "Paste your mcp.json, claude_desktop_config.json, or MCP server source here", "done": "Done - see the MCP 2026 Migration Lint panel", "nothing_found": "Nothing here breaks under MCP 2026-07-28.", "need_key": "Full version: every mcp.json and server file in the whole repository in one pass, exported as a report, and a CI check that fails the build.", "buy": "Get the full version - $29 once", "key_ok": "Licence accepted - workspace scan, report export and CI output are on.", "key_bad": "That key did not validate. Check it was pasted whole.", "enter_key": "Enter licence key"};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('MCP 2026 Migration Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('mcp-2026-migration-lint').get('min_severity')
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
const RULES = [{"pattern": "\"type\"\\s*:\\s*\"sse\"", "message": "HTTP+SSE transport is Deprecated under the 2026-07-28 feature lifecycle (deprecated since protocol 2025-03-26). Removal is allowed after the 12-month window.", "fix": "\"type\": \"http\"  (Streamable HTTP)", "sev": "error"}, {"pattern": "\"transportType\"\\s*:\\s*\"sse\"", "message": "Same deprecated HTTP+SSE transport, written with the SDK-style key.", "fix": "\"transportType\": \"http\"", "sev": "error"}, {"pattern": "\"mcpServers\"\\s*:", "message": "Key is mcpServers. Correct for Claude Code .mcp.json and claude_desktop_config.json; VS Code .vscode/mcp.json reads the key servers and shows no server under mcpServers.", "fix": "In .vscode/mcp.json use \"servers\": { ... }", "sev": "info"}, {"pattern": "\"-y\"\\s*,\\s*\"(?![^\"]*@\\d)[^\"]+\"", "message": "npx -y with an unpinned package: the agent installs whatever version is published the moment it launches, on every start.", "fix": "Pin it: \"pkg@1.4.2\"", "sev": "warn"}, {"pattern": "\"[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Z0-9_]*\"\\s*:\\s*\"(?!\\$\\{)[^\"]{8,}\"", "message": "Literal credential in the config file. This file is commonly committed; the agent process also inherits it.", "fix": "VS Code: \"inputs\" + \"${input:my-key}\", or \"envFile\". Claude Code: \"${env:MY_KEY}\"", "sev": "error"}, {"pattern": "(?:protocolVersion|PROTOCOL_VERSION|MCP-Protocol-Version)\\s*[:=]\\s*[\"\\'](?:2024-11-05|2025-03-26|2025-06-18|2025-11-25)[\"\\']", "message": "Superseded protocol version. The current revision is 2026-07-28, and the version now travels in _meta on every request, not in a handshake.", "fix": "_meta[\"io.modelcontextprotocol/protocolVersion\"] = \"2026-07-28\"", "sev": "warn"}, {"pattern": "(?:method|Method)\\s*[:=]\\s*[\"\\']initialize[\"\\']|InitializeRequestSchema", "message": "The initialize handshake was REMOVED in 2026-07-28. MCP is stateless: protocol version and client capabilities ride in _meta on every request.", "fix": "Implement server/discover; read _meta[\"io.modelcontextprotocol/clientCapabilities\"]", "sev": "error"}, {"pattern": "[\"\\']notifications/initialized[\"\\']|InitializedNotificationSchema", "message": "notifications/initialized was REMOVED with the handshake in 2026-07-28.", "fix": "Delete it. Nothing replaces it — every request is self-describing.", "sev": "error"}, {"pattern": "Mcp-Session-Id", "message": "The Mcp-Session-Id header and protocol-level sessions were REMOVED in 2026-07-28. List endpoints no longer vary per connection.", "fix": "Mint your own handle server-side and pass it as an ordinary tool argument.", "sev": "error"}, {"pattern": "Last-Event-ID|lastEventId", "message": "SSE stream resumability and message redelivery were REMOVED in 2026-07-28. A broken stream loses the in-flight request.", "fix": "Re-issue the request with a new request ID.", "sev": "error"}, {"pattern": "(?:method|Method)\\s*[:=]\\s*[\"\\']ping[\"\\']|PingRequestSchema", "message": "ping was REMOVED in 2026-07-28.", "fix": "Delete the handler. Use transport-level keepalive if you need liveness.", "sev": "error"}, {"pattern": "[\"\\']logging/setLevel[\"\\']|SetLevelRequestSchema", "message": "logging/setLevel was REMOVED in 2026-07-28. Log level is now per-request.", "fix": "_meta[\"io.modelcontextprotocol/logLevel\"] on the request", "sev": "error"}, {"pattern": "[\"\\']notifications/roots/list_changed[\"\\']|RootsListChangedNotificationSchema", "message": "notifications/roots/list_changed was REMOVED in 2026-07-28.", "fix": "Pass directories as tool parameters or server configuration.", "sev": "error"}, {"pattern": "[\"\\']resources/(?:un)?subscribe[\"\\']|(?:Un)?SubscribeRequestSchema", "message": "resources/subscribe and resources/unsubscribe were REPLACED in 2026-07-28 by a single subscriptions/listen stream.", "fix": "subscriptions/listen, opting in to resourceSubscriptions", "sev": "error"}, {"pattern": "[\"\\']tasks/result[\"\\']", "message": "tasks/result was removed when Tasks moved out of core into the io.modelcontextprotocol/tasks extension in 2026-07-28.", "fix": "Poll tasks/get; use tasks/update to send input", "sev": "error"}, {"pattern": "[\"\\']tasks/list[\"\\']", "message": "tasks/list was removed in the redesigned Tasks extension (2026-07-28).", "fix": "Track task handles yourself; poll tasks/get", "sev": "error"}, {"pattern": "[\"\\']notifications/elicitation/complete[\"\\']", "message": "This notification, introduced in 2025-11-25, was REMOVED in 2026-07-28. Under MRTR the client learns the outcome by retrying the original request.", "fix": "Delete it; encode your correlation id in requestState", "sev": "error"}, {"pattern": "elicitationId", "message": "The elicitationId field of URL-mode elicitation was REMOVED in 2026-07-28.", "fix": "Encode your own identifier in requestState", "sev": "error"}, {"pattern": "[\"\\']roots/list[\"\\']|ListRootsRequestSchema", "message": "Server-initiated roots/list is replaced by the Multi Round-Trip Requests pattern in 2026-07-28, and Roots itself is Deprecated. The lifecycle policy sets a minimum 12-month window, so removal is no earlier than 2027-07-28.", "fix": "Return InputRequiredResult with inputRequests; or take the path as a tool parameter", "sev": "error"}, {"pattern": "[\"\\']sampling/createMessage[\"\\']|CreateMessageRequestSchema", "message": "Server-initiated sampling/createMessage is replaced by MRTR in 2026-07-28, and Sampling is Deprecated. Minimum 12-month window means removal no earlier than 2027-07-28.", "fix": "Return InputRequiredResult, or call the LLM provider API directly", "sev": "error"}, {"pattern": "[\"\\']elicitation/create[\"\\']|ElicitRequestSchema", "message": "Server-initiated elicitation/create is replaced by MRTR in 2026-07-28.", "fix": "Return resultType \"input_required\" with inputRequests; read inputResponses on the retry", "sev": "error"}, {"pattern": "includeContext\\s*[:=]\\s*[\"\\'](?:thisServer|allServers)[\"\\']", "message": "includeContext values thisServer and allServers are Deprecated as of 2026-07-28 (soft-deprecated since 2025-11-25).", "fix": "Omit the field, or use \"none\"", "sev": "warn"}, {"pattern": "-32002", "message": "Resource-not-found changed from -32002 to -32602 (Invalid Params) in 2026-07-28, to align with JSON-RPC.", "fix": "-32602", "sev": "error"}, {"pattern": "-3200[134]\\b", "message": "Renumbered in 2026-07-28 by the error-code allocation policy: HeaderMismatch -32001 to -32020, MissingRequiredClientCapability -32003 to -32021, UnsupportedProtocolVersion -32004 to -32022. -32000..-32019 stays implementation-defined.", "fix": "Use the -32020..-32099 MCP range", "sev": "warn"}, {"pattern": "SSE(?:Server|Client)Transport", "message": "SDK transport class for the Deprecated HTTP+SSE transport.", "fix": "StreamableHTTPServerTransport / StreamableHTTPClientTransport", "sev": "error"}, {"pattern": "registration_endpoint|client_id_issued_at", "message": "OAuth 2.0 Dynamic Client Registration (RFC 7591) is Deprecated as of 2026-07-28 in favour of Client ID Metadata Documents. It stays available only for authorization servers that do not support CIMD.", "fix": "Client ID Metadata Documents; if you keep DCR, send application_type", "sev": "warn"}, {"pattern": "[\"\\']notifications/message[\"\\']", "message": "Servers MUST NOT emit notifications/message for a request that did not carry io.modelcontextprotocol/logLevel in _meta (2026-07-28). Logging is also Deprecated.", "fix": "Gate on _meta logLevel; or write to stderr / OpenTelemetry", "sev": "warn"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('mcp-2026-migration-lint');
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
  const _c = vscode.workspace.getConfiguration('mcp-2026-migration-lint');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('mcp-2026-migration-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('mcp-2026-migration-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'mcp-2026-migration-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'mcp-2026-migration-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "mcp-2026-migration-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('mcp-2026-migration-lint.audit_file', runCurrent);
  reg('mcp-2026-migration-lint.audit_selection', runSelection);
  reg('mcp-2026-migration-lint.list_rules', listRules);
  reg('mcp-2026-migration-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('mcp-2026-migration-lint.export_report', function () { return exportReport(ctx); });
  reg('mcp-2026-migration-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('mcp-2026-migration-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
