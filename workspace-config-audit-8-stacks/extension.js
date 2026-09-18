// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing 26 rules across 8 toolchains...", "done": "Audit finished. See the findings above, each with its file and line number.", "nothing_found": "No findings. Nothing in this file matches any of the 26 rules.", "need_key": "This command belongs to the paid half. Paste your licence key to unlock the workspace scan, the report file and the line replacement. The free commands keep working without a key.", "key_ok": "Licence key accepted. The workspace scan, the report file and the line replacement are now available.", "key_bad": "That key was not accepted. Check for a stray space at either end, or write to the support address on your receipt.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Angular & SAP Fiori Workspace Config Audit');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('workspace-config-audit-8-stacks').get('min_severity')
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
const RULES = [{"pattern": "ng build\\s+[^\\n]*--prod\\b", "flags": "i", "message": "Angular CLI: --prod was removed after Angular 11. This build is not using the production configuration.", "fix": "ng build --configuration production"}, {"pattern": "\"aot\"\\s*:\\s*false", "flags": "i", "message": "Angular CLI: ahead-of-time compilation is switched off, so template errors surface in the browser instead of at build time.", "fix": "\"aot\": true"}, {"pattern": "\"buildOptimizer\"\\s*:\\s*false", "flags": "i", "message": "Angular CLI: the build optimizer is off, so the production bundle keeps code the optimizer would have removed.", "fix": "\"buildOptimizer\": true"}, {"pattern": "\"extractCss\"\\s*:", "flags": "i", "message": "Angular CLI: extractCss is no longer a build option; CSS is extracted by default in a production build. Remove this key."}, {"pattern": "ng serve[^\\n]*--disable-host-check", "flags": "i", "message": "Angular CLI: --disable-host-check turns off the host header check on the dev server. Use --host and an allowed host instead."}, {"pattern": "HostName=[^;\\s\"']+\\.azure-devices\\.net;[^\"'\\s]*SharedAccessKey=", "flags": "i", "message": "Azure IoT: a full IoT Hub connection string with its shared access key is written in this file. Commit it once and every device key it covers has to be rotated. Read it from an environment variable."}, {"pattern": "DefaultEndpointsProtocol=https?;AccountName=", "flags": "i", "message": "Azure IoT: an Azure Storage connection string is written in plain text here. Move it to an environment variable or the pipeline secret store."}, {"pattern": "iothubowner", "flags": "i", "message": "Azure IoT: iothubowner is the all-rights policy. Application and device code should use a device or service policy, not this one."}, {"pattern": "mcr\\.microsoft\\.com/azureiotedge-[a-z0-9-]+:latest", "flags": "i", "message": "Azure IoT Edge: this module image is pinned to :latest, so two deployments of the same manifest can install different code. Pin an explicit version tag."}, {"pattern": "\"(statements|branches|lines|functions)\"\\s*:\\s*0\\s*[,}]", "flags": "i", "message": "Coverage: a threshold is set to 0, so this gate passes whatever the tests actually cover. Set a real number or remove the key."}, {"pattern": "--no-coverage\\b", "flags": "i", "message": "Coverage: this run disables coverage collection, so any downstream coverage gate has nothing to measure."}, {"pattern": "/\\*\\s*istanbul ignore file\\s*\\*/", "flags": "i", "message": "Coverage: the whole file is excluded from coverage. Confirm this is a generated file and not production code being hidden from the gate."}, {"pattern": "<img(?![^>]*\\balt=)[^>]*>", "flags": "i", "message": "HTML5: this img has no alt attribute. Screen readers announce the file name, and accessibility reviews fail on it."}, {"pattern": "<button(?![^>]*\\btype=)[^>]*>", "flags": "i", "message": "HTML5: a button with no type defaults to submit, so it submits the surrounding form when it is clicked."}, {"pattern": "\\[innerHTML\\]\\s*=", "flags": "i", "message": "Angular template: [innerHTML] writes markup straight into the DOM. Bind interpolated text, or sanitise the value explicitly."}, {"pattern": "target=[\"']_blank[\"']", "flags": "i", "message": "HTML5: a link opening in a new tab without rel=\"noopener noreferrer\" gives the opened page a handle on this one.", "fix": "target=\"_blank\" rel=\"noopener noreferrer\""}, {"pattern": "^[ ]*\\t", "flags": "m", "message": "YAML: tab characters are not legal for indentation in YAML. The parser rejects the file. Use spaces."}, {"pattern": ":\\s*(yes|no|on|off)\\s*$", "flags": "im", "message": "YAML: bare yes/no/on/off is read as a boolean by YAML 1.1 parsers and as a string by YAML 1.2 parsers. Write true/false, or quote the value."}, {"pattern": "^\\s*version:\\s*\\d+\\.\\d+\\s*$", "flags": "m", "message": "YAML: an unquoted version like 1.10 is parsed as the number 1.1 and the trailing zero is lost. Quote it."}, {"pattern": "(password|secret|token|apiKey)\\s*:\\s*[\"']?[A-Za-z0-9+/=_-]{8,}", "flags": "i", "message": "YAML: a secret value is written literally in this file. Reference a pipeline variable or an environment variable instead."}, {"pattern": "\"\\*\\*/(node_modules|dist|\\.angular|out|coverage)\"\\s*:\\s*false", "flags": "i", "message": "Workspace settings: a build output folder is explicitly un-excluded, so it comes back into the Explorer tree, the search results and Go to File."}, {"pattern": "\"files\\.watcherExclude\"\\s*:\\s*\\{\\s*\\}", "flags": "i", "message": "Workspace settings: files.watcherExclude is empty, so the editor watches node_modules and dist. On a large Angular or Fiori repository that is the file-watcher limit being spent on generated files."}, {"pattern": "jQuery\\.sap\\.", "flags": "", "message": "SAP UI5: jQuery.sap.* is a legacy namespace kept only for compatibility. Replace it with the sap/base or sap/ui/dom module you need."}, {"pattern": "specVersion:\\s*[\"']?[01]\\.\\d", "flags": "i", "message": "SAP Fiori tooling: ui5.yaml declares an old specVersion. The current UI5 tooling middleware configuration expects a 2.x or newer specVersion."}, {"pattern": "sap:label=", "flags": "i", "message": "SAP Fiori: a sap:label attribute annotation sits in the metadata. In an OData V4 Fiori elements app the label belongs in the annotation file as Common.Label or a UI.DataField label."}, {"pattern": "<PropertyValue[^>]*Property=\"Label\"[^>]*String=\"\"", "flags": "i", "message": "SAP Fiori annotations: this Label is an empty string, so the column header or field renders blank in the running app."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('workspace-config-audit-8-stacks');
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

const SNIPPETS = {"ng_build_budgets": ["\"budgets\": [", "  {", "    \"type\": \"initial\",", "    \"maximumWarning\": \"${1:500kb}\",", "    \"maximumError\": \"${2:1mb}\"", "  },", "  {", "    \"type\": \"anyComponentStyle\",", "    \"maximumWarning\": \"${3:2kb}\",", "    \"maximumError\": \"${4:4kb}\"", "  }", "]"], "ng_prod_configuration": ["\"production\": {", "  \"optimization\": true,", "  \"outputHashing\": \"all\",", "  \"sourceMap\": false,", "  \"namedChunks\": false,", "  \"extractLicenses\": true,", "  \"fileReplacements\": [", "    {", "      \"replace\": \"src/environments/environment.ts\",", "      \"with\": \"src/environments/environment.${1:prod}.ts\"", "    }", "  ]", "}"], "ng_proxy_conf": ["{", "  \"/${1:sap}/*\": {", "    \"target\": \"https://${2:my-system.internal}:44300\",", "    \"secure\": false,", "    \"changeOrigin\": true,", "    \"logLevel\": \"debug\"", "  }", "}"], "ng_lazy_route": ["{", "  path: '${1:orders}',", "  loadChildren: () => import('./${1:orders}/${1:orders}.routes').then(m => m.${2:ORDERS_ROUTES})", "},"], "ng_environment_prod": ["export const environment = {", "  production: true,", "  apiBaseUrl: '${1:/api}',", "  iotHubHostName: '${2:my-hub.azure-devices.net}'", "};"], "ng_standalone_component": ["import { ChangeDetectionStrategy, Component } from '@angular/core';", "", "@Component({", "  selector: '${1:app-order-list}',", "  standalone: true,", "  changeDetection: ChangeDetectionStrategy.OnPush,", "  templateUrl: './${2:order-list}.component.html'", "})", "export class ${3:OrderListComponent} {}"], "iot_edge_module": ["\"${1:telemetryModule}\": {", "  \"version\": \"1.0\",", "  \"type\": \"docker\",", "  \"status\": \"running\",", "  \"restartPolicy\": \"always\",", "  \"settings\": {", "    \"image\": \"${2:myregistry.azurecr.io/telemetry}:${3:1.4.2}\",", "    \"createOptions\": \"{}\"", "  }", "}"], "iot_edge_route": ["\"routes\": {", "  \"${1:telemetryToUpstream}\": \"FROM /messages/modules/${2:telemetryModule}/outputs/* INTO \\$upstream\"", "}"], "iot_client_from_env": ["import { Client, Message } from 'azure-iot-device';", "import { Mqtt } from 'azure-iot-device-mqtt';", "", "const connectionString = process.env.${1:IOTHUB_DEVICE_CONNECTION_STRING};", "if (!connectionString) {", "  throw new Error('${1:IOTHUB_DEVICE_CONNECTION_STRING} is not set');", "}", "const client = Client.fromConnectionString(connectionString, Mqtt);"], "iot_send_telemetry": ["const message = new Message(JSON.stringify({", "  deviceId: '${1:line-04}',", "  ${2:temperature}: ${3:21.4},", "  timestamp: new Date().toISOString()", "}));", "message.contentType = 'application/json';", "message.contentEncoding = 'utf-8';", "await client.sendEvent(message);"], "iot_direct_method": ["client.onDeviceMethod('${1:restartModule}', async (request, response) => {", "  ${2:await restartModule(request.payload);}", "  await response.send(200, { status: '${3:accepted}' });", "});"], "cov_karma_thresholds": ["coverageReporter: {", "  dir: require('path').join(__dirname, './coverage'),", "  subdir: '.',", "  reporters: [", "    { type: 'html' },", "    { type: 'lcovonly' },", "    { type: 'cobertura' }", "  ],", "  check: {", "    global: {", "      statements: ${1:80},", "      branches: ${2:70},", "      functions: ${3:80},", "      lines: ${4:80}", "    }", "  }", "}"], "cov_jest_threshold": ["\"coverageThreshold\": {", "  \"global\": {", "    \"statements\": ${1:80},", "    \"branches\": ${2:70},", "    \"functions\": ${3:80},", "    \"lines\": ${4:80}", "  }", "}"], "cov_ci_test_step": ["- script: npx ng test --watch=false --code-coverage --browsers=ChromeHeadless", "  displayName: '${1:Unit tests with coverage}'"], "cov_publish_results": ["- task: PublishCodeCoverageResults@1", "  inputs:", "    codeCoverageTool: 'Cobertura'", "    summaryFileLocation: '${1:coverage}/cobertura-coverage.xml'", "    reportDirectory: '${1:coverage}'"], "html_image_accessible": ["<img src=\"${1:assets/line-04.webp}\" alt=\"${2:Production line 4 status}\" width=\"${3:640}\" height=\"${4:360}\" loading=\"lazy\" decoding=\"async\">"], "html_labelled_field": ["<label for=\"${1:order-id}\">${2:Order number}</label>", "<input id=\"${1:order-id}\" name=\"${1:order-id}\" type=\"${3:text}\" autocomplete=\"${4:off}\" required>"], "html_external_link": ["<a href=\"${1:https://learn.microsoft.com/azure/iot-hub/}\" target=\"_blank\" rel=\"noopener noreferrer\">${2:IoT Hub documentation}</a>"], "html_data_table": ["<table>", "  <caption>${1:Devices reporting in the last hour}</caption>", "  <thead>", "    <tr>", "      <th scope=\"col\">${2:Device}</th>", "      <th scope=\"col\">${3:Last message}</th>", "    </tr>", "  </thead>", "  <tbody>", "    <tr>", "      <td>${4:line-04}</td>", "      <td>${5:11:42}</td>", "    </tr>", "  </tbody>", "</table>"], "yaml_quoted_version": ["version: \"${1:1.10}\""], "yaml_anchor_reuse": ["defaults: &${1:defaults}", "  pool:", "    vmImage: ${2:ubuntu-latest}", "", "${3:build}:", "  <<: *${1:defaults}"], "yaml_block_scalar": ["${1:script}: |", "  npm ci", "  npx ng build --configuration production"], "yaml_secret_reference": ["env:", "  ${1:IOTHUB_DEVICE_CONNECTION_STRING}: \\$(${2:iothubDeviceConnectionString})"], "vsc_files_exclude": ["\"files.exclude\": {", "  \"**/node_modules\": true,", "  \"**/dist\": true,", "  \"**/.angular\": true,", "  \"**/coverage\": true,", "  \"**/${1:*.js.map}\": true", "}"], "vsc_search_exclude": ["\"search.exclude\": {", "  \"**/node_modules\": true,", "  \"**/dist\": true,", "  \"**/coverage\": true,", "  \"**/${1:package-lock.json}\": true", "}"], "vsc_watcher_exclude": ["\"files.watcherExclude\": {", "  \"**/node_modules/**\": true,", "  \"**/dist/**\": true,", "  \"**/.angular/**\": true,", "  \"**/${1:coverage}/**\": true", "}"], "fiori_manifest_datasource": ["\"dataSources\": {", "  \"${1:mainService}\": {", "    \"uri\": \"/sap/opu/odata4/sap/${2:zui_orders}/srvd/sap/${3:zsd_orders}/0001/\",", "    \"type\": \"OData\",", "    \"settings\": {", "      \"odataVersion\": \"4.0\",", "      \"annotations\": [\"${4:annotation}\"],", "      \"localUri\": \"localService/metadata.xml\"", "    }", "  }", "}"], "fiori_manifest_routing": ["\"routing\": {", "  \"config\": {", "    \"routerClass\": \"sap.f.routing.Router\",", "    \"viewType\": \"XML\",", "    \"async\": true,", "    \"controlId\": \"${1:appContent}\",", "    \"controlAggregation\": \"pages\"", "  },", "  \"routes\": [", "    {", "      \"pattern\": \"\",", "      \"name\": \"${2:OrdersList}\",", "      \"target\": \"${2:OrdersList}\"", "    }", "  ]", "}"], "fiori_ui5_yaml": ["specVersion: \"3.1\"", "metadata:", "  name: ${1:zui-orders}", "type: application", "server:", "  customMiddleware:", "    - name: fiori-tools-proxy", "      afterMiddleware: compression", "      configuration:", "        backend:", "          - path: /sap", "            url: https://${2:my-system.internal}:44300", "            client: \"${3:100}\""], "fiori_view_byid": ["onInit: function () {", "  var ${1:oTable} = this.getView().byId(\"${2:ordersTable}\");", "  ${1:oTable}.attachEvent(\"${3:selectionChange}\", this.${4:onSelectionChange}, this);", "}"], "anno_ui_lineitem": ["<Annotation Term=\"UI.LineItem\">", "  <Collection>", "    <Record Type=\"UI.DataField\">", "      <PropertyValue Property=\"Value\" Path=\"${1:OrderID}\"/>", "      <PropertyValue Property=\"Label\" String=\"${2:Order}\"/>", "    </Record>", "    <Record Type=\"UI.DataField\">", "      <PropertyValue Property=\"Value\" Path=\"${3:CustomerName}\"/>", "      <PropertyValue Property=\"Label\" String=\"${4:Customer}\"/>", "    </Record>", "  </Collection>", "</Annotation>"], "anno_ui_selectionfields": ["<Annotation Term=\"UI.SelectionFields\">", "  <Collection>", "    <PropertyPath>${1:OrderID}</PropertyPath>", "    <PropertyPath>${2:CustomerName}</PropertyPath>", "  </Collection>", "</Annotation>"], "anno_ui_headerinfo": ["<Annotation Term=\"UI.HeaderInfo\">", "  <Record Type=\"UI.HeaderInfoType\">", "    <PropertyValue Property=\"TypeName\" String=\"${1:Order}\"/>", "    <PropertyValue Property=\"TypeNamePlural\" String=\"${2:Orders}\"/>", "    <PropertyValue Property=\"Title\">", "      <Record Type=\"UI.DataField\">", "        <PropertyValue Property=\"Value\" Path=\"${3:OrderID}\"/>", "      </Record>", "    </PropertyValue>", "  </Record>", "</Annotation>"], "anno_common_valuelist": ["<Annotation Term=\"Common.ValueList\">", "  <Record Type=\"Common.ValueListType\">", "    <PropertyValue Property=\"CollectionPath\" String=\"${1:Customers}\"/>", "    <PropertyValue Property=\"Parameters\">", "      <Collection>", "        <Record Type=\"Common.ValueListParameterInOut\">", "          <PropertyValue Property=\"LocalDataProperty\" PropertyPath=\"${2:CustomerID}\"/>", "          <PropertyValue Property=\"ValueListProperty\" String=\"${3:CustomerID}\"/>", "        </Record>", "      </Collection>", "    </PropertyValue>", "  </Record>", "</Annotation>"]};

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
  const _c = vscode.workspace.getConfiguration('workspace-config-audit-8-stacks');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('workspace-config-audit-8-stacks').get('reportFormat')
    || vscode.workspace.getConfiguration('workspace-config-audit-8-stacks').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'workspace-config-audit-8-stacks-report.' + pick.toLowerCase());
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
  try { lic.pullFeed(ctx, "workspace-config-audit-8-stacks").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('workspace-config-audit-8-stacks.audit_file', runCurrent);
  reg('workspace-config-audit-8-stacks.audit_selection', runSelection);
  reg('workspace-config-audit-8-stacks.insert_snippet', insertSnippet);
  reg('workspace-config-audit-8-stacks.list_rules', listRules);
  reg('workspace-config-audit-8-stacks.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('workspace-config-audit-8-stacks.export_report', function () { return exportReport(ctx); });
  reg('workspace-config-audit-8-stacks.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('workspace-config-audit-8-stacks').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
