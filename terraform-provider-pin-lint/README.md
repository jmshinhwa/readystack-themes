# Terraform Provider Pin Lint

![Terraform Provider Pin Lint](https://getreadystack.com/img/promo/sku88463_result_card.jpg)

Your pipeline runs `terraform init` on an empty runner. Nothing carries over from the last job: every provider and every module is chosen again, from scratch, by whatever the constraint in your `.tf` file happens to allow. A constraint of `>= 4.0` allows the next major. A `required_providers` entry with no `version` allows the newest release published this morning. A `module` block pointing at a git URL with no `?ref=` follows the default branch wherever it went.

None of that is a syntax error, so nothing in the standard toolchain says a word about it. `terraform fmt` rewrites whitespace and alignment. `terraform validate` checks syntax and internal consistency against providers that `terraform init` has **already** installed — by the time it runs, the choice has been made. The line that moved is the line that both tools read without complaint.

This extension reads a `.tf` file as text and applies **14 rules** to the parts that decide what gets installed.

## What it checks

- `required_providers` entries with no `source` — Terraform falls back to the `hashicorp/` namespace, which is the wrong publisher for most third-party providers
- `required_providers` entries with no `version`
- Constraints with no upper bound (`>= 5.0`), wildcards (`*`), and constraints that track a `0.x` provider, where the minor digit is still allowed to break
- `provider` blocks configured but never declared in `required_providers`, and `provider` blocks in a file with no `required_providers` block at all
- `terraform` blocks with no `required_version`, or a `required_version` with no upper bound
- Registry `module` sources with no `version` argument
- Git `module` sources with no `?ref=`, or a `?ref=` pointing at a branch name rather than a tag or commit SHA
- `module` sources fetched over plain `http://`
- An `s3` backend still locking through `dynamodb_table` — Terraform 1.10 added native S3 state locking via `use_lockfile` and marks the DynamoDB path deprecated

Every finding carries the line number and the pinned form to paste in its place.

## Measured on the sample files

Two fixtures ship with the extension. On `_fixtures/dirty.tf`, a 41-line root module, the 14 rules report **8 findings** — 6 high, 2 medium. On `_fixtures/clean.tf`, the same module with each of those lines pinned, the same 14 rules report **0**.

## Free and licensed

Linting the file you have open is free, permanently. No watermark, no trial counter, no findings held back behind a key — you open a `.tf` file, run **Terraform Provider Pin Lint: Check this file**, and the job is finished.

The licence key opens a different axis: **scope and ownership**. It scans every `.tf` file in the workspace in one pass — every environment folder, every module directory — and writes a dated Markdown report you keep, for the CI gate, the change ticket and the audit trail.

## Yardstick

Doing this review by hand means opening the registry page for each provider and each module to see which majors the constraint admits. Contract platform and DevOps engineers list $75-150/hour on public freelance marketplaces.

## Also runs in the browser

The same engine file — `ext/engine.js`, the same 14 rules — runs as a single web page with no install and no upload. Paste a `.tf` file, get the same findings.

More tools: <https://getreadystack.com/tools/terraform-provider-pin-lint>

## Licence

Commercial licence, one key per person or team seat. See `LICENSE.txt`.
