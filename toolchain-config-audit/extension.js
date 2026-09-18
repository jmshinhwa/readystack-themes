// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking against 28 rules.", "done": "Check finished. Findings are in the output panel with file name and line number.", "nothing_found": "No findings. This passes all 28 rules.", "need_key": "This is a paid command. Enter your licence key to open the workspace scan, the quick fix and the report export.", "key_ok": "Licence key accepted. The paid commands are open on this machine.", "key_bad": "That key was not accepted. Check for a missing character, or reply to your purchase email and we will reissue it.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "export_report"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Config Audit - 8 Toolchains');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('toolchain-config-audit').get('min_severity')
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
const RULES = [{"pattern": "^\\s*mp\\.jwt\\.verify\\.publickey\\s*=\\s*\\S+", "flags": "im", "message": "MicroProfile: the verification key is written inline, so it ships inside the artifact and cannot be rotated without a rebuild. Point at a location instead.", "fix": "mp.jwt.verify.publickey.location=/META-INF/publicKey.pem"}, {"pattern": "^\\s*[\\w.]*(password|secret)\\s*=\\s*(?!\\$\\{)[^\\s#]+", "flags": "im", "message": "A literal password sits in a config properties file. MicroProfile Config resolves ${...} from the environment at startup, so the value never has to be in the file."}, {"pattern": "@ConfigProperty\\(\\s*name\\s*=\\s*\"[^\"]+\"\\s*\\)", "flags": "", "message": "@ConfigProperty without defaultValue: the container refuses to start when the value is absent in that environment. Add defaultValue or inject Optional."}, {"pattern": "HostName=[A-Za-z0-9-]+\\.azure-devices\\.net;", "flags": "i", "message": "An IoT Hub connection string is written into the source, so the repository carries the device identity. Read it from the environment."}, {"pattern": "SharedAccessKey=[A-Za-z0-9+/=]{20,}", "flags": "", "message": "SharedAccessKey in clear text. Anyone holding this line can send telemetry as that device until the key is rotated in the hub."}, {"pattern": "mqtt://[A-Za-z0-9.-]*azure-devices\\.net", "flags": "i", "message": "Plain MQTT to IoT Hub. The hub accepts MQTT only over TLS on port 8883, so this connection fails on the device."}, {"pattern": "\"password\"\\s*:\\s*\"[^\"]+\"", "flags": "", "message": "A database password is stored in a workspace settings file, which is usually committed. Let SQLTools prompt for it instead.", "fix": "\"askForPassword\": true"}, {"pattern": "\"encrypt\"\\s*:\\s*(false|\"false\")", "flags": "i", "message": "Encryption is switched off on this MSSQL connection, so credentials and rows cross the network in clear.", "fix": "\"encrypt\": true"}, {"pattern": "\"trustServerCertificate\"\\s*:\\s*(true|\"true\")", "flags": "i", "message": "trustServerCertificate accepts any certificate, which removes the protection that switching encryption on was for.", "fix": "\"trustServerCertificate\": false"}, {"pattern": "<ApplicationId>com\\.companyname\\.", "flags": "i", "message": ".NET MAUI: the template identifier com.companyname is still here. Two apps built from the template collide on the same device and the store entry cannot be moved later."}, {"pattern": "http://(?!localhost|127\\.0\\.0\\.1)", "flags": "i", "message": "Cleartext HTTP endpoint. Android 9 and later block cleartext traffic by default, so this call works in the emulator setup and fails on a real device."}, {"pattern": "<ApplicationVersion>1</ApplicationVersion>", "flags": "", "message": "ApplicationVersion is still 1. A store upload whose build number was already used is rejected, and the build number cannot go backwards."}, {"pattern": "image:\\s*\\S+:latest", "flags": "", "message": "An image pinned to :latest. After a node restart the pod pulls a different build and the cluster no longer runs what you tested. Pin the version tag or the digest."}, {"pattern": "privileged:\\s*true", "flags": "", "message": "A privileged container holds the node's devices and capabilities. A namespace enforcing the baseline Pod Security standard refuses this pod."}, {"pattern": "hostNetwork:\\s*true", "flags": "", "message": "hostNetwork puts the pod in the node's network namespace, which bypasses the NetworkPolicy written for it.", "fix": "hostNetwork: false"}, {"pattern": "allowPrivilegeEscalation:\\s*true", "flags": "", "message": "allowPrivilegeEscalation lets a process gain more rights than its parent. The restricted Pod Security standard rejects it.", "fix": "allowPrivilegeEscalation: false"}, {"pattern": "setwd\\(", "flags": "", "message": "setwd() hardcodes one machine's folder. The script stops working for the next person who opens the project. Build paths from the project root."}, {"pattern": "install\\.packages\\(", "flags": "", "message": "install.packages() inside an analysis script reinstalls on every run and can change a package version underneath the result. Move it to a setup script or renv."}, {"pattern": "Sys\\.setenv\\(\\s*[A-Z_]*(KEY|TOKEN|SECRET|PASSWORD)", "flags": "", "message": "A credential is assigned inside the R script, so it travels with the analysis into version control. Put it in .Renviron, which is not committed."}, {"pattern": "read\\.(csv|table)\\(\\s*[\"'][A-Za-z]:[\\\\/]", "flags": "i", "message": "An absolute Windows path in a data read. Nobody else can run this file, and the CI runner cannot either."}, {"pattern": "```\\{r\\}", "flags": "", "message": "An unnamed R Markdown chunk. It cannot be cached, cross-referenced or found in the knitr error message when the render fails. Give it a name."}, {"pattern": "cache\\s*=\\s*TRUE", "flags": "", "message": "cache = TRUE keeps the previous result when only the data file changed, because knitr hashes the code and not the file. Add cache.extra with the file's checksum."}, {"pattern": "knitr::opts_chunk\\$set\\([^)]*echo\\s*=\\s*TRUE", "flags": "", "message": "echo = TRUE globally prints every line of code, including the connection line, into the rendered report you hand out."}, {"pattern": "AKIA[0-9A-Z]{16}", "flags": "", "message": "An AWS access key ID. This exact pattern is the first thing public scanners look for. Rotate it before this file is shared."}, {"pattern": "ghp_[A-Za-z0-9]{36}", "flags": "", "message": "A GitHub personal access token. Revoke it under Settings, Developer settings, Personal access tokens."}, {"pattern": "xox[baprs]-[A-Za-z0-9-]{10,}", "flags": "", "message": "A Slack token. It stays valid until it is revoked in the app configuration, whatever happens to this file."}, {"pattern": "-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----", "flags": "", "message": "A private key is pasted into this file. Move the key outside the workspace folder and reference its path."}, {"pattern": "^\\s*(API_KEY|SECRET_KEY|DB_PASSWORD|AZURE_CLIENT_SECRET|MSSQL_PASSWORD)\\s*=\\s*\\S+", "flags": "im", "message": "A secret assignment in a plain file. If this path is not in .gitignore, the value is already in the history."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('toolchain-config-audit');
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

const SNIPPETS = {"mp_config_env_reference": ["${1:app.token.secret}=\\${APP_TOKEN_SECRET}"], "mp_jwt_verify_block": ["mp.jwt.verify.publickey.location=${1:/META-INF/publicKey.pem}", "mp.jwt.verify.issuer=${2:https://auth.internal/realms/services}"], "mp_config_property_injection": ["@Inject", "@ConfigProperty(name = \"${1:app.timeout.ms}\", defaultValue = \"${2:5000}\")", "long ${3:timeoutMs};"], "iot_connection_from_env": ["const connectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;", "if (!connectionString) {", "  throw new Error('IOTHUB_DEVICE_CONNECTION_STRING is not set');", "}"], "iot_send_telemetry": ["const client = Client.fromConnectionString(connectionString, Mqtt);", "await client.open();", "await client.sendEvent(new Message(JSON.stringify({ ${1:temperature}: ${2:reading} })));", "await client.close();"], "iot_cloud_to_device_handler": ["client.on('message', async (msg) => {", "  const body = JSON.parse(msg.data.toString());", "  ${1:await apply(body);}", "  await client.complete(msg);", "});"], "sqltools_mssql_connection": ["{", "  \"name\": \"${1:reporting}\",", "  \"driver\": \"MSSQL\",", "  \"server\": \"${2:sql-reporting.internal}\",", "  \"port\": 1433,", "  \"database\": \"${3:reporting}\",", "  \"username\": \"${4:reporting_ro}\",", "  \"askForPassword\": true,", "  \"mssqlOptions\": { \"encrypt\": true, \"trustServerCertificate\": false }", "}"], "mssql_offset_fetch_page": ["SELECT ${1:order_id, created_at, total}", "FROM ${2:dbo.orders}", "ORDER BY ${3:created_at} DESC", "OFFSET ${4:0} ROWS FETCH NEXT ${5:100} ROWS ONLY;"], "mssql_transaction_with_rollback": ["BEGIN TRY", "  BEGIN TRANSACTION;", "  ${1:UPDATE dbo.orders SET status = 'sent' WHERE order_id = @order_id;}", "  COMMIT TRANSACTION;", "END TRY", "BEGIN CATCH", "  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;", "  THROW;", "END CATCH;"], "maui_identity_block": ["<ApplicationId>${1:com.acme.fieldapp}</ApplicationId>", "<ApplicationDisplayVersion>${2:1.2.0}</ApplicationDisplayVersion>", "<ApplicationVersion>${3:12}</ApplicationVersion>"], "maui_https_client": ["builder.Services.AddSingleton(new HttpClient", "{", "    BaseAddress = new Uri(\"https://${1:api.acme.internal}/\")", "});"], "maui_secure_storage": ["await SecureStorage.Default.SetAsync(\"${1:api_token}\", ${2:token});", "var stored = await SecureStorage.Default.GetAsync(\"${1:api_token}\");"], "aks_deployment_hardened": ["apiVersion: apps/v1", "kind: Deployment", "metadata:", "  name: ${1:orders-api}", "spec:", "  replicas: ${2:2}", "  selector:", "    matchLabels:", "      app: ${1:orders-api}", "  template:", "    metadata:", "      labels:", "        app: ${1:orders-api}", "    spec:", "      containers:", "        - name: ${1:orders-api}", "          image: ${3:acmeregistry.azurecr.io/orders-api:1.4.2}", "          resources:", "            requests: { cpu: 100m, memory: 128Mi }", "            limits: { cpu: 500m, memory: 512Mi }", "          securityContext:", "            runAsNonRoot: true", "            allowPrivilegeEscalation: false"], "aks_pod_disruption_budget": ["apiVersion: policy/v1", "kind: PodDisruptionBudget", "metadata:", "  name: ${1:orders-api}", "spec:", "  minAvailable: ${2:1}", "  selector:", "    matchLabels:", "      app: ${1:orders-api}"], "aks_default_deny_ingress": ["apiVersion: networking.k8s.io/v1", "kind: NetworkPolicy", "metadata:", "  name: ${1:orders-api-ingress}", "spec:", "  podSelector:", "    matchLabels:", "      app: ${2:orders-api}", "  policyTypes: [Ingress]", "  ingress:", "    - from:", "        - podSelector:", "            matchLabels:", "              app: ${3:gateway}"], "r_credential_from_renviron": ["key <- Sys.getenv(\"${1:API_KEY}\")", "if (!nzchar(key)) stop(\"${1:API_KEY} is not set in .Renviron\")"], "r_project_relative_path": ["library(here)", "data <- readr::read_csv(here(\"data\", \"${1:orders.csv}\"))"], "r_mssql_connection": ["con <- DBI::dbConnect(odbc::odbc(),", "                      Driver = \"ODBC Driver 18 for SQL Server\",", "                      Server = \"${1:sql-reporting.internal}\",", "                      Database = \"${2:reporting}\",", "                      UID = Sys.getenv(\"MSSQL_USER\"),", "                      PWD = Sys.getenv(\"MSSQL_PASSWORD\"),", "                      Encrypt = \"yes\")"], "rmd_setup_chunk": ["```{r setup, include=FALSE}", "knitr::opts_chunk\\$set(echo = FALSE, warning = FALSE, message = FALSE)", "```"], "rmd_front_matter": ["---", "title: \"${1:Monthly reporting}\"", "date: \"`r format(Sys.Date(), '%d %B %Y')`\"", "output:", "  html_document:", "    toc: true", "---"], "rmd_cached_chunk": ["```{r ${1:load-orders}, cache=TRUE, cache.extra=tools::md5sum(here::here(\"data\", \"${2:orders.csv}\"))}", "orders <- readr::read_csv(here::here(\"data\", \"${2:orders.csv}\"))", "```"], "gitignore_secret_paths": [".env", ".Renviron", "*.pem", "*.pfx", "appsettings.Development.json", ".vscode/settings.json"], "key_rotation_checklist": ["1. Revoke the key at the provider.", "2. Issue a new key and put it in the secret store.", "3. Rewrite the history if the key was committed.", "4. Redeploy every service that read the old key.", "5. Record the date and who did it."], "odbc_dsn_encrypted": ["[${1:reporting}]", "Driver=ODBC Driver 18 for SQL Server", "Server=${2:sql-reporting.internal}", "Database=${3:reporting}", "Encrypt=yes", "TrustServerCertificate=no"]};

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

// ★무료 — ★스니펫을 골라 ★커서 자리에 넣는다
async function insertSnippet() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const names = Object.keys(SNIPPETS);
  if (!names.length) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const pick = await vscode.window.showQuickPick(names, { placeHolder: S.run });
  if (!pick) return;
  await ed.insertSnippet(new vscode.SnippetString(SNIPPETS[pick].join('\n')));
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
  const _c = vscode.workspace.getConfiguration('toolchain-config-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('toolchain-config-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('toolchain-config-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'toolchain-config-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "toolchain-config-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('toolchain-config-audit.audit_file', runCurrent);
  reg('toolchain-config-audit.audit_selection', runSelection);
  reg('toolchain-config-audit.insert_snippet', insertSnippet);
  reg('toolchain-config-audit.list_rules', listRules);
  reg('toolchain-config-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('toolchain-config-audit.quick_fix', function () { return quickFix(ctx); });
  reg('toolchain-config-audit.export_report', function () { return exportReport(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('toolchain-config-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
