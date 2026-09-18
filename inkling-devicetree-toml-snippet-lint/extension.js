// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking this file against 21 rules.", "done": "Done. Every finding is in the output panel with its file name and line number.", "nothing_found": "No findings. This file passes all 21 rules.", "need_key": "This is a paid command. Paste your licence key to unlock it.", "key_ok": "Licence key accepted. The paid commands are unlocked on this machine.", "key_bad": "That key was not accepted. Check for a missing character and paste it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "export_report", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Inkling · DeviceTree · TOML — Snippets & Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('inkling-devicetree-toml-snippet-lint').get('min_severity')
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
const RULES = [{"pattern": "inkling\\s+\"1\\.0\"", "flags": "", "message": "Inkling 1.0 header. The training graph syntax used below is Inkling 2.0.", "fix": "inkling \"2.0\""}, {"pattern": "\\b(EpisodeIterationLimit|NoProgressIterationLimit|TotalIterationLimit|LessonRewardThreshold)\\s*=", "flags": "", "message": "Inkling training clauses take Name: value. The equals sign is not assignment here."}, {"pattern": "/mp-rest/url\\s*=\\s*http://", "flags": "i", "message": "MicroProfile Rest Client target is plain http, so the JWT this client forwards travels unencrypted.", "fix": "/mp-rest/url=https://"}, {"pattern": "@Retry\\s*\\(\\s*\\)", "flags": "", "message": "@Retry() falls back to the spec defaults (maxRetries 3, delay 0). Write the values so the retry budget is visible.", "fix": "@Retry(maxRetries = 3, delay = 200, delayUnit = ChronoUnit.MILLIS)"}, {"pattern": "status\\s*=\\s*\"ok\"\\s*;", "flags": "", "message": "The Devicetree Specification marks \"ok\" as deprecated. Write status = \"okay\".", "fix": "status = \"okay\";"}, {"pattern": "#include\\s+\"[^\"]+\\.dts\"", "flags": "", "message": "Including a .dts pulls its own root node into this file. Include the matching .dtsi instead."}, {"pattern": "\\bMsgBox\\s*,", "flags": "", "message": "Command syntax: AutoHotkey v2 has no MsgBox, form. Call MsgBox(\"text\") instead."}, {"pattern": "\\bSetTimer\\s*,", "flags": "", "message": "AutoHotkey v2 dropped command syntax. Call SetTimer(Callback, Period)."}, {"pattern": "\\bStringReplace\\b", "flags": "", "message": "StringReplace was removed in AutoHotkey v2. StrReplace() returns the new string.", "fix": "StrReplace"}, {"pattern": "\\bconfig\\.developer\\s*=\\s*True\\b", "flags": "", "message": "config.developer = True ships the developer console and the reload key inside the built game.", "fix": "config.developer = False"}, {"pattern": "^\\s*[a-z_]\\w*\\s+\"[^\"]*%\\([A-Za-z_]\\w*\\)s", "flags": "", "message": "Ren'Py replaced %(name)s interpolation in dialogue with square brackets: [name]."}, {"pattern": "^\\s*version\\s*=\\s*[0-9]+\\.[0-9]", "flags": "", "message": "TOML has no bare version literal: 1.2.3 is a syntax error and 2.0 is a float. Quote the version."}, {"pattern": "requires-python\\s*=\\s*\"\\s*[0-9]", "flags": "", "message": "requires-python is a version specifier and needs an operator, as in \">=3.11\"."}, {"pattern": "^\\s*[A-Za-z0-9_.-]+\\s*=\\s*\\{[^}]*,\\s*\\}", "flags": "", "message": "A TOML inline table may not end with a trailing comma."}, {"pattern": "\\btry!\\s", "flags": "", "message": "try! turns any thrown error into a crash. Use try? or catch the error."}, {"pattern": "\\bas!\\s", "flags": "", "message": "A force cast traps at run time when the type does not match. Use as? with a guard."}, {"pattern": "\"source\\.fixAll\"\\s*:\\s*true", "flags": "", "message": "Boolean values in editor.codeActionsOnSave are deprecated. Use \"explicit\" or \"never\".", "fix": "\"source.fixAll\": \"explicit\""}, {"pattern": "\"source\\.organizeImports\"\\s*:\\s*true", "flags": "", "message": "Boolean values in editor.codeActionsOnSave are deprecated. Use \"explicit\" or \"never\".", "fix": "\"source.organizeImports\": \"explicit\""}, {"pattern": "\"python\\.linting\\.[A-Za-z]+\"", "flags": "", "message": "python.linting.* was removed from the Python extension. Linting now comes from the separate Pylint, Flake8 or Ruff extensions."}, {"pattern": "\"python\\.formatting\\.provider\"", "flags": "", "message": "python.formatting.provider was removed. Set the formatter under \"[python]\" with editor.defaultFormatter."}, {"pattern": "\"python\\.pythonPath\"", "flags": "", "message": "python.pythonPath was replaced by python.defaultInterpreterPath.", "fix": "\"python.defaultInterpreterPath\""}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('inkling-devicetree-toml-snippet-lint');
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

const SNIPPETS = {"inkling_header": ["inkling \"2.0\"", "", "type SimState {", "    ${1:position}: number,", "    ${2:velocity}: number,", "}", "", "type SimAction {", "    ${3:command}: number<-1 .. 1>,", "}", "", "type SimConfig {", "    ${4:episode_length}: number,", "}"], "inkling_simulator": ["simulator ${1:CartPoleSim}(action: SimAction, config: SimConfig): SimState {", "    package \"${2:cartpole}\"", "}"], "inkling_concept": ["graph (input: SimState): SimAction {", "    concept ${1:Balance}(input): SimAction {", "        curriculum {", "            source ${2:CartPoleSim}", "", "            training {", "                EpisodeIterationLimit: ${3:200},", "                NoProgressIterationLimit: ${4:1000000},", "            }", "        }", "    }", "}"], "inkling_goal": ["goal (State: SimState) {", "    avoid ${1:FallOver}:", "        Math.Abs(State.${2:angle}) in Goal.RangeAbove(${3:0.5})", "    drive ${4:CenterCart}:", "        State.${5:position} in Goal.Range(-${6:0.1}, ${6:0.1})", "}"], "inkling_lesson": ["lesson ${1:StartNearCenter} {", "    scenario {", "        ${2:initial_position}: number<-0.1 .. 0.1>,", "        ${3:initial_velocity}: number<-0.05 .. 0.05>,", "    }", "}"], "mp_jwt_config": ["mp.jwt.verify.publickey.location=${1:META-INF/publicKey.pem}", "mp.jwt.verify.issuer=${2:https://sso.internal/realms/api}", "mp.jwt.verify.audiences=${3:orders-service}", "mp.jwt.token.header=Authorization"], "mp_rest_client_config": ["${1:orders.OrderClient}/mp-rest/url=${2:https://orders.internal}", "${1:orders.OrderClient}/mp-rest/scope=jakarta.enterprise.context.ApplicationScoped", "${1:orders.OrderClient}/mp-rest/connectTimeout=${3:2000}", "${1:orders.OrderClient}/mp-rest/readTimeout=${4:5000}"], "mp_fault_tolerance": ["@Retry(maxRetries = ${1:3}, delay = ${2:200}, delayUnit = ChronoUnit.MILLIS)", "@Timeout(value = ${3:2}, unit = ChronoUnit.SECONDS)", "@Fallback(fallbackMethod = \"${4:onFailure}\")", "public ${5:String} ${6:load}() {", "    ${0}", "}"], "mp_health_check": ["@Readiness", "@ApplicationScoped", "public class ${1:DatabaseReadyCheck} implements HealthCheck {", "", "    @Override", "    public HealthCheckResponse call() {", "        return HealthCheckResponse.named(\"${2:database}\")", "                .status(${3:true})", "                .build();", "    }", "}"], "dts_board_header": ["/dts-v1/;", "", "#include \"${1:sun8i-h3}.dtsi\"", "#include <dt-bindings/gpio/gpio.h>", "", "/ {", "    model = \"${2:Rev B carrier board}\";", "    compatible = \"${3:acme,carrier-rev-b}\", \"${4:allwinner,sun8i-h3}\";", "", "    chosen {", "        stdout-path = \"${5:serial0:115200n8}\";", "    };", "};"], "dts_overlay": ["/dts-v1/;", "/plugin/;", "", "&${1:i2c1} {", "    status = \"okay\";", "", "    ${2:rtc}@${3:51} {", "        compatible = \"${4:nxp,pcf8563}\";", "        reg = <0x${3:51}>;", "        status = \"okay\";", "    };", "};"], "dts_gpio_leds": ["leds {", "    compatible = \"gpio-leds\";", "", "    led-${1:0} {", "        label = \"${2:board:green:status}\";", "        gpios = <&${3:pio} ${4:0} ${5:10} GPIO_ACTIVE_HIGH>;", "        linux,default-trigger = \"${6:heartbeat}\";", "    };", "};"], "dts_spi_device": ["&${1:spi0} {", "    status = \"okay\";", "", "    ${2:flash}@0 {", "        compatible = \"${3:jedec,spi-nor}\";", "        reg = <0>;", "        spi-max-frequency = <${4:50000000}>;", "        status = \"okay\";", "    };", "};"], "ahk_v2_header": ["#Requires AutoHotkey v2.0", "#SingleInstance Force", "", "SetWorkingDir(A_ScriptDir)", "${0}"], "ahk_v2_hotkey": ["${1:^!n}::", "{", "    ${0:Run(\"notepad.exe\")}", "}"], "ahk_v2_gui": ["MyGui := Gui(\"+Resize\", \"${1:Batch renamer}\")", "MyGui.SetFont(\"s10\")", "MyGui.AddText(\"xm w120\", \"${2:Folder}\")", "FolderEdit := MyGui.AddEdit(\"x+5 w300 vFolder\")", "MyGui.AddButton(\"xm w100 Default\", \"${3:Start}\").OnEvent(\"Click\", Start)", "MyGui.OnEvent(\"Close\", (*) => ExitApp())", "MyGui.Show()", "", "Start(*)", "{", "    MsgBox(\"${4:Working on: }\" . FolderEdit.Value)", "}"], "ahk_v2_hotstring": [":*:${1:btw}::${2:by the way}", ":*:${3:sig}::${4:Kind regards,}"], "renpy_character": ["define ${1:m} = Character(\"${2:Mira}\", color=\"#${3:c8ffc8}\", who_outline=[(2, \"#000000\")])"], "renpy_label": ["label ${1:chapter_one}:", "", "    scene bg ${2:office} with fade", "    show ${3:mira} ${4:neutral} at center with dissolve", "", "    ${5:m} \"${6:You actually came.}\"", "", "    return"], "renpy_menu": ["menu:", "    \"${1:What do you say?}\"", "", "    \"${2:Tell her the truth.}\":", "        $ ${3:trust} += 1", "        jump ${4:route_honest}", "", "    \"${5:Say nothing.}\":", "        jump ${6:route_silent}"], "renpy_screen": ["screen ${1:quick_menu}():", "", "    zorder 100", "", "    hbox:", "        style_prefix \"quick\"", "        xalign 0.5", "        yalign 0.99", "", "        textbutton _(\"Back\") action Rollback()", "        textbutton _(\"Save\") action ShowMenu('save')", "        textbutton _(\"Prefs\") action ShowMenu('preferences')"], "toml_pyproject": ["[build-system]", "requires = [\"hatchling\"]", "build-backend = \"hatchling.build\"", "", "[project]", "name = \"${1:board-tools}\"", "version = \"${2:0.1.0}\"", "requires-python = \">=${3:3.11}\"", "dependencies = [", "    \"${4:click>=8.1}\",", "]", "", "[project.scripts]", "${5:board-tools} = \"${6:board_tools.cli}:main\""], "toml_cargo": ["[package]", "name = \"${1:dts-check}\"", "version = \"${2:0.1.0}\"", "edition = \"${3:2021}\"", "", "[dependencies]", "${4:serde} = { version = \"${5:1}\", features = [\"derive\"] }", "", "[profile.release]", "lto = true", "strip = \"symbols\""], "toml_ruff": ["[tool.ruff]", "line-length = ${1:100}", "target-version = \"${2:py311}\"", "", "[tool.ruff.lint]", "select = [\"E\", \"F\", \"I\", \"UP\", \"B\"]", "ignore = [\"${3:E501}\"]", "", "[tool.ruff.format]", "quote-style = \"double\""], "toml_array_of_tables": ["[[${1:board}]]", "name = \"${2:carrier-rev-b}\"", "overlay = \"${3:overlays/rtc-pcf8563.dtbo}\"", "", "[[${1:board}]]", "name = \"${4:carrier-rev-c}\"", "overlay = \"${5:overlays/rtc-ds3231.dtbo}\""], "swift_package_manifest": ["// swift-tools-version: 5.9", "import PackageDescription", "", "let package = Package(", "    name: \"${1:BoardKit}\",", "    platforms: [.macOS(.v13), .iOS(.v16)],", "    products: [", "        .library(name: \"${1:BoardKit}\", targets: [\"${1:BoardKit}\"])", "    ],", "    targets: [", "        .target(name: \"${1:BoardKit}\"),", "        .testTarget(name: \"${1:BoardKit}Tests\", dependencies: [\"${1:BoardKit}\"])", "    ]", ")"], "swift_async_request": ["func ${1:loadBoards}() async throws -> [${2:Board}] {", "    var request = URLRequest(url: ${3:endpoint})", "    request.httpMethod = \"GET\"", "", "    let (data, response) = try await URLSession.shared.data(for: request)", "    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {", "        throw URLError(.badServerResponse)", "    }", "    return try JSONDecoder().decode([${2:Board}].self, from: data)", "}"], "swift_xctest_case": ["import XCTest", "@testable import ${1:BoardKit}", "", "final class ${2:BoardParserTests}: XCTestCase {", "", "    func test${3:ParsesOverlayName}() throws {", "        let sut = ${4:BoardParser}()", "        XCTAssertEqual(try sut.${5:parse}(\"${6:rtc-pcf8563.dtbo}\"), \"${7:rtc-pcf8563}\")", "    }", "}"], "swift_actor": ["actor ${1:BoardCache} {", "", "    private var storage: [String: ${2:Board}] = [:]", "", "    func value(for key: String) -> ${2:Board}? {", "        storage[key]", "    }", "", "    func store(_ value: ${2:Board}, for key: String) {", "        storage[key] = value", "    }", "}"], "lint_eslintrc_json": ["{", "    \"root\": true,", "    \"env\": { \"es2022\": true, \"node\": true },", "    \"parserOptions\": { \"ecmaVersion\": 2022, \"sourceType\": \"module\" },", "    \"extends\": [\"eslint:recommended\"],", "    \"rules\": {", "        \"no-unused-vars\": [\"error\", { \"argsIgnorePattern\": \"^_\" }],", "        \"eqeqeq\": \"error\"", "    }", "}"], "lint_markdownlint_json": ["{", "    \"default\": true,", "    \"MD013\": { \"line_length\": ${1:120}, \"code_blocks\": false },", "    \"MD033\": { \"allowed_elements\": [\"br\", \"kbd\"] },", "    \"MD041\": false", "}"], "lint_yamllint_config": ["extends: default", "", "rules:", "  line-length:", "    max: ${1:120}", "    level: warning", "  document-start: disable", "  truthy:", "    allowed-values: [\"true\", \"false\"]"], "lint_fix_on_save": ["\"editor.codeActionsOnSave\": {", "    \"source.fixAll\": \"explicit\",", "    \"source.organizeImports\": \"explicit\"", "},", "\"editor.formatOnSave\": true"], "python_editor_theme": ["\"editor.semanticTokenColorCustomizations\": {", "    \"enabled\": true,", "    \"rules\": {", "        \"class:python\": { \"foreground\": \"#4EC9B0\", \"bold\": true },", "        \"function:python\": { \"foreground\": \"#DCDCAA\" },", "        \"parameter:python\": { \"foreground\": \"#9CDCFE\" },", "        \"selfParameter:python\": { \"foreground\": \"#569CD6\", \"italic\": true }", "    }", "}"], "python_format_settings": ["\"[python]\": {", "    \"editor.defaultFormatter\": \"ms-python.black-formatter\",", "    \"editor.formatOnSave\": true,", "    \"editor.tabSize\": 4,", "    \"editor.rulers\": [88],", "    \"editor.codeActionsOnSave\": { \"source.organizeImports\": \"explicit\" }", "}"], "python_analysis_settings": ["\"python.analysis.typeCheckingMode\": \"${1:basic}\",", "\"python.analysis.autoImportCompletions\": true,", "\"python.analysis.inlayHints.functionReturnTypes\": true,", "\"python.analysis.diagnosticMode\": \"${2:openFilesOnly}\""], "python_testing_settings": ["\"python.testing.pytestEnabled\": true,", "\"python.testing.unittestEnabled\": false,", "\"python.testing.pytestArgs\": [\"${1:tests}\", \"-q\"],", "\"python.terminal.activateEnvironment\": true"]};

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
  const _c = vscode.workspace.getConfiguration('inkling-devicetree-toml-snippet-lint');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('inkling-devicetree-toml-snippet-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('inkling-devicetree-toml-snippet-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'inkling-devicetree-toml-snippet-lint-report.' + pick.toLowerCase());
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

function activate(ctx) {
  try { lic.pullFeed(ctx, "inkling-devicetree-toml-snippet-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('inkling-devicetree-toml-snippet-lint.audit_file', runCurrent);
  reg('inkling-devicetree-toml-snippet-lint.insert_snippet', insertSnippet);
  reg('inkling-devicetree-toml-snippet-lint.list_rules', listRules);
  reg('inkling-devicetree-toml-snippet-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('inkling-devicetree-toml-snippet-lint.quick_fix', function () { return quickFix(ctx); });
  reg('inkling-devicetree-toml-snippet-lint.export_report', function () { return exportReport(ctx); });
  reg('inkling-devicetree-toml-snippet-lint.watch_on_save', function () { return watchOnSave(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('inkling-devicetree-toml-snippet-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
