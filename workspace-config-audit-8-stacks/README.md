# Angular & SAP Fiori Workspace Config Audit

One hard-coded azure-devices.net key, or a coverage gate left at 0, slips into the repo unnoticed - 26 checks across the 8 toolchains an enterprise Angular workspace runs on, applied to the file you have open, offline, without an account.

## What it does for free

- All 26 rules on the file you have open, with line numbers
- The same 26 rules on just the lines you selected
- All 34 snippets, inserted at the cursor
- The full printed list of what is checked and what is inserted

## With a licence

- **Every file in the repository, not just the open one** — Opens every file in the workspace and runs the same check on each.
- **A report file a reviewer can read without this extension** — Writes the findings as a file (CSV, JSON or HTML) into the workspace folder; it uses the report_format setting when that is set, and only asks which format when it is not.
- **The corrected line written into the editor for you** — Replaces the offending lines in the editor with the suggested text.

## Install

```
ext install workspace-config-audit-8-stacks
```
