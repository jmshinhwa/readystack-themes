# OpenTofu Migration Lint — Terraform

![OpenTofu Migration Lint — Terraform — finds the line](https://getreadystack.com/img/promo/opentofu-migration-lint_demo.gif)

![OpenTofu Migration Lint — Terraform](https://getreadystack.com/img/promo/sku400702_result_card.jpg)

**OpenTofu migration check for the files that run Terraform.** It reads `.tf` and `.tofu` files, GitHub Actions and GitLab CI YAML, shell scripts and Dockerfiles, and marks every line that ties the project to HashiCorp Terraform or HCP Terraform, with the OpenTofu fix next to it. 13 rules, offline, no account.

Web version (same engine): https://getreadystack.com/tools/opentofu-migration-lint

## What it found in the sample

The sample 49-line `main.tf` in this repository (`_fixtures/dirty.tf`) gives **9 findings: 1 error, 4 warnings, 4 info**. The OpenTofu version of the same file (`_fixtures/clean.tf`) gives 0.

| Terraform line | OpenTofu fix |
|---|---|
| `required_version = "~> 1.9.0"` | `versions.tofu`: `language { compatible_with { opentofu = ">= 1.12" } }` |
| `cloud { organization = "acme-platform" }` | back up state, move to an s3, gcs, azurerm or pg backend, `tofu plan` |
| `source = "registry.terraform.io/hashicorp/aws"` | `source = "hashicorp/aws"` |
| `backend = "remote"` in `terraform_remote_state` | migrate the producing configuration first |
| `source = "app.terraform.io/acme-platform/vpc/aws"` | `git::https://…?ref=v3.4.1` |
| `resource "tfe_workspace" "network"` | `removed` block or `tofu state rm` after the state move |

## The 13 rules

1. `hcp-cloud-block` — `cloud {}` keeps state and runs in HCP Terraform (Free plan: 500 managed resources, 1 concurrent run).
2. `hcp-remote-backend` — `backend "remote"` stores state in HCP Terraform.
3. `remote-state-on-hcp` — `terraform_remote_state` with `backend = "remote"` depends on another HCP workspace.
4. `hcp-private-module` — modules from `app.terraform.io` need an HCP token at `tofu init`.
5. `tfe-provider` — `hashicorp/tfe` and `tfe_*` resources manage HCP Terraform itself.
6. `hashicorp-registry-host` — provider sources written with the `registry.terraform.io` host.
7. `required-version-pin` — a `required_version` that OpenTofu 1.11.14 does not satisfy; OpenTofu 1.11 and earlier check it against their own version.
8. `required-version-bsl` — a `required_version` that asks for Terraform 1.6.0 or later. The Terraform LICENSE file covers "Terraform Version 1.6.0 or later" under the Business Source License, Licensor IBM.
9. `provider-meta-ignored` — OpenTofu accepts `provider_meta` but silently ignores it.
10. `setup-terraform-action` — `hashicorp/setup-terraform` (latest v4.0.1) in CI; use `opentofu/setup-opentofu@v2` (latest v2.0.2).
11. `terraform-docker-image` — `hashicorp/terraform` images; use `ghcr.io/opentofu/opentofu:1.12.6`.
12. `terraform-cli-call` — `terraform init|plan|apply…` calls in scripts and pipelines.
13. `hcp-token-env` — `TF_TOKEN_app_terraform_io`, `TFE_TOKEN`, `TF_CLOUD_ORGANIZATION`, `TF_CLOUD_HOSTNAME`.

## Versions this release reads

- OpenTofu 1.12.6 (stable, 2026-08-19); 1.11.14 is the newest 1.11 patch; 1.13.0-rc1 appeared on 2026-09-17.
- Terraform 1.16.4 (2026-09-23), Business Source License since 1.6.0.
- The `language` block with `compatible_with` is accepted from OpenTofu 1.12. When `versions.tofu` and `versions.tf` both exist, OpenTofu ignores `versions.tf`, so the Terraform pin can stay for Terraform users.

## How to use

Open a `.tf`, workflow YAML, shell script or Dockerfile and run **OpenTofu Migration Lint: Check this file**. Findings appear in the Problems panel with the rule id and the fix. Follow the OpenTofu migration guide order: back up state, `tofu init`, `tofu plan` and expect "No changes", then `tofu apply`.

## Yardstick

The Terraform licence question is legal work: DOJ's Fitzpatrick Matrix rates a 15-year litigator at $851/hour for billing year 2026, which is one hour of counsel reading the Terraform BSL Additional Use Grant.

## Free and licensed

Free: every finding in the open file, in the editor and on the web page. Licensed ($29 once, one licence key per person or team seat): the whole workspace in one pass and one exported Markdown migration report for the change ticket. [Get the full version](https://getreadystack.com/api/buy/cl/polar_cl_Y3oMOcLwT7dEf8D9a5smCQxIX6uUTIULF9pmu08r145)

Sources: hashicorp/terraform LICENSE; OpenTofu docs (Migration Guide, Migrating interdependent configurations, Language and Compatibility Settings, Cloud Configuration); HCP Terraform subscription plans page (developer.hashicorp.com, modified 2026-08-19); GitHub releases of opentofu/opentofu, hashicorp/terraform, opentofu/setup-opentofu, hashicorp/setup-terraform.
