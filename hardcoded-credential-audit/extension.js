// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking for hardcoded credentials…", "done": "Finished: {count} findings in {files} file(s).", "nothing_found": "No hardcoded credentials found by the 30 built-in checks.", "need_key": "This is a paid feature. Enter your licence key to continue — the free checks keep working either way.", "key_ok": "Licence key accepted. Workspace scan, reports, save-watching, custom rules, CI output and quick fixes are on.", "key_bad": "That key was not accepted. Check for a missing character, or reply to your purchase email and we will sort it out.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "watch_on_save", "custom_rules", "ci_json", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Hardcoded Credential Audit — 8 Stacks');
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
  for (const r of rows) {
    if (!r.hits.length) continue;
    c.appendLine(path.basename(r.file));
    for (const h of r.hits) { c.appendLine('  ' + h.line + ': ' + h.msg); n++; }
  }
  c.appendLine('—— ' + n + ' ——');
  c.show(true);
  return n;
}

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질).
const RULES = [{"pattern": "SharedAccessKey\\s*=\\s*[A-Za-z0-9+/=]{22,}", "flags": "i", "message": "A device or service shared access key is written in this file. Anyone who clones the repository can talk to that endpoint as you."}, {"pattern": "HostName\\s*=\\s*[A-Za-z0-9._-]+\\.azure-devices\\.net", "flags": "i", "message": "An IoT hub endpoint is hardcoded here. If the key sits in the same string, this line is a complete working credential."}, {"pattern": "AccountKey\\s*=\\s*[A-Za-z0-9+/=]{40,}", "flags": "i", "message": "A storage account key is in this file. Rotating it means updating every service that reads that account."}, {"pattern": "(?:Password|Pwd)\\s*=\\s*(?!\\s*[;\"'])[^;\"'\\s]{3,}", "flags": "i", "message": "This connection string carries the password in plain text. Move it out and read it at runtime."}, {"pattern": "Encrypt\\s*=\\s*[Ff]alse", "flags": "i", "message": "Encryption is switched off on this connection. The password you just protected travels in the clear.", "fix": "Encrypt=True"}, {"pattern": "TrustServerCertificate\\s*=\\s*[Tt]rue", "flags": "i", "message": "The server certificate is trusted without checking it, which defeats the encryption on this connection.", "fix": "TrustServerCertificate=False"}, {"pattern": "jdbc:[a-z0-9]+:[^\\s\"']*[?&](?:user|password)=[^&\\s\"']+", "flags": "i", "message": "Credentials are embedded in this JDBC URL. URLs end up in logs, stack traces and error pages."}, {"pattern": "\"password\"\\s*:\\s*\"[^\"]{3,}\"", "flags": "i", "message": "A connection password is stored in plain text in this configuration. Ask for it at connect time instead.", "fix": "\"askForPassword\": true"}, {"pattern": "^[A-Za-z0-9._-]*(?:password|secret|token|api[._-]?key)\\s*=\\s*(?!\\$\\{)\\S+", "flags": "im", "message": "This config property holds the literal secret. Use a config expression that resolves from the environment."}, {"pattern": "\\$\\{[A-Za-z0-9._-]+:[^}\\s]{8,}\\}", "flags": "i", "message": "The config expression looks safe, but its default value is the real secret — it ships whenever the variable is unset."}, {"pattern": "^\\s*(?:password|passwd|token|apiKey|secretKey)\\s*:\\s*(?!\\$)[\"']?[^\\s\"'{}]{6,}", "flags": "im", "message": "A literal secret value sits in this manifest. Reference a Secret instead of writing the value into the YAML."}, {"pattern": "client-key-data\\s*:\\s*[A-Za-z0-9+/=]{40,}", "flags": "i", "message": "This kubeconfig embeds a client private key. Whoever holds this file holds cluster access."}, {"pattern": "insecure-skip-tls-verify\\s*:\\s*true", "flags": "i", "message": "TLS verification is disabled for this cluster connection, so the credential can be handed to anyone answering on that address.", "fix": "insecure-skip-tls-verify: false"}, {"pattern": "^\\s{2,}[A-Za-z0-9_.-]+\\s*:\\s*[A-Za-z0-9+/]{40,}={0,2}\\s*$", "flags": "m", "message": "This looks like a base64 value in a Secret. Base64 is encoding, not encryption — anyone can decode it in one command."}, {"pattern": "^\\s*(?:password|dbPassword|rootPassword|adminPassword)\\s*:\\s*(?![\"']{2})\\S{4,}", "flags": "im", "message": "A chart values file is carrying the real password. Point at an existing Secret instead."}, {"pattern": "\"(?:Password|ApiKey|ClientSecret|AccountKey)\"\\s*:\\s*\"[^\"]{8,}\"", "flags": "i", "message": "appsettings.json holds the live secret. This file is committed by default in most project templates."}, {"pattern": "(?:const\\s+)?string\\s+\\w*(?:Key|Secret|Token|Password)\\w*\\s*=\\s*\"[^\"]{8,}\"", "flags": "i", "message": "A credential is compiled into the binary as a string literal. Shipping the app ships the secret."}, {"pattern": "Sys\\.setenv\\(\\s*[A-Za-z_][A-Za-z0-9_.]*\\s*=\\s*[\"'][^\"']{8,}[\"']", "flags": "i", "message": "The script sets an environment variable to a literal secret. Put the value in .Renviron and read it, do not write it."}, {"pattern": "dbConnect\\([^)]*?(?:password|pwd)\\s*=\\s*[\"'][^\"']+[\"']", "flags": "i", "message": "The database password is passed as a literal in this connection call. Read it from the environment or the keyring."}, {"pattern": "ssl_verifypeer\\s*=\\s*(?:0|FALSE)", "flags": "i", "message": "Certificate checking is turned off on this request, so any token it sends can be collected by an interceptor.", "fix": "ssl_verifypeer = 1"}, {"pattern": "^(?!#)\\s*[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PWD)\\s*=\\s*(?!\\$)(?!<)(?!\"\")(?!change)[^\\s#]{8,}", "flags": "im", "message": "This env file holds a real value, not a placeholder. If it is not in .gitignore it is already in the history."}, {"pattern": "export\\s+[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\\s*=\\s*[\"']?[^\\s\"'$]{8,}", "flags": "i", "message": "A secret is exported with a literal value in this script. It also lands in your shell history."}, {"pattern": "^\\s*[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\\s*:\\s*(?!\\$)[\"']?[^\\s\"']{12,}", "flags": "im", "message": "A pipeline env value is inline instead of a secret reference, so it appears in build logs."}, {"pattern": "-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----", "flags": "i", "message": "A private key block is in this file. Remove it and reissue the key — the old one must be treated as public."}, {"pattern": "eyJ[A-Za-z0-9_-]{8,}\\.eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}", "flags": "i", "message": "A signed token is pasted here. It works until it expires, and expiry is not a control you own."}, {"pattern": "Bearer\\s+[A-Za-z0-9\\-._~+/]{20,}=*", "flags": "i", "message": "A bearer token is written out in full. Anything holding this line can call the API as the token's owner."}, {"pattern": "[a-z][a-z0-9+.-]*://[^/\\s:@]+:[^/\\s:@]{3,}@", "flags": "i", "message": "Username and password are embedded in this URL. Proxies and log lines keep the whole URL."}, {"pattern": "(?:password|passwd|pwd)\\s*[:=]\\s*[\"'](?:123456|admin|password|changeme|test|root)[\"']", "flags": "i", "message": "A default or placeholder password is being used as a real one. These are the first values anything scanning your service will try."}, {"pattern": "AKIA[0-9A-Z]{16}", "flags": "i", "message": "A cloud access key id is in this file. It is only useful with its secret — and the secret is usually two lines away."}, {"pattern": "gh[pousr]_[A-Za-z0-9]{36}", "flags": "i", "message": "A personal access token is written here. It carries your account's permissions, not the project's."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('hardcoded-credential-audit');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      let re;
      try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
      if (re.test(lines[i])) hits.push({ line: i + 1, msg: r.message, fix: r.fix || null });
    }
  }
  return hits;
}

