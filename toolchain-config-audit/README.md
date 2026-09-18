# Config Audit - 8 Toolchains

28 rules and 24 snippets across 8 toolchains, run on the file you have open, before the connection string, the plain-text password or the :latest tag is committed.

## What it does for free

- The open file checked against all 28 rules, no key, no limit
- The same 28 rules over just the lines you selected
- All 24 safe-config snippets, inserted at the cursor
- Every rule and snippet listed in full before you decide

## With a licence

- **Every file in the repository, not just the one on screen** — Opens every file in the workspace and runs the same check on each.
- **The offending line rewritten for you** — Replaces the offending lines in the editor with the suggested text.
- **A findings file you can hand to a reviewer** — Writes the findings as a file (CSV, JSON or HTML) into the workspace folder; it uses the report_format setting when that is set, and only asks which format when it is not.

## Install

```
ext install toolchain-config-audit
```
