# Workflow Expiry

Finds the lines in .github/workflows that are valid today and fail on a date GitHub has already published.

## What it does for free

- Check the workflow you have open against all 29 rules, with line numbers and the replacement line
- Check just the lines you have selected
- Read every rule and the date it fires

## With a licence

- **Every workflow in the repo at once** — Walks the whole workspace instead of the one file you have open - the 40-workflow monorepo, in one pass.
- **Export the dated audit as a file** — Writes findings to CSV, JSON or HTML so it can go into a ticket or an audit trail.
- **Machine-readable output for a CI gate** — Emits JSON a pipeline step can fail on, so an expiring line cannot merge.
- **Apply the replacement line** — Rewrites the flagged line to the fix instead of only naming it.
- **Re-check on every save** — Runs automatically each time a workflow file is saved.
- **Your organisation's own rules** — Adds rules you write in settings alongside the 29 that ship inside.

## Install

```
ext install workflow-expiry-check
```
