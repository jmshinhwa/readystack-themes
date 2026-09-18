// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking against 28 rules.", "done": "Check finished. Every finding is in the output panel with its file name and line number.", "nothing_found": "No findings. This file passes all 28 rules.", "need_key": "This is a paid command. Paste your licence key to unlock the workspace scan, check-on-save, quick fix and report export. The free audit and the 36 snippets keep working either way.", "key_ok": "Licence key accepted. The paid commands are unlocked on this machine, and stay unlocked offline.", "key_bad": "That key was not recognised. Check for a missing character, or reply to your purchase receipt and we will resend it.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "watch_on_save", "quick_fix", "export_report"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Config & DSL Lint + Snippets — 9 Sets');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('config-dsl-lint-snippet-pack').get('min_severity')
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
const RULES = [{"pattern": "/mp-rest/url\\s*=\\s*\\S+/\\s*$", "flags": "m", "message": "This REST Client base URL ends with a slash. MicroProfile REST Client appends the @Path after it, so the request goes to a double slash. Drop the trailing slash."}, {"pattern": "^\\s*config_ordinal\\s*=\\s*\\d{1,2}\\s*$", "flags": "m", "message": "config_ordinal is below 100. META-INF/microprofile-config.properties already has an ordinal of 100, so a lower value here overrides nothing."}, {"pattern": "^\\s*mp\\.[\\w.-]+\\s*=\\s*$", "flags": "m", "message": "This MicroProfile key has no value. The container starts normally, and the first request that reads the key fails."}, {"pattern": "^\\s*inkling\\s+\"1\\.[0-9]+\"", "flags": "m", "message": "Inkling 1.0 header. The current language version is 2.0 and the type and graph syntax below will not parse against it.", "fix": "inkling \"2.0\""}, {"pattern": "number\\s*<[^>]*\\.\\.\\.[^>]*>", "flags": "m", "message": "An Inkling range uses two dots, not three: number<-1 .. 1>."}, {"pattern": "^\\s*(drive|avoid|reach)\\s+\\w+\\s*:(?![^\\n]*Goal\\.)", "flags": "m", "message": "A goal clause needs a Goal objective, for example Goal.RangeAbove(0.8) or Goal.Sphere(...)."}, {"pattern": "^\\s*/dts-v1/\\s*$", "flags": "m", "message": "The /dts-v1/ directive needs its semicolon, or dtc stops at the first line.", "fix": "/dts-v1/;"}, {"pattern": "status\\s*=\\s*\"(enable|enabled|disable|true|false)\"", "flags": "i", "message": "DeviceTree status takes \"okay\" or \"disabled\". Any other string is not recognised, and the node stays disabled."}, {"pattern": "^\\s*(compatible|status|label|clock-names)\\s*=\\s*'", "flags": "m", "message": "DeviceTree strings are double quoted. dtc rejects single quotes here."}, {"pattern": "gpios\\s*=\\s*<\\s*&\\w+\\s+\\w+\\s*>", "flags": "m", "message": "This gpio specifier has one cell. Controllers that declare #gpio-cells = <2> also need the flags cell, GPIO_ACTIVE_LOW or GPIO_ACTIVE_HIGH."}, {"pattern": "^\\s*(MsgBox|Send|SendInput|Run|Sleep|WinActivate|FileAppend)\\s*,", "flags": "m", "message": "AutoHotkey v2 removed comma command syntax. Call it as a function instead: MsgBox(\"text\")."}, {"pattern": "^\\s*#(NoEnv|Persistent|EscapeChar|CommentFlag)\\b", "flags": "m", "message": "#NoEnv, #Persistent, #EscapeChar and #CommentFlag were removed in AutoHotkey v2. Delete the line; Persistent() is now a function call."}, {"pattern": ":=\\s*[^\\n;]*%\\w+%", "flags": "m", "message": "AutoHotkey v2 has no percent dereferencing inside expressions. Write the variable name on its own."}, {"pattern": "^\\s*(label\\s+[\\w.]+|screen\\s+[\\w.]+|menu)\\s*$", "flags": "m", "message": "A Ren'Py block header ends with a colon, for example: label start:"}, {"pattern": "^\\s*(jump|call)\\s+[\\w.]+\\s*:", "flags": "m", "message": "jump and call take a bare label name with no colon: jump left_door"}, {"pattern": "^\\s*\\$\\s*\\w+\\s*==", "flags": "m", "message": "A $ line runs one Python statement. '==' compares and throws the result away; use '=' if you meant to assign."}, {"pattern": "^\\s*[A-Za-z_][\\w.-]*\\s*=\\s*(True|False|None)\\s*$", "flags": "m", "message": "TOML booleans are lowercase, true and false, and TOML has no None. Use an empty string or leave the key out."}, {"pattern": "^\\s*\\[\\[?[A-Za-z_][\\w.-]*\\s+[\\w.-]+\\]?\\]\\s*$", "flags": "m", "message": "A bare TOML table key cannot contain a space. Quote it instead, for example [\"my table\"]."}, {"pattern": "^\\s*[A-Za-z_][\\w.-]*\\s*=\\s*-?0[0-9]+\\s*$", "flags": "m", "message": "A TOML integer cannot have a leading zero. Write 3, or quote it as the string \"03\"."}, {"pattern": "\\b(try!|as!)\\s", "flags": "m", "message": "A force operator stops the process the moment it fails. Use try? or as?, or wrap it in do-catch."}, {"pattern": "^\\s*(var|let)\\s+\\w+\\s*:\\s*[\\w<>\\[\\], .]+!\\s*(=|$)", "flags": "m", "message": "Implicitly unwrapped optional. Reading it while it is nil stops the app at that line."}, {"pattern": "\\.forEach\\s*\\{[^}]*\\breturn\\b", "flags": "m", "message": "return inside forEach leaves the closure only; the loop keeps going. Use for ... in if you meant to stop early."}, {"pattern": "\\.eslintrc(\\.(js|cjs|json|yml|yaml))?\\b", "flags": "i", "message": "ESLint 9 loads eslint.config.js. An .eslintrc file is ignored unless ESLINT_USE_FLAT_CONFIG=false is set in the environment."}, {"pattern": "^\\s*(env|parserOptions)\\s*:\\s*\\{", "flags": "m", "message": "In flat config, env becomes languageOptions.globals and parserOptions moves under languageOptions. At the top level both are ignored."}, {"pattern": "\"extends\"\\s*:\\s*\\[", "flags": "m", "message": "\"extends\" is an .eslintrc key. In eslint.config.js you spread the shared config into the exported array instead."}, {"pattern": "\"python\\.pythonPath\"", "flags": "m", "message": "python.pythonPath was removed from the Python extension. Use python.defaultInterpreterPath."}, {"pattern": "\"python\\.linting\\.[\\w.]+\"", "flags": "m", "message": "python.linting.* was removed from the Python extension. Linting now comes from a separate extension (Ruff, Pylint or Flake8), each with its own settings namespace."}, {"pattern": "\"editor\\.defaultFormatter\"\\s*:\\s*\"ms-python\\.python\"", "flags": "m", "message": "ms-python.python no longer formats. Point this at ms-python.black-formatter, ms-python.autopep8 or charliermarsh.ruff."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('config-dsl-lint-snippet-pack');
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

const SNIPPETS = {"mp_config_property": ["# src/main/resources/META-INF/microprofile-config.properties", "config_ordinal=100", "${1:app.greeting.message}=${2:Hello}"], "mp_rest_client": ["${1:org.acme.client.CountryService}/mp-rest/url=${2:http://localhost:8080}", "${1:org.acme.client.CountryService}/mp-rest/scope=jakarta.enterprise.context.ApplicationScoped", "${1:org.acme.client.CountryService}/mp-rest/connectTimeout=${3:2000}", "${1:org.acme.client.CountryService}/mp-rest/readTimeout=${4:5000}"], "mp_jwt_verify": ["mp.jwt.verify.publickey.location=${1:META-INF/resources/publicKey.pem}", "mp.jwt.verify.issuer=${2:http://localhost:8180/realms/main}", "mp.jwt.verify.audiences=${3:order-service}", "mp.jwt.token.header=${4:Authorization}"], "mp_fault_tolerance": ["${1:org.acme.OrderService}/${2:placeOrder}/Retry/maxRetries=${3:3}", "${1:org.acme.OrderService}/${2:placeOrder}/Timeout/value=${4:2000}", "${1:org.acme.OrderService}/${2:placeOrder}/CircuitBreaker/requestVolumeThreshold=${5:10}", "MP_Fault_Tolerance_NonFallback_Enabled=${6:true}"], "inkling_header": ["inkling \"2.0\"", "", "type ${1:SimState} {", "    ${2:position}: number,", "    ${3:velocity}: number,", "}"], "inkling_action_config": ["type ${1:SimAction} {", "    ${2:command}: number<-1 .. 1>,", "}", "", "type ${3:SimConfig} {", "    ${4:initial_position}: number<-0.5 .. 0.5>,", "}"], "inkling_simulator": ["simulator ${1:Simulator}(action: ${2:SimAction}, config: ${3:SimConfig}): ${4:SimState} {", "}"], "inkling_graph_concept": ["graph (input: ${1:SimState}): ${2:SimAction} {", "    concept ${3:BalancePole}(input): ${2:SimAction} {", "        curriculum {", "            source ${4:Simulator}", "", "            goal (State: ${1:SimState}) {", "                avoid ${5:Falling}: Math.Abs(State.${6:position}) in Goal.RangeAbove(${7:0.8})", "            }", "        }", "    }", "}"], "dt_device_node": ["${1:tmp102}@${2:48} {", "    compatible = \"${3:ti,tmp102}\";", "    reg = <0x${2:48}>;", "    status = \"okay\";", "};"], "dt_i2c_child": ["&${1:i2c1} {", "    #address-cells = <1>;", "    #size-cells = <0>;", "    status = \"okay\";", "", "    ${2:eeprom}@${3:50} {", "        compatible = \"${4:atmel,24c32}\";", "        reg = <0x${3:50}>;", "        pagesize = <${5:32}>;", "    };", "};"], "dt_gpio_keys": ["gpio-keys {", "    compatible = \"gpio-keys\";", "", "    ${1:button-user} {", "        label = \"${2:User}\";", "        linux,code = <${3:0x100}>;", "        gpios = <&${4:gpio1} ${5:5} GPIO_ACTIVE_LOW>;", "    };", "};"], "dt_overlay_file": ["/dts-v1/;", "/plugin/;", "", "&${1:spi0} {", "    status = \"okay\";", "", "    ${2:display}@0 {", "        compatible = \"${3:sitronix,st7735r}\";", "        reg = <0>;", "        spi-max-frequency = <${4:16000000}>;", "    };", "};"], "ahk_v2_header": ["#Requires AutoHotkey v2.0", "#SingleInstance Force", "SetWorkingDir(A_ScriptDir)"], "ahk_v2_hotkey": ["${1:^!j}:: {", "    ${2:MsgBox(\"Hotkey fired\")}", "}"], "ahk_v2_hotstring": [":*:${1:btw}::${2:by the way}"], "ahk_v2_gui": ["myGui := Gui(\"+Resize\", \"${1:Report}\")", "myGui.Add(\"Text\", \"w240\", \"${2:Pick a file to process}\")", "btn := myGui.Add(\"Button\", \"Default w120\", \"${3:Run}\")", "btn.OnEvent(\"Click\", (*) => MsgBox(\"${4:Done}\"))", "myGui.Show()"], "renpy_label_block": ["label ${1:start}:", "", "    scene ${2:bg room}", "    show ${3:eileen happy}", "", "    \"${4:The lights come back on.}\"", "", "    return"], "renpy_character": ["define ${1:e} = Character(\"${2:Eileen}\", color=\"${3:#c8ffc8}\")", "", "label ${4:intro}:", "    ${1:e} \"${5:You have reached the end of the demo.}\"", "    return"], "renpy_menu_choice": ["menu:", "    \"${1:Which door do you take?}\"", "", "    \"${2:The left door}\":", "        jump ${3:left_door}", "", "    \"${4:The right door}\":", "        jump ${5:right_door}"], "renpy_screen": ["screen ${1:save_notice}:", "    frame:", "        align (0.5, 0.1)", "        vbox:", "            text \"${2:Progress saved}\"", "            textbutton \"${3:Close}\" action Hide(\"${1:save_notice}\")"], "toml_table": ["[${1:tool.ruff}]", "${2:line-length} = ${3:100}", "${4:target-version} = \"${5:py312}\""], "toml_array_of_tables": ["[[${1:tool.poetry.packages}]]", "include = \"${2:my_package}\"", "from = \"${3:src}\"", "", "[[${1:tool.poetry.packages}]]", "include = \"${4:my_plugin}\"", "from = \"${3:src}\""], "toml_value_types": ["${1:enabled} = true", "${2:retries} = 3", "${3:threshold} = 0.75", "${4:released} = 2026-01-31T09:00:00Z", "${5:tags} = [\"${6:stable}\", \"${7:linux}\"]"], "toml_multiline_string": ["${1:description} = \"\"\"", "${2:First line of the description.}", "${3:Second line stays literal.}", "\"\"\""], "swift_async_function": ["func ${1:loadReport}(from url: URL) async throws -> ${2:Report} {", "    let (data, response) = try await URLSession.shared.data(from: url)", "    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {", "        throw ${3:ReportError}.badStatus", "    }", "    return try JSONDecoder().decode(${2:Report}.self, from: data)", "}"], "swift_actor": ["actor ${1:ReportCache} {", "    private var storage: [String: ${2:Report}] = [:]", "", "    func value(for key: String) -> ${2:Report}? {", "        storage[key]", "    }", "", "    func store(_ value: ${2:Report}, for key: String) {", "        storage[key] = value", "    }", "}"], "swift_codable_struct": ["struct ${1:Report}: Codable, Sendable {", "    let ${2:id}: String", "    let ${3:createdAt}: Date", "", "    enum CodingKeys: String, CodingKey {", "        case ${2:id}", "        case ${3:createdAt} = \"${4:created_at}\"", "    }", "}"], "swift_xctest_case": ["import XCTest", "@testable import ${1:MyModule}", "", "final class ${2:ReportTests}: XCTestCase {", "    func test${3:DecodesCreatedAt}() throws {", "        let json = Data(#\"{\"id\":\"1\",\"created_at\":\"2026-01-31T09:00:00Z\"}\"#.utf8)", "        let decoder = JSONDecoder()", "        decoder.dateDecodingStrategy = .iso8601", "        let report = try decoder.decode(${4:Report}.self, from: json)", "        XCTAssertEqual(report.id, \"1\")", "    }", "}"], "eslint_flat_config": ["import js from \"@eslint/js\";", "", "export default [", "    js.configs.recommended,", "    {", "        files: [\"**/*.js\"],", "        languageOptions: {", "            ecmaVersion: 2024,", "            sourceType: \"module\",", "        },", "        rules: {", "            \"no-unused-vars\": \"warn\",", "        },", "    },", "];"], "eslint_global_ignores": ["export default [", "    {", "        ignores: [\"dist/**\", \"coverage/**\", \"**/*.min.js\"],", "    },", "];"], "eslint_typescript_flat": ["import tseslint from \"typescript-eslint\";", "", "export default tseslint.config(", "    ...tseslint.configs.recommended,", "    {", "        files: [\"src/**/*.ts\"],", "        languageOptions: {", "            parserOptions: {", "                projectService: true,", "            },", "        },", "    },", ");"], "eslint_file_override": ["export default [", "    {", "        files: [\"test/**/*.js\"],", "        languageOptions: {", "            globals: {", "                describe: \"readonly\",", "                it: \"readonly\",", "            },", "        },", "        rules: {", "            \"no-console\": \"off\",", "        },", "    },", "];"], "py_interpreter_settings": ["\"python.defaultInterpreterPath\": \"${1:.venv/bin/python}\",", "\"python.terminal.activateEnvironment\": true,", "\"python.analysis.autoImportCompletions\": ${2:true}"], "py_analysis_settings": ["\"python.analysis.typeCheckingMode\": \"${1:standard}\",", "\"python.analysis.diagnosticMode\": \"${2:workspace}\",", "\"python.analysis.extraPaths\": [\"${3:src}\"],", "\"python.analysis.inlayHints.functionReturnTypes\": ${4:true}"], "py_format_on_save": ["\"[python]\": {", "    \"editor.defaultFormatter\": \"${1:charliermarsh.ruff}\",", "    \"editor.formatOnSave\": true,", "    \"editor.codeActionsOnSave\": {", "        \"source.organizeImports\": \"explicit\"", "    }", "}"], "py_token_colours": ["\"editor.tokenColorCustomizations\": {", "    \"textMateRules\": [", "        {", "            \"scope\": \"support.function.builtin.python\",", "            \"settings\": { \"foreground\": \"${1:#c586c0}\" }", "        },", "        {", "            \"scope\": \"meta.function-call.generic.python\",", "            \"settings\": { \"foreground\": \"${2:#dcdcaa}\" }", "        },", "        {", "            \"scope\": \"comment.line.number-sign.python\",", "            \"settings\": { \"fontStyle\": \"${3:italic}\" }", "        }", "    ]", "}"]};

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

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('config-dsl-lint-snippet-pack');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('config-dsl-lint-snippet-pack').get('reportFormat')
    || vscode.workspace.getConfiguration('config-dsl-lint-snippet-pack').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'config-dsl-lint-snippet-pack-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "config-dsl-lint-snippet-pack").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('config-dsl-lint-snippet-pack.audit_file', runCurrent);
  reg('config-dsl-lint-snippet-pack.audit_selection', runSelection);
  reg('config-dsl-lint-snippet-pack.insert_snippet', insertSnippet);
  reg('config-dsl-lint-snippet-pack.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('config-dsl-lint-snippet-pack.watch_on_save', function () { return watchOnSave(ctx); });
  reg('config-dsl-lint-snippet-pack.quick_fix', function () { return quickFix(ctx); });
  reg('config-dsl-lint-snippet-pack.export_report', function () { return exportReport(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('config-dsl-lint-snippet-pack').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
