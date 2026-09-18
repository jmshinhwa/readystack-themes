# Inkling · DeviceTree · TOML — Snippets & Lint

The nine languages VS Code only colours — 37 snippets and 21 rules that catch what the syntax highlighter never says: a v1 `MsgBox,` in a v2 script, `status = "ok"` in an overlay, an unquoted version in pyproject.toml.

## What it does for free

- All 21 rules run over the file you have open, no key
- All 37 snippets, every language, no key and no limit
- The full list of 21 rules and 37 snippets, before you pay anything

## With a licence

- **Every .dts, .rpy, .toml, .ahk and settings.json in the repository** — opens every file in the workspace and runs the same check on each
- **The flagged line rewritten for you** — replaces the offending lines in the editor with the suggested text
- **The findings saved next to the board files** — writes the findings as a file (CSV, JSON or HTML) into the workspace folder; it uses the report_format setting when that is set, and only asks which format when it is not
- **The check keeps running while you work** — a toggle: after it is on, every save re-runs the check

## Install

```
ext install inkling-devicetree-toml-snippet-lint
```
