# Config & DSL Check — 9 languages

VS Code colours these 9 languages but never checks them: 30 rules and 35 snippets that catch the tab in a .rpy script, the unterminated property in a .dts overlay and the password sitting in plain text in microprofile-config.properties — before the build does.

## What it does for free

- The open file is checked against all 30 rules — every rule, no key, no limit
- Check only the lines you selected, for files too big to read at once
- All 35 snippets across 9 languages, insertable at the cursor
- Read every rule message and snippet trigger that ships inside, before you rely on it

## With a licence

- **The whole workspace, not one file** — Runs the 30 rules over every file in the open folder. This is the one you want the minute the open file comes back clean and you remember the other 200 .dts, .toml and .properties files nobody has read since 2023.
- **Apply the fix instead of reading about it** — Rewrites the lines that have a defined replacement — the Ren'Py tab, status = "ok", #NoEnv, python.pythonPath, capitalised True in TOML — across the file or the whole scan.
- **A report file in the repository (CSV, JSON, HTML)** — Writes the findings to a file you can attach to a pull request, hand to a reviewer, or keep as the record of what the config looked like on the day you shipped.
- **Re-check automatically on every save** — The check runs itself each time you save, so a device tree overlay or a pyproject.toml is never wrong for longer than one keystroke.
- **Your own house rules, not only the built-in 30** — Point a setting at a rules file in the repository and your team's own patterns run beside the built-in set — the internal registry hostname nobody may hardcode, the deprecated key nobody may reintroduce.
- **Machine-readable output your CI job can fail on** — Emits the findings as JSON on stdout with a non-zero exit when there are hits, so the same check that runs in your editor also guards the branch.

## Install

```
ext install config-dsl-lint-snippets
```
