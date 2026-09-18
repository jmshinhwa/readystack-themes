# SQLTools MSSQL Config & Secret Auditor

17 rules · 24 config blocks · 8 stacks — it names the SQL Server password sitting in the .vscode/settings.json you are about to commit, on the file you have open, offline.

## What it does for free

- Audit the file you have open against all 17 rules — no key, no cap, no expiry
- Audit only the lines you selected, for a review of one block
- Insert any of the 24 configuration blocks for the 8 stacks at the cursor
- See all 17 rules and all 24 blocks, with what each rule catches

## With a licence

- **Check every file in the repository, not just the one on screen** — opens every file in the workspace and runs the same check on each
- **A findings file you can hand to the team lead or the security reviewer** — WRITES the findings as a file (CSV, JSON or HTML) into the workspace folder; it uses the report_format setting when that is set, and only asks which format when it is not
- **Rewrite the flagged connection line in place** — replaces the offending lines in the editor with the suggested text
- **Keep it clean: re-check on every save** — a toggle: after it is on, every save re-runs the check
- **Add your own patterns — your internal host names, your key prefixes** — opens Settings so the user adds their own rules (free = the built-in set)

## Install

```
ext install mssql-config-secret-auditor
```
