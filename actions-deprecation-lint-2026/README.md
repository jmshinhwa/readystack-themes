# GitHub Actions Deprecation Lint

![GitHub Actions Deprecation Lint: the 2026 runner and action EOL dates](https://getreadystack.com/img/promo/sku17012_result_card.jpg)

Node 20 is removed from GitHub-hosted runners on 2026-09-23 and ubuntu-22.04 deprecation opens 2026-09-17. This checks a workflow file against 25 dated GitHub shutdowns and names the date each line stops running.

## What it finds

```
.github/workflows/release.yml
  12  error  runs-on: ubuntu-20.04 - image removed 2025-04-15, the job fails now. Use ubuntu-24.04.
  19  warn   actions/checkout@v4 runs on Node 20; the runner drops Node 20 on 2026-09-23. Use @v5.
  27  error  actions/upload-artifact@v3 - shut down 2025-01-30. Use @v6.
  31  warn   runs-on: ubuntu-22.04 - deprecation opens 2026-09-17, unsupported 2027-04-17.
  44  error  ::set-output - disabled 2023-06-01. Write to $GITHUB_OUTPUT.
```

## What it does for free

- Audit the open workflow file against all 25 dated rules, with the line number and the shutdown date
- Audit just the lines you selected
- Reopen the last findings panel

## With a licence

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.

- **Scan every workflow in the repository** — One pass over the whole workspace instead of the file you happen to have open - .github/workflows, composite action.yml files and reusable workflows together.
- **Export the findings as CSV, JSON or HTML** — Writes the report into the workspace so you can hand it to a migration ticket or a colleague.
- **Machine output your CI can fail on** — Emits JSON so a pipeline step can block a pull request that reintroduces a dead action version.
- **Re-check automatically on every save** — Runs the same audit each time a workflow file is saved, so a paste from a chatbot is caught before commit.
- **Add your own rules alongside the 25 built in** — Your internal actions and private runner labels get their own dated rules in settings.

## Install

```
ext install actions-deprecation-lint-2026
```
