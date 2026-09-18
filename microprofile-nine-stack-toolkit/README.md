# MicroProfile Tools & 9-Stack Snippets

A wrong key in microprofile-config.properties does not break the build. It breaks the deploy. 46 snippets write the boilerplate and 24 rules check the file you have open, across 9 stacks, before you commit.

## What it does for free

- All 46 snippets, all 9 stacks — no key, no limit, forever
- The complete 24-rule audit of the file you have open, reported as file:line
- Audit only the lines you selected, for a block you just pasted
- Print every rule with its pattern and message, so nothing is hidden

## With a licence

- **Every file in the repository, not the one tab** — One command audits the whole workspace — each module's microprofile-config.properties, every .dts and overlay, every .ahk, .rpy, .toml, .swift and .py — and groups the findings by stack. The open-file audit answers one file; this answers the repository.
- **Apply the fix instead of reading about it** — Rewrites the findings that carry a replacement — status = "ok" to "okay", StringReplace to StrReplace, python: to init python: — across the file in one pass, and tells you how many lines it changed.
- **Keep it right, not just right once** — With watch on, every save re-runs the rules for that file and refreshes the output channel, so a v1 MsgBox line or an uppercase mp. key is caught while you are still in the file.
- **Your team's rules beside the built-in 24** — Point custom_rules_file at a JSON list of your own patterns and messages — your internal config prefix, your banned API, your board's compatible strings — and they run in the same pass as the built-in set.
- **A report file you can hand to someone** — Writes CSV for a spreadsheet or HTML for a pull-request comment into the workspace: file, line, stack, rule and message per finding. This is the list you take to the team, not a screenshot of your editor.
- **JSON your pipeline can read** — Set report_format to json and the same audit becomes machine-readable, so a CI step can fail the build when a MicroProfile key or a DeviceTree status regresses instead of finding out after deploy.

## Install

```
ext install microprofile-nine-stack-toolkit
```
