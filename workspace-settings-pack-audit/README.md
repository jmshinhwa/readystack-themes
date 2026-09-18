# Formatter & Workspace Settings Pack — 8 Sets

34 ready config files and 26 rules across 8 stacks. Prettier's published default tabWidth is 2 while VS Code's default editor.tabSize is 4 — until one committed file decides, every save re-indents what your teammate just saved and the next pull request is mostly whitespace.

## What it does for free

- Every conflicting or ignored setting in the config file you have open, with line numbers
- The same 26 rules over only the block you highlighted
- All 34 config blocks from the 8 sets, inserted at the cursor
- The full list of what is checked and what can be inserted

## With a licence

- **Check .vscode, .editorconfig, .prettierrc and every other config in the repository at once** — Opens every file in the workspace and runs the same check on each.
- **Hand the team a list of every config conflict as a file** — Writes the findings as a file (CSV, JSON or HTML) into the workspace folder; it uses the report_format setting when that is set, and only asks which format when it is not.
- **Swap a setting that takes a string but holds a boolean, in place** — Replaces the offending lines in the editor with the suggested text.

## Install

```
ext install workspace-settings-pack-audit
```