const SNIPPETS = {"mp_config_env_ref": ["# resolved from the environment at start-up, never stored in this file", "${1:db.password}=\\${${2:DB_PASSWORD}}"], "mp_config_profile_env": ["%dev.${1:db.password}=\\${${2:DEV_DB_PASSWORD}}", "%prod.${1:db.password}=\\${${3:PROD_DB_PASSWORD}}"], "mp_config_inject": ["@Inject", "@ConfigProperty(name = \"${1:db.password}\")", "String ${2:dbPassword};"], "mp_config_inject_optional": ["@Inject", "@ConfigProperty(name = \"${1:api.token}\")", "Optional<String> ${2:apiToken};", "", "if (${2}.isEmpty()) {", "    throw new IllegalStateException(\"${1} is not configured\");", "}"], "iot_conn_from_env_csharp": ["var ${1:connectionString} = Environment.GetEnvironmentVariable(\"${2:IOT_DEVICE_CONNECTION_STRING}\")", "    ?? throw new InvalidOperationException(\"${2} is not set\");"], "iot_conn_from_env_node": ["const ${1:connectionString} = process.env.${2:IOT_DEVICE_CONNECTION_STRING};", "if (!${1}) {", "  throw new Error('${2} is not set');", "}"], "iot_conn_example_line": ["# .env.example — commit this file, never .env", "${1:IOT_DEVICE_CONNECTION_STRING}=HostName=<your-hub>;DeviceId=<your-device>;SharedAccessKey=<paste-locally>"], "iot_key_secure_storage": ["await SecureStorage.Default.SetAsync(\"${1:iot_device_key}\", ${2:value});", "var ${3:deviceKey} = await SecureStorage.Default.GetAsync(\"${1}\");"], "sql_conn_from_env_csharp": ["var ${1:connectionString} = Environment.GetEnvironmentVariable(\"${2:DB_CONNECTION_STRING}\")", "    ?? throw new InvalidOperationException(\"${2} is not set\");"], "sql_conn_builder_csharp": ["var ${1:builder} = new SqlConnectionStringBuilder", "{", "    DataSource = Environment.GetEnvironmentVariable(\"${2:DB_SERVER}\"),", "    InitialCatalog = Environment.GetEnvironmentVariable(\"${3:DB_NAME}\"),", "    UserID = Environment.GetEnvironmentVariable(\"${4:DB_USER}\"),", "    Password = Environment.GetEnvironmentVariable(\"${5:DB_PASSWORD}\"),", "    Encrypt = true,", "    TrustServerCertificate = false", "};"], "sqltools_ask_password": ["{", "  \"name\": \"${1:local-mssql}\",", "  \"driver\": \"${2:MSSQL}\",", "  \"server\": \"${3:localhost}\",", "  \"port\": ${4:1433},", "  \"database\": \"${5:app}\",", "  \"username\": \"${6:app_user}\",", "  \"askForPassword\": true", "}"], "jdbc_props_env": ["${1:datasource}.url=\\${${2:DB_URL}}", "${1}.user=\\${${3:DB_USER}}", "${1}.password=\\${${4:DB_PASSWORD}}"], "sql_conn_python_env": ["import os", "", "${1:conn_str} = (", "    f\"Driver={{${2:ODBC Driver 18 for SQL Server}}};\"", "    f\"Server={os.environ['${3:DB_SERVER}']};\"", "    f\"Uid={os.environ['${4:DB_USER}']};\"", "    f\"Pwd={os.environ['${5:DB_PASSWORD}']};\"", "    \"Encrypt=yes;TrustServerCertificate=no;\"", ")"], "appsettings_placeholder": ["\"ConnectionStrings\": {", "  \"${1:Default}\": \"\"", "},", "\"${2:ApiKey}\": \"\""], "dotnet_user_secrets_cli": ["dotnet user-secrets init", "dotnet user-secrets set \"${1:ConnectionStrings:Default}\" \"${2:<paste value here>}\"", "dotnet user-secrets list"], "config_add_environment": ["${1:builder}.Configuration.AddEnvironmentVariables(\"${2:APP_}\");"], "k8s_secret_ref_env": ["env:", "  - name: ${1:DB_PASSWORD}", "    valueFrom:", "      secretKeyRef:", "        name: ${2:app-db}", "        key: ${3:password}"], "k8s_envfrom_secret": ["envFrom:", "  - secretRef:", "      name: ${1:app-db}", "  - configMapRef:", "      name: ${2:app-config}"], "k8s_secret_volume": ["volumes:", "  - name: ${1:app-db-secret}", "    secret:", "      secretName: ${2:app-db}", "      defaultMode: 0400", "volumeMounts:", "  - name: ${1}", "    mountPath: ${3:/etc/secrets}", "    readOnly: true"], "helm_existing_secret": ["${1:database}:", "  existingSecret: ${2:app-db}", "  existingSecretPasswordKey: ${3:password}"], "kubectl_create_secret": ["read -rs -p \"${1:DB password}: \" ${2:DB_PASSWORD}", "kubectl create secret generic ${3:app-db} \\\\", "  --from-literal=password=\"\\$${2}\" \\\\", "  --namespace ${4:default}", "unset ${2}"], "r_getenv_guard": ["${1:api_key} <- Sys.getenv(\"${2:API_KEY}\")", "if (!nzchar(${1})) stop(\"${2} is not set\")"], "r_dbconnect_env": ["con <- DBI::dbConnect(", "  odbc::odbc(),", "  Driver = \"${1:ODBC Driver 18 for SQL Server}\",", "  Server = Sys.getenv(\"${2:DB_SERVER}\"),", "  Database = Sys.getenv(\"${3:DB_NAME}\"),", "  UID = Sys.getenv(\"${4:DB_USER}\"),", "  PWD = Sys.getenv(\"${5:DB_PASSWORD}\"),", "  Encrypt = \"yes\"", ")"], "r_keyring_get": ["# run once, interactively:", "# keyring::key_set(\"${1:service}\", username = \"${2:user}\")", "${3:pwd} <- keyring::key_get(\"${1}\", \"${2}\")"], "r_renviron_line": ["# .Renviron — keep this file out of version control", "${1:DB_PASSWORD}=${2:<paste locally, never commit>}"], "dotenv_example_block": ["# .env.example — commit this, add .env to .gitignore", "${1:DB_USER}=", "${2:DB_PASSWORD}=", "${3:API_TOKEN}=", "${4:IOT_DEVICE_CONNECTION_STRING}="], "gitignore_secret_paths": [".env", ".env.*", "!.env.example", ".Renviron", "*.pem", "*.key", "kubeconfig", "appsettings.*.local.json", "secrets/"], "ci_secret_reference": ["env:", "  ${1:DB_PASSWORD}: \\${{ secrets.${2:DB_PASSWORD} }}", "  ${3:API_TOKEN}: \\${{ secrets.${4:API_TOKEN} }}"], "redaction_note": ["[credential removed on ${1:YYYY-MM-DD}]", "Stored in: ${2:secret store / keyring / CI secrets}", "Variable name: ${3:DB_PASSWORD}", "Ask ${4:owner} if you need access."], "rotation_checklist": ["## Rotation — ${1:credential name}", "- [ ] Revoke the exposed value at ${2:issuer}", "- [ ] Issue the replacement", "- [ ] Update the secret store / CI secrets", "- [ ] Redeploy every service that reads it: ${3:list them}", "- [ ] Remove the value from the file AND from the git history", "- [ ] Re-run the workspace audit and export the report"]};

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
  const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 2000);
  const rows = [];
  for (const f of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(f);
      rows.push({ file: f.fsPath, hits: scan(doc.getText(), f.fsPath) });
    } catch (e) { /* 열 수 없는 파일은 건너뛴다 */ }
  }
  report(rows);
}

