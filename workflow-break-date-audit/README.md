# Workflow Break-Date Audit

![GitHub Actions Break-Date Audit](https://getreadystack.com/img/promo/sku32481_result_card.jpg)

Names the date each line in your workflow stops working - Node 20 leaves the runner on 23 September 2026 and ubuntu-22.04 begins its brownouts on 17 September 2026 - and the exact version to move to.

## What it does for free

- Check the open workflow or action.yml against all 35 rules - no key, no cap, no watermark
- Check only the lines you select
- Every finding carries its real break date and the version that replaces it
- The first safe major per action, measured from each action.yml - they are not the same number
- List all 35 rules and what each one replaces

## With a licence

- **Scan every workflow in the repository at once** — One pass over every file under .github/workflows and every action.yml in the workspace, instead of one open file at a time.
- **Export the dated audit as CSV, JSON or HTML** — A file you keep: every finding, its break date and its replacement, for the upgrade ticket or the security review.
- **CI JSON so a build fails before the date arrives** — Machine-readable output for a pipeline gate, so a new workflow cannot reintroduce a dated action.
- **Re-check on every save** — Runs the audit again each time a workflow file is saved, so a paste from an AI assistant is caught immediately.

A US DevOps engineer averages $59.11/hour (ZipRecruiter, 7 September 2026). This is about 29 minutes of that, once.

[**Get the full version - $29**](https://getreadystack.com) - $29 once, one licence key per person or team seat, 7-day full refund.


## Install

```
ext install workflow-break-date-audit
```
