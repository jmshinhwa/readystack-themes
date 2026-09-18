// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking the configuration against 26 rules.", "done": "Check finished. Every conflict is listed with its file name and line number in the output panel.", "nothing_found": "Nothing here matched any of the 26 configuration rules.", "need_key": "This is a paid command. Paste your licence key to unlock the repository check, the findings export and the quick fix.", "key_ok": "Licence key accepted. The repository check, the findings export and the quick fix are unlocked on this machine.", "key_bad": "That licence key was not accepted. Check for a missing character, or reply to your purchase receipt and we will send it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "export_report", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Formatter & Workspace Settings Pack — 8 Sets');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('workspace-settings-pack-audit').get('min_severity')
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
const RULES = [{"pattern": ":\\s*\"(?:[A-Za-z]:[\\\\/]|/Users/|/home/)", "flags": "", "message": "This value is an absolute path from one machine. Everyone else who clones the repository gets a path that does not exist. Use ${workspaceFolder} or an environment variable."}, {"pattern": "\"files\\.eol\"\\s*:\\s*\"\\\\r\\\\n\"", "flags": "", "message": "files.eol is pinned to CRLF. On a macOS or Linux checkout every line of every touched file then shows as changed.", "fix": "  \"files.eol\": \"\\n\","}, {"pattern": "\"editor\\.insertSpaces\"\\s*:\\s*false", "flags": "", "message": "This asks for tabs. If .editorconfig says indent_style = space, the two disagree and the file re-indents every time someone else saves it."}, {"pattern": "\"editor\\.tabSize\"\\s*:\\s*(?!2\\b|4\\b)\\d+", "flags": "", "message": "An unusual tab size. It must match indent_size in .editorconfig and tabWidth in .prettierrc, or the three tools fight over the same file."}, {"pattern": "\"editor\\.autoIndent\"\\s*:\\s*(?:true|false)", "flags": "", "message": "editor.autoIndent takes a string, not a boolean. A boolean here is ignored and the editor silently keeps its default.", "fix": "  \"editor.autoIndent\": \"full\","}, {"pattern": "\"editor\\.renderWhitespace\"\\s*:\\s*(?:true|false)", "flags": "", "message": "editor.renderWhitespace takes a string, not a boolean. A boolean here is ignored.", "fix": "  \"editor.renderWhitespace\": \"boundary\","}, {"pattern": "\"files\\.autoSave\"\\s*:\\s*(?:true|false)", "flags": "", "message": "files.autoSave takes a string, not a boolean. A boolean here is ignored and nothing autosaves.", "fix": "  \"files.autoSave\": \"onFocusChange\","}, {"pattern": "\"editor\\.wordWrap\"\\s*:\\s*(?:true|false)", "flags": "", "message": "editor.wordWrap takes a string, not a boolean. A boolean here is ignored and long lines keep scrolling sideways.", "fix": "  \"editor.wordWrap\": \"on\","}, {"pattern": ",\\s*[}\\]]", "flags": "", "message": "A trailing comma. .vscode files are parsed as JSONC and tolerate it, but .prettierrc, package.json and tsconfig consumers are strict JSON and fail to parse."}, {"pattern": "\"prettier\\.[a-zA-Z]+\"\\s*:", "flags": "", "message": "A Prettier option set in editor settings only applies inside this editor. Put it in .prettierrc so the command line and the pipeline format the same way."}, {"pattern": "\"printWidth\"\\s*:\\s*\\d{3,}", "flags": "", "message": "printWidth is three digits or more. Prettier's published default is 80, and a wide value makes side-by-side review diffs wrap."}, {"pattern": "^\\s*indent_size\\s*=\\s*(?!2\\s*$)(?!4\\s*$)\\d+", "flags": "im", "message": "This indent size matches neither of the two values the rest of the toolchain assumes. Whatever you choose, editor.tabSize and tabWidth must carry the same number."}, {"pattern": "^\\s*insert_final_newline\\s*=\\s*false", "flags": "im", "message": "Files then end without a newline. Every tool that adds one produces a one-line diff on a file nobody edited.", "fix": "insert_final_newline = true"}, {"pattern": "^\\s*trim_trailing_whitespace\\s*=\\s*false", "flags": "im", "message": "Trailing spaces survive. The next person whose editor trims them commits a diff on every line they touched.", "fix": "trim_trailing_whitespace = true"}, {"pattern": "^\\s*root\\s*=\\s*false", "flags": "im", "message": "root = false means .editorconfig files in parent folders keep overriding this one, including any file in your home directory.", "fix": "root = true"}, {"pattern": "\"command\"\\s*:\\s*\"[^\"]*\\.(?:exe|cmd|bat)\"", "flags": "i", "message": "This task command only runs on Windows. A teammate on macOS or Linux gets a task that fails before it starts."}, {"pattern": "\"version\"\\s*:\\s*\"0\\.1\\.0\"", "flags": "", "message": "This is the retired task schema. Problem matchers, groups and dependsOn all behave differently from the current one.", "fix": "  \"version\": \"2.0.0\","}, {"pattern": "\"program\"\\s*:\\s*\"(?!\\$\\{workspaceFolder\\})[^\"]+\"", "flags": "", "message": "A launch path that does not start with ${workspaceFolder} depends on where the folder happens to be opened from. Debugging breaks for everyone else."}, {"pattern": "\"recommendations\"\\s*:\\s*\\[\\s*\\]", "flags": "", "message": "The recommendations list is empty, so a new teammate opens the repository and is offered nothing. This is the one file that onboards them."}, {"pattern": "\"(?:editor\\.background|editor\\.foreground|activityBar\\.background|statusBar\\.background)\"\\s*:\\s*\"(?!#)[^\"]*\"", "flags": "", "message": "A colour customisation must be a hex string beginning with #. Anything else is dropped and the theme colour stays as it was."}, {"pattern": "\"workbench\\.colorTheme\"\\s*:", "flags": "", "message": "A theme pinned in committed workspace settings overrides the theme every teammate chose for themselves, on every repository they open."}, {"pattern": "@tailwind\\s+(?:base|components|utilities)", "flags": "", "message": "The built-in CSS language service does not know the @tailwind directive and marks it as an unknown at-rule. Set css.lint.unknownAtRules to ignore in workspace settings, or this file shows a false error forever."}, {"pattern": "\"key\"\\s*:\\s*\"(?:f1|ctrl\\+shift\\+p|cmd\\+shift\\+p)\"", "flags": "i", "message": "This rebinds the command palette. Anyone who inherits this keybindings file loses the one shortcut they use to find everything else."}, {"pattern": "\"C_Cpp\\.intelliSenseEngine\"\\s*:\\s*\"Tag Parser\"", "flags": "", "message": "Tag Parser mode gives fuzzy, name-only results. Go to Definition then lands on the wrong overload in a large C or C++ tree."}, {"pattern": "\"java\\.home\"\\s*:", "flags": "", "message": "java.home was replaced by java.jdt.ls.java.home and java.configuration.runtimes. Set here, it is ignored and the language server picks whatever JDK it finds."}, {"pattern": "\"editor\\.defaultFormatter\"\\s*:\\s*\"[^\".]*\"", "flags": "", "message": "A default formatter must be an extension identifier in publisher.name form. A bare word matches nothing, so format on save quietly does nothing."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('workspace-settings-pack-audit');
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

const SNIPPETS = {"prettierrc_base": ["{", "\t\"printWidth\": ${1:100},", "\t\"tabWidth\": ${2:2},", "\t\"useTabs\": false,", "\t\"semi\": true,", "\t\"singleQuote\": ${3:true},", "\t\"trailingComma\": \"all\",", "\t\"bracketSpacing\": true,", "\t\"arrowParens\": \"always\",", "\t\"endOfLine\": \"lf\"", "}"], "prettierrc_overrides": ["\"overrides\": [", "\t{", "\t\t\"files\": \"*.md\",", "\t\t\"options\": { \"proseWrap\": \"preserve\", \"tabWidth\": 2 }", "\t},", "\t{", "\t\t\"files\": [\"*.json\", \"*.jsonc\"],", "\t\t\"options\": { \"tabWidth\": 2, \"trailingComma\": \"none\" }", "\t},", "\t{", "\t\t\"files\": [\"*.yml\", \"*.yaml\"],", "\t\t\"options\": { \"singleQuote\": false }", "\t}", "]"], "editorconfig_root": ["root = true", "", "[*]", "charset = utf-8", "end_of_line = lf", "indent_style = space", "indent_size = ${1:2}", "insert_final_newline = true", "trim_trailing_whitespace = true", "max_line_length = ${2:100}", "", "[*.{md,markdown}]", "trim_trailing_whitespace = false", "", "[*.{cs,java}]", "indent_size = 4", "", "[Makefile]", "indent_style = tab"], "settings_format_on_save": ["\"editor.formatOnSave\": true,", "\"editor.defaultFormatter\": \"esbenp.prettier-vscode\",", "\"editor.codeActionsOnSave\": {", "\t\"source.organizeImports\": \"explicit\"", "},", "\"editor.formatOnSaveMode\": \"file\",", "\"files.trimTrailingWhitespace\": true,", "\"files.insertFinalNewline\": true,", "\"files.eol\": \"\\n\""], "prettierignore_block": ["# generated output", "dist/", "build/", "out/", "coverage/", "", "# vendored or machine-written", "package-lock.json", "pnpm-lock.yaml", "*.min.js", "*.min.css"], "color_customizations_theme_scoped": ["\"workbench.colorCustomizations\": {", "\t\"[${1:Default Dark Modern}]\": {", "\t\t\"editor.background\": \"#${2:11161d}\",", "\t\t\"sideBar.background\": \"#${3:0d1117}\",", "\t\t\"statusBar.background\": \"#${4:161b22}\",", "\t\t\"editor.lineHighlightBackground\": \"#1a2130\",", "\t\t\"editorLineNumber.activeForeground\": \"#7d8fb3\"", "\t}", "}"], "token_color_customizations": ["\"editor.tokenColorCustomizations\": {", "\t\"[${1:Default Dark Modern}]\": {", "\t\t\"comments\": \"#6b7a90\",", "\t\t\"textMateRules\": [", "\t\t\t{", "\t\t\t\t\"scope\": [\"comment\", \"punctuation.definition.comment\"],", "\t\t\t\t\"settings\": { \"fontStyle\": \"italic\" }", "\t\t\t},", "\t\t\t{", "\t\t\t\t\"scope\": [\"string.quoted\", \"string.template\"],", "\t\t\t\t\"settings\": { \"foreground\": \"#a5d6a7\" }", "\t\t\t}", "\t\t]", "\t}", "}"], "semantic_token_colors": ["\"editor.semanticHighlighting.enabled\": true,", "\"editor.semanticTokenColorCustomizations\": {", "\t\"[${1:Default Dark Modern}]\": {", "\t\t\"enabled\": true,", "\t\t\"rules\": {", "\t\t\t\"parameter\": { \"fontStyle\": \"italic\" },", "\t\t\t\"property.readonly\": { \"foreground\": \"#c9a2ff\" },", "\t\t\t\"variable.defaultLibrary\": { \"foreground\": \"#7fd1e0\" }", "\t\t}", "\t}", "}"], "editor_readability_settings": ["\"editor.fontFamily\": \"${1:Cascadia Code}, Menlo, Consolas, monospace\",", "\"editor.fontLigatures\": ${2:true},", "\"editor.fontSize\": ${3:13},", "\"editor.lineHeight\": 1.6,", "\"editor.bracketPairColorization.enabled\": true,", "\"editor.guides.bracketPairs\": \"active\",", "\"editor.renderWhitespace\": \"boundary\",", "\"editor.rulers\": [${4:100}]"], "tailwind_vscode_settings": ["\"css.lint.unknownAtRules\": \"ignore\",", "\"scss.lint.unknownAtRules\": \"ignore\",", "\"files.associations\": {", "\t\"*.css\": \"tailwindcss\"", "},", "\"editor.quickSuggestions\": {", "\t\"strings\": \"on\"", "},", "\"tailwindCSS.classAttributes\": [\"class\", \"className\", \"ngClass\", \"classList\"],", "\"tailwindCSS.emmetCompletions\": true"], "tailwind_config_content": ["export default {", "\tcontent: [", "\t\t'./index.html',", "\t\t'./src/**/*.{js,ts,jsx,tsx,vue,svelte}',", "\t\t'./${1:components}/**/*.{razor,cshtml,html}'", "\t],", "\ttheme: {", "\t\textend: {", "\t\t\tcolors: { brand: { 500: '#${2:1d4ed8}' } },", "\t\t\tspacing: { '18': '4.5rem' }", "\t\t}", "\t},", "\tplugins: []", "};"], "tailwind_css_entry": ["@tailwind base;", "@tailwind components;", "@tailwind utilities;", "", "@layer components {", "\t.${1:btn} {", "\t\t@apply inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium;", "\t}", "", "\t.${1:btn}--primary {", "\t\t@apply bg-brand-500 text-white hover:bg-brand-500/90;", "\t}", "}"], "tailwind_prettier_plugin": ["{", "\t\"plugins\": [\"prettier-plugin-tailwindcss\"],", "\t\"tailwindConfig\": \"./${1:tailwind.config.js}\",", "\t\"tailwindFunctions\": [\"clsx\", \"cn\", \"cva\"],", "\t\"printWidth\": ${2:100}", "}"], "code_snippets_file": ["{", "\t\"${1:Component skeleton}\": {", "\t\t\"scope\": \"${2:javascript,typescript}\",", "\t\t\"prefix\": \"${3:comp}\",", "\t\t\"body\": [", "\t\t\t\"export function \\\\$1() {\",", "\t\t\t\"\\treturn null;\",", "\t\t\t\"}\"", "\t\t],", "\t\t\"description\": \"${4:What this inserts}\"", "\t}", "}"], "settings_sync_ignore": ["\"settingsSync.ignoredSettings\": [", "\t\"editor.fontSize\",", "\t\"window.zoomLevel\",", "\t\"terminal.integrated.env.windows\",", "\t\"-editor.fontFamily\"", "],", "\"settingsSync.ignoredExtensions\": [", "\t\"${1:ms-vscode-remote.remote-wsl}\"", "]"], "profile_extensions_json": ["{", "\t\"recommendations\": [", "\t\t\"esbenp.prettier-vscode\",", "\t\t\"editorconfig.editorconfig\",", "\t\t\"bradlc.vscode-tailwindcss\",", "\t\t\"${1:ms-dotnettools.csdevkit}\"", "\t],", "\t\"unwantedRecommendations\": [", "\t\t\"${2:hookyqr.beautify}\"", "\t]", "}"], "gist_readme_index": ["## What each config file decides", "", "| File | Decides | Read by |", "| --- | --- | --- |", "| `.editorconfig` | indent style, size, final newline | every editor |", "| `.prettierrc` | line width, quotes, trailing commas | Prettier, in the editor and on the command line |", "| `.vscode/settings.json` | format on save, which formatter | this editor only |", "| `.vscode/extensions.json` | what a new teammate is offered | this editor only |", "", "Run the config check before you commit any of these four."], "c_cpp_properties": ["{", "\t\"version\": 4,", "\t\"configurations\": [", "\t\t{", "\t\t\t\"name\": \"${1:Linux}\",", "\t\t\t\"includePath\": [", "\t\t\t\t\"\\\\${workspaceFolder}/**\",", "\t\t\t\t\"\\\\${workspaceFolder}/${2:include}\"", "\t\t\t],", "\t\t\t\"defines\": [\"_DEBUG\"],", "\t\t\t\"cStandard\": \"c17\",", "\t\t\t\"cppStandard\": \"c++20\",", "\t\t\t\"intelliSenseMode\": \"${3:linux-gcc-x64}\",", "\t\t\t\"compileCommands\": \"\\\\${workspaceFolder}/build/compile_commands.json\"", "\t\t}", "\t]", "}"], "cpp_tasks_build": ["{", "\t\"label\": \"${1:build}\",", "\t\"type\": \"shell\",", "\t\"command\": \"g++\",", "\t\"args\": [\"-g\", \"-std=c++20\", \"-Wall\", \"-o\", \"\\\\${workspaceFolder}/build/${2:app}\", \"\\\\${file}\"],", "\t\"group\": { \"kind\": \"build\", \"isDefault\": true },", "\t\"problemMatcher\": [\"$gcc\"]", "}"], "cpp_launch_gdb": ["{", "\t\"name\": \"${1:Debug (gdb)}\",", "\t\"type\": \"cppdbg\",", "\t\"request\": \"launch\",", "\t\"program\": \"\\\\${workspaceFolder}/build/${2:app}\",", "\t\"args\": [],", "\t\"cwd\": \"\\\\${workspaceFolder}\",", "\t\"MIMode\": \"gdb\",", "\t\"preLaunchTask\": \"${3:build}\",", "\t\"setupCommands\": [", "\t\t{ \"description\": \"Pretty printing\", \"text\": \"-enable-pretty-printing\", \"ignoreFailures\": true }", "\t]", "}"], "cpp_settings_navigation": ["\"C_Cpp.intelliSenseEngine\": \"default\",", "\"C_Cpp.default.compileCommands\": \"\\\\${workspaceFolder}/build/compile_commands.json\",", "\"C_Cpp.workspaceParsingPriority\": \"highest\",", "\"C_Cpp.clang_format_fallbackStyle\": \"{ BasedOnStyle: LLVM, IndentWidth: 4, ColumnLimit: 100 }\",", "\"files.associations\": {", "\t\"*.h\": \"cpp\",", "\t\"*.inl\": \"cpp\"", "}"], "aspnet_launch_json": ["{", "\t\"name\": \"${1:Run web}\",", "\t\"type\": \"coreclr\",", "\t\"request\": \"launch\",", "\t\"preLaunchTask\": \"build\",", "\t\"program\": \"\\\\${workspaceFolder}/${2:src/Web}/bin/Debug/${3:net9.0}/${4:Web}.dll\",", "\t\"cwd\": \"\\\\${workspaceFolder}/${2:src/Web}\",", "\t\"serverReadyAction\": {", "\t\t\"action\": \"openExternally\",", "\t\t\"pattern\": \"\\\\\\\\bNow listening on:\\\\\\\\s+(https?://\\\\\\\\S+)\"", "\t},", "\t\"env\": { \"ASPNETCORE_ENVIRONMENT\": \"Development\" }", "}"], "aspnet_tasks_json": ["{", "\t\"label\": \"build\",", "\t\"command\": \"dotnet\",", "\t\"type\": \"process\",", "\t\"args\": [\"build\", \"\\\\${workspaceFolder}/${1:src/Web}/${2:Web.csproj}\", \"/property:GenerateFullPaths=true\", \"/consoleloggerparameters:NoSummary\"],", "\t\"group\": { \"kind\": \"build\", \"isDefault\": true },", "\t\"problemMatcher\": \"$msCompile\"", "}"], "aspnet_settings_workspace": ["\"files.exclude\": {", "\t\"**/bin\": true,", "\t\"**/obj\": true", "},", "\"search.exclude\": {", "\t\"**/bin\": true,", "\t\"**/obj\": true,", "\t\"**/*.min.js\": true", "},", "\"dotnet.defaultSolution\": \"${1:src/Solution.sln}\",", "\"[csharp]\": {", "\t\"editor.defaultFormatter\": \"ms-dotnettools.csharp\",", "\t\"editor.formatOnSave\": true", "}"], "aspnet_launchsettings": ["{", "\t\"profiles\": {", "\t\t\"${1:Web}\": {", "\t\t\t\"commandName\": \"Project\",", "\t\t\t\"dotnetRunMessages\": true,", "\t\t\t\"launchBrowser\": true,", "\t\t\t\"applicationUrl\": \"https://localhost:${2:7186};http://localhost:${3:5186}\",", "\t\t\t\"environmentVariables\": {", "\t\t\t\t\"ASPNETCORE_ENVIRONMENT\": \"Development\"", "\t\t\t}", "\t\t}", "\t}", "}"], "java_settings_workspace": ["\"java.configuration.runtimes\": [", "\t{ \"name\": \"JavaSE-${1:21}\", \"path\": \"\\\\${env:JAVA_HOME}\", \"default\": true }", "],", "\"java.format.settings.url\": \"\\\\${workspaceFolder}/${2:eclipse-formatter.xml}\",", "\"java.saveActions.organizeImports\": true,", "\"java.compile.nullAnalysis.mode\": \"automatic\",", "\"[java]\": {", "\t\"editor.tabSize\": 4,", "\t\"editor.formatOnSave\": true", "}"], "mp_config_properties": ["# names only; values come from the environment", "mp.openapi.extensions.smallrye.info.title=${1:Orders API}", "mp.openapi.extensions.smallrye.info.version=${2:1.0.0}", "mp.jwt.verify.issuer=\\\\${JWT_ISSUER}", "${3:orders}.api.url=\\\\${ORDERS_API_URL}", "quarkus.http.port=${4:8080}"], "java_tasks_maven": ["{", "\t\"label\": \"${1:package}\",", "\t\"type\": \"shell\",", "\t\"command\": \"./mvnw\",", "\t\"args\": [\"-B\", \"clean\", \"package\", \"-DskipTests=${2:false}\"],", "\t\"options\": { \"cwd\": \"\\\\${workspaceFolder}\" },", "\t\"group\": { \"kind\": \"build\", \"isDefault\": true },", "\t\"problemMatcher\": []", "}"], "java_launch_quarkus": ["{", "\t\"name\": \"${1:Attach to running service}\",", "\t\"type\": \"java\",", "\t\"request\": \"attach\",", "\t\"hostName\": \"localhost\",", "\t\"port\": ${2:5005},", "\t\"projectName\": \"${3:orders-service}\"", "}"], "keybindings_toggle_wordwrap": ["{", "\t\"key\": \"alt+z\",", "\t\"command\": \"editor.action.toggleWordWrap\",", "\t\"when\": \"editorTextFocus\"", "}"], "keybindings_toggle_zen": ["{", "\t\"key\": \"ctrl+alt+z\",", "\t\"command\": \"workbench.action.toggleZenMode\"", "},", "{", "\t\"key\": \"ctrl+alt+b\",", "\t\"command\": \"workbench.action.toggleSidebarVisibility\"", "},", "{", "\t\"key\": \"ctrl+alt+j\",", "\t\"command\": \"workbench.action.togglePanel\"", "}"], "keybindings_task_run": ["{", "\t\"key\": \"ctrl+alt+t\",", "\t\"command\": \"workbench.action.tasks.runTask\",", "\t\"args\": \"${1:build}\"", "}"], "keybindings_when_clauses": ["{", "\t\"key\": \"ctrl+enter\",", "\t\"command\": \"${1:workbench.action.debug.start}\",", "\t\"when\": \"editorLangId == ${2:csharp} && !inDebugMode\"", "},", "{", "\t\"key\": \"ctrl+enter\",", "\t\"command\": \"${3:jupyter.runcell}\",", "\t\"when\": \"notebookEditorFocused\"", "}"], "settings_workspace_starter": ["{", "\t\"editor.formatOnSave\": true,", "\t\"editor.defaultFormatter\": \"esbenp.prettier-vscode\",", "\t\"editor.tabSize\": ${1:2},", "\t\"editor.insertSpaces\": true,", "\t\"editor.rulers\": [${2:100}],", "\t\"files.eol\": \"\\n\",", "\t\"files.trimTrailingWhitespace\": true,", "\t\"files.insertFinalNewline\": true,", "\t\"files.exclude\": { \"**/.git\": true, \"**/node_modules\": true },", "\t\"search.useIgnoreFiles\": true", "}"]};

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
  const _c = vscode.workspace.getConfiguration('workspace-settings-pack-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('workspace-settings-pack-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('workspace-settings-pack-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'workspace-settings-pack-audit-report.' + pick.toLowerCase());
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
  try { lic.pullFeed(ctx, "workspace-settings-pack-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('workspace-settings-pack-audit.audit_file', runCurrent);
  reg('workspace-settings-pack-audit.audit_selection', runSelection);
  reg('workspace-settings-pack-audit.insert_snippet', insertSnippet);
  reg('workspace-settings-pack-audit.list_rules', listRules);
  reg('workspace-settings-pack-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('workspace-settings-pack-audit.export_report', function () { return exportReport(ctx); });
  reg('workspace-settings-pack-audit.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('workspace-settings-pack-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