async function exportReport(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const rows = ed ? [{ file: ed.document.fileName, hits: scan(ed.document.getText(), ed.document.fileName) }] : [];
  const lines = ['file,line,message'];
  for (const r of rows) for (const h of r.hits)
    lines.push([r.file, h.line, String(h.msg).replace(/,/g, ' ')].join(','));
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'hardcoded-credential-audit-report.csv');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(lines.join('\n'), 'utf8'));
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
  await vscode.commands.executeCommand('workbench.action.openSettings', 'hardcoded-credential-audit');
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'hardcoded-credential-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
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
  try { lic.pullFeed(ctx, "hardcoded-credential-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('hardcoded-credential-audit.audit_file', runCurrent);
  reg('hardcoded-credential-audit.audit_selection', runSelection);
  reg('hardcoded-credential-audit.insert_snippet', insertSnippet);
  reg('hardcoded-credential-audit.list_rules', listRules);
  reg('hardcoded-credential-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('hardcoded-credential-audit.export_report', function () { return exportReport(ctx); });
  reg('hardcoded-credential-audit.watch_on_save', function () { return watchOnSave(ctx); });
  reg('hardcoded-credential-audit.custom_rules', function () { return customRules(ctx); });
  reg('hardcoded-credential-audit.ci_json', function () { return ciJson(ctx); });
  reg('hardcoded-credential-audit.quick_fix', function () { return quickFix(ctx); });
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
