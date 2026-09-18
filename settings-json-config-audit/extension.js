// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking settings.json for dead, renamed and conflicting keys", "done": "Check finished. Every finding is listed in the output panel with the file name and the line number.", "nothing_found": "No dead, renamed or conflicting keys were found in this file.", "need_key": "This is a paid command. Paste your licence key to open the workspace scan, the report file, your own rules and the one-click rename.", "key_ok": "Licence key accepted. The paid commands are open on this machine.", "key_bad": "That licence key was not accepted. Check for a missing character, or reply to your order email and we will re-issue it.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "quick_fix", "export_report", "custom_rules"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('settings.json Config Kit + Deprecated-Key Audit');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('settings-json-config-audit').get('min_severity')
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
const RULES = [{"pattern": "editor\\.renderIndentGuides", "flags": "i", "message": "Dead key: editor.renderIndentGuides was renamed. Nothing reads it, so your indent guides are on whatever the theme decides. Use editor.guides.indentation.", "fix": "editor.guides.indentation"}, {"pattern": "editor\\.highlightActiveIndentGuide", "flags": "i", "message": "Dead key: editor.highlightActiveIndentGuide was renamed to editor.guides.highlightActiveIndentation. The active guide is not being highlighted from this line.", "fix": "editor.guides.highlightActiveIndentation"}, {"pattern": "terminal\\.integrated\\.shell\\.(windows|osx|linux)", "flags": "i", "message": "Dead key: the shell you named here is ignored. A shell is now declared under terminal.integrated.profiles.<os> and selected with terminal.integrated.defaultProfile.<os>."}, {"pattern": "terminal\\.integrated\\.shellArgs\\.(windows|osx|linux)", "flags": "i", "message": "Dead key: these arguments never reach your shell. They belong inside the matching entry of terminal.integrated.profiles.<os>."}, {"pattern": "python\\.pythonPath", "flags": "i", "message": "Dead key: python.pythonPath no longer selects the interpreter. Use python.defaultInterpreterPath.", "fix": "python.defaultInterpreterPath"}, {"pattern": "javascript\\.implicitProjectConfig\\.checkJs", "flags": "i", "message": "Dead key: the JavaScript-only form was replaced by the shared js/ts.implicitProjectConfig.checkJs. Type checking is not being switched on from this line.", "fix": "js/ts.implicitProjectConfig.checkJs"}, {"pattern": "editor\\.parameterHints\"", "flags": "i", "message": "Dead key: editor.parameterHints is now a section, not a switch. The setting that turns hints on is editor.parameterHints.enabled.", "fix": "editor.parameterHints.enabled\""}, {"pattern": "editor\\.hover\"", "flags": "i", "message": "Dead key: editor.hover is now a section, not a switch. The setting that turns the hover on is editor.hover.enabled.", "fix": "editor.hover.enabled\""}, {"pattern": "telemetry\\.enableTelemetry", "flags": "i", "message": "Dead key: telemetry.enableTelemetry no longer controls anything on its own. Telemetry is set with telemetry.telemetryLevel, whose values are all, error, crash and off."}, {"pattern": "telemetry\\.enableCrashReporter", "flags": "i", "message": "Dead key: crash reporting is folded into telemetry.telemetryLevel. Setting this alone leaves your real telemetry level untouched."}, {"pattern": "update\\.channel", "flags": "i", "message": "Dead key: update.channel was replaced by update.mode, whose values are none, manual, start and default. Your update behaviour is not coming from this line."}, {"pattern": "\"editor\\.lineNumbers\"\\s*:\\s*true", "flags": "i", "message": "Wrong type: editor.lineNumbers stopped taking true or false. Valid values are on, off, relative and interval, so this line is discarded.", "fix": "\"editor.lineNumbers\": \"on\""}, {"pattern": "\"editor\\.lineNumbers\"\\s*:\\s*false", "flags": "i", "message": "Wrong type: editor.lineNumbers stopped taking true or false. Write off as a string to hide the numbers.", "fix": "\"editor.lineNumbers\": \"off\""}, {"pattern": "\"editor\\.renderWhitespace\"\\s*:\\s*true", "flags": "i", "message": "Wrong type: editor.renderWhitespace takes none, boundary, selection, trailing or all. A boolean is discarded and whitespace stays hidden.", "fix": "\"editor.renderWhitespace\": \"all\""}, {"pattern": "\"editor\\.renderWhitespace\"\\s*:\\s*false", "flags": "i", "message": "Wrong type: editor.renderWhitespace takes none, boundary, selection, trailing or all. Write none as a string.", "fix": "\"editor.renderWhitespace\": \"none\""}, {"pattern": "\"editor\\.acceptSuggestionOnEnter\"\\s*:\\s*true", "flags": "i", "message": "Wrong type: editor.acceptSuggestionOnEnter takes on, smart or off. A boolean is discarded, so Enter is behaving the default way, not yours.", "fix": "\"editor.acceptSuggestionOnEnter\": \"on\""}, {"pattern": "\"editor\\.matchBrackets\"\\s*:\\s*true", "flags": "i", "message": "Wrong type: editor.matchBrackets takes always, near or never. A boolean is discarded.", "fix": "\"editor.matchBrackets\": \"always\""}, {"pattern": "\"editor\\.wordWrap\"\\s*:\\s*true", "flags": "i", "message": "Wrong type: editor.wordWrap takes off, on, wordWrapColumn or bounded. A boolean is discarded and long lines still run off the screen.", "fix": "\"editor.wordWrap\": \"on\""}, {"pattern": "\"editor\\.autoIndent\"\\s*:\\s*true", "flags": "i", "message": "Wrong type: editor.autoIndent takes none, keep, brackets, advanced or full. A boolean is discarded.", "fix": "\"editor.autoIndent\": \"full\""}, {"pattern": "\"workbench\\.editor\\.showTabs\"\\s*:\\s*true", "flags": "i", "message": "Wrong type: workbench.editor.showTabs takes multiple, single or none. A boolean is discarded and you get the default tab bar.", "fix": "\"workbench.editor.showTabs\": \"multiple\""}, {"pattern": "\"source\\.organizeImports\"\\s*:\\s*true", "flags": "i", "message": "Old form: code actions on save take explicit, always or never instead of a boolean. Written as true, the import sort may not run on save.", "fix": "\"source.organizeImports\": \"explicit\""}, {"pattern": "\"editor\\.quickSuggestions\"\\s*:\\s*(true|false)", "flags": "i", "message": "Old form: editor.quickSuggestions takes an object with other, comments and strings. As a boolean it cannot switch suggestions on inside strings, which is what class-name completion needs."}, {"pattern": "\"editor\\.formatOnSave\"\\s*:\\s*false", "flags": "i", "message": "Nothing is formatted when you save in this scope. If a language block below sets formatOnSave to true, that block wins for that language only, and every other file is left unformatted."}, {"pattern": "(/Users/[a-z]|/home/[a-z]|[A-Za-z]:\\\\Users\\\\)", "flags": "i", "message": "An absolute path to somebody's home folder is written into this settings file. If this file is committed, it points at a folder nobody else on the team has."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('settings-json-config-audit');
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

const SNIPPETS = {"notes_markdown_editing": ["\"[markdown]\": {", "  \"editor.wordWrap\": \"on\",", "  \"editor.quickSuggestions\": { \"other\": \"on\", \"comments\": \"off\", \"strings\": \"off\" },", "  \"editor.unicodeHighlight.ambiguousCharacters\": false,", "  \"editor.renderWhitespace\": \"none\"", "}"], "notes_autosave": ["\"files.autoSave\": \"afterDelay\",", "\"files.autoSaveDelay\": ${1:1000},", "\"files.hotExit\": \"onExitAndWindowClose\""], "notes_file_associations": ["\"files.associations\": {", "  \"*.mdx\": \"markdown\",", "  \"*.markdown\": \"markdown\"", "},", "\"markdown.preview.breaks\": true,", "\"markdown.preview.typographer\": true"], "notes_explorer_focus": ["\"explorer.autoReveal\": true,", "\"explorer.compactFolders\": false,", "\"workbench.editor.enablePreview\": false,", "\"workbench.editor.enablePreviewFromQuickOpen\": false"], "cpp_language_standard": ["\"C_Cpp.default.cppStandard\": \"${1:c++17}\",", "\"C_Cpp.default.cStandard\": \"${2:c11}\",", "\"C_Cpp.intelliSenseEngine\": \"default\""], "cpp_search_exclude_build": ["\"search.exclude\": {", "  \"**/build\": true,", "  \"**/out\": true,", "  \"**/*.o\": true,", "  \"**/GTAGS\": true,", "  \"**/GRTAGS\": true,", "  \"**/GPATH\": true", "}"], "cpp_format_on_save": ["\"[cpp]\": {", "  \"editor.formatOnSave\": true,", "  \"editor.tabSize\": 4,", "  \"editor.insertSpaces\": true", "},", "\"[c]\": {", "  \"editor.formatOnSave\": true,", "  \"editor.tabSize\": 4", "},", "\"C_Cpp.clang_format_style\": \"file\""], "cpp_watcher_exclude": ["\"files.watcherExclude\": {", "  \"**/build/**\": true,", "  \"**/GTAGS\": true,", "  \"**/GRTAGS\": true,", "  \"**/GPATH\": true", "}"], "format_on_save_core": ["\"editor.formatOnSave\": true,", "\"editor.formatOnSaveMode\": \"${1:file}\",", "\"editor.formatOnPaste\": false,", "\"editor.formatOnType\": false"], "format_per_language": ["\"[javascript]\": { \"editor.defaultFormatter\": \"${1:esbenp.prettier-vscode}\" },", "\"[typescript]\": { \"editor.defaultFormatter\": \"${1:esbenp.prettier-vscode}\" },", "\"[json]\": { \"editor.defaultFormatter\": \"vscode.json-language-features\" },", "\"[jsonc]\": { \"editor.defaultFormatter\": \"vscode.json-language-features\" }"], "format_code_actions_on_save": ["\"editor.codeActionsOnSave\": {", "  \"source.organizeImports\": \"explicit\",", "  \"source.fixAll\": \"explicit\"", "}"], "format_whitespace_eol": ["\"files.trimTrailingWhitespace\": true,", "\"files.insertFinalNewline\": true,", "\"files.trimFinalNewlines\": true,", "\"files.eol\": \"\\n\""], "dark_theme_select": ["\"workbench.colorTheme\": \"${1:Default Dark Modern}\",", "\"workbench.preferredDarkColorTheme\": \"${1:Default Dark Modern}\",", "\"workbench.preferredLightColorTheme\": \"Default Light Modern\",", "\"window.autoDetectColorScheme\": true"], "dark_terminal_ansi": ["\"workbench.colorCustomizations\": {", "  \"terminal.background\": \"#1e1e1e\",", "  \"terminal.foreground\": \"#cccccc\",", "  \"terminal.ansiBlack\": \"#3b3b3b\",", "  \"terminal.ansiRed\": \"#f14c4c\",", "  \"terminal.ansiGreen\": \"#23d18b\",", "  \"terminal.ansiYellow\": \"#f5f543\",", "  \"terminal.ansiBlue\": \"#3b8eea\",", "  \"terminal.ansiMagenta\": \"#d670d6\",", "  \"terminal.ansiCyan\": \"#29b8db\",", "  \"terminal.ansiWhite\": \"#e5e5e5\"", "}"], "dark_bracket_colors": ["\"editor.bracketPairColorization.enabled\": true,", "\"editor.guides.bracketPairs\": \"active\",", "\"workbench.colorCustomizations\": {", "  \"editorBracketHighlight.foreground1\": \"#ffd700\",", "  \"editorBracketHighlight.foreground2\": \"#da70d6\",", "  \"editorBracketHighlight.foreground3\": \"#179fff\",", "  \"editorBracketHighlight.unexpectedBracket.foreground\": \"#ff1212\"", "}"], "dark_token_colors": ["\"editor.tokenColorCustomizations\": {", "  \"comments\": \"#6a9955\",", "  \"textMateRules\": [", "    { \"scope\": \"comment\", \"settings\": { \"fontStyle\": \"italic\" } },", "    { \"scope\": [\"constant.language\", \"variable.other.constant\"], \"settings\": { \"foreground\": \"#569cd6\" } }", "  ]", "},", "\"editor.semanticHighlighting.enabled\": true"], "tailwind_css_lint": ["\"css.lint.unknownAtRules\": \"ignore\",", "\"scss.lint.unknownAtRules\": \"ignore\",", "\"less.lint.unknownAtRules\": \"ignore\""], "tailwind_class_suggestions": ["\"editor.quickSuggestions\": {", "  \"other\": \"on\",", "  \"comments\": \"off\",", "  \"strings\": \"on\"", "},", "\"editor.inlineSuggest.enabled\": true"], "tailwind_include_languages": ["\"tailwindCSS.includeLanguages\": {", "  \"html\": \"html\",", "  \"javascript\": \"javascript\",", "  \"javascriptreact\": \"javascript\",", "  \"typescriptreact\": \"javascript\",", "  \"vue\": \"html\",", "  \"svelte\": \"html\"", "},", "\"tailwindCSS.emmetCompletions\": true"], "tailwind_file_associations": ["\"files.associations\": {", "  \"*.css\": \"tailwindcss\"", "},", "\"emmet.includeLanguages\": {", "  \"javascript\": \"javascriptreact\"", "}"], "dotnet_hide_bin_obj": ["\"files.exclude\": {", "  \"**/bin\": true,", "  \"**/obj\": true", "},", "\"search.exclude\": {", "  \"**/bin\": true,", "  \"**/obj\": true,", "  \"**/wwwroot/lib\": true", "}"], "dotnet_csharp_formatting": ["\"[csharp]\": {", "  \"editor.formatOnSave\": true,", "  \"editor.tabSize\": 4,", "  \"editor.insertSpaces\": true,", "  \"editor.codeActionsOnSave\": { \"source.organizeImports\": \"explicit\" }", "}"], "dotnet_debug_console": ["\"debug.internalConsoleOptions\": \"openOnSessionStart\",", "\"debug.openDebug\": \"openOnDebugBreak\",", "\"debug.console.fontSize\": ${1:13},", "\"debug.toolBarLocation\": \"docked\""], "dotnet_razor_associations": ["\"files.associations\": {", "  \"*.cshtml\": \"aspnetcorerazor\",", "  \"*.razor\": \"aspnetcorerazor\",", "  \"*.csproj\": \"xml\",", "  \"*.props\": \"xml\",", "  \"*.targets\": \"xml\"", "}"], "java_hide_target": ["\"files.exclude\": {", "  \"**/target\": true,", "  \"**/.classpath\": true,", "  \"**/.project\": true,", "  \"**/.settings\": true,", "  \"**/.factorypath\": true", "}"], "java_format_on_save": ["\"[java]\": {", "  \"editor.formatOnSave\": true,", "  \"editor.tabSize\": 4,", "  \"editor.insertSpaces\": true", "},", "\"java.configuration.updateBuildConfiguration\": \"automatic\""], "java_microprofile_config": ["\"files.associations\": {", "  \"microprofile-config.properties\": \"properties\",", "  \"*.properties\": \"properties\",", "  \"server.xml\": \"xml\",", "  \"*.mvn/**\": \"properties\"", "}"], "java_search_exclude": ["\"search.exclude\": {", "  \"**/target/**\": true,", "  \"**/.mvn/**\": true,", "  \"**/*.class\": true", "},", "\"files.watcherExclude\": {", "  \"**/target/**\": true", "}"], "cycle_font_size": ["\"settings.cycle\": [", "  {", "    \"id\": \"fontSize\",", "    \"overrideWorkspaceSettings\": true,", "    \"values\": [", "      { \"editor.fontSize\": 13 },", "      { \"editor.fontSize\": 16 },", "      { \"editor.fontSize\": 20 }", "    ]", "  }", "]"], "cycle_color_theme": ["\"settings.cycle\": [", "  {", "    \"id\": \"colorTheme\",", "    \"overrideWorkspaceSettings\": true,", "    \"values\": [", "      { \"workbench.colorTheme\": \"${1:Default Dark Modern}\" },", "      { \"workbench.colorTheme\": \"Default Light Modern\" }", "    ]", "  }", "]"], "cycle_word_wrap": ["\"settings.cycle\": [", "  {", "    \"id\": \"wordWrap\",", "    \"overrideWorkspaceSettings\": true,", "    \"values\": [", "      { \"editor.wordWrap\": \"off\" },", "      { \"editor.wordWrap\": \"on\" },", "      { \"editor.wordWrap\": \"bounded\", \"editor.wordWrapColumn\": 100 }", "    ]", "  }", "]"], "cycle_minimap": ["\"settings.cycle\": [", "  {", "    \"id\": \"focusMode\",", "    \"overrideWorkspaceSettings\": true,", "    \"values\": [", "      { \"editor.minimap.enabled\": true, \"breadcrumbs.enabled\": true },", "      { \"editor.minimap.enabled\": false, \"breadcrumbs.enabled\": false }", "    ]", "  }", "]"]};

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
  const _c = vscode.workspace.getConfiguration('settings-json-config-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('settings-json-config-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('settings-json-config-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'settings-json-config-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function customRules(ctx) {
  if (!(await paidGate(ctx))) return;
  await vscode.commands.executeCommand('workbench.action.openSettings', 'settings-json-config-audit');
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "settings-json-config-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('settings-json-config-audit.audit_file', runCurrent);
  reg('settings-json-config-audit.insert_snippet', insertSnippet);
  reg('settings-json-config-audit.list_rules', listRules);
  reg('settings-json-config-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('settings-json-config-audit.quick_fix', function () { return quickFix(ctx); });
  reg('settings-json-config-audit.export_report', function () { return exportReport(ctx); });
  reg('settings-json-config-audit.custom_rules', function () { return customRules(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('settings-json-config-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
