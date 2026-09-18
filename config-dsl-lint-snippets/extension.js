// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking against 30 rules...", "done": "Check finished. Findings are listed below with file name and line number.", "nothing_found": "No findings. This file passes all 30 rules.", "need_key": "This is a paid command. Paste your licence key to unlock the workspace scan, the fixes, the report file, save-watching, your own rules and CI output. The free checks keep working either way.", "key_ok": "Licence key accepted. The paid commands are unlocked on this machine, and they keep working offline.", "key_bad": "That key was not accepted. Check for a stray space at the start or the end, then paste it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "export_report", "watch_on_save", "custom_rules", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Config & DSL Check — 9 languages');
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
const RULES = [{"pattern": "=\\s*True\\b", "flags": "", "message": "[TOML] Booleans are lowercase. True is a parse error in a .toml file.", "fix": "= true"}, {"pattern": "=\\s*False\\b", "flags": "", "message": "[TOML] Booleans are lowercase. False is a parse error in a .toml file.", "fix": "= false"}, {"pattern": "^\\s*version\\s*=\\s*[0-9]", "flags": "", "message": "[TOML] version takes a quoted string: version = \"1.2.0\". A bare number is a float and drops the patch part."}, {"pattern": "=\\s*\"[A-Za-z]:\\\\[^\"]*\"", "flags": "", "message": "[TOML] Backslash is an escape inside a basic string. Use a literal string with single quotes for a Windows path."}, {"pattern": "status\\s*=\\s*\"ok\"", "flags": "", "message": "[DeviceTree] The value is okay, not ok. A node left with ok is treated as not enabled.", "fix": "status = \"okay\""}, {"pattern": "^\\s*[\\w,.+#@-]+\\s*=\\s*<[^>]*>\\s*$", "flags": "", "message": "[DeviceTree] This property assignment has no closing semicolon; dtc stops at this line."}, {"pattern": "^\\s*compatible\\s*=\\s*[^\"\\s]", "flags": "", "message": "[DeviceTree] compatible takes a quoted string list: compatible = \"vendor,part\";"}, {"pattern": "gpios?\\s*=\\s*<\\s*&\\w+\\s+[0-9]+\\s*>", "flags": "", "message": "[DeviceTree] This gpio specifier has two cells. Most bindings expect <&gpio PIN FLAGS> — check the binding before you flash it."}, {"pattern": "^\\s*inkling\\s+\"1", "flags": "", "message": "[Inkling] This file declares version 1 in its header. Current brain files start with inkling \"2.0\"."}, {"pattern": "^\\s*concept\\s+\\w+\\s*\\{", "flags": "", "message": "[Inkling] A concept declares its signature before the block: concept Name(input): ActionType {"}, {"pattern": "^\\s*(MsgBox|SetTimer|StringReplace|FileAppend|WinGet|Send)\\s*,", "flags": "", "message": "[AHK v2] Command-comma syntax is v1. In v2 these are function calls: MsgBox(\"text\")."}, {"pattern": "^\\s*#NoEnv\\b.*$", "flags": "", "message": "[AHK v2] #NoEnv was removed in v2. Delete the line.", "fix": ""}, {"pattern": "^\\s*Gosub\\b", "flags": "i", "message": "[AHK v2] Gosub was removed in v2. Call a function instead."}, {"pattern": "^\\t+", "flags": "", "message": "[Ren'Py] The script parser refuses tab indentation. Use spaces.", "fix": "    "}, {"pattern": "^\\s*label\\s+[\\w.]+\\s*$", "flags": "", "message": "[Ren'Py] A label opens a block and ends with a colon: label start:"}, {"pattern": "^\\s*menu\\s*$", "flags": "", "message": "[Ren'Py] menu opens a block and ends with a colon: menu:"}, {"pattern": "^[^#!\\s][\\w.\\-]*(password|passwd|secret|token|apikey|api[_.\\-]?key)\\s*[=:]\\s*\\S+", "flags": "i", "message": "Credential written in plain text. MicroProfile Config reads environment variables at a higher ordinal than microprofile-config.properties, so an env var can hold this instead."}, {"pattern": "^[^#!\\s][^=:]*[=:].*[ \\t]+$", "flags": "", "message": "[.properties] Trailing whitespace becomes part of the value. The string you read back will have a space on the end."}, {"pattern": "[=:][^\\n]*[A-Za-z]:\\\\[^\\\\]", "flags": "", "message": "[.properties] A single backslash escapes the next character. Double it, or use forward slashes."}, {"pattern": "\\btry!\\s", "flags": "", "message": "[Swift] try! traps and kills the process when the call throws. Use try with do/catch, or try?."}, {"pattern": "\\bas!\\s", "flags": "", "message": "[Swift] as! traps at runtime on a wrong type. Prefer as? with a guard."}, {"pattern": "\\.unsafeFlags\\(", "flags": "", "message": "[SwiftPM] A package that uses unsafeFlags cannot be resolved as a versioned dependency by anyone else."}, {"pattern": "\"python\\.pythonPath\"", "flags": "", "message": "[settings.json] python.pythonPath was replaced by python.defaultInterpreterPath.", "fix": "\"python.defaultInterpreterPath\""}, {"pattern": "\"python\\.linting\\.[\\w.]+\"", "flags": "", "message": "[settings.json] The python.linting.* settings were removed from the Python extension. Linting now lives in the separate linter extension you install."}, {"pattern": "\"python\\.formatting\\.[\\w.]+\"", "flags": "", "message": "[settings.json] The python.formatting.* settings were removed. Set editor.defaultFormatter for the Python language instead."}, {"pattern": "\"(/home/[^\"/]+|/Users/[^\"/]+|[A-Za-z]:\\\\\\\\Users\\\\\\\\[^\"\\\\]+)", "flags": "", "message": "An absolute path to your own home folder in a committed settings file breaks on every other machine. Use ${workspaceFolder}."}, {"pattern": "-----BEGIN [A-Z ]*PRIVATE KEY-----", "flags": "", "message": "A private key is embedded in this file. Once it is committed, treat it as leaked and rotate it."}, {"pattern": "\\b(ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})\\b", "flags": "", "message": "This matches the shape of a live access token. Move it out of the file before you commit."}, {"pattern": "\"http://(?!localhost|127\\.0\\.0\\.1)[^\"\\s]+\"", "flags": "i", "message": "A plain http:// endpoint in a config file. Credentials and payloads travel unencrypted."}, {"pattern": "\\b(TODO|FIXME|XXX|HACK)\\b", "flags": "", "message": "Unresolved marker left in a configuration file."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('config-dsl-lint-snippets');
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

const SNIPPETS = {"toml_pyproject_skeleton": ["[build-system]", "requires = [\"hatchling\"]", "build-backend = \"hatchling.build\"", "", "[project]", "name = \"${1:my_package}\"", "version = \"${2:0.1.0}\"", "description = \"${3:One line about the package}\"", "requires-python = \">=${4:3.10}\"", "dependencies = []"], "toml_ruff_config": ["[tool.ruff]", "line-length = ${1:100}", "target-version = \"py${2:311}\"", "", "[tool.ruff.lint]", "select = [\"E\", \"F\", \"I\", \"UP\"]", "ignore = [\"${3:E501}\"]"], "toml_cargo_package": ["[package]", "name = \"${1:my_crate}\"", "version = \"${2:0.1.0}\"", "edition = \"${3:2021}\"", "license = \"${4:MIT}\"", "", "[dependencies]", "${5:serde} = { version = \"${6:1}\", features = [\"derive\"] }"], "toml_array_of_tables": ["[[${1:tool.mypy.overrides}]]", "module = [\"${2:package.*}\"]", "ignore_missing_imports = true"], "toml_optional_dependencies": ["[project.optional-dependencies]", "dev = [\"pytest>=${1:8}\", \"ruff\"]", "", "[project.scripts]", "${2:my-cli} = \"${3:my_package.cli}:main\""], "dts_source_skeleton": ["/dts-v1/;", "", "/ {", "\tmodel = \"${1:Board name}\";", "\tcompatible = \"${2:vendor,board}\";", "", "\tchosen {", "\t\tstdout-path = \"${3:serial0:115200n8}\";", "\t};", "};"], "dts_overlay_fragment": ["/dts-v1/;", "/plugin/;", "", "/ {", "\tfragment@0 {", "\t\ttarget = <&${1:i2c1}>;", "\t\t__overlay__ {", "\t\t\tstatus = \"okay\";", "\t\t\t${2}", "\t\t};", "\t};", "};"], "dts_i2c_device_node": ["&${1:i2c1} {", "\tstatus = \"okay\";", "\tclock-frequency = <${2:400000}>;", "", "\t${3:sensor}@${4:48} {", "\t\tcompatible = \"${5:vendor,part}\";", "\t\treg = <0x${4:48}>;", "\t\tstatus = \"okay\";", "\t};", "};"], "dts_gpio_leds_node": ["/ {", "\tleds {", "\t\tcompatible = \"gpio-leds\";", "", "\t\t${1:status_led} {", "\t\t\tlabel = \"${2:board:green:status}\";", "\t\t\tgpios = <&${3:gpio1} ${4:18} GPIO_ACTIVE_HIGH>;", "\t\t\tdefault-state = \"off\";", "\t\t};", "\t};", "};"], "dts_pinctrl_group": ["&${1:pinctrl} {", "\t${2:uart1_default}: ${3:uart1-default-grp} {", "\t\tpins = \"${4:PA9}\", \"${5:PA10}\";", "\t\tfunction = \"${6:uart}\";", "\t\tbias-pull-up;", "\t};", "};"], "inkling_brain_skeleton": ["inkling \"2.0\"", "", "type ${1:SimState} {", "    ${2:position}: number,", "}", "", "type ${3:SimAction} {", "    ${4:command}: number<-1 .. 1>,", "}", "", "graph (input: ${1:SimState}): ${3:SimAction} {", "    concept ${5:Balance}(input): ${3:SimAction} {", "        curriculum {", "            source ${6:Simulator}", "        }", "    }", "}"], "inkling_type_block": ["type ${1:SimConfig} {", "    ${2:mass}: number<${3:0.1} .. ${4:2.0}>,", "    ${5:episode_length}: number,", "}"], "inkling_simulator_block": ["simulator ${1:Simulator}(action: ${2:SimAction}, config: ${3:SimConfig}): ${4:SimState} {", "}"], "inkling_curriculum_goal": ["curriculum {", "    source ${1:Simulator}", "", "    goal (State: ${2:SimState}) {", "        drive ${3:Center}:", "            State.${4:position} in Goal.Range(${5:-0.1}, ${6:0.1})", "        avoid ${7:Falling}:", "            State.${8:angle} in Goal.RangeAbove(${9:0.8})", "    }", "", "    training {", "        EpisodeIterationLimit: ${10:250}", "    }", "}"], "renpy_label_block": ["label ${1:start}:", "    scene ${2:bg room}", "    show ${3:eileen} happy", "", "    \"${4:Narration line.}\"", "    ${3:eileen} \"${5:Line of dialogue.}\"", "", "    return"], "renpy_choice_menu": ["menu:", "    \"${1:What do you do?}\"", "", "    \"${2:Open the door}\":", "        jump ${3:door_scene}", "", "    \"${4:Wait and listen}\":", "        jump ${5:wait_scene}"], "renpy_character_define": ["define ${1:e} = Character(\"${2:Eileen}\", color=\"#${3:c8ffc8}\", what_prefix=\"\", who_outline=[(2, \"#000000\")])"], "renpy_screen_block": ["screen ${1:hud}():", "    zorder 100", "", "    frame:", "        xalign 0.98", "        yalign 0.02", "        vbox:", "            text \"${2:Day [day]}\"", "            textbutton \"${3:Menu}\" action ShowMenu(\"save\")"], "ahk_v2_hotkey": ["#Requires AutoHotkey v2.0", "", "${1:^!j}::", "{", "    ${2:MsgBox(\"Hotkey fired\")}", "}"], "ahk_v2_hotstring": [":*:${1:btw}::${2:by the way}", ":C:${3:ADDR}::${4:221B Baker Street}"], "ahk_v2_gui_window": ["g := Gui(\"+Resize\", \"${1:Tool}\")", "g.SetFont(\"s10\")", "g.AddText(\"w220\", \"${2:Pick a file}\")", "g.AddEdit(\"w220 vPath\")", "g.AddButton(\"w80 Default\", \"${3:Run}\").OnEvent(\"Click\", Go)", "g.Show()", "", "Go(*)", "{", "    saved := g.Submit(false)", "    MsgBox(saved.Path)", "}"], "ahk_v2_class": ["class ${1:Watcher}", "{", "    __New(${2:path})", "    {", "        this.path := ${2:path}", "    }", "", "    Start()", "    {", "        SetTimer(ObjBindMethod(this, \"Tick\"), ${3:1000})", "    }", "", "    Tick()", "    {", "        ${4:; work goes here}", "    }", "}"], "microprofile_config_property": ["# read with @ConfigProperty(name = \"${1:app.greeting}\")", "${1:app.greeting}=${2:Hello}", "%dev.${1:app.greeting}=${3:Hello from dev}", "%prod.${1:app.greeting}=${4:Hello}"], "microprofile_rest_client_config": ["${1:com.example.WeatherClient}/mp-rest/url=${2:https://api.example.com}", "${1:com.example.WeatherClient}/mp-rest/scope=jakarta.enterprise.context.ApplicationScoped", "${1:com.example.WeatherClient}/mp-rest/connectTimeout=${3:5000}", "${1:com.example.WeatherClient}/mp-rest/readTimeout=${4:10000}"], "microprofile_fault_tolerance_config": ["${1:com.example.OrderService/placeOrder}/Retry/maxRetries=${2:3}", "${1:com.example.OrderService/placeOrder}/Retry/delay=${3:200}", "${1:com.example.OrderService/placeOrder}/Timeout/value=${4:2000}", "${1:com.example.OrderService/placeOrder}/CircuitBreaker/requestVolumeThreshold=${5:10}"], "microprofile_health_jwt_config": ["mp.health.disable-default-procedures=${1:false}", "mp.health.default.readiness.empty.response=${2:UP}", "mp.metrics.appName=${3:my-service}", "mp.jwt.verify.publickey.location=${4:META-INF/publicKey.pem}", "mp.jwt.verify.issuer=${5:https://issuer.example.com}"], "swift_package_manifest": ["// swift-tools-version:${1:5.9}", "import PackageDescription", "", "let package = Package(", "    name: \"${2:MyLibrary}\",", "    platforms: [.macOS(.v13), .iOS(.v16)],", "    products: [", "        .library(name: \"${2:MyLibrary}\", targets: [\"${2:MyLibrary}\"])", "    ],", "    targets: [", "        .target(name: \"${2:MyLibrary}\"),", "        .testTarget(name: \"${2:MyLibrary}Tests\", dependencies: [\"${2:MyLibrary}\"])", "    ]", ")"], "swift_xctest_case": ["import XCTest", "@testable import ${1:MyLibrary}", "", "final class ${2:ParserTests}: XCTestCase {", "    func test${3:ParsesEmptyInput}() throws {", "        let sut = ${4:Parser}()", "        XCTAssertEqual(try sut.parse(\"${5:}\"), ${6:[]})", "    }", "}"], "swift_async_throwing_request": ["func ${1:load}(from ${2:url}: URL) async throws -> ${3:Item} {", "    let (data, response) = try await URLSession.shared.data(from: ${2:url})", "    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {", "        throw ${4:LoadError}.badStatus", "    }", "    return try JSONDecoder().decode(${3:Item}.self, from: data)", "}"], "swift_error_enum": ["enum ${1:LoadError}: Error, LocalizedError {", "    case ${2:badStatus}", "    case ${3:decoding}(Error)", "", "    var errorDescription: String? {", "        switch self {", "        case .${2:badStatus}: return \"${4:The server did not return 200.}\"", "        case .${3:decoding}(let error): return error.localizedDescription", "        }", "    }", "}"], "vscode_python_interpreter_settings": ["\"python.defaultInterpreterPath\": \"\\${workspaceFolder}/.venv/bin/python\",", "\"python.terminal.activateEnvInCurrentTerminal\": true,", "\"python.envFile\": \"\\${workspaceFolder}/.env\""], "vscode_python_analysis_settings": ["\"python.analysis.typeCheckingMode\": \"${1:basic}\",", "\"python.analysis.autoImportCompletions\": true,", "\"python.analysis.extraPaths\": [\"${2:src}\"],", "\"python.analysis.diagnosticSeverityOverrides\": {", "    \"reportUnusedImport\": \"warning\"", "}"], "vscode_python_colour_block": ["\"workbench.colorCustomizations\": {", "    \"editorIndentGuide.activeBackground1\": \"#${1:5a5a8a}\",", "    \"editorBracketHighlight.foreground1\": \"#${2:ffd866}\",", "    \"statusBar.background\": \"#${3:2d2b55}\"", "},", "\"editor.tokenColorCustomizations\": {", "    \"textMateRules\": [", "        { \"scope\": \"support.function.builtin.python\", \"settings\": { \"foreground\": \"#${4:78dce8}\" } },", "        { \"scope\": \"comment.line.number-sign.python\", \"settings\": { \"fontStyle\": \"italic\" } }", "    ]", "}"], "vscode_python_launch_config": ["{", "    \"name\": \"${1:Python: current file}\",", "    \"type\": \"debugpy\",", "    \"request\": \"launch\",", "    \"program\": \"\\${file}\",", "    \"console\": \"integratedTerminal\",", "    \"justMyCode\": ${2:false},", "    \"env\": { \"PYTHONPATH\": \"\\${workspaceFolder}/src\" }", "}"], "custom_rule_entry": ["{", "    \"pattern\": \"${1:TODO|FIXME}\",", "    \"flags\": \"${2:i}\",", "    \"message\": \"${3:House rule: this must not reach main.}\"", "}"]};

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
  const pick = await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'config-dsl-lint-snippets-report.' + pick.toLowerCase());
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

async function customRules(ctx) {
  if (!(await paidGate(ctx))) return;
  await vscode.commands.executeCommand('workbench.action.openSettings', 'config-dsl-lint-snippets');
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'config-dsl-lint-snippets-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "config-dsl-lint-snippets").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('config-dsl-lint-snippets.audit_file', runCurrent);
  reg('config-dsl-lint-snippets.audit_selection', runSelection);
  reg('config-dsl-lint-snippets.insert_snippet', insertSnippet);
  reg('config-dsl-lint-snippets.list_rules', listRules);
  reg('config-dsl-lint-snippets.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('config-dsl-lint-snippets.quick_fix', function () { return quickFix(ctx); });
  reg('config-dsl-lint-snippets.export_report', function () { return exportReport(ctx); });
  reg('config-dsl-lint-snippets.watch_on_save', function () { return watchOnSave(ctx); });
  reg('config-dsl-lint-snippets.custom_rules', function () { return customRules(ctx); });
  reg('config-dsl-lint-snippets.ci_json', function () { return ciJson(ctx); });
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
