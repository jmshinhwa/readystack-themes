// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking the open file against 23 rules.", "done": "Check finished. Findings are listed in the output panel with line numbers.", "nothing_found": "No findings. This file passes all 23 rules.", "need_key": "This command belongs to the paid pack. Paste your licence key to unlock it.", "key_ok": "Licence key accepted. The paid commands are unlocked on this machine.", "key_bad": "That key was not accepted. Check for a stray space at either end and paste it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "watch_on_save", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('DeviceTree & 8 More - Embedded Config Pack');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('devicetree-config-language-pack').get('min_severity')
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
const RULES = [{"pattern": "status\\s*=\\s*\"ok\"", "flags": "i", "message": "status = \"ok\" is not in the Devicetree Specification v0.4 status list (\"okay\", \"disabled\", \"reserved\", \"fail\", \"fail-sss\"). Zephyr marks the node present only for the exact value \"okay\".", "fix": "status = \"okay\""}, {"pattern": "status\\s*=\\s*\"disable\"", "flags": "i", "message": "The disabled state is spelled \"disabled\". \"disable\" is not a defined status value.", "fix": "status = \"disabled\""}, {"pattern": "status\\s*=\\s*\"enabled?\"", "flags": "i", "message": "There is no \"enable\"/\"enabled\" status in devicetree. The value that turns a node on is \"okay\".", "fix": "status = \"okay\""}, {"pattern": "compatible\\s*=\\s*\"[^\",]*\"", "flags": "i", "message": "A compatible string is written \"vendor,device\". Without the comma it matches no binding and the driver never probes.", "fix": ""}, {"pattern": "^\\s*address-cells\\s*=", "flags": "im", "message": "The property is #address-cells, with the leading hash. Written without it, the parent supplies no address cell count and every child reg is read wrong.", "fix": "#address-cells ="}, {"pattern": "^\\s*[a-z][a-z0-9_-]*_[a-z0-9_-]*@[0-9a-f]+\\s*\\{", "flags": "im", "message": "Underscores in a node name are flagged by dtc -Wnode_name_chars_strict. Node names use lowercase letters, digits and hyphens; keep underscores for the label before the colon.", "fix": ""}, {"pattern": "@0x[0-9a-f]+\\s*\\{", "flags": "im", "message": "A unit address is written without the 0x prefix, for example serial@40011000. dtc compares it against the first reg cell as plain hex.", "fix": ""}, {"pattern": "interrupt-parent\\s*=\\s*<\\s*[0-9]", "flags": "i", "message": "interrupt-parent takes a phandle reference such as <&intc>. A literal number here only works if it happens to match a generated phandle value.", "fix": ""}, {"pattern": "^\\s*phandle\\s*=\\s*<", "flags": "im", "message": "dtc generates phandle values itself. Setting one by hand can collide with a generated value and silently rewire an interrupt or clock.", "fix": ""}, {"pattern": "gpios\\s*=\\s*<\\s*&[a-z0-9_]+\\s+[0-9]+\\s*>", "flags": "i", "message": "A GPIO specifier on these bindings has two cells: pin and flags, as in <&gpio0 13 GPIO_ACTIVE_LOW>. With the flags cell missing the polarity defaults and the LED or button reads inverted.", "fix": ""}, {"pattern": "^\\s*version\\s*=\\s*[0-9]+\\.[0-9]+", "flags": "im", "message": "TOML has no bare version literal. 1.0.0 is not a number, so the key must be quoted: version = \"1.0.0\".", "fix": ""}, {"pattern": "^\\s*edition\\s*=\\s*[0-9]{4}\\s*$", "flags": "im", "message": "The edition key is a string in TOML: edition = \"2021\". An unquoted year parses as an integer and the manifest is rejected.", "fix": ""}, {"pattern": "^\\s*requires-python\\s*=\\s*[^\"'\\s]", "flags": "im", "message": "PEP 621 requires-python is a quoted string: requires-python = \">=3.9\". An unquoted specifier is not valid TOML.", "fix": ""}, {"pattern": "^\\s*mp\\.jwt\\.verify\\.publickey\\.location\\s*=\\s*http:", "flags": "im", "message": "mp.jwt.verify.publickey.location is being fetched over plain http, so the verification key can be swapped in transit. Use https, classpath: or file:.", "fix": ""}, {"pattern": "^\\s*%[a-z0-9]+\\s*=", "flags": "im", "message": "A MicroProfile config profile prefix must be followed by the property name: %dev.my.property=value. On its own, %dev is not a property key.", "fix": ""}, {"pattern": "/mp-rest/(uri|baseurl|base-url)\\s*=", "flags": "i", "message": "The MicroProfile Rest Client key is /mp-rest/url. Any other spelling is ignored and the client falls back to the annotation value.", "fix": ""}, {"pattern": "^\\s*(MsgBox|SetTimer|StringReplace|WinActivate|Gui|FileAppend)\\s*,", "flags": "im", "message": "This is AutoHotkey v1 command syntax. v2 uses function calls with parentheses, for example MsgBox(\"text\") and SetTimer(callback, 1000).", "fix": ""}, {"pattern": "^\\s*#(NoEnv|Persistent|EscapeChar)\\b", "flags": "im", "message": "This directive was removed in AutoHotkey v2. #NoEnv and #EscapeChar are gone, and #Persistent became the Persistent function.", "fix": ""}, {"pattern": ":=\\s*[^%\\n]*%[a-z_][a-z0-9_]*%", "flags": "i", "message": "Percent dereferencing inside an expression was removed in AutoHotkey v2. Write the variable name on its own, or use %name% only in a double-deref such as %varName%.", "fix": ""}, {"pattern": "\\bim\\.(Scale|FactorScale|Composite|Crop|Grayscale)\\(", "flags": "i", "message": "The im.* image manipulators are deprecated in Ren'Py. Use a Transform with zoom, xysize or crop instead; im.* results are not cached the same way and cost memory on Android.", "fix": ""}, {"pattern": "^\\s*(label\\s+[a-z_][a-z0-9_]*|menu)\\s*$", "flags": "im", "message": "A Ren'Py block statement ends with a colon: label start: or menu:. Without it the parser stops on this line.", "fix": ""}, {"pattern": "\\b(try|as)!\\s", "flags": "i", "message": "try! and as! crash the process on failure. Use try?/do-catch or as? with a guard so a malformed board profile does not take the tool down.", "fix": ""}, {"pattern": "^\\s*inkling\\s+\"1\\.[0-9]+\"", "flags": "im", "message": "The Inkling 1.x version declaration is not accepted by the 2.0 toolchain. The first line must read inkling \"2.0\".", "fix": "inkling \"2.0\""}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('devicetree-config-language-pack');
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

const SNIPPETS = {"dts_file_header": ["/dts-v1/;", "#include <dt-bindings/gpio/gpio.h>", "", "/ {", "\tmodel = \"${1:Rev A Controller Board}\";", "\tcompatible = \"${2:vendor},${3:board-rev-a}\";", "", "\tchosen {", "\t\tzephyr,console = &${4:usart1};", "\t};", "};"], "dts_node_with_reg": ["${1:i2c1}: ${2:i2c}@${3:40005400} {", "\tcompatible = \"${4:vendor},${5:i2c-controller}\";", "\treg = <0x${3:40005400} 0x400>;", "\t#address-cells = <1>;", "\t#size-cells = <0>;", "\tstatus = \"okay\";", "};"], "dts_i2c_child": ["&${1:i2c1} {", "\tclock-frequency = <100000>;", "\tstatus = \"okay\";", "", "\t${2:sensor}@${3:48} {", "\t\tcompatible = \"${4:vendor},${5:part-number}\";", "\t\treg = <0x${3:48}>;", "\t\tstatus = \"okay\";", "\t};", "};"], "dts_spi_flash": ["&${1:spi1} {", "\tstatus = \"okay\";", "\tcs-gpios = <&${2:gpioa} ${3:4} GPIO_ACTIVE_LOW>;", "", "\t${4:flash}@0 {", "\t\tcompatible = \"jedec,spi-nor\";", "\t\treg = <0>;", "\t\tspi-max-frequency = <${5:8000000}>;", "\t\tstatus = \"okay\";", "\t};", "};"], "dts_gpio_leds": ["leds {", "\tcompatible = \"gpio-leds\";", "", "\t${1:led0}: led-0 {", "\t\tgpios = <&${2:gpioa} ${3:5} GPIO_ACTIVE_LOW>;", "\t\tlabel = \"${4:Green LED}\";", "\t};", "};"], "dts_gpio_keys": ["keys {", "\tcompatible = \"gpio-keys\";", "", "\t${1:button0}: button-0 {", "\t\tgpios = <&${2:gpioc} ${3:13} (GPIO_PULL_UP | GPIO_ACTIVE_LOW)>;", "\t\tlabel = \"${4:User Button}\";", "\t\tzephyr,code = <${5:INPUT_KEY_0}>;", "\t};", "};"], "dts_board_overlay": ["/dts-v1/;", "/plugin/;", "", "&${1:i2c1} {", "\tstatus = \"okay\";", "", "\t${2:sensor}@${3:76} {", "\t\tcompatible = \"${4:vendor},${5:part-number}\";", "\t\treg = <0x${3:76}>;", "\t};", "};"], "dts_chosen_zephyr": ["chosen {", "\tzephyr,console = &${1:usart1};", "\tzephyr,shell-uart = &${1:usart1};", "\tzephyr,sram = &sram0;", "\tzephyr,flash = &flash0;", "\tzephyr,code-partition = &slot0_partition;", "};"], "dts_memory_node": ["memory@${1:80000000} {", "\tdevice_type = \"memory\";", "\treg = <0x${1:80000000} 0x${2:10000000}>;", "};"], "dts_pinctrl_uart": ["&${1:usart1} {", "\tpinctrl-0 = <&${2:usart1_tx_pa9} &${3:usart1_rx_pa10}>;", "\tpinctrl-names = \"default\";", "\tcurrent-speed = <${4:115200}>;", "\tstatus = \"okay\";", "};"], "dts_fixed_regulator": ["${1:vcc_3v3}: regulator-${2:3v3} {", "\tcompatible = \"regulator-fixed\";", "\tregulator-name = \"${3:vcc-3v3}\";", "\tregulator-min-microvolt = <3300000>;", "\tregulator-max-microvolt = <3300000>;", "\tgpio = <&${4:gpiob} ${5:2} GPIO_ACTIVE_HIGH>;", "\tenable-active-high;", "\tregulator-boot-on;", "};"], "dts_fixed_partitions": ["&flash0 {", "\tpartitions {", "\t\tcompatible = \"fixed-partitions\";", "\t\t#address-cells = <1>;", "\t\t#size-cells = <1>;", "", "\t\tboot_partition: partition@0 {", "\t\t\tlabel = \"mcuboot\";", "\t\t\treg = <0x00000000 0x0000c000>;", "\t\t\tread-only;", "\t\t};", "", "\t\tslot0_partition: partition@c000 {", "\t\t\tlabel = \"image-0\";", "\t\t\treg = <0x0000c000 0x00069000>;", "\t\t};", "", "\t\tstorage_partition: partition@75000 {", "\t\t\tlabel = \"storage\";", "\t\t\treg = <0x00075000 0x0000b000>;", "\t\t};", "\t};", "};"], "dts_aliases_and_user": ["aliases {", "\tled0 = &${1:green_led};", "\tsw0 = &${2:user_button};", "\twatchdog0 = &${3:iwdg};", "};", "", "zephyr,user {", "\tio-channels = <&${4:adc1} ${5:0}>;", "\t${6:signal}-gpios = <&${7:gpioa} ${8:8} GPIO_ACTIVE_HIGH>;", "};"], "toml_table": ["[${1:package}]", "name = \"${2:firmware-tools}\"", "version = \"${3:0.1.0}\"", "description = \"${4:Board bring-up helpers}\"", "authors = [\"${5:Hardware Team}\"]"], "toml_array_of_tables": ["[[${1:target}]]", "name = \"${2:debug}\"", "flags = [\"${3:-Og}\", \"${4:-g3}\"]", "", "[[${1:target}]]", "name = \"${5:release}\"", "flags = [\"${6:-Os}\"]"], "toml_rust_manifest": ["[package]", "name = \"${1:dts-tools}\"", "version = \"${2:0.1.0}\"", "edition = \"2021\"", "", "[dependencies]", "serde = { version = \"${3:1}\", features = [\"derive\"] }", "", "[profile.release]", "opt-level = \"z\"", "lto = true"], "toml_pyproject": ["[build-system]", "requires = [\"setuptools>=68\"]", "build-backend = \"setuptools.build_meta\"", "", "[project]", "name = \"${1:dts-lint}\"", "version = \"${2:0.1.0}\"", "requires-python = \">=${3:3.9}\"", "dependencies = [\"${4:pyyaml}\"]", "", "[project.scripts]", "${5:dts-lint} = \"${6:dts_lint}:main\""], "toml_string_forms": ["description = \"\"\"", "${1:Line one of the description.}", "${2:Line two, on its own line.}", "\"\"\"", "path = '${3:/opt/firmware/build}'", "node_pattern = '${4:^cpu@\\d+$}'"], "toml_scalars": ["created = ${1:2026-09-06T09:30:00Z}", "release_day = ${2:2026-10-01}", "build_time = ${3:07:45:00}", "retries = ${4:3}", "timeout_s = ${5:1.5}", "enabled = ${6:true}"], "mp_config_ordinal": ["config_ordinal=${1:150}", "${2:app.greeting}=${3:Hello from the config file}"], "mp_config_profile": ["mp.config.profile=${1:dev}", "%dev.${2:app.datasource.url}=${3:jdbc:h2:mem:devdb}", "%test.${2:app.datasource.url}=${4:jdbc:h2:mem:testdb}", "%prod.${2:app.datasource.url}=${5:jdbc:postgresql://db:5432/app}"], "mp_rest_client": ["${1:fully.qualified.ClientInterface}/mp-rest/url=${2:https://inventory.svc.cluster.local:8443}", "${1:fully.qualified.ClientInterface}/mp-rest/scope=jakarta.enterprise.context.ApplicationScoped", "${1:fully.qualified.ClientInterface}/mp-rest/connectTimeout=${3:2000}", "${1:fully.qualified.ClientInterface}/mp-rest/readTimeout=${4:5000}"], "mp_fault_tolerance": ["${1:fully.qualified.ServiceClass}/${2:fetchInventory}/Retry/maxRetries=${3:3}", "${1:fully.qualified.ServiceClass}/${2:fetchInventory}/Retry/delay=${4:200}", "${1:fully.qualified.ServiceClass}/${2:fetchInventory}/Timeout/value=${5:2000}", "${1:fully.qualified.ServiceClass}/${2:fetchInventory}/CircuitBreaker/requestVolumeThreshold=${6:10}", "MP_Fault_Tolerance_NonFallback_Enabled=${7:true}"], "mp_jwt_verify": ["mp.jwt.verify.publickey.location=${1:/META-INF/resources/publicKey.pem}", "mp.jwt.verify.issuer=${2:https://auth.internal/realms/devices}", "mp.jwt.verify.audiences=${3:device-api}", "mp.jwt.token.header=Authorization"], "mp_config_property": ["@Inject", "@ConfigProperty(name = \"${1:app.retry.max}\", defaultValue = \"${2:3}\")", "${3:int} ${4:maxRetries};"], "renpy_label": ["label ${1:start}:", "    scene ${2:bg lab} with fade", "    \"${3:The console prints one line, then stops.}\"", "    jump ${4:chapter_one}"], "renpy_menu": ["menu:", "    \"${1:Which board do you flash first?}\"", "", "    \"${2:The one on the bench}\":", "        $ ${3:choice} = \"${4:bench}\"", "        jump ${5:bench_path}", "", "    \"${6:The one in the rack}\":", "        $ ${3:choice} = \"${7:rack}\"", "        jump ${8:rack_path}"], "renpy_character": ["define ${1:m} = Character(\"${2:Mira}\", color=\"#c8ffc8\", what_prefix='\"', what_suffix='\"')", "define ${3:narrator_soft} = Character(None, what_italic=True)"], "renpy_scene_transition": ["scene ${1:bg lab} with dissolve", "show ${2:mira} ${3:happy} at left with moveinleft", "with Pause(${4:0.5})", "show ${5:tech} ${6:neutral} at right", "hide ${5:tech} with dissolve"], "renpy_screen": ["screen ${1:board_status}(${2:board_name}):", "    frame:", "        xalign 0.98 yalign 0.02", "        vbox:", "            text \"[${2:board_name}]\"", "            textbutton \"${3:Flash again}\" action Jump(\"${4:flash_again}\")", "            textbutton \"${5:Close}\" action Hide(\"${1:board_status}\")"], "ahk_v2_header": ["#Requires AutoHotkey v2.0", "#SingleInstance Force", "SetWorkingDir(A_ScriptDir)", "Persistent"], "ahk_v2_hotkey": ["^!${1:j}::${2:BuildAndFlash}()", "", "${2:BuildAndFlash}() {", "    ToolTip(\"${3:Building the firmware image}\")", "    SetTimer(() => ToolTip(), -${4:1500})", "}"], "ahk_v2_gui": ["${1:panel} := Gui(\"+AlwaysOnTop\", \"${2:Board Bring-Up}\")", "${1:panel}.SetFont(\"s10\")", "${1:panel}.Add(\"Text\", \"xm w220\", \"${3:Serial port}\")", "${4:portBox} := ${1:panel}.Add(\"Edit\", \"xm w220\", \"${5:COM3}\")", "${6:goButton} := ${1:panel}.Add(\"Button\", \"xm w220 Default\", \"${7:Open console}\")", "${6:goButton}.OnEvent(\"Click\", (*) => MsgBox(${4:portBox}.Value))", "${1:panel}.Show()"], "ahk_hotstrings": ["::${1:dtso}::${2:status = \"okay\";}", ":*:${3:cmpt}::${4:compatible = \"vendor,device\";}"], "ahk_clipboard_rewrite": ["^!${1:v}:: {", "    saved := A_Clipboard", "    A_Clipboard := \"\"", "    Send(\"^c\")", "    if !ClipWait(${2:1})", "        return", "    A_Clipboard := StrReplace(A_Clipboard, \"${3:_}\", \"${4:-}\")", "    Send(\"^v\")", "    Sleep(${5:200})", "    A_Clipboard := saved", "}"], "swift_package_manifest": ["// swift-tools-version: 5.9", "import PackageDescription", "", "let package = Package(", "    name: \"${1:BoardTools}\",", "    platforms: [.macOS(.v13)],", "    products: [", "        .library(name: \"${1:BoardTools}\", targets: [\"${1:BoardTools}\"])", "    ],", "    targets: [", "        .target(name: \"${1:BoardTools}\"),", "        .testTarget(name: \"${1:BoardTools}Tests\", dependencies: [\"${1:BoardTools}\"])", "    ]", ")"], "swift_async_throws": ["func ${1:loadProfile}(from url: URL) async throws -> String {", "    let (data, response) = try await URLSession.shared.data(from: url)", "    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {", "        throw ${2:LoaderError}.badStatus", "    }", "    return String(decoding: data, as: UTF8.self)", "}", "", "enum ${2:LoaderError}: Error { case badStatus }"], "swift_codable_struct": ["struct ${1:BoardProfile}: Codable, Sendable {", "    let ${2:name}: String", "    let ${3:consoleBaud}: Int", "    let ${4:tags}: [String]", "", "    enum CodingKeys: String, CodingKey {", "        case ${2:name}", "        case ${3:consoleBaud} = \"console_baud\"", "        case ${4:tags}", "    }", "}"], "swift_xctest_case": ["import XCTest", "@testable import ${1:BoardTools}", "", "final class ${2:BoardProfileTests}: XCTestCase {", "    func test${3:DecodesConsoleBaud}() throws {", "        let json = Data(${4:sampleJSON}.utf8)", "        let profile = try JSONDecoder().decode(${5:BoardProfile}.self, from: json)", "        XCTAssertEqual(profile.${6:consoleBaud}, ${7:115200})", "    }", "}"], "inkling_types": ["inkling \"2.0\"", "", "type ${1:SimState} {", "    ${2:position}: number,", "    ${3:velocity}: number", "}", "", "type ${4:SimAction} {", "    ${5:command}: number<-1 .. 1>", "}", "", "type ${6:SimConfig} {", "    ${7:initial_position}: number<-0.5 .. 0.5>", "}"], "inkling_graph_concept": ["simulator ${1:BoardSim}(action: ${2:SimAction}, config: ${3:SimConfig}): ${4:SimState} {", "}", "", "graph (input: ${4:SimState}) {", "    concept ${5:HoldSetpoint}(input): ${2:SimAction} {", "        curriculum {", "            source ${1:BoardSim}", "            training {", "                EpisodeIterationLimit: ${6:250}", "            }", "        }", "    }", "}"], "inkling_goal_lesson": ["goal (State: ${1:SimState}) {", "    avoid ${2:Overshoot}:", "        Math.Abs(State.${3:error}) in Goal.RangeAbove(${4:1.0})", "    drive ${5:OnTarget}:", "        State.${3:error} in Goal.Range(-${6:0.1}, ${6:0.1})", "}", "", "lesson ${7:StartNearTarget} {", "    scenario {", "        ${8:initial_position}: number<-0.1 .. 0.1>", "    }", "}"], "editorconfig_embedded_repo": ["root = true", "", "[*]", "end_of_line = lf", "insert_final_newline = true", "charset = utf-8", "trim_trailing_whitespace = true", "", "[*.{dts,dtsi,overlay}]", "indent_style = tab", "indent_size = 8", "", "[*.{toml,yml,yaml,json}]", "indent_style = space", "indent_size = 2", "", "[*.{py,rpy}]", "indent_style = space", "indent_size = 4"], "dtc_check_script": ["#!/usr/bin/env bash", "set -euo pipefail", "", "mkdir -p build", "cpp -nostdinc -I include -undef -x assembler-with-cpp ${1:board.dts} build/preprocessed.dts", "dtc -I dts -O dtb -o build/${2:board}.dtb build/preprocessed.dts", "dtc -I dts -O dts -q -f build/preprocessed.dts > build/${2:board}.flat.dts"], "vscode_file_associations": ["\"files.associations\": {", "    \"*.dts\": \"plaintext\",", "    \"*.dtsi\": \"plaintext\",", "    \"*.overlay\": \"plaintext\",", "    \"*.rpy\": \"plaintext\",", "    \"*.ahk\": \"plaintext\",", "    \"*.ink\": \"plaintext\",", "    \"microprofile-config.properties\": \"properties\"", "}"], "west_manifest": ["manifest:", "  remotes:", "    - name: ${1:upstream}", "      url-base: ${2:https://github.com/zephyrproject-rtos}", "  projects:", "    - name: zephyr", "      remote: ${1:upstream}", "      revision: ${3:v3.7-branch}", "      import:", "        name-allowlist:", "          - cmsis", "          - hal_stm32", "  self:", "    path: ${4:application}"], "python_dts_node_scan": ["import re", "from pathlib import Path", "", "NODE = re.compile(r\"^\\s*(?:([\\w-]+)\\s*:\\s*)?([\\w,.+-]+)(@([0-9a-fA-F]+))?\\s*\\{\")", "", "def scan(root: Path):", "    for path in sorted(root.rglob(\"*.dts*\")):", "        text = path.read_text(encoding=\"utf-8\")", "        for line_no, line in enumerate(text.splitlines(), 1):", "            match = NODE.match(line)", "            if match:", "                yield path, line_no, match.group(2), match.group(4)", "", "for path, line_no, node, unit in scan(Path(\"${1:boards}\")):", "    print(path, line_no, node, unit)"], "python_bindings_check": ["import sys", "import yaml", "from pathlib import Path", "", "REQUIRED = (\"description\", \"compatible\", \"properties\")", "problems = 0", "", "for path in sorted(Path(\"${1:dts/bindings}\").rglob(\"*.yaml\")):", "    data = yaml.safe_load(path.read_text(encoding=\"utf-8\")) or {}", "    missing = [key for key in REQUIRED if key not in data]", "    if missing:", "        problems += 1", "        print(path, \"missing\", \", \".join(missing))", "", "sys.exit(1 if problems else 0)"], "python_serial_console": ["import serial", "", "port = serial.Serial(\"${1:/dev/ttyACM0}\", ${2:115200}, timeout=${3:1})", "port.reset_input_buffer()", "port.write(b\"${4:kernel version}\\r\\n\")", "", "for _ in range(${5:40}):", "    line = port.readline().decode(\"utf-8\", \"replace\").strip()", "    if line:", "        print(line)", "", "port.close()"], "python_image_crc": ["import zlib", "from pathlib import Path", "", "image = Path(\"${1:build/zephyr/zephyr.bin}\").read_bytes()", "slot_size = ${2:0x69000}", "", "print(\"size  :\", len(image), \"bytes\")", "print(\"crc32 : 0x%08x\" % (zlib.crc32(image) & 0xFFFFFFFF))", "print(\"free  :\", slot_size - len(image), \"bytes left in the slot\")"]};

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
  const _c = vscode.workspace.getConfiguration('devicetree-config-language-pack');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('devicetree-config-language-pack').get('reportFormat')
    || vscode.workspace.getConfiguration('devicetree-config-language-pack').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'devicetree-config-language-pack-report.' + pick.toLowerCase());
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
  try { lic.pullFeed(ctx, "devicetree-config-language-pack").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('devicetree-config-language-pack.audit_file', runCurrent);
  reg('devicetree-config-language-pack.insert_snippet', insertSnippet);
  reg('devicetree-config-language-pack.list_rules', listRules);
  reg('devicetree-config-language-pack.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('devicetree-config-language-pack.export_report', function () { return exportReport(ctx); });
  reg('devicetree-config-language-pack.watch_on_save', function () { return watchOnSave(ctx); });
  reg('devicetree-config-language-pack.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('devicetree-config-language-pack').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
