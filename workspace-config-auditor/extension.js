// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking this file against 25 config rules.", "done": "Audit finished. Every finding is listed in the Output panel with its file name and line number.", "nothing_found": "No findings. This file passes all 25 rules.", "need_key": "This is a paid command. Paste your licence key to switch on the workspace scan, quick fixes and report export.", "key_ok": "Licence key accepted. Workspace scan, quick fixes and report export are now available.", "key_bad": "That key was not accepted. Check for a missing character, or reply to your purchase receipt.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Angular CLI Workspace Config Auditor');
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
const RULES = [{"pattern": "\"outputHashing\"\\s*:\\s*\"none\"", "flags": "i", "message": "angular.json: outputHashing is \"none\". Browsers and CDNs keep serving yesterday's main.js after you deploy, because the file name never changes.", "fix": "\"outputHashing\": \"all\""}, {"pattern": "\"aot\"\\s*:\\s*false", "flags": "i", "message": "angular.json: aot is off. The bundle carries the template compiler and templates are only checked at runtime.", "fix": "\"aot\": true"}, {"pattern": "\"extractLicenses\"\\s*:\\s*false", "flags": "i", "message": "angular.json: extractLicenses is off, so no 3rdpartylicenses.txt is emitted. Licence compliance reviews ask for that file.", "fix": "\"extractLicenses\": true"}, {"pattern": "HostName=[^;\"\\s]+;DeviceId=[^;\"\\s]+;SharedAccessKey=", "flags": "", "message": "An IoT Hub device connection string is written into this file. Anyone who can read the repository can send messages as that device. Move it to an environment variable or Key Vault reference and rotate the key."}, {"pattern": "\"createOptions\"\\s*:\\s*\\{", "flags": "", "message": "IoT Edge deployment manifest: createOptions is an object here, but the agent expects a JSON string. Wrap the whole thing in quotes, for example \"createOptions\": \"{}\"."}, {"pattern": "\"restartPolicy\"\\s*:\\s*\"never\"", "flags": "i", "message": "IoT Edge module restartPolicy is \"never\". After the first crash the module stays down until someone redeploys the device.", "fix": "\"restartPolicy\": \"always\""}, {"pattern": "[\"']?(statements|branches|functions|lines)[\"']?\\s*:\\s*0\\s*[,}]", "flags": "", "message": "A coverage threshold is set to 0. This gate can never fail, so the pipeline reports a coverage check that checks nothing. Set a number you actually hold today."}, {"pattern": "\"codeCoverage\"\\s*:\\s*false", "flags": "i", "message": "angular.json test target: codeCoverage is off, so no lcov is produced and any coverage step downstream has nothing to read.", "fix": "\"codeCoverage\": true"}, {"pattern": "browsers\\s*:\\s*\\[\\s*['\"]Chrome['\"]\\s*\\]", "flags": "", "message": "karma.conf: browsers is [\"Chrome\"]. On a build agent with no display this hangs until the timeout. Use a headless launcher.", "fix": "browsers: ['ChromeHeadless']"}, {"pattern": "<html(?![^>]*\\slang=)[^>]*>", "flags": "i", "message": "<html> has no lang attribute. Screen readers pick the wrong pronunciation and this is the first thing an accessibility audit flags (WCAG 3.1.1, Language of Page)."}, {"pattern": "<img(?![^>]*\\balt=)[^>]*>", "flags": "i", "message": "<img> has no alt attribute. Add alt=\"\" if the image is decorative, or a short description if it carries meaning (WCAG 1.1.1)."}, {"pattern": "target=[\"']_blank[\"'](?![^>]*rel=)", "flags": "i", "message": "target=\"_blank\" without rel. The opened page gets a handle on window.opener in older engines and can navigate your tab away.", "fix": "target=\"_blank\" rel=\"noopener noreferrer\""}, {"pattern": "user-scalable\\s*=\\s*no", "flags": "i", "message": "The viewport meta blocks pinch zoom. That fails WCAG 1.4.4 (Resize Text) and is the single most common finding on mobile accessibility reviews."}, {"pattern": "^\\t+[a-z][\\w.-]*:\\s*$", "flags": "", "message": "Tab indentation in a YAML mapping. YAML forbids tabs for indentation, and most parsers stop at this line. Replace the tabs with spaces."}, {"pattern": "^on:\\s*$", "flags": "", "message": "The bare key on: is read as the boolean true by YAML 1.1 parsers, so tools that lint your workflow can lose the trigger block. Quote the key.", "fix": "\"on\":"}, {"pattern": ":\\s+(yes|no|off)\\s*$", "flags": "i", "message": "A bare yes / no / off value: YAML 1.1 parsers turn this into a boolean, YAML 1.2 parsers keep it as a string, and the two disagree. Quote the value if you meant the word."}, {"pattern": "^\\s*(password|token|api_key|apiKey|client_secret)\\s*:\\s*(?!\\$\\{|\\s*$)[\"']?[A-Za-z0-9+/=_-]{8,}", "flags": "", "message": "A literal secret is written into this YAML file. Replace it with a variable reference such as ${{ secrets.NAME }} or an environment lookup, then rotate the value that was committed."}, {"pattern": "\"\\*\\*/(node_modules|dist|out|coverage)\"\\s*:\\s*false", "flags": "", "message": "This generated folder is explicitly set to false in an exclude list, which puts it back into the explorer, the search index and the file watcher. Set it to true unless you really need to open files in there."}, {"pattern": "\"files\\.exclude\"\\s*:\\s*\\{\\s*\\}", "flags": "", "message": ".vscode/settings.json: files.exclude is empty, so node_modules, dist and coverage are all in the explorer tree and in every Go to File result."}, {"pattern": "\"search\\.followSymlinks\"\\s*:\\s*true", "flags": "", "message": "search.followSymlinks is on. Every search walks symlinked package folders, which is why full-text search crawls in a monorepo.", "fix": "\"search.followSymlinks\": false"}, {"pattern": "\"uri\"\\s*:\\s*\"https?://", "flags": "i", "message": "manifest.json dataSource: the uri is an absolute URL. A deployed Fiori app must call a relative path so the destination or the launchpad proxy resolves the backend. Use a path beginning with /sap/opu/odata/."}, {"pattern": "\"async\"\\s*:\\s*false", "flags": "i", "message": "manifest.json: asynchronous loading is switched off. Synchronous view and router loading is deprecated in SAPUI5 and blocks the main thread while views load.", "fix": "\"async\": true"}, {"pattern": "xmlns:edmx=\"http://schemas\\.microsoft\\.com/ado/2007/06/edmx\"", "flags": "", "message": "This annotation file uses the OData V2 edmx namespace. A V4 service will not load it — the V4 namespace is http://docs.oasis-open.org/odata/ns/edmx. Check which version your dataSource declares."}, {"pattern": "<Annotations(?![^>]*Target=)", "flags": "i", "message": "<Annotations> without a Target attribute. The annotations inside it are attached to nothing, so the modeler and Fiori Elements silently ignore the whole block."}, {"pattern": "<Record>\\s*$", "flags": "", "message": "<Record> has no Type attribute. Inside a UI collection each record needs its type, for example Type=\"UI.DataField\", or the entry is not rendered."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('workspace-config-auditor');
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

const SNIPPETS = {"ng_budget": ["\"budgets\": [", "  {", "    \"type\": \"initial\",", "    \"maximumWarning\": \"${1:500kb}\",", "    \"maximumError\": \"${2:1mb}\"", "  },", "  {", "    \"type\": \"anyComponentStyle\",", "    \"maximumWarning\": \"${3:2kb}\",", "    \"maximumError\": \"${4:4kb}\"", "  }", "]"], "ng_prod_config": ["\"production\": {", "  \"budgets\": [", "    { \"type\": \"initial\", \"maximumWarning\": \"${1:500kb}\", \"maximumError\": \"${2:1mb}\" }", "  ],", "  \"outputHashing\": \"all\",", "  \"optimization\": true,", "  \"sourceMap\": false,", "  \"namedChunks\": false,", "  \"extractLicenses\": true,", "  \"aot\": true", "}"], "ng_proxy": ["{", "  \"/${1:api}\": {", "    \"target\": \"http://${2:localhost:8080}\",", "    \"secure\": false,", "    \"changeOrigin\": true,", "    \"logLevel\": \"debug\",", "    \"pathRewrite\": { \"^/${1:api}\": \"\" }", "  }", "}"], "ng_file_replacements": ["\"fileReplacements\": [", "  {", "    \"replace\": \"src/environments/environment.ts\",", "    \"with\": \"src/environments/environment.${1:production}.ts\"", "  }", "]"], "ng_test_coverage": ["\"test\": {", "  \"builder\": \"@angular-devkit/build-angular:karma\",", "  \"options\": {", "    \"karmaConfig\": \"karma.conf.js\",", "    \"tsConfig\": \"tsconfig.spec.json\",", "    \"codeCoverage\": true,", "    \"codeCoverageExclude\": [\"${1:src/**/*.spec.ts}\"]", "  }", "}"], "iot_edge_deployment": ["\"modules\": {", "  \"${1:SampleModule}\": {", "    \"version\": \"1.0\",", "    \"type\": \"docker\",", "    \"status\": \"running\",", "    \"restartPolicy\": \"always\",", "    \"settings\": {", "      \"image\": \"${2:myregistry.azurecr.io/samplemodule:0.0.1-amd64}\",", "      \"createOptions\": \"{}\"", "    }", "  }", "}"], "iot_edge_route": ["\"routes\": {", "  \"${1:sensorToCloud}\": \"FROM /messages/modules/${2:SampleModule}/outputs/${3:output1} INTO \\$upstream\",", "  \"${4:sensorToModule}\": \"FROM /messages/modules/${2:SampleModule}/outputs/${3:output1} INTO BrokeredEndpoint(\\\"/modules/${5:FilterModule}/inputs/input1\\\")\"", "},", "\"storeAndForwardConfiguration\": {", "  \"timeToLiveSecs\": ${6:7200}", "}"], "iot_module_twin": ["\"${1:SampleModule}\": {", "  \"properties.desired\": {", "    \"telemetryIntervalSeconds\": ${2:60},", "    \"logLevel\": \"${3:info}\",", "    \"thresholds\": {", "      \"temperature\": ${4:25}", "    }", "  }", "}"], "cov_jest_threshold": ["coverageThreshold: {", "  global: {", "    statements: ${1:80},", "    branches: ${2:70},", "    functions: ${3:80},", "    lines: ${4:80}", "  }", "}"], "cov_jest_collect": ["collectCoverage: true,", "collectCoverageFrom: [", "  'src/**/*.{ts,tsx}',", "  '!src/**/*.spec.ts',", "  '!src/**/*.module.ts',", "  '!src/main.ts'", "],", "coverageReporters: ['text-summary', 'lcov', 'cobertura'],", "coverageDirectory: 'coverage/${1:app-name}'"], "cov_karma_check": ["coverageReporter: {", "  dir: require('path').join(__dirname, './coverage/${1:app-name}'),", "  subdir: '.',", "  reporters: [", "    { type: 'html' },", "    { type: 'text-summary' },", "    { type: 'lcovonly' }", "  ],", "  check: {", "    global: {", "      statements: ${2:80},", "      branches: ${3:70},", "      functions: ${4:80},", "      lines: ${5:80}", "    }", "  }", "}"], "cov_karma_ci_browser": ["browsers: ['ChromeHeadlessCI'],", "customLaunchers: {", "  ChromeHeadlessCI: {", "    base: 'ChromeHeadless',", "    flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']", "  }", "},", "singleRun: true,", "restartOnFileChange: false"], "html5_document": ["<!DOCTYPE html>", "<html lang=\"${1:en}\">", "<head>", "  <meta charset=\"utf-8\">", "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">", "  <title>${2:Page title}</title>", "  <meta name=\"description\" content=\"${3:One sentence describing this page.}\">", "  <link rel=\"canonical\" href=\"${4:/}\">", "</head>", "<body>", "  <a class=\"skip-link\" href=\"#main\">${5:Skip to content}</a>", "  <main id=\"main\">", "    ${0}", "  </main>", "</body>", "</html>"], "html5_picture": ["<picture>", "  <source srcset=\"${1:image}.avif\" type=\"image/avif\">", "  <source srcset=\"${1:image}.webp\" type=\"image/webp\">", "  <img src=\"${1:image}.jpg\"", "       alt=\"${2:What the image shows}\"", "       width=\"${3:1200}\" height=\"${4:630}\"", "       loading=\"lazy\" decoding=\"async\">", "</picture>"], "html5_form_field": ["<div class=\"field\">", "  <label for=\"${1:email}\">${2:Email address}</label>", "  <input id=\"${1:email}\"", "         name=\"${1:email}\"", "         type=\"${3:email}\"", "         autocomplete=\"${4:email}\"", "         required", "         aria-describedby=\"${1:email}-help\">", "  <p id=\"${1:email}-help\">${5:We only use this to reply to you.}</p>", "</div>"], "html5_landmarks": ["<body>", "  <a class=\"skip-link\" href=\"#main\">${1:Skip to content}</a>", "  <header>", "    <nav aria-label=\"${2:Primary}\">", "      <ul>", "        <li><a href=\"${3:/}\">${4:Home}</a></li>", "      </ul>", "    </nav>", "  </header>", "  <main id=\"main\" tabindex=\"-1\">", "    ${0}", "  </main>", "  <footer>", "    <p>${5:Contact and legal links go here.}</p>", "  </footer>", "</body>"], "yaml_anchor_block": ["x-common: &common", "  restart: ${1:unless-stopped}", "  logging:", "    driver: json-file", "    options:", "      max-size: \"10m\"", "", "services:", "  ${2:api}:", "    <<: *common", "    image: ${3:node:20-alpine}"], "yaml_block_scalar": ["${1:script}: |", "  ${2:npm ci}", "  ${3:npm run build}", "summary: >-", "  ${4:This text is folded into a single line when the file is read.}"], "yaml_workflow_trigger": ["\"on\":", "  push:", "    branches: [ ${1:main} ]", "  pull_request:", "    branches: [ ${1:main} ]", "  workflow_dispatch:"], "yaml_matrix": ["strategy:", "  fail-fast: false", "  matrix:", "    node: [ ${1:18}, ${2:20}, ${3:22} ]", "    os: [ ubuntu-latest, windows-latest ]", "runs-on: ${{ matrix.os }}"], "vsc_files_exclude": ["\"files.exclude\": {", "  \"**/.git\": true,", "  \"**/node_modules\": true,", "  \"**/dist\": true,", "  \"**/coverage\": true,", "  \"**/.angular\": true,", "  \"**/*.js.map\": ${1:true}", "}"], "vsc_search_exclude": ["\"search.exclude\": {", "  \"**/node_modules\": true,", "  \"**/dist\": true,", "  \"**/coverage\": true,", "  \"**/package-lock.json\": true,", "  \"**/*.min.js\": true", "},", "\"search.followSymlinks\": false"], "vsc_watcher_exclude": ["\"files.watcherExclude\": {", "  \"**/node_modules/**\": true,", "  \"**/dist/**\": true,", "  \"**/.angular/**\": true,", "  \"**/coverage/**\": true", "}"], "fiori_manifest_app": ["\"sap.app\": {", "  \"id\": \"${1:com.company.app}\",", "  \"type\": \"application\",", "  \"applicationVersion\": { \"version\": \"${2:1.0.0}\" },", "  \"title\": \"{{appTitle}}\",", "  \"description\": \"{{appDescription}}\",", "  \"dataSources\": {", "    \"mainService\": {", "      \"uri\": \"${3:/sap/opu/odata/sap/ZSERVICE_SRV/}\",", "      \"type\": \"OData\",", "      \"settings\": {", "        \"odataVersion\": \"${4:2.0}\",", "        \"localUri\": \"localService/metadata.xml\"", "      }", "    }", "  }", "}"], "fiori_manifest_ui5": ["\"sap.ui5\": {", "  \"dependencies\": {", "    \"minUI5Version\": \"${1:1.120.0}\",", "    \"libs\": {", "      \"sap.ui.core\": {},", "      \"sap.m\": {},", "      \"sap.f\": {}", "    }", "  },", "  \"rootView\": {", "    \"viewName\": \"${2:com.company.app.view.App}\",", "    \"type\": \"XML\",", "    \"id\": \"app\",", "    \"async\": true", "  },", "  \"models\": {", "    \"i18n\": {", "      \"type\": \"sap.ui.model.resource.ResourceModel\",", "      \"settings\": { \"bundleName\": \"${3:com.company.app.i18n.i18n}\" }", "    },", "    \"\": { \"dataSource\": \"mainService\", \"preload\": true }", "  }", "}"], "fiori_routing": ["\"routing\": {", "  \"config\": {", "    \"routerClass\": \"sap.m.routing.Router\",", "    \"viewType\": \"XML\",", "    \"viewPath\": \"${1:com.company.app.view}\",", "    \"controlId\": \"app\",", "    \"controlAggregation\": \"pages\",", "    \"async\": true", "  },", "  \"routes\": [", "    { \"name\": \"${2:list}\", \"pattern\": \"\", \"target\": [\"${2:list}\"] },", "    { \"name\": \"${3:detail}\", \"pattern\": \"${3:detail}/{objectId}\", \"target\": [\"${3:detail}\"] }", "  ],", "  \"targets\": {", "    \"${2:list}\": { \"viewName\": \"${2:list}\" },", "    \"${3:detail}\": { \"viewName\": \"${3:detail}\" }", "  }", "}"], "fiori_ui5_yaml": ["specVersion: \"${1:3.0}\"", "metadata:", "  name: ${2:com.company.app}", "type: application", "framework:", "  name: ${3:SAPUI5}", "  version: \"${4:1.120.0}\"", "  libraries:", "    - name: sap.ui.core", "    - name: sap.m", "    - name: themelib_sap_horizon"], "anno_edmx_document": ["<edmx:Edmx xmlns:edmx=\"http://docs.oasis-open.org/odata/ns/edmx\" Version=\"4.0\">", "  <edmx:Reference Uri=\"https://sap.github.io/odata-vocabularies/vocabularies/UI.xml\">", "    <edmx:Include Namespace=\"com.sap.vocabularies.UI.v1\" Alias=\"UI\"/>", "  </edmx:Reference>", "  <edmx:DataServices>", "    <Schema xmlns=\"http://docs.oasis-open.org/odata/ns/edm\" Namespace=\"${1:local}\">", "      <Annotations Target=\"${2:ServiceNamespace.EntityType}\">", "        ${0}", "      </Annotations>", "    </Schema>", "  </edmx:DataServices>", "</edmx:Edmx>"], "anno_line_item": ["<Annotation Term=\"UI.LineItem\">", "  <Collection>", "    <Record Type=\"UI.DataField\">", "      <PropertyValue Property=\"Value\" Path=\"${1:ProductName}\"/>", "      <PropertyValue Property=\"Label\" String=\"${2:Product}\"/>", "    </Record>", "    <Record Type=\"UI.DataField\">", "      <PropertyValue Property=\"Value\" Path=\"${3:Price}\"/>", "      <PropertyValue Property=\"Label\" String=\"${4:Price}\"/>", "    </Record>", "  </Collection>", "</Annotation>"], "anno_selection_fields": ["<Annotation Term=\"UI.SelectionFields\">", "  <Collection>", "    <PropertyPath>${1:Status}</PropertyPath>", "    <PropertyPath>${2:CreatedAt}</PropertyPath>", "  </Collection>", "</Annotation>"], "anno_header_info": ["<Annotation Term=\"UI.HeaderInfo\">", "  <Record Type=\"UI.HeaderInfoType\">", "    <PropertyValue Property=\"TypeName\" String=\"${1:Order}\"/>", "    <PropertyValue Property=\"TypeNamePlural\" String=\"${2:Orders}\"/>", "    <PropertyValue Property=\"Title\">", "      <Record Type=\"UI.DataField\">", "        <PropertyValue Property=\"Value\" Path=\"${3:OrderID}\"/>", "      </Record>", "    </PropertyValue>", "  </Record>", "</Annotation>"], "anno_field_group": ["<Annotation Term=\"UI.FieldGroup\" Qualifier=\"${1:General}\">", "  <Record Type=\"UI.FieldGroupType\">", "    <PropertyValue Property=\"Label\" String=\"${2:General information}\"/>", "    <PropertyValue Property=\"Data\">", "      <Collection>", "        <Record Type=\"UI.DataField\">", "          <PropertyValue Property=\"Value\" Path=\"${3:CustomerName}\"/>", "        </Record>", "        <Record Type=\"UI.DataField\">", "          <PropertyValue Property=\"Value\" Path=\"${4:CreatedAt}\"/>", "        </Record>", "      </Collection>", "    </PropertyValue>", "  </Record>", "</Annotation>"]};

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
  const pick = await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'workspace-config-auditor-report.' + pick.toLowerCase());
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
  try { lic.pullFeed(ctx, "workspace-config-auditor").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('workspace-config-auditor.audit_file', runCurrent);
  reg('workspace-config-auditor.audit_selection', runSelection);
  reg('workspace-config-auditor.insert_snippet', insertSnippet);
  reg('workspace-config-auditor.list_rules', listRules);
  reg('workspace-config-auditor.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('workspace-config-auditor.export_report', function () { return exportReport(ctx); });
  reg('workspace-config-auditor.quick_fix', function () { return quickFix(ctx); });
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
