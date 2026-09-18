# Snippets for 8 Stacks + Deprecated-Code Audit

The snippet pack you installed was written for the old major version. It still expands, and what it expands is code the framework has already removed. 48 snippets written for the current majors, and 22 rules that name every removed pattern still sitting in the file you have open.

## What it does for free

- All 48 snippets expand at the cursor, no key, no limit
- The file you have open is checked whole against all 22 rules
- Read every prefix and every rule that ships inside

## With a licence

- **Find every removed pattern in the whole repo, not just this file** — Opens every file in the workspace and runs the same check on each.
- **Rewrite before_filter, toBeCalled and flex-shrink-0 in place** — Replaces the offending lines in the editor with the suggested text.
- **Keep the check running through the whole migration** — A toggle: after it is on, every save re-runs the check.
- **A report file to attach to the migration pull request** — Writes the findings as a file (CSV, JSON or HTML) into the workspace folder; it uses the report_format setting when that is set, and only asks which format when it is not.

## Install

```
ext install modern-stack-snippets-audit
```
