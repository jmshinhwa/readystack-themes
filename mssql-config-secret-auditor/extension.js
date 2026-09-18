// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing this file against 17 rules…", "done": "Audit finished. Every finding is listed in the Output panel with its file name and line number.", "nothing_found": "No credential, cleartext transport flag or machine-only path found in this file.", "need_key": "This is a paid command. Enter your licence key to turn on the workspace scan, the report file, quick fix and watch-on-save.", "key_ok": "Licence key accepted. Workspace scan, report export, quick fix and watch-on-save are on.", "key_bad": "That key was not accepted. Check for a stray space at either end, or reply to the e-mail on your receipt.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "quick_fix", "watch_on_save", "custom_rules"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('SQLTools MSSQL Config & Secret Auditor');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('mssql-config-secret-auditor').get('min_severity')
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
const RULES = [{"pattern": "\"password\"\\s*:\\s*\"[^\"]+\"", "flags": "i", "message": "A literal password is written into this settings file. Use \"askForPassword\": true so SQLTools asks at connect time and nothing is stored on disk.", "fix": "\"askForPassword\": true"}, {"pattern": "\"trustServerCertificate\"\\s*:\\s*true", "flags": "i", "message": "trustServerCertificate is true: this connection accepts any certificate, including one presented by a machine in the middle.", "fix": "\"trustServerCertificate\": false"}, {"pattern": "\"encrypt\"\\s*:\\s*false", "flags": "i", "message": "encrypt is false: the login and every result row travel to SQL Server in clear text.", "fix": "\"encrypt\": true"}, {"pattern": "(?:Server|Data Source)\\s*=[^;\\n]{1,120};[^\\n]{0,240}?\\b(?:Password|Pwd)\\s*=\\s*[^;\"'\\s]+", "flags": "i", "message": "A full connection string with the password inside it is stored in this file. Move the password to an environment variable and read it at runtime."}, {"pattern": "-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----", "flags": "", "message": "A private key is embedded in this file. Anyone who clones the repository holds this key."}, {"pattern": "SharedAccessKey\\s*=\\s*[A-Za-z0-9+/=]{20,}", "flags": "i", "message": "An Azure shared access key (IoT Hub, Service Bus or Event Hubs) is in this file. Keep hub and device connection strings in your User settings, not in the workspace."}, {"pattern": "AccountKey\\s*=\\s*[A-Za-z0-9+/=]{40,}", "flags": "i", "message": "An Azure Storage account key is in this file. It grants full access to the whole account, not just one container."}, {"pattern": "^\\s*[\\w.-]*(?:password|passwd|secret|api[-_.]?key)\\s*=\\s*(?!\\$\\{)\\S+", "flags": "im", "message": "This properties key holds a literal value. MicroProfile Config reads environment variables first, so write ${ENV_NAME} here and set the value outside the repository."}, {"pattern": "<AndroidSigning(?:Key|Store)Pass>\\s*(?!\\$\\()[^<\\s][^<]*</", "flags": "i", "message": "The Android keystore password is written into the project file. Pass it as $(MAUI_KEY_PASS) from an environment variable at build time."}, {"pattern": "^\\s*(?:client-key-data|client-certificate-data|token)\\s*:\\s*\\S{20,}", "flags": "im", "message": "This looks like a kubeconfig credential committed to the repository. It authenticates as you against the cluster until it is revoked."}, {"pattern": "insecure-skip-tls-verify\\s*:\\s*true", "flags": "i", "message": "insecure-skip-tls-verify is true: kubectl will trust any API server that answers on that address.", "fix": "insecure-skip-tls-verify: false"}, {"pattern": "\\bgh[pousr]_[A-Za-z0-9]{36}\\b", "flags": "", "message": "A GitHub personal access token is in this file. Revoke it and issue a new one; anyone with the repository has it."}, {"pattern": "\"recommendations\"\\s*:\\s*\\[[^\\]]*?\"[a-z0-9][a-z0-9-]*\"", "flags": "i", "message": "An extension id here has no publisher prefix. VS Code only matches publisher.name, so an entry like \"r\" or \"sqltools-driver-mssql\" is silently ignored and nobody on the team gets the recommendation."}, {"pattern": "(?:\"[A-Za-z]:\\\\\\\\Users\\\\\\\\|/(?:home|Users)/)[^\"\\s]+", "flags": "", "message": "This path points inside one person's home folder. Every teammate who opens this workspace gets an error on that setting."}, {"pattern": "\\bhttp://(?!localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0)", "flags": "i", "message": "A cleartext http:// endpoint is configured. Tokens sent to it can be read on the network path."}, {"pattern": "TrustServerCertificate\\s*=\\s*[\"']?\\s*(?:yes|true)", "flags": "i", "message": "The ODBC connection accepts any server certificate. The channel is encrypted but the server is not verified.", "fix": "TrustServerCertificate=no"}, {"pattern": "Encrypt\\s*=\\s*[\"']?\\s*(?:no|false)\\b", "flags": "i", "message": "The ODBC connection turns encryption off. ODBC Driver 18 defaults to encryption on for a reason.", "fix": "Encrypt=yes"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('mssql-config-secret-auditor');
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

const SNIPPETS = {"sqltools_mssql_local": ["\"sqltools.connections\": [", "  {", "    \"name\": \"${1:local-dev}\",", "    \"driver\": \"MSSQL\",", "    \"server\": \"${2:localhost}\",", "    \"port\": ${3:1433},", "    \"database\": \"${4:AppDb}\",", "    \"username\": \"${5:app_dev}\",", "    \"askForPassword\": true,", "    \"connectionTimeout\": 15,", "    \"previewLimit\": 50,", "    \"mssqlOptions\": { \"encrypt\": true, \"trustServerCertificate\": false, \"appName\": \"SQLTools\" }", "  }", "]"], "sqltools_mssql_azure": ["\"sqltools.connections\": [", "  {", "    \"name\": \"${1:azure-sql}\",", "    \"driver\": \"MSSQL\",", "    \"server\": \"${2:contoso-sql}.database.windows.net\",", "    \"port\": 1433,", "    \"database\": \"${3:AppDb}\",", "    \"username\": \"${4:app_reader}\",", "    \"askForPassword\": true,", "    \"connectionTimeout\": 30,", "    \"previewLimit\": 50,", "    \"mssqlOptions\": { \"encrypt\": true, \"trustServerCertificate\": false, \"appName\": \"SQLTools\" }", "  }", "]"], "sqltools_mssql_multi_env": ["\"sqltools.connections\": [", "  {", "    \"name\": \"dev\",", "    \"driver\": \"MSSQL\",", "    \"server\": \"${1:sqldev.internal.local}\",", "    \"port\": 1433,", "    \"database\": \"${2:AppDb}\",", "    \"username\": \"${3:app_dev}\",", "    \"askForPassword\": true,", "    \"connectionTimeout\": 15,", "    \"mssqlOptions\": { \"encrypt\": true, \"trustServerCertificate\": false, \"appName\": \"SQLTools\" }", "  },", "  {", "    \"name\": \"staging\",", "    \"driver\": \"MSSQL\",", "    \"server\": \"${4:sqlstg.internal.local}\",", "    \"port\": 1433,", "    \"database\": \"${2:AppDb}\",", "    \"username\": \"${5:app_stg}\",", "    \"askForPassword\": true,", "    \"connectionTimeout\": 20,", "    \"mssqlOptions\": { \"encrypt\": true, \"trustServerCertificate\": false, \"appName\": \"SQLTools\" }", "  }", "]"], "sqltools_mssql_prod_readonly": ["{", "  \"name\": \"prod-read-only\",", "  \"driver\": \"MSSQL\",", "  \"server\": \"${1:sqlprod.internal.local}\",", "  \"port\": 1433,", "  \"database\": \"${2:Reporting}\",", "  \"username\": \"${3:reporting_ro}\",", "  \"askForPassword\": true,", "  \"connectionTimeout\": 30,", "  \"previewLimit\": 20,", "  \"mssqlOptions\": { \"encrypt\": true, \"trustServerCertificate\": false, \"appName\": \"SQLTools-readonly\" }", "}"], "sqltools_mssql_vpn_timeout": ["{", "  \"name\": \"${1:vpn-warehouse}\",", "  \"driver\": \"MSSQL\",", "  \"server\": \"${2:sqlwh.internal.local}\",", "  \"port\": 1433,", "  \"database\": \"${3:Warehouse}\",", "  \"username\": \"${4:analyst}\",", "  \"askForPassword\": true,", "  \"connectionTimeout\": 60,", "  \"previewLimit\": 50,", "  \"mssqlOptions\": { \"encrypt\": true, \"trustServerCertificate\": false, \"appName\": \"SQLTools\" }", "}"], "sql_editor_defaults": ["\"files.associations\": { \"*.sql\": \"sql\", \"*.dacpac.sql\": \"sql\" },", "\"[sql]\": {", "  \"editor.tabSize\": 2,", "  \"editor.insertSpaces\": true,", "  \"editor.wordWrap\": \"on\",", "  \"editor.rulers\": [120]", "}"], "iot_device_twin_desired": ["{", "  \"properties\": {", "    \"desired\": {", "      \"telemetry\": { \"intervalSeconds\": ${1:30}, \"batchSize\": ${2:20} },", "      \"firmwareVersion\": \"${3:1.4.0}\",", "      \"logLevel\": \"${4|info,debug,warn,error|}\"", "    }", "  }", "}"], "iot_d2c_message": ["{", "  \"deviceId\": \"${1:sensor-01}\",", "  \"temperatureC\": ${2:21.5},", "  \"humidity\": ${3:48},", "  \"batteryPercent\": ${4:87},", "  \"timestamp\": \"${5:2026-09-06T10:00:00Z}\"", "}"], "maui_android_signing": ["<PropertyGroup Condition=\"'$(Configuration)' == 'Release' and $(TargetFramework.Contains('android'))\">", "  <AndroidKeyStore>true</AndroidKeyStore>", "  <AndroidSigningKeyStore>$(MAUI_KEYSTORE_PATH)</AndroidSigningKeyStore>", "  <AndroidSigningKeyAlias>$(MAUI_KEY_ALIAS)</AndroidSigningKeyAlias>", "  <AndroidSigningKeyPass>$(MAUI_KEY_PASS)</AndroidSigningKeyPass>", "  <AndroidSigningStorePass>$(MAUI_STORE_PASS)</AndroidSigningStorePass>", "  <AndroidPackageFormat>aab</AndroidPackageFormat>", "</PropertyGroup>"], "maui_ios_codesign": ["<PropertyGroup Condition=\"'$(Configuration)' == 'Release' and $(TargetFramework.Contains('ios'))\">", "  <RuntimeIdentifier>ios-arm64</RuntimeIdentifier>", "  <CodesignKey>${1:Apple Distribution: Contoso Ltd}</CodesignKey>", "  <CodesignProvision>${2:Contoso App Store Profile}</CodesignProvision>", "  <ArchiveOnBuild>true</ArchiveOnBuild>", "</PropertyGroup>"], "maui_app_identity": ["<PropertyGroup>", "  <ApplicationTitle>${1:Contoso Orders}</ApplicationTitle>", "  <ApplicationId>${2:com.contoso.orders}</ApplicationId>", "  <ApplicationDisplayVersion>${3:1.4.0}</ApplicationDisplayVersion>", "  <ApplicationVersion>${4:14}</ApplicationVersion>", "  <WindowsPackageType>None</WindowsPackageType>", "</PropertyGroup>"], "mp_jwt_verify": ["mp.jwt.verify.publickey.location=${1:https://sso.internal.local/auth/realms/app/protocol/openid-connect/certs}", "mp.jwt.verify.issuer=${2:https://sso.internal.local/auth/realms/app}", "mp.jwt.verify.audiences=${3:orders-api}", "mp.jwt.token.header=Authorization"], "mp_rest_client": ["${1:com.contoso.orders.OrderClient}/mp-rest/url=${2:https://orders.internal.local}", "$1/mp-rest/scope=jakarta.enterprise.context.ApplicationScoped", "$1/mp-rest/connectTimeout=5000", "$1/mp-rest/readTimeout=10000"], "mp_metrics_openapi": ["mp.metrics.tags=app=${1:orders-api},env=${2:staging}", "mp.openapi.scan.disable=false", "mp.openapi.servers=${3:https://orders.internal.local}"], "aks_deployment_secret_env": ["apiVersion: apps/v1", "kind: Deployment", "metadata:", "  name: ${1:orders-api}", "spec:", "  replicas: ${2:2}", "  selector:", "    matchLabels:", "      app: $1", "  template:", "    metadata:", "      labels:", "        app: $1", "    spec:", "      containers:", "        - name: $1", "          image: ${3:contosoacr.azurecr.io/orders-api:1.4.0}", "          env:", "            - name: MSSQL_PASSWORD", "              valueFrom:", "                secretKeyRef:", "                  name: ${4:orders-db}", "                  key: mssql-password", "          resources:", "            requests: { cpu: 100m, memory: 128Mi }", "            limits: { cpu: 500m, memory: 512Mi }", "          readinessProbe:", "            httpGet: { path: /q/health/ready, port: 8080 }"], "aks_keyvault_csi": ["apiVersion: secrets-store.csi.x-k8s.io/v1", "kind: SecretProviderClass", "metadata:", "  name: ${1:orders-kv}", "  namespace: ${2:orders}", "spec:", "  provider: azure", "  parameters:", "    usePodIdentity: \"false\"", "    clientID: ${3:11111111-2222-3333-4444-555555555555}", "    keyvaultName: ${4:contoso-kv}", "    tenantId: ${5:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", "    objects: |", "      array:", "        - |", "          objectName: ${6:mssql-password}", "          objectType: secret"], "aks_workload_identity": ["apiVersion: v1", "kind: ServiceAccount", "metadata:", "  name: ${1:orders-api}", "  namespace: ${2:orders}", "  annotations:", "    azure.workload.identity/client-id: ${3:11111111-2222-3333-4444-555555555555}", "# the pod template must also carry this label:", "#   labels:", "#     azure.workload.identity/use: \"true\""], "r_workspace_settings": ["\"r.rterm.linux\": \"/usr/bin/R\",", "\"r.rterm.mac\": \"/usr/local/bin/R\",", "\"r.rterm.windows\": \"C:\\\\Program Files\\\\R\\\\R-${1:4.4.1}\\\\bin\\\\x64\\\\R.exe\",", "\"r.bracketedPaste\": true,", "\"r.sessionWatcher\": true,", "\"r.alwaysUseActiveTerminal\": true,", "\"r.plot.useHttpgd\": true"], "r_dbi_mssql_connect": ["con <- DBI::dbConnect(", "  odbc::odbc(),", "  Driver = \"ODBC Driver 18 for SQL Server\",", "  Server = \"${1:sqlsrv.internal.local}\",", "  Port = 1433,", "  Database = \"${2:AppDb}\",", "  UID = Sys.getenv(\"MSSQL_USER\"),", "  PWD = Sys.getenv(\"MSSQL_PWD\"),", "  Encrypt = \"yes\",", "  TrustServerCertificate = \"no\"", ")"], "r_env_failfast": ["mssql_pwd <- Sys.getenv(\"MSSQL_PWD\", unset = NA)", "if (is.na(mssql_pwd)) {", "  stop(\"MSSQL_PWD is not set. Add it to ~/.Renviron, then restart R.\", call. = FALSE)", "}"], "txt_file_associations": ["\"files.associations\": {", "  \"*.txt\": \"plaintext\",", "  \"*.log\": \"plaintext\",", "  \"*.out\": \"plaintext\",", "  \"*.err\": \"plaintext\"", "},", "\"[plaintext]\": {", "  \"editor.wordWrap\": \"on\",", "  \"editor.renderWhitespace\": \"all\",", "  \"files.trimTrailingWhitespace\": false", "},", "\"files.encoding\": \"utf8\",", "\"files.eol\": \"\\n\""], "txt_search_exclude": ["\"search.exclude\": {", "  \"**/*.log\": true,", "  \"**/logs/**\": true,", "  \"**/*.bak\": true,", "  \"**/dump*.txt\": true", "},", "\"files.watcherExclude\": {", "  \"**/logs/**\": true", "}"], "extensions_recommendations": ["{", "  \"recommendations\": [", "    \"mtxr.sqltools\",", "    \"mtxr.sqltools-driver-mssql\",", "    \"vsciot-vscode.azure-iot-toolkit\",", "    \"ms-kubernetes-tools.vscode-aks-tools\",", "    \"ms-dotnettools.dotnet-maui\",", "    \"redhat.vscode-microprofile\",", "    \"reditorsupport.r\"", "  ]", "}"], "gitignore_secrets": ["# credentials and machine-local files - keep them out of the repository", ".Renviron", ".env", ".env.*", "*.keystore", "*.jks", "*.p12", "*.pfx", "*.mobileprovision", "kubeconfig", "*.kubeconfig"]};

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
  const _c = vscode.workspace.getConfiguration('mssql-config-secret-auditor');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('mssql-config-secret-auditor').get('reportFormat')
    || vscode.workspace.getConfiguration('mssql-config-secret-auditor').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'mssql-config-secret-auditor-report.' + pick.toLowerCase());
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
  await vscode.commands.executeCommand('workbench.action.openSettings', 'mssql-config-secret-auditor');
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "mssql-config-secret-auditor").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('mssql-config-secret-auditor.audit_file', runCurrent);
  reg('mssql-config-secret-auditor.audit_selection', runSelection);
  reg('mssql-config-secret-auditor.insert_snippet', insertSnippet);
  reg('mssql-config-secret-auditor.list_rules', listRules);
  reg('mssql-config-secret-auditor.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('mssql-config-secret-auditor.export_report', function () { return exportReport(ctx); });
  reg('mssql-config-secret-auditor.quick_fix', function () { return quickFix(ctx); });
  reg('mssql-config-secret-auditor.watch_on_save', function () { return watchOnSave(ctx); });
  reg('mssql-config-secret-auditor.custom_rules', function () { return customRules(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('mssql-config-secret-auditor').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
