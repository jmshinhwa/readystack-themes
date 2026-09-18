// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking your .vscode configuration", "done": "Check finished. Every finding is listed above with its file and line.", "nothing_found": "No configuration problems found in this file.", "need_key": "This is a paid command. Enter your licence key to continue.", "key_ok": "Licence key accepted. The paid commands are unlocked on this machine.", "key_bad": "That licence key was not accepted. Check for a stray space and paste it again.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "export_report", "custom_rules"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('GNU Global C/C++ .vscode Config Pack');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('gnu-global-cpp-vscode-config-pack').get('min_severity')
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
const RULES = [{"pattern": "\\$\\{workspaceRoot\\}", "flags": "i", "message": "${workspaceRoot} is the deprecated name. Newer VS Code releases resolve it inconsistently across tasks and launch configs, so the path can come out empty and the task runs in the wrong folder. Use ${workspaceFolder}.", "fix": "${workspaceFolder}"}, {"pattern": "\"/(home|Users)/[^\"]+\"", "flags": "", "message": "An absolute path from your own machine. Every teammate who clones this repository gets a path that does not exist, and the setting is ignored without an error. Use ${workspaceFolder} for repo paths or ${userHome} for personal ones."}, {"pattern": "[A-Za-z]:\\\\[^\\\\\"]", "flags": "", "message": "A single backslash in a Windows path is an invalid JSON escape. This file will not parse and every setting in it is dropped. Double the backslashes or use forward slashes, which VS Code accepts on Windows."}, {"pattern": ",\\s*[}\\]]", "flags": "", "message": "Trailing comma. tasks.json and settings.json tolerate it, but package.json, .eslintrc.json and any tool reading this with a strict JSON parser will fail on this line."}, {"pattern": "\"[^\"]*[Tt]oken\"\\s*:\\s*\"gh[pousr]_", "flags": "", "message": "A GitHub token is written into a file that lives in the repository. The moment this is pushed the token is public; GitHub revokes leaked tokens automatically and your gist and repo access stops. Move it to the VS Code secret storage or an environment variable."}, {"pattern": "\"[^\"]*([Ss]ecret|[Pp]assword|apiKey|api_key)\"\\s*:\\s*\"[^\"$][^\"]{7,}\"", "flags": "", "message": "A literal credential in a committed workspace file. Reference an environment variable such as ${env:MY_SECRET} instead of the value itself."}, {"pattern": "\"version\"\\s*:\\s*\"0\\.1\\.0\"", "flags": "", "message": "This is the legacy tasks.json schema. Task groups, presentation options and background matchers are all ignored under 0.1.0. The current schema is 2.0.0.", "fix": "\"version\": \"2.0.0\""}, {"pattern": "\"[A-Za-z_.]*[Pp]ath\"\\s*:\\s*\"~/", "flags": "", "message": "VS Code does not expand a leading tilde in JSON configuration. The path resolves literally to a folder named ~ , so the setting silently does nothing. Use ${userHome}/ instead."}, {"pattern": "\"console\"\\s*:\\s*\"internalConsole\"", "flags": "", "message": "The internal debug console cannot take keyboard input. Your program blocks forever on the first read from stdin and looks hung. Use integratedTerminal for anything that reads input.", "fix": "\"console\": \"integratedTerminal\""}, {"pattern": "\"intelliSenseMode\"\\s*:\\s*\"(msvc|gcc|clang)-(x64|x86|arm64|arm)\"", "flags": "", "message": "This is the pre-platform form of intelliSenseMode. The current values carry the platform first: windows-msvc-x64, linux-gcc-x64, macos-clang-arm64. The old value falls back to a guess and your defines and include search can differ from the real compiler."}, {"pattern": "\"cStandard\"\\s*:\\s*\"(c\\+\\+|gnu\\+\\+)", "flags": "", "message": "A C++ standard has been put in cStandard. C and C++ standards are separate keys: cStandard takes c11, c17, c23; cppStandard takes c++17, c++20, c++23. IntelliSense will parse your headers under the wrong language rules."}, {"pattern": "\"compileCommands\"\\s*:\\s*\"[^$\"]", "flags": "", "message": "compileCommands is given without ${workspaceFolder}. When the path cannot be resolved the C/C++ extension does not warn — it falls back to includePath guessing and you get red squiggles across files that compile fine. Write ${workspaceFolder}/build/compile_commands.json."}, {"pattern": "\"css\\.lint\\.unknownAtRules\"\\s*:\\s*\"(warning|error)\"", "flags": "", "message": "With this on, @tailwind and @apply are reported as unknown at-rules on every stylesheet you open, and the real CSS problems are buried in the noise. Set it to ignore.", "fix": "\"css.lint.unknownAtRules\": \"ignore\""}, {"pattern": "\"editor\\.defaultFormatter\"\\s*:\\s*\"[^\".]+\"", "flags": "", "message": "An extension id is always publisher.extension, with a dot. This value can never match an installed extension, so format-on-save does nothing at all and no message is shown. Example of the correct shape: esbenp.prettier-vscode."}, {"pattern": "\"(eslint\\.autoFixOnSave|prettier\\.eslintIntegration|prettier\\.tslintIntegration)\"", "flags": "", "message": "This setting was removed from the extension and is now read by nothing. Your files stop being fixed on save and the setting stays in the file looking correct. Use editor.codeActionsOnSave with source.fixAll.eslint instead."}, {"pattern": "\"source\\.fixAll(\\.[A-Za-z]+)?\"\\s*:\\s*(true|false)", "flags": "", "message": "The boolean form of a code action on save is deprecated. Use the string form — \"explicit\" to run only on an explicit save, \"always\" to include auto-saves, \"never\" to disable."}, {"pattern": "\"files\\.autoSave\"\\s*:\\s*\"afterDelay\"", "flags": "", "message": "afterDelay together with format-on-save reformats the file while you are still typing, which moves the cursor and can trigger a save-fix loop. onFocusChange gives the same safety without the interruption.", "fix": "\"files.autoSave\": \"onFocusChange\""}, {"pattern": "\"workbench\\.colorTheme\"\\s*:", "flags": "", "message": "A theme set in .vscode/settings.json is forced on everyone who opens this repository, overriding their own choice with no warning. Keep the theme in your User settings and put only workbench.colorCustomizations here."}, {"pattern": "\"key\"\\s*:\\s*\"cmd\\+", "flags": "i", "message": "cmd+ only binds on macOS. Teammates on Windows and Linux get no shortcut and nothing tells them why. Bind ctrl+ as well, or move the mac-only binding into your personal keybindings.json."}, {"pattern": "\"java\\.home\"\\s*:", "flags": "", "message": "java.home is deprecated. The language server now reads java.jdt.ls.java.home for its own runtime and java.configuration.runtimes for the project JDKs; this key alone leaves your MicroProfile project compiling against whatever JDK is first on PATH."}, {"pattern": "\"ASPNETCORE_ENVIRONMENT\"\\s*:\\s*\"Production\"", "flags": "", "message": "This debug configuration launches with the Production environment. The developer exception page is off, so an unhandled error shows a blank 500 instead of the stack trace, and appsettings.Production.json values are loaded on your machine. Use Development or Staging here."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('gnu-global-cpp-vscode-config-pack');
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

const SNIPPETS = {"gtags_build": ["{", "  \"label\": \"gtags: build index\",", "  \"type\": \"shell\",", "  \"command\": \"gtags\",", "  \"args\": [\"--statistics\"],", "  \"options\": { \"cwd\": \"${1:.}\" },", "  \"problemMatcher\": [],", "  \"group\": \"build\"", "}"], "gtags_exclude": ["\"files.watcherExclude\": {", "  \"**/GTAGS\": true,", "  \"**/GRTAGS\": true,", "  \"**/GPATH\": true,", "  \"**/${1:build}/**\": true", "},", "\"search.exclude\": {", "  \"**/GTAGS\": true,", "  \"**/GRTAGS\": true,", "  \"**/GPATH\": true", "}"], "cpp_props_gcc": ["{", "  \"name\": \"Linux\",", "  \"includePath\": [\"${1:src}/**\", \"${2:include}/**\"],", "  \"defines\": [\"${3:_GNU_SOURCE}\"],", "  \"compilerPath\": \"/usr/bin/${4:gcc}\",", "  \"cStandard\": \"c17\",", "  \"cppStandard\": \"c++17\",", "  \"intelliSenseMode\": \"linux-gcc-x64\"", "}"], "cpp_props_msvc": ["{", "  \"name\": \"Win32\",", "  \"includePath\": [\"${1:src}/**\"],", "  \"defines\": [\"_DEBUG\", \"UNICODE\", \"_UNICODE\"],", "  \"cStandard\": \"c17\",", "  \"cppStandard\": \"c++17\",", "  \"intelliSenseMode\": \"windows-msvc-x64\"", "}"], "cpp_compile_commands": ["\"C_Cpp.default.compileCommands\": \"\\${workspaceFolder}/${1:build}/compile_commands.json\",", "\"C_Cpp.default.browse.path\": [\"\\${workspaceFolder}/${2:src}\"],", "\"C_Cpp.default.browse.limitSymbolsToIncludedHeaders\": false"], "cpp_launch_gdb": ["{", "  \"name\": \"C/C++: debug (gdb)\",", "  \"type\": \"cppdbg\",", "  \"request\": \"launch\",", "  \"program\": \"\\${workspaceFolder}/${1:build}/${2:app}\",", "  \"args\": [],", "  \"cwd\": \"\\${workspaceFolder}\",", "  \"MIMode\": \"gdb\",", "  \"console\": \"integratedTerminal\",", "  \"preLaunchTask\": \"${3:build}\"", "}"], "gist_workspace": ["{", "  \"folders\": [", "    { \"name\": \"${1:notes}\", \"path\": \"${2:./notes}\" }", "  ],", "  \"settings\": {", "    \"files.autoSave\": \"onFocusChange\",", "    \"editor.wordWrap\": \"on\"", "  }", "}"], "gist_md_settings": ["\"[markdown]\": {", "  \"editor.wordWrap\": \"on\",", "  \"editor.quickSuggestions\": { \"comments\": \"off\", \"strings\": \"off\", \"other\": \"off\" },", "  \"editor.formatOnSave\": ${1:false}", "}"], "gist_autosave": ["\"files.autoSave\": \"onFocusChange\",", "\"workbench.editor.enablePreview\": false,", "\"explorer.confirmDelete\": ${1:true}"], "gist_exclude": ["\"files.exclude\": {", "  \"**/.DS_Store\": true,", "  \"**/Thumbs.db\": true,", "  \"**/${1:.scratch}\": true", "}"], "gist_md_preview": ["\"markdown.preview.fontSize\": ${1:14},", "\"markdown.preview.lineHeight\": ${2:1.6},", "\"markdown.preview.breaks\": true,", "\"markdown.updateLinksOnFileMove.enabled\": \"always\""], "fmt_default": ["\"editor.formatOnSave\": true,", "\"editor.defaultFormatter\": \"${1:esbenp.prettier-vscode}\",", "\"editor.formatOnPaste\": false"], "fmt_per_language": ["\"[typescript]\": { \"editor.defaultFormatter\": \"${1:esbenp.prettier-vscode}\" },", "\"[json]\": { \"editor.defaultFormatter\": \"vscode.json-language-features\" },", "\"[jsonc]\": { \"editor.defaultFormatter\": \"vscode.json-language-features\" },", "\"[cpp]\": { \"editor.defaultFormatter\": \"ms-vscode.cpptools\" }"], "fmt_codeactions": ["\"editor.codeActionsOnSave\": {", "  \"source.fixAll\": \"explicit\",", "  \"source.organizeImports\": \"${1:explicit}\"", "}"], "fmt_save_mode": ["\"editor.formatOnSave\": true,", "\"editor.formatOnSaveMode\": \"${1:modifications}\",", "\"files.autoSave\": \"onFocusChange\""], "fmt_cpp_clang": ["\"C_Cpp.formatting\": \"clangFormat\",", "\"C_Cpp.clang_format_style\": \"${1:file}\",", "\"C_Cpp.clang_format_fallbackStyle\": \"${2:LLVM}\",", "\"[cpp]\": { \"editor.formatOnSave\": true },", "\"[c]\": { \"editor.formatOnSave\": true }"], "fmt_whitespace": ["\"files.trimTrailingWhitespace\": true,", "\"files.insertFinalNewline\": true,", "\"files.trimFinalNewlines\": true,", "\"files.eol\": \"${1:\\n}\""], "theme_scoped": ["\"workbench.colorCustomizations\": {", "  \"[Default Dark+]\": {", "    \"editor.background\": \"${1:#12161c}\",", "    \"sideBar.background\": \"${2:#0f1319}\",", "    \"editorGroupHeader.tabsBackground\": \"${3:#0f1319}\"", "  }", "}"], "theme_tokens": ["\"editor.tokenColorCustomizations\": {", "  \"[Default Dark+]\": {", "    \"comments\": \"${1:#5c6773}\",", "    \"strings\": \"${2:#a3be8c}\",", "    \"numbers\": \"${3:#d08770}\"", "  }", "}"], "theme_cpp_tokens": ["\"editor.tokenColorCustomizations\": {", "  \"[Default Dark+]\": {", "    \"textMateRules\": [", "      {", "        \"scope\": [\"entity.name.function\"],", "        \"settings\": { \"foreground\": \"${1:#82aaff}\" }", "      },", "      {", "        \"scope\": [\"storage.type\", \"${2:entity.name.type}\"],", "        \"settings\": { \"foreground\": \"${3:#c3a6ff}\" }", "      }", "    ]", "  }", "}"], "theme_terminal": ["\"workbench.colorCustomizations\": {", "  \"[Default Dark+]\": {", "    \"terminal.background\": \"${1:#0f1319}\",", "    \"terminal.foreground\": \"${2:#d8dee9}\",", "    \"terminalCursor.foreground\": \"${3:#88c0d0}\",", "    \"terminal.ansiRed\": \"${4:#bf616a}\",", "    \"terminal.ansiGreen\": \"${5:#a3be8c}\"", "  }", "}"], "theme_brackets": ["\"editor.bracketPairColorization.enabled\": true,", "\"editor.guides.bracketPairs\": \"${1:active}\",", "\"workbench.colorCustomizations\": {", "  \"[Default Dark+]\": {", "    \"editorBracketHighlight.foreground1\": \"${2:#e5c07b}\",", "    \"editorBracketHighlight.foreground2\": \"${3:#c678dd}\",", "    \"editorBracketHighlight.foreground3\": \"${4:#56b6c2}\"", "  }", "}"], "theme_statusbar": ["\"workbench.colorCustomizations\": {", "  \"[Default Dark+]\": {", "    \"statusBar.background\": \"${1:#1f2430}\",", "    \"statusBar.foreground\": \"${2:#cbccc6}\",", "    \"statusBar.debuggingBackground\": \"${3:#bf616a}\",", "    \"statusBarItem.remoteBackground\": \"${4:#3b4252}\"", "  }", "}"], "tw_at_rules": ["\"css.lint.unknownAtRules\": \"ignore\",", "\"scss.lint.unknownAtRules\": \"ignore\",", "\"less.lint.unknownAtRules\": \"ignore\""], "tw_associations": ["\"files.associations\": {", "  \"*.css\": \"tailwindcss\",", "  \"${1:*.pcss}\": \"tailwindcss\"", "}"], "tw_emmet": ["\"emmet.includeLanguages\": {", "  \"javascript\": \"javascriptreact\",", "  \"${1:vue-html}\": \"html\"", "},", "\"emmet.triggerExpansionOnTab\": true"], "tw_languages": ["\"tailwindCSS.includeLanguages\": {", "  \"${1:plaintext}\": \"html\",", "  \"${2:erb}\": \"html\"", "},", "\"tailwindCSS.emmetCompletions\": true"], "tw_suggestions": ["\"editor.quickSuggestions\": { \"strings\": \"on\" },", "\"[html]\": { \"editor.suggest.insertMode\": \"${1:replace}\" },", "\"[css]\": { \"editor.suggest.showWords\": false }"], "tw_file_nesting": ["\"explorer.fileNesting.enabled\": true,", "\"explorer.fileNesting.patterns\": {", "  \"tailwind.config.*\": \"postcss.config.*, ${1:vite.config.*}\",", "  \"package.json\": \"package-lock.json, ${2:pnpm-lock.yaml}\"", "}"], "net_launch_dev": ["{", "  \"name\": \".NET: run (Development)\",", "  \"type\": \"coreclr\",", "  \"request\": \"launch\",", "  \"preLaunchTask\": \"build\",", "  \"program\": \"\\${workspaceFolder}/${1:src/Web}/bin/Debug/${2:net8.0}/${3:Web}.dll\",", "  \"cwd\": \"\\${workspaceFolder}/${1:src/Web}\",", "  \"env\": { \"ASPNETCORE_ENVIRONMENT\": \"Development\" },", "  \"console\": \"integratedTerminal\"", "}"], "net_launch_staging": ["{", "  \"name\": \".NET: run (Staging)\",", "  \"type\": \"coreclr\",", "  \"request\": \"launch\",", "  \"preLaunchTask\": \"build\",", "  \"program\": \"\\${workspaceFolder}/${1:src/Web}/bin/Debug/${2:net8.0}/${3:Web}.dll\",", "  \"cwd\": \"\\${workspaceFolder}/${1:src/Web}\",", "  \"env\": {", "    \"ASPNETCORE_ENVIRONMENT\": \"Staging\",", "    \"ASPNETCORE_URLS\": \"http://localhost:${4:5080}\"", "  },", "  \"console\": \"integratedTerminal\"", "}"], "net_attach": ["{", "  \"name\": \".NET: attach to process\",", "  \"type\": \"coreclr\",", "  \"request\": \"attach\",", "  \"processId\": \"\\${command:pickProcess}\"", "}"], "net_build_task": ["{", "  \"label\": \"build\",", "  \"command\": \"dotnet\",", "  \"type\": \"process\",", "  \"args\": [\"build\", \"${1:src/Web/Web.csproj}\", \"/property:GenerateFullPaths=true\", \"/consoleloggerparameters:NoSummary\"],", "  \"problemMatcher\": \"\\$msCompile\",", "  \"group\": { \"kind\": \"build\", \"isDefault\": true }", "}"], "net_watch_task": ["{", "  \"label\": \"watch\",", "  \"command\": \"dotnet\",", "  \"type\": \"process\",", "  \"args\": [\"watch\", \"run\", \"--project\", \"${1:src/Web/Web.csproj}\"],", "  \"problemMatcher\": \"\\$msCompile\",", "  \"isBackground\": true", "}"], "net_settings": ["\"dotnet.defaultSolution\": \"${1:App.sln}\",", "\"dotnet.server.useOmnisharp\": false,", "\"[csharp]\": { \"editor.defaultFormatter\": \"ms-dotnettools.csharp\" }"], "mp_runtimes": ["\"java.configuration.runtimes\": [", "  { \"name\": \"JavaSE-${1:17}\", \"path\": \"/usr/lib/jvm/${2:temurin-17}\", \"default\": true },", "  { \"name\": \"JavaSE-${3:21}\", \"path\": \"/usr/lib/jvm/${4:temurin-21}\" }", "]"], "mp_launch": ["{", "  \"name\": \"MicroProfile: run server\",", "  \"type\": \"java\",", "  \"request\": \"launch\",", "  \"mainClass\": \"${1:app.Main}\",", "  \"projectName\": \"${2:app}\",", "  \"console\": \"integratedTerminal\",", "  \"env\": { \"MP_CONFIG_PROFILE\": \"${3:dev}\" }", "}"], "mp_mvn_package": ["{", "  \"label\": \"mvn: package\",", "  \"type\": \"shell\",", "  \"command\": \"mvn\",", "  \"args\": [\"-q\", \"package\", \"-DskipTests=${1:false}\"],", "  \"problemMatcher\": [],", "  \"group\": { \"kind\": \"build\", \"isDefault\": true }", "}"], "mp_mvn_verify": ["{", "  \"label\": \"mvn: verify\",", "  \"type\": \"shell\",", "  \"command\": \"mvn\",", "  \"args\": [\"verify\", \"-Dmp.config.profile=${1:test}\"],", "  \"problemMatcher\": [],", "  \"group\": { \"kind\": \"test\", \"isDefault\": true }", "}"], "mp_java_format": ["\"java.format.enabled\": true,", "\"java.saveActions.organizeImports\": true,", "\"java.completion.importOrder\": [\"java\", \"javax\", \"jakarta\", \"${1:org}\", \"com\"],", "\"files.associations\": { \"microprofile-config.properties\": \"properties\" }"], "key_wordwrap": ["{", "  \"key\": \"${1:alt+z}\",", "  \"command\": \"editor.action.toggleWordWrap\",", "  \"when\": \"editorTextFocus\"", "}"], "key_minimap": ["{", "  \"key\": \"${1:ctrl+k ctrl+m}\",", "  \"command\": \"editor.action.toggleMinimap\"", "}"], "key_theme": ["{", "  \"key\": \"${1:ctrl+k ctrl+t}\",", "  \"command\": \"workbench.action.selectTheme\"", "}"], "key_run_task": ["{", "  \"key\": \"${1:ctrl+alt+g}\",", "  \"command\": \"workbench.action.tasks.runTask\",", "  \"args\": \"${2:gtags: build index}\"", "}"], "key_when_cpp": ["{", "  \"key\": \"${1:f12}\",", "  \"command\": \"${2:editor.action.revealDefinition}\",", "  \"when\": \"editorTextFocus && editorLangId == cpp\"", "}"]};

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
  const _c = vscode.workspace.getConfiguration('gnu-global-cpp-vscode-config-pack');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('gnu-global-cpp-vscode-config-pack').get('reportFormat')
    || vscode.workspace.getConfiguration('gnu-global-cpp-vscode-config-pack').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'gnu-global-cpp-vscode-config-pack-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function customRules(ctx) {
  if (!(await paidGate(ctx))) return;
  await vscode.commands.executeCommand('workbench.action.openSettings', 'gnu-global-cpp-vscode-config-pack');
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "gnu-global-cpp-vscode-config-pack").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('gnu-global-cpp-vscode-config-pack.audit_file', runCurrent);
  reg('gnu-global-cpp-vscode-config-pack.insert_snippet', insertSnippet);
  reg('gnu-global-cpp-vscode-config-pack.list_rules', listRules);
  reg('gnu-global-cpp-vscode-config-pack.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('gnu-global-cpp-vscode-config-pack.quick_fix', function () { return quickFix(ctx); });
  reg('gnu-global-cpp-vscode-config-pack.export_report', function () { return exportReport(ctx); });
  reg('gnu-global-cpp-vscode-config-pack.custom_rules', function () { return customRules(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('gnu-global-cpp-vscode-config-pack').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
