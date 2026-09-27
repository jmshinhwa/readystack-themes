# Terraform State Secret Leak Lint

![Terraform State Secret Leak Lint](https://getreadystack.com/img/promo/sku78493_result_card.jpg)

Terraform writes back everything it sends to a provider. That is how it detects drift, and it is why `terraform.tfstate` is a plaintext copy of your infrastructure — including the values you never meant to persist.

This extension reads the `.tf` file you have open and names every place a secret value ends up in `terraform.tfstate` in cleartext, with the line number and what to do instead.

## The 10 rules

| Rule | Severity | What it catches |
| --- | --- | --- |
| `state_plaintext_attr` | error | `password`, `secret_string`, `private_key`, `client_secret`, `auth_token` and 14 more attribute names, on any resource, provider or module block |
| `random_password_state` | error | `random_password` / `random_string` / `random_id` — the generated value is stored in state forever |
| `tls_private_key_state` | error | `tls_private_key` writes `private_key_pem` and `private_key_openssh` into state |
| `secret_data_source_state` | error | `aws_secretsmanager_secret_version`, `vault_generic_secret`, `azurerm_key_vault_secret` and 4 more — data source results are persisted |
| `backend_s3_unencrypted` | error | remote state object written with no `encrypt = true` / `kms_key_id` |
| `output_missing_sensitive` | error | an output returning a secret-bearing value without `sensitive = true` |
| `hardcoded_secret_literal` | error | an AWS access key id, PEM block, GitHub, Slack, OpenAI-style or Google key written into the source |
| `state_encryption_block_missing` | warn | a `terraform` block with no `encryption { }` — state encryption has been available since Terraform 1.10 |
| `backend_local_state` | warn | `backend "local"`, or no backend at all — state is an unencrypted JSON file on disk |
| `variable_missing_sensitive` | warn | a credential-named variable without `sensitive = true` |

## What it reports

The repository ships two sample files. On the 47-line `_fixtures/dirty.tf` — ordinary Terraform that a code scanner passes — the extension returns **8 findings: 6 errors and 2 warnings**. On `_fixtures/clean.tf`, the same stack rewritten so no secret reaches state, it returns **0**.

```
ERROR  L23  random_password_state       random_password.db stores `result` in terraform.tfstate in cleartext forever
ERROR  L28  tls_private_key_state       tls_private_key.deploy writes private_key_pem into state
ERROR  L42  state_plaintext_attr        `password` on aws_db_instance.prod is stored verbatim in terraform.tfstate
WARN   L2   state_encryption_block_missing  terraform block has no encryption { }
```

## Why a code scanner passes this file

Free scanners look for a secret written in the code. This looks for the values Terraform copies out of the code and into `terraform.tfstate`, which is a different list: `random_password.result`, `tls_private_key.private_key_pem` and every secret data source are clean HCL that still land in state in cleartext.

`sensitive = true` is part of that misunderstanding. It hides the value in plan output and in CI logs. It does not remove it from the state file.

## Free, and what the licence key adds

Free, with no key: scan the file you have open against all 10 rules and read every finding with its line number and its fix. That is a complete job on one file.

The licence key adds a different axis — **scope and ownership**: the workspace sweep, which scans every `.tf` file in one pass, and the export that writes the findings to a dated Markdown or JSON file you keep as audit evidence.

Hand review runs about $150/hour. The licence is $29 once, one key per person or CI seat, with a 7-day full refund.

[Workspace sweep + dated evidence file — $29 once](https://buy.polar.sh/polar_cl_zIkhgslGAKC7DwM9YZoNxdZy6f9YhUR5XrlPP4UKzK6)

## Commands

- `Terraform State Secret Leak Lint: Check This File` — the open `.tf` file, free
- `Terraform State Secret Leak Lint: Sweep Workspace` — every `.tf` file, licence key
- `Terraform State Secret Leak Lint: Export Evidence File` — dated Markdown or JSON, licence key

## Run it in a browser first

The same engine, byte for byte, runs as a single page with nothing uploaded: <https://getreadystack.com/tools/tfstate-secret-leak-lint>

## Licence

Commercial licence, see `LICENSE.txt`. Nothing is sent anywhere except the licence key check against `api.polar.sh`.
