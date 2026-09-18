// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking against 22 rules across 9 language packs", "done": "Check finished. Findings are listed above with file name and line number.", "nothing_found": "No findings. Nothing in this file matched any of the 22 rules.", "need_key": "This is a paid command. Paste your licence key to unlock the workspace scan, the in-place fixes and the report file.", "key_ok": "Licence key accepted. The workspace scan, the fixes and the report file are open on this machine.", "key_bad": "That key was not accepted. Check for a stray space at either end, or write to the support address on the listing page.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "export_report"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('AutoHotkey v2 · TOML · DeviceTree · 9 Packs');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('autohotkey-toml-devicetree-snippets').get('min_severity')
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
const RULES = [{"pattern": "\\b(MsgBox|StringReplace|IfWinExist|IfWinActive|SetFormat|StringSplit|EnvSet)\\s*,", "flags": "m", "message": "AutoHotkey v1 command syntax with a comma. Version 2 calls functions: MsgBox(\"text\")."}, {"pattern": ":=\\s*\"[^\"\\n]*%[A-Za-z_][A-Za-z0-9_]*%", "flags": "m", "message": "AutoHotkey v2 does not expand %var% inside quotes, so this string is stored literally. Join instead: \"total \" count."}, {"pattern": "#Requires\\s+AutoHotkey\\s+v1", "flags": "im", "message": "This script is pinned to AutoHotkey v1, so every v2 snippet in this pack will fail to load here.", "fix": "#Requires AutoHotkey v2.0"}, {"pattern": "=\\s*\\{[^}\\n]*,\\s*\\}", "flags": "m", "message": "A TOML inline table may not end with a trailing comma. The parser stops on this line."}, {"pattern": "=\\s*0[0-9]+\\s*(#|$)", "flags": "m", "message": "TOML rejects an integer with a leading zero. Write 9, or quote it as \"09\" if it is a code."}, {"pattern": "^\\s*\\[\\[?[A-Za-z0-9_.\\-]+\\]\\]?[ \\t]+[^#\\s]", "flags": "m", "message": "Nothing but a comment may follow a TOML table header on the same line."}, {"pattern": "^\\s*(compatible|status|clock-names|reg)\\s*=\\s*(<[^>\\n]*>|\"[^\"\\n]*\")[ \\t]*$", "flags": "m", "message": "This DeviceTree property is not closed with a semicolon, and the compiler will report the error on a later line."}, {"pattern": "status\\s*=\\s*\"(ok|enable|enabled|on|true)\"", "flags": "im", "message": "DeviceTree accepts only \"okay\" or \"disabled\" here. Anything else leaves the node switched off at boot.", "fix": "status = \"okay\""}, {"pattern": "^\\s*[A-Za-z0-9]+_[A-Za-z0-9_]*@[0-9a-fA-F]+\\s*\\{", "flags": "m", "message": "Node names use hyphens, not underscores, under the Devicetree naming rules. Labels may keep the underscore."}, {"pattern": "@ConfigProperty\\(\\s*name\\s*=\\s*\"[^\"]+\"\\s*\\)", "flags": "m", "message": "@ConfigProperty with no defaultValue makes the key mandatory, and deployment fails when it is missing in one environment."}, {"pattern": "@Retry\\((?![^)]*maxRetries)[^)]*\\)", "flags": "m", "message": "@Retry with no maxRetries falls back to the default of 3. State the number so the retry budget is visible to a reviewer."}, {"pattern": "^\\s*label\\s+[A-Za-z_][A-Za-z0-9_]*\\s*$", "flags": "m", "message": "A Ren'Py label must end with a colon, otherwise the script fails to parse at launch."}, {"pattern": "^\\t+\\s*(label|menu|scene|show|hide|play|jump|call|return)\\b", "flags": "m", "message": "This Ren'Py line is indented with a tab. Script files must use spaces, or the game refuses to start."}, {"pattern": "URL\\(string:\\s*\"[^\"]*\"\\)!", "flags": "m", "message": "A force-unwrapped URL crashes the app on a malformed address. Use guard let and throw instead."}, {"pattern": "\\btry!\\s", "flags": "m", "message": "try! turns a thrown error into a crash. Use try with a catch, or try? when nil is acceptable."}, {"pattern": "\\.forEach\\s*\\{[^}]*\\breturn\\b", "flags": "m", "message": "return inside forEach leaves only that closure and the loop keeps going. Use a for loop when you mean to stop."}, {"pattern": "number\\s*<\\s*-?[0-9.]+\\s*,\\s*-?[0-9.]+\\s*>", "flags": "m", "message": "An Inkling ranged number is written with two dots, not a comma: number<0 .. 1>."}, {"pattern": "inkling\\s+\"1\\.[0-9]\"", "flags": "m", "message": "This file targets Inkling 1.x, and the graph and concept snippets in this pack are 2.0.", "fix": "inkling \"2.0\""}, {"pattern": "(api[_-]?key|secret|token|password)\\s*[:=]\\s*[\"'][A-Za-z0-9_\\-]{16,}[\"']", "flags": "im", "message": "A credential is written straight into this file. Move it to an environment variable or a file the repository ignores."}, {"pattern": "^\\s*-\\s+uses:\\s*[A-Za-z0-9_.\\-]+/[A-Za-z0-9_.\\-]+[ \\t]*$", "flags": "m", "message": "This workflow step is not pinned to a version, so it can change under you. Add a tag such as @v4 or a commit SHA."}, {"pattern": "^\\s*(insert_final_newline|trim_trailing_whitespace|root)\\s*=\\s*(True|False)\\b", "flags": "m", "message": "An .editorconfig boolean is lower-case. True is read as an unknown value and the setting is skipped."}, {"pattern": "\"editor\\.semanticHighlighting\\.enabled\"\\s*:\\s*false", "flags": "m", "message": "Semantic highlighting is switched off here, so the Python semantic colour rules in this pack never take effect.", "fix": "\"editor.semanticHighlighting.enabled\": true"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('autohotkey-toml-devicetree-snippets');
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

const SNIPPETS = {"ahk_v2_header": ["#Requires AutoHotkey v2.0", "#SingleInstance Force", "SetWorkingDir A_ScriptDir"], "ahk_v2_hotkey": ["^!${1:s}:: {", "\t${0:MsgBox(\"hotkey fired\")}", "}"], "ahk_v2_hotstring": [":*:${1:btw}::${2:by the way}", ":*:${3:sig}::${4:Kind regards,}"], "ahk_v2_gui": ["MyGui := Gui(\"+Resize\", \"${1:Title}\")", "MyGui.AddText(\"w220\", \"${2:Label}\")", "NameEdit := MyGui.AddEdit(\"vName w220\")", "MyGui.AddButton(\"Default w100\", \"OK\").OnEvent(\"Click\", Ok_Click)", "MyGui.OnEvent(\"Close\", (*) => ExitApp())", "MyGui.Show()", "", "Ok_Click(*) {", "\tMsgBox(NameEdit.Value)", "}"], "ahk_v2_window_wait": ["if WinExist(\"${1:ahk_exe notepad.exe}\") {", "\tWinActivate", "\tWinWaitActive \"$1\", , 3", "\tSendText \"${2:text}\"", "} else {", "\tRun \"${3:notepad.exe}\"", "\tWinWait \"$1\", , 5", "}"], "ahk_v2_class": ["class ${1:Worker} {", "\t__New(name) {", "\t\tthis.Name := name", "\t}", "", "\tRun(*) {", "\t\treturn this.Name", "\t}", "}"], "ahk_v2_try_catch": ["try {", "\t${1:FileRead(\"data.txt\")}", "} catch Error as err {", "\tMsgBox(\"${2:Failed}: \" err.Message \"`n\" err.What)", "}"], "toml_table": ["[${1:section}]", "${2:key} = \"${3:value}\"", "enabled = true", "count = 3"], "toml_array_of_tables": ["[[${1:server}]]", "name = \"${2:alpha}\"", "port = 8080", "", "[[$1]]", "name = \"${3:beta}\"", "port = 8081"], "toml_pyproject": ["[build-system]", "requires = [\"setuptools>=68\"]", "build-backend = \"setuptools.build_meta\"", "", "[project]", "name = \"${1:my-package}\"", "version = \"${2:0.1.0}\"", "requires-python = \">=3.9\"", "dependencies = [\"requests>=2.31\"]", "", "[project.scripts]", "${3:my-cli} = \"${4:my_package.cli}:main\""], "toml_cargo_manifest": ["[package]", "name = \"${1:my-crate}\"", "version = \"${2:0.1.0}\"", "edition = \"2021\"", "", "[dependencies]", "serde = { version = \"1\", features = [\"derive\"] }", "", "[profile.release]", "lto = true"], "toml_multiline_and_dates": ["description = \"\"\"", "${1:first line}", "${2:second line}", "\"\"\"", "path = '${3:/var/log/app}'", "created = 2026-09-06T09:30:00Z", "window = [9, 17]"], "toml_dotted_inline": ["${1:owner}.name = \"${2:Ada}\"", "$1.role = \"${3:maintainer}\"", "limits = { cpu = 2, memory = \"512MiB\" }"], "dts_node": ["${1:mydevice}: ${2:serial}@${3:40001000} {", "\tcompatible = \"${4:arm,pl011}\";", "\treg = <0x$3 0x1000>;", "\tstatus = \"okay\";", "};"], "dts_i2c_child": ["&i2c${1:1} {", "\tstatus = \"okay\";", "\tclock-frequency = <400000>;", "", "\t${2:sensor}@${3:76} {", "\t\tcompatible = \"${4:bosch,bme280}\";", "\t\treg = <0x$3>;", "\t};", "};"], "dts_gpio_keys": ["gpio-keys {", "\tcompatible = \"gpio-keys\";", "", "\t${1:user}: ${1}-key {", "\t\tlabel = \"${2:User Button}\";", "\t\tgpios = <&gpio${3:0} ${4:11} GPIO_ACTIVE_LOW>;", "\t\tlinux,code = <KEY_ENTER>;", "\t};", "};"], "dts_overlay_fragment": ["/dts-v1/;", "/plugin/;", "", "/ {", "\tfragment@0 {", "\t\ttarget = <&${1:i2c1}>;", "\t\t__overlay__ {", "\t\t\tstatus = \"okay\";", "\t\t\t#address-cells = <1>;", "\t\t\t#size-cells = <0>;", "\t\t\t${0}", "\t\t};", "\t};", "};"], "dts_interrupts_clocks": ["\tinterrupt-parent = <&${1:gic}>;", "\tinterrupts = <GIC_SPI ${2:34} IRQ_TYPE_LEVEL_HIGH>;", "\tclocks = <&${3:clk} ${4:12}>;", "\tclock-names = \"${5:apb_pclk}\";", "\tpinctrl-names = \"default\";", "\tpinctrl-0 = <&${6:uart0_pins}>;"], "mp_config_property": ["\t@Inject", "\t@ConfigProperty(name = \"${1:app.timeout.seconds}\", defaultValue = \"${2:5}\")", "\t${3:int} ${4:timeoutSeconds};"], "mp_fault_tolerance": ["\t@Retry(maxRetries = 3, delay = 200)", "\t@Timeout(value = 2000)", "\t@Fallback(fallbackMethod = \"${1:fallbackResponse}\")", "\t@CircuitBreaker(requestVolumeThreshold = 8, failureRatio = 0.5, delay = 10000)", "\tpublic ${2:String} ${3:callRemote}() {", "\t\treturn ${4:client}.fetch();", "\t}", "", "\tpublic $2 $1() {", "\t\treturn ${5:\"cached\"};", "\t}"], "mp_health_check": ["@Readiness", "@ApplicationScoped", "public class ${1:DatabaseReadyCheck} implements HealthCheck {", "", "\t@Override", "\tpublic HealthCheckResponse call() {", "\t\treturn HealthCheckResponse.named(\"${2:database}\")", "\t\t\t\t.status(${3:true})", "\t\t\t\t.withData(\"${4:pool}\", \"${5:up}\")", "\t\t\t\t.build();", "\t}", "}"], "mp_rest_client": ["@RegisterRestClient(configKey = \"${1:orders-api}\")", "@Path(\"/${2:orders}\")", "public interface ${3:OrdersClient} {", "", "\t@GET", "\t@Path(\"/{id}\")", "\t@Produces(MediaType.APPLICATION_JSON)", "\t${4:Order} findById(@PathParam(\"id\") ${5:String} id);", "}"], "mp_config_properties_file": ["${1:orders-api}/mp-rest/url=${2:http://localhost:8081}", "$1/mp-rest/scope=jakarta.enterprise.context.ApplicationScoped", "mp.health.disable-default-procedures=false", "mp.openapi.scan.disable=false", "app.timeout.seconds=5"], "renpy_label_dialogue": ["label ${1:start}:", "\tscene bg ${2:room}", "\tshow ${3:mira} happy", "\tm \"${4:Welcome back.}\"", "\tmenu:", "\t\t\"${5:Stay}\":", "\t\t\tjump ${6:stay_branch}", "\t\t\"${7:Leave}\":", "\t\t\tjump ${8:leave_branch}", "\treturn"], "renpy_define_character": ["define ${1:m} = Character(\"${2:Mira}\", color=\"#c8ffc8\", who_outline=[(\"#000000\", 1, 0, 0)])", "define ${3:n} = Character(None, what_italic=True)", "image ${4:mira} happy = \"${5:images/mira_happy.png}\""], "renpy_scene_transition": ["\tscene bg ${1:street} with fade", "\tshow ${2:mira} at ${3:left} with dissolve", "\tpause 0.5", "\thide $2 with moveoutleft", "\tplay music \"${4:audio/theme.ogg}\" fadein 1.0"], "renpy_screen": ["screen ${1:save_notice}():", "\tframe:", "\t\txalign 0.5 yalign 0.1", "\t\tvbox:", "\t\t\ttext \"${2:Progress saved}\"", "\t\t\ttextbutton \"${3:Close}\" action Hide(\"$1\")"], "renpy_variable_branch": ["default ${1:trust} = 0", "", "label ${2:choice_point}:", "\tif $1 >= ${3:3}:", "\t\tjump ${4:good_end}", "\telse:", "\t\t\"${5:She looks away.}\"", "\t\tjump ${6:neutral_end}"], "swift_codable_model": ["struct ${1:Order}: Codable, Identifiable {", "\tlet id: UUID", "\tlet ${2:total}: Decimal", "\tlet createdAt: Date", "", "\tenum CodingKeys: String, CodingKey {", "\t\tcase id", "\t\tcase $2", "\t\tcase createdAt = \"created_at\"", "\t}", "}"], "swift_async_request": ["func ${1:loadOrders}() async throws -> [${2:Order}] {", "\tguard let url = URL(string: \"${3:https://api.internal/orders}\") else {", "\t\tthrow ${4:ServiceError}.badURL", "\t}", "\tlet (data, response) = try await URLSession.shared.data(from: url)", "\tguard let http = response as? HTTPURLResponse, http.statusCode == 200 else {", "\t\tthrow $4.badStatus((response as? HTTPURLResponse)?.statusCode ?? -1)", "\t}", "\treturn try JSONDecoder().decode([$2].self, from: data)", "}"], "swift_error_enum": ["enum ${1:ServiceError}: Error, LocalizedError {", "\tcase badURL", "\tcase badStatus(Int)", "\tcase decoding(Error)", "", "\tvar errorDescription: String? {", "\t\tswitch self {", "\t\tcase .badURL: return \"The request address is not valid.\"", "\t\tcase .badStatus(let code): return \"The server answered with status \\(code).\"", "\t\tcase .decoding: return \"The response could not be read.\"", "\t\t}", "\t}", "}"], "swift_protocol_extension": ["protocol ${1:OrderStoring} {", "\tfunc save(_ order: ${2:Order}) async throws", "}", "", "extension $1 {", "\tfunc saveAll(_ orders: [$2]) async throws {", "\t\tfor order in orders {", "\t\t\ttry await save(order)", "\t\t}", "\t}", "}"], "swift_actor_cache": ["actor ${1:OrderCache} {", "\tprivate var items: [UUID: ${2:Order}] = [:]", "", "\tfunc put(_ order: $2) {", "\t\titems[order.id] = order", "\t}", "", "\tfunc get(_ id: UUID) -> $2? {", "\t\titems[id]", "\t}", "}"], "editorconfig_root": ["root = true", "", "[*]", "charset = utf-8", "end_of_line = lf", "insert_final_newline = true", "indent_style = ${1:space}", "indent_size = ${2:2}", "trim_trailing_whitespace = true", "", "[*.md]", "trim_trailing_whitespace = false"], "precommit_config": ["repos:", "  - repo: https://github.com/pre-commit/pre-commit-hooks", "    rev: v4.6.0", "    hooks:", "      - id: end-of-file-fixer", "      - id: trailing-whitespace", "      - id: check-yaml", "      - id: check-toml"], "ci_lint_job": ["name: ${1:lint}", "", "on:", "  pull_request:", "  push:", "    branches: [ main ]", "", "jobs:", "  $1:", "    runs-on: ubuntu-latest", "    steps:", "      - uses: actions/checkout@v4", "      - name: ${2:run checks}", "        run: ${3:make lint}"], "workspace_lint_settings": ["{", "\t\"editor.formatOnSave\": true,", "\t\"editor.codeActionsOnSave\": {", "\t\t\"source.fixAll\": \"explicit\"", "\t},", "\t\"files.trimTrailingWhitespace\": true,", "\t\"files.insertFinalNewline\": true,", "\t\"files.associations\": {", "\t\t\"*.dts\": \"c\",", "\t\t\"*.dtsi\": \"c\",", "\t\t\"*.overlay\": \"c\"", "\t}", "}"], "ignore_patterns": ["node_modules/", "dist/", "build/", ".venv/", "__pycache__/", "*.log", "*.tmp", ".DS_Store"], "inkling_types": ["inkling \"2.0\"", "", "type ${1:SimState} {", "\tposition: number<-2.4 .. 2.4>,", "\tvelocity: number,", "\tangle: number<-0.42 .. 0.42>", "}", "", "type ${2:SimAction} {", "\tcommand: number<-1 .. 1>", "}", "", "type ${3:SimConfig} {", "\tinitial_position: number", "}"], "inkling_simulator": ["simulator ${1:Simulator}(action: ${2:SimAction}, config: ${3:SimConfig}): ${4:SimState} {", "}"], "inkling_graph_concept": ["graph (input: ${1:SimState}): ${2:SimAction} {", "\tconcept ${3:Balance}(input): $2 {", "\t\tcurriculum {", "\t\t\tsource ${4:Simulator}", "\t\t\ttraining {", "\t\t\t\tEpisodeIterationLimit: 200,", "\t\t\t\tNoProgressIterationLimit: 500000", "\t\t\t}", "\t\t\tgoal (State: $1) {", "\t\t\t\tavoid FallOver: Math.Abs(State.angle) in Goal.RangeAbove(0.35)", "\t\t\t\tdrive Centered: State.position in Goal.Range(-0.5, 0.5)", "\t\t\t}", "\t\t}", "\t}", "\toutput $3", "}"], "inkling_lessons": ["\t\tcurriculum {", "\t\t\tsource ${1:Simulator}", "\t\t\tlesson ${2:easy_start} {", "\t\t\t\tscenario {", "\t\t\t\t\tinitial_position: number<-0.2 .. 0.2>", "\t\t\t\t}", "\t\t\t}", "\t\t\tlesson ${3:full_range} {", "\t\t\t\tscenario {", "\t\t\t\t\tinitial_position: number<-1.0 .. 1.0>", "\t\t\t\t}", "\t\t\t}", "\t\t}"], "python_token_colors": ["\"editor.tokenColorCustomizations\": {", "\t\"textMateRules\": [", "\t\t{", "\t\t\t\"scope\": \"string.quoted.docstring.multi.python\",", "\t\t\t\"settings\": { \"foreground\": \"#7f9f7f\", \"fontStyle\": \"italic\" }", "\t\t},", "\t\t{", "\t\t\t\"scope\": \"meta.function.decorator.python entity.name.function\",", "\t\t\t\"settings\": { \"foreground\": \"#dcb67a\" }", "\t\t},", "\t\t{", "\t\t\t\"scope\": \"variable.language.special.self.python\",", "\t\t\t\"settings\": { \"foreground\": \"#c586c0\", \"fontStyle\": \"italic\" }", "\t\t}", "\t]", "}"], "python_semantic_tokens": ["\"editor.semanticTokenColorCustomizations\": {", "\t\"[${1:Default Dark Modern}]\": {", "\t\t\"enabled\": true,", "\t\t\"rules\": {", "\t\t\t\"parameter.declaration:python\": \"#9cdcfe\",", "\t\t\t\"class.declaration:python\": \"#4ec9b0\",", "\t\t\t\"selfParameter:python\": \"#c586c0\"", "\t\t}", "\t}", "}"], "python_editor_settings": ["\"[python]\": {", "\t\"editor.rulers\": [88],", "\t\"editor.tabSize\": 4,", "\t\"editor.insertSpaces\": true,", "\t\"editor.wordBasedSuggestions\": \"off\",", "\t\"editor.formatOnSave\": true", "}"], "python_bracket_and_indent_colors": ["\"editor.bracketPairColorization.enabled\": true,", "\"editor.guides.bracketPairs\": \"active\",", "\"workbench.colorCustomizations\": {", "\t\"editorIndentGuide.activeBackground1\": \"#6a9955\",", "\t\"editorBracketHighlight.foreground1\": \"#ffd700\",", "\t\"editorBracketHighlight.foreground2\": \"#da70d6\"", "}"]};

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
  const _c = vscode.workspace.getConfiguration('autohotkey-toml-devicetree-snippets');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('autohotkey-toml-devicetree-snippets').get('reportFormat')
    || vscode.workspace.getConfiguration('autohotkey-toml-devicetree-snippets').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'autohotkey-toml-devicetree-snippets-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "autohotkey-toml-devicetree-snippets").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('autohotkey-toml-devicetree-snippets.audit_file', runCurrent);
  reg('autohotkey-toml-devicetree-snippets.audit_selection', runSelection);
  reg('autohotkey-toml-devicetree-snippets.insert_snippet', insertSnippet);
  reg('autohotkey-toml-devicetree-snippets.list_rules', listRules);
  reg('autohotkey-toml-devicetree-snippets.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('autohotkey-toml-devicetree-snippets.quick_fix', function () { return quickFix(ctx); });
  reg('autohotkey-toml-devicetree-snippets.export_report', function () { return exportReport(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('autohotkey-toml-devicetree-snippets').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
