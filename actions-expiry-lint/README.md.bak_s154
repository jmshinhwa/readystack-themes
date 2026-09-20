# Actions Expiry Lint

![Actions Expiry Lint](https://getreadystack.com/img/promo/sku38744_result_card.jpg)

A GitHub Actions workflow is the one file in a repository that rots without being edited.
The YAML does not change; the platform underneath it does. A runner image is removed, an
action's backing service is switched off, a Node line leaves maintenance — and the file that
passed last year now fails on the first line of the job.

This extension reads `.github/workflows/*.yml` and reports every line that has an expiry
date attached to it, together with the date itself and the line that replaces it.

## The thirteen checks

| Check | What it catches |
| --- | --- |
| `runner-retired` | `runs-on` names a runner image GitHub has already removed |
| `runner-retiring` | `runs-on` names an image whose removal date is still ahead |
| `runner-floating` | a `-latest` label, which GitHub repoints without touching your file |
| `action-shutdown` | an action major version whose backing service was switched off |
| `action-runtime-old` | an action major version built on a Node runtime the runners no longer ship |
| `action-archived` | an action repository that is archived and read-only |
| `action-unpinned` | `uses:` following a moving branch instead of a tag or a commit SHA |
| `node-eol` | `node-version` past its end-of-life date |
| `node-eol-soon` | `node-version` reaching end-of-life inside the 270-day notice window |
| `node-odd-release` | `node-version` on an odd-numbered line, which never becomes LTS |
| `cmd-set-output` | the `::set-output::` workflow command, disabled by the runner |
| `cmd-save-state` | the `::save-state::` workflow command, disabled by the runner |
| `cmd-set-env` | the `::set-env::` and `::add-path::` commands, disabled in November 2020 |

## The as-of date

Every check is a date plus a replacement. The engine compares those dates against an
as-of day, which defaults to today. Move the date and the same file reports different
findings — that is the point of the tool, not a side effect of it.

The same ten-line workflow, unchanged:

```
as of 2024-06-01   4 findings, 1 error    (ubuntu-20.04 retires in 318 days)
as of 2026-09-11   5 findings, 4 errors   (ubuntu-20.04 was removed 514 days ago)
```

## Free and paid

Free: `Actions Expiry: Check This File` runs all thirteen checks on the workflow open in
the editor, with full messages and full dates and no key. The same engine runs in the
browser at <https://getreadystack.com/tools/actions-expiry-lint>, with nothing uploaded.

Paid ($29 once, one key per person or team seat, 7-day full refund):
`Actions Expiry: Sweep The Workspace` walks every workflow in the repository in one
command and writes a dated `actions-expiry-report.md` you keep and attach to the change
ticket. Yardstick: contract DevOps work is commonly quoted at $75-$150 an hour, so one
licence is under half an hour of it.

## The rule set

All dates live in one file, `rules.json`, marked with a revision date. Findings are
advisory and quote GitHub's published retirement and Node's published release schedule;
they are not legal or contractual advice. Rule set revision **2026.09**, revised
**2026-09-11**.
