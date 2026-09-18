# Snippet Packs + Deprecation Audit (8 Stacks)

8 snippet libraries, 24 named snippet groups, and an audit that names the file and line where a snippet pack still emits an API your framework major removed — the line the reviewer would have sent back.

## What it does for free

- The open file, finished: every removed or superseded API in it, with line number and the current form
- The majors come from your own package.json and Gemfile — no config file to write
- All 8 snippet libraries, 24 groups, every snippet marked with the major it targets
- Which snippet prefix actually expands when two packs claim the same one

## With a licence

- **Every file, not just the one you have open** — Runs all 8 rulesets across the repo and returns one grouped list, so you find the other 900 files the free audit could not see.
- **Rewrite it, do not just report it** — Applies the current form of each flagged call in the editor, one confirmation per file, instead of leaving you 400 lines to edit by hand.
- **Re-audit on every save** — The file is checked the moment you save it, so a reverted pattern is caught before the commit, not in review.
- **Your team's own rules, on top of the built-in eight** — Point the setting at your rules file and your internal deprecations are flagged beside the framework ones.
- **The audit as a file you can hand over** — Writes CSV, JSON or HTML into the workspace — the migration checklist the team works through.
- **JSON your CI job can fail on** — A machine-readable count and location list, so the build goes red before a removed API reaches main.

## Install

```
ext install snippet-packs-deprecation-audit
```
