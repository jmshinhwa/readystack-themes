// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing for hardcoded credentials across 26 rules.", "done": "Audit finished. Every finding is listed with its file name and line number in the output panel.", "nothing_found": "No hardcoded credential matched any of the 26 rules here.", "need_key": "This is a paid command. Paste your licence key to unlock the workspace audit, the findings export and the quick fix.", "key_ok": "Licence key accepted. The workspace audit, the findings export and the quick fix are unlocked on this machine.", "key_bad": "That licence key was not accepted. Check for a missing character, or reply to your purchase receipt and we will send it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Connection String & Secret Audit — 8 Stacks');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('connection-string-secret-audit').get('min_severity')
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
const RULES = [{"pattern": "HostName=[^;\\s\"']+\\.azure-devices\\.net;[^\\n]*SharedAccessKey=[A-Za-z0-9+/=]{16,}", "flags": "i", "message": "An IoT Hub connection string with a live SharedAccessKey is written into this file. Anyone who clones the repository can send and receive on that device identity.", "fix": "HostName=${IOTHUB_HOSTNAME};DeviceId=${IOTHUB_DEVICE_ID};SharedAccessKey=${IOTHUB_DEVICE_KEY}"}, {"pattern": "SharedAccessSignature\\s+sr=[^&\\s]+&sig=[A-Za-z0-9%+/=]{16,}", "flags": "i", "message": "A SAS token is pasted here. It works until it expires and it cannot be revoked on its own without regenerating the policy key.", "fix": "SharedAccessSignature=${IOTHUB_SAS_TOKEN}"}, {"pattern": "symmetricKey\\s*[:=]\\s*[\"'][A-Za-z0-9+/=]{20,}[\"']", "flags": "i", "message": "A Device Provisioning Service symmetric key is hardcoded. Read it from the environment, or provision with an X.509 certificate instead."}, {"pattern": "DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{40,}", "flags": "i", "message": "A storage account key is in this file. That key grants full read and write on every container in the account, including IoT file uploads.", "fix": "DefaultEndpointsProtocol=https;AccountName=${AZURE_STORAGE_ACCOUNT};AccountKey=${AZURE_STORAGE_KEY}"}, {"pattern": "Endpoint=sb://[^;]+;SharedAccessKeyName=[^;]+;SharedAccessKey=[A-Za-z0-9+/=]{16,}", "flags": "i", "message": "An Event Hubs or Service Bus connection string with its key is hardcoded. This is usually the telemetry endpoint the whole device fleet writes to.", "fix": "Endpoint=${EVENTHUB_ENDPOINT};SharedAccessKeyName=${EVENTHUB_KEY_NAME};SharedAccessKey=${EVENTHUB_KEY}"}, {"pattern": "(?:Server|Data Source)=[^;\\n]+;[^\\n]*(?:Password|Pwd)=[^;\"'\\s]{4,}", "flags": "i", "message": "A SQL Server connection string carries the password inline. Use Microsoft Entra authentication, or read the whole string from the environment.", "fix": "Server=${SQL_SERVER};Database=${SQL_DATABASE};Authentication=Active Directory Default;Encrypt=true"}, {"pattern": "TrustServerCertificate\\s*=\\s*(?:true|yes)", "flags": "i", "message": "TrustServerCertificate is on, so the driver accepts any certificate and the encrypted connection can be intercepted.", "fix": "TrustServerCertificate=false"}, {"pattern": "jdbc:sqlserver://[^\\s\"']*(?:password|Password)=[^;\\s\"']{4,}", "flags": "", "message": "A JDBC URL for SQL Server contains the password. JDBC URLs end up in logs and stack traces.", "fix": "jdbc:sqlserver://${SQL_SERVER};database=${SQL_DATABASE};authentication=ActiveDirectoryDefault;encrypt=true"}, {"pattern": "\"password\"\\s*:\\s*\"[^\"]{4,}\"", "flags": "", "message": "A saved connection stores the password in plain JSON. Let the client ask for it at connect time instead.", "fix": "\"askForPassword\": true"}, {"pattern": "(?:client-key-data|client-certificate-data|token):\\s*[A-Za-z0-9+/=._-]{40,}", "flags": "", "message": "A kubeconfig credential is committed here. It authenticates to the cluster from any machine that has this file."}, {"pattern": "az\\s+aks\\s+get-credentials[^\\n]*--admin", "flags": "i", "message": "This fetches the cluster-admin certificate, which is not tied to a user and cannot be revoked for one person. Fetch user credentials instead.", "fix": "az aks get-credentials --resource-group ${AKS_RESOURCE_GROUP} --name ${AKS_CLUSTER_NAME}"}, {"pattern": "--docker-password[=\\s]+[^\\s\"']{4,}", "flags": "", "message": "A registry password is passed on the command line. It lands in shell history and in CI logs.", "fix": "--docker-password=${REGISTRY_PASSWORD}"}, {"pattern": "Preferences(?:\\.Default)?\\.Set\\s*\\(\\s*\"[^\"]*(?:token|password|secret|key)[^\"]*\"", "flags": "i", "message": "A secret is being written to Preferences, which is unencrypted on the device. Use SecureStorage, which uses the platform keystore."}, {"pattern": "\"(?:ApiKey|ClientSecret|ConnectionString|AccountKey)\"\\s*:\\s*\"[^\"]{8,}\"", "flags": "", "message": "A secret sits in an appsettings file that ships inside the app package. Anyone can unzip the package and read it."}, {"pattern": "const\\s+string\\s+\\w*(?:ApiKey|Secret|Token|Password)\\w*\\s*=\\s*\"[^\"]{8,}\"", "flags": "i", "message": "A credential is compiled in as a constant. It stays readable in the assembly with any decompiler."}, {"pattern": "^[\\t ]*[\\w.-]*(?:password|secret|api[-_.]?key|token)[\\w.-]*\\s*=\\s*\\S{4,}$", "flags": "im", "message": "A configuration property holds a real value. MicroProfile Config reads environment variables first, so leave the value out of the file."}, {"pattern": "@ConfigProperty\\s*\\([^)]*defaultValue\\s*=\\s*\"[^\"]{12,}\"", "flags": "", "message": "A long defaultValue on @ConfigProperty is a secret baked into the class file. Drop the default and let startup fail loudly when it is missing."}, {"pattern": "add\\(\\s*\"Authorization\"\\s*,\\s*\"(?:Bearer|Basic)\\s+[^\"]{16,}\"", "flags": "", "message": "An Authorization header is hardcoded in the Rest Client. Inject it through config so it can be rotated without a rebuild."}, {"pattern": "Sys\\.setenv\\s*\\(\\s*[\\w.]*(?:KEY|TOKEN|SECRET|PASSWORD|PAT)[\\w.]*\\s*=\\s*[\"'][^\"']{8,}", "flags": "", "message": "Sys.setenv is being called with a literal secret. Put the value in .Renviron, which stays out of git, and read it with Sys.getenv."}, {"pattern": "dbConnect\\s*\\([^)]*password\\s*=\\s*[\"'][^\"']{3,}[\"']", "flags": "i", "message": "A database password is written into the dbConnect call. It will also sit in .Rhistory and in the rendered notebook."}, {"pattern": "options\\s*\\(\\s*[\\w.]*(?:key|token|secret)[\\w.]*\\s*=\\s*[\"'][^\"']{8,}[\"']", "flags": "i", "message": "A key is set through options(), so it is saved with the workspace image and printed by any call that dumps options."}, {"pattern": "add_headers\\s*\\(\\s*Authorization\\s*=\\s*[\"'](?:Bearer|Basic)\\s+[^\"']{16,}", "flags": "", "message": "A bearer token is written into a request chunk. Rendering this document with echo on prints the token into the output file."}, {"pattern": "-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----", "flags": "", "message": "A private key block is inside this file. Keep the key on disk outside the repository and pass its path in an environment variable.", "fix": "# private key removed - load it from the path in ${PRIVATE_KEY_PATH}"}, {"pattern": "\\b(?:https?|mongodb|postgres(?:ql)?|amqps?|mqtts?)://[^\\s/:@\"']+:[^\\s/:@\"']+@", "flags": "i", "message": "A user name and password are embedded in a URL. Proxies and error pages copy whole URLs, so this credential travels further than the file."}, {"pattern": "\\bey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}", "flags": "", "message": "A JSON Web Token is pasted here. It is valid until it expires, and its payload is readable by anyone."}, {"pattern": "^[\\t ]*(?:AWS_SECRET_ACCESS_KEY|AZURE_CLIENT_SECRET|IOTHUB_CONNECTION_STRING|DATABASE_PASSWORD)\\s*=\\s*\\S{6,}$", "flags": "im", "message": "A filled-in secret variable is in a tracked file. Keep values in .env, git-ignore it, and commit .env.example with the names only."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('connection-string-secret-audit');
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

const SNIPPETS = {"iothub_conn_env": ["const connectionString = process.env.${1:IOTHUB_DEVICE_CONNECTION_STRING};", "if (!connectionString) {", "\tthrow new Error('${1} is not set. Add it to your local .env and to the deployment settings.');", "}", "const client = Client.fromConnectionString(connectionString, Mqtt);"], "iothub_key_vault": ["const { DefaultAzureCredential } = require('@azure/identity');", "const { SecretClient } = require('@azure/keyvault-secrets');", "", "const vault = new SecretClient('https://${1:my-vault}.vault.azure.net', new DefaultAzureCredential());", "const secret = await vault.getSecret('${2:iothub-device-connection-string}');", "const client = Client.fromConnectionString(secret.value, Mqtt);"], "iothub_x509_provision": ["const cert = {", "\tcert: fs.readFileSync(process.env.${1:DEVICE_CERT_PATH}),", "\tkey: fs.readFileSync(process.env.${2:DEVICE_KEY_PATH})", "};", "const security = new X509Security(process.env.${3:DPS_REGISTRATION_ID}, cert);", "const provisioning = ProvisioningDeviceClient.create(", "\t'global.azure-devices-provisioning.net',", "\tprocess.env.${4:DPS_ID_SCOPE},", "\tnew ProvTransport(),", "\tsecurity", ");"], "iothub_env_example": ["# fill these in your local .env - never commit the filled file", "IOTHUB_HOSTNAME=", "IOTHUB_DEVICE_ID=", "IOTHUB_DEVICE_CONNECTION_STRING=", "DPS_ID_SCOPE="], "mssql_conn_env": ["var connectionString = Environment.GetEnvironmentVariable(\"${1:SQL_CONNECTION_STRING}\")", "\t?? throw new InvalidOperationException(\"${1} is not set.\");", "", "using var connection = new SqlConnection(connectionString);", "await connection.OpenAsync();"], "mssql_managed_identity": ["// No password in the string: the application authenticates as itself.", "var builder = new SqlConnectionStringBuilder", "{", "\tDataSource = \"${1:my-server}.database.windows.net\",", "\tInitialCatalog = \"${2:my-database}\",", "\tAuthentication = SqlAuthenticationMethod.ActiveDirectoryDefault,", "\tEncrypt = true", "};", "", "using var connection = new SqlConnection(builder.ConnectionString);"], "mssql_python_env": ["import os", "import pyodbc", "", "server = os.environ['${1:SQL_SERVER}']", "database = os.environ['${2:SQL_DATABASE}']", "connection = pyodbc.connect(", "\tf\"Driver={{ODBC Driver 18 for SQL Server}};Server={server};Database={database};\"", "\t\"Authentication=ActiveDirectoryDefault;Encrypt=yes\"", ")"], "sqltools_conn_nopassword": ["{", "\t\"name\": \"${1:Reporting DB}\",", "\t\"driver\": \"MSSQL\",", "\t\"server\": \"${2:localhost}\",", "\t\"port\": 1433,", "\t\"database\": \"${3:reporting}\",", "\t\"username\": \"${4:reporting_reader}\",", "\t\"askForPassword\": true", "}"], "aks_secret_ref": ["env:", "  - name: ${1:IOTHUB_CONNECTION_STRING}", "    valueFrom:", "      secretKeyRef:", "        name: ${2:iothub-credentials}", "        key: ${3:connection-string}"], "aks_csi_keyvault": ["apiVersion: secrets-store.csi.x-k8s.io/v1", "kind: SecretProviderClass", "metadata:", "  name: ${1:iothub-secrets}", "spec:", "  provider: azure", "  parameters:", "    usePodIdentity: \"false\"", "    clientID: ${2:workload-identity-client-id}", "    keyvaultName: ${3:my-vault}", "    tenantId: ${4:tenant-id}", "    objects: |", "      array:", "        - |", "          objectName: ${5:iothub-connection-string}", "          objectType: secret"], "aks_get_credentials": ["# user-scoped credentials: --admin hands out a cluster-admin certificate that cannot be revoked per user", "az aks get-credentials --resource-group ${1:my-resource-group} --name ${2:my-cluster}"], "aks_secret_from_env": ["# reads the values from a git-ignored file, so no credential appears in this script", "kubectl create secret generic ${1:iothub-credentials} --from-env-file=${2:.env.production}"], "maui_securestorage_set": ["// SecureStorage uses the platform keystore; Preferences does not.", "await SecureStorage.Default.SetAsync(\"${1:iothub_device_key}\", ${2:deviceKey});"], "maui_securestorage_get": ["var ${1:deviceKey} = await SecureStorage.Default.GetAsync(\"${2:iothub_device_key}\");", "if (string.IsNullOrEmpty(${1}))", "{", "\tawait Shell.Current.GoToAsync(\"${3:pairing}\");", "\treturn;", "}"], "maui_config_binding": ["builder.Configuration.AddUserSecrets<App>(optional: true);", "builder.Services.Configure<${1:IotOptions}>(builder.Configuration.GetSection(\"${2:Iot}\"));"], "maui_appsettings_shape": ["{", "\t\"${1:Iot}\": {", "\t\t\"HostName\": \"${2:my-hub}.azure-devices.net\",", "\t\t\"DeviceId\": \"${3:sensor-01}\"", "\t},", "\t\"_comment\": \"Keys and passwords live in user secrets or SecureStorage, never in this file.\"", "}"], "mp_config_property": ["@Inject", "@ConfigProperty(name = \"${1:iothub.connection.string}\")", "String ${2:iotHubConnectionString};"], "mp_config_optional": ["@Inject", "@ConfigProperty(name = \"${1:iothub.connection.string}\")", "Optional<String> ${2:iotHubConnectionString};", "", "void onStart(@Observes StartupEvent event) {", "\t${2}.orElseThrow(() -> new IllegalStateException(\"${1} is not configured\"));", "}"], "mp_config_properties": ["# this file names the properties; the values come from the environment", "${1:iothub.connection.string}=\\${IOTHUB_CONNECTION_STRING}", "${2:sql.password}=\\${SQL_PASSWORD}"], "mp_rest_auth_header": ["public class ${1:IotHeadersFactory} implements ClientHeadersFactory {", "", "\t@Inject", "\t@ConfigProperty(name = \"${2:iothub.sas.token}\")", "\tString token;", "", "\t@Override", "\tpublic MultivaluedMap<String, String> update(MultivaluedMap<String, String> incoming, MultivaluedMap<String, String> outgoing) {", "\t\toutgoing.add(\"Authorization\", token);", "\t\treturn outgoing;", "\t}", "}"], "r_env_key": ["${1:iothub_key} <- Sys.getenv(\"${2:IOTHUB_SAS_TOKEN}\")", "if (!nzchar(${1})) stop(\"${2} is not set. Add it to .Renviron, which stays out of git.\")"], "r_renviron": ["# .Renviron - keep this file out of git", "IOTHUB_SAS_TOKEN=", "SQL_SERVER=", "SQL_DATABASE="], "r_dbconnect_env": ["con <- DBI::dbConnect(", "\todbc::odbc(),", "\tDriver = \"ODBC Driver 18 for SQL Server\",", "\tServer = Sys.getenv(\"${1:SQL_SERVER}\"),", "\tDatabase = Sys.getenv(\"${2:SQL_DATABASE}\"),", "\tAuthentication = \"ActiveDirectoryIntegrated\",", "\tEncrypt = \"yes\"", ")"], "r_keyring": ["${1:token} <- keyring::key_get(\"${2:iothub}\", \"${3:sensor-01}\")"], "rmd_setup_chunk": ["```{r setup, include=FALSE}", "knitr::opts_chunk\\$set(echo = FALSE)", "${1:api_key} <- Sys.getenv(\"${2:IOTHUB_SAS_TOKEN}\")", "```"], "rmd_secret_guard": ["```{r credentials-check, include=FALSE}", "required <- c(\"${1:IOTHUB_SAS_TOKEN}\", \"${2:SQL_SERVER}\")", "missing <- required[!nzchar(Sys.getenv(required))]", "if (length(missing)) stop(\"Set these before rendering: \", paste(missing, collapse = \", \"))", "```"], "rmd_params_header": ["---", "title: \"${1:Device Fleet Report}\"", "output: html_document", "params:", "  hub_name: \"${2:my-hub}\"", "  window_days: ${3:7}", "---"], "qmd_env_chunk": ["```{r}", "#| echo: false", "#| message: false", "con <- DBI::dbConnect(odbc::odbc(), dsn = Sys.getenv(\"${1:REPORTING_DSN}\"))", "```"], "env_example_block": ["# .env.example - commit this file, never the filled .env", "IOTHUB_DEVICE_CONNECTION_STRING=", "SQL_CONNECTION_STRING=", "AZURE_STORAGE_CONNECTION_STRING=", "REGISTRY_PASSWORD="], "gitignore_secrets": ["# secrets", "..env", "..env.*", "!.env.example", ".Renviron", "appsettings.Development.json", "kubeconfig", "*.pfx", "*.pem"], "secrets_readme": ["## Where the credentials live", "", "| Name | Where it is stored | Who rotates it |", "| --- | --- | --- |", "| ${1:IOTHUB_DEVICE_CONNECTION_STRING} | ${2:Azure Key Vault} | ${3:platform team} |", "", "Nothing in this repository contains a live key. Run the audit before every push."], "rotate_checklist": ["## Key rotation - run in this order", "", "1. Create the second key on ${1:the IoT Hub shared access policy}.", "2. Update ${2:Key Vault} with the new value.", "3. Restart the consumers and confirm they connect.", "4. Regenerate the first key.", "5. Re-run the workspace audit and export the report."]};

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
  const _c = vscode.workspace.getConfiguration('connection-string-secret-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('connection-string-secret-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('connection-string-secret-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'connection-string-secret-audit-report.' + pick.toLowerCase());
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
  try { lic.pullFeed(ctx, "connection-string-secret-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('connection-string-secret-audit.audit_file', runCurrent);
  reg('connection-string-secret-audit.audit_selection', runSelection);
  reg('connection-string-secret-audit.insert_snippet', insertSnippet);
  reg('connection-string-secret-audit.list_rules', listRules);
  reg('connection-string-secret-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('connection-string-secret-audit.export_report', function () { return exportReport(ctx); });
  reg('connection-string-secret-audit.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('connection-string-secret-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
