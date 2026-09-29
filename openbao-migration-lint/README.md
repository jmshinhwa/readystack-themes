# OpenBao Migration Lint — HashiCorp Vault

![OpenBao Migration Lint — HashiCorp Vault](https://getreadystack.com/img/promo/sku353992_result_card.jpg)

**OpenBao migration check for the files that deploy HashiCorp Vault.** It reads shell scripts, Terraform, Helm values, Dockerfiles and Vault server HCL and marks every line that breaks or changes when the cluster moves to OpenBao, with the OpenBao fix next to it. 14 rules, offline, no account.

Web version (same engine): https://getreadystack.com/tools/openbao-migration-lint

## What it found in the sample

The sample 31-line Vault deploy script in this repository (`_fixtures/dirty.sh`) gives **17 findings: 7 errors, 9 warnings, 1 info**. The OpenBao version of the same script (`_fixtures/clean.sh`) gives 0.

| Vault line | OpenBao fix |
|---|---|
| `seal "awskms" {` | install the awskms seal plugin from openbao-plugins |
| `storage "consul" {` | `storage "raft"` and `bao operator migrate` |
| `docker pull hashicorp/vault:1.17.2` | `quay.io/openbao/openbao:2.7.0` |
| `vault auth enable aws` | plugin, or jwt/oidc, kubernetes or cert |
| `plugin_name=mssql-database-plugin` | external plugin; postgresql is built in |
| `[[ "$VAULT_TOKEN" != hvs.* ]]` | `BAO_TOKEN`; new tokens are `s.<random>` |

## The 14 rules and where each fact comes from

1. **vault-bsl-image** — `hashicorp/vault` 1.15.0 or later, `latest` or `vault-enterprise`. The Vault LICENSE names "Vault Version 1.15.0 or later" as the Licensed Work under the Business Source License, licensor IBM.
2. **vault-pre-1141-image** — Vault before 1.14.1. OpenBao's in-place migration guide says to upgrade to v1.14.1 first.
3. **helm-hashicorp-chart** — `helm.releases.hashicorp.com` or the `hashicorp/vault` chart. OpenBao's chart: `helm repo add openbao https://openbao.github.io/openbao-helm`.
4. **hashicorp-package-repo** — apt/rpm.releases.hashicorp.com or `apt install vault`.
5. **storage-not-in-openbao** — consul, s3, dynamodb, etcd, gcs, mysql, file and others. OpenBao 2.7.0 registers raft, postgresql, pebbledb and inmem; file was removed in 2.7.0.
6. **seal-plugin-since-2-7** — pkcs11, alicloudkms, awskms, azurekeyvault, gcpckms, ocikms. Since OpenBao 2.7.0 (September 23, 2026) these are external plugins.
7. **auth-not-builtin** — CLI `auth enable` or Terraform `vault_auth_backend`. Built in: approle, cert, jwt, kubernetes, oidc, userpass.
8. **secrets-not-builtin** — aws, azure, gcp, consul, nomad, terraform, ldap and others. Built in: kubernetes, kv, pki, rabbitmq, ssh, totp, transit.
9. **db-plugin-not-builtin** — mssql, oracle, mongodb, elasticsearch, hana, snowflake, redshift, couchbase.
10. **vault-env-prefix** — `VAULT_ADDR`, `VAULT_TOKEN` and friends; OpenBao's api/client.go reads `BAO_*`.
11. **vault-cli-binary** — the command is `bao`.
12. **token-prefix-hvs** — OpenBao issues `s.`/`b.`/`r.` tokens, not `hvs.`/`hvb.`/`hvr.`.
13. **disable-mlock** — OpenBao does not use mlock since 2.0.0.
14. **enterprise-licence** — `license_path` or `VAULT_LICENSE`; the migration guide covers Community Edition only.

Sources: the Vault LICENSE file (github.com/hashicorp/vault), the OpenBao CHANGELOG for 2.7.0, `internal/helper/builtinplugins/registry.go`, `internal/command/commands.go`, `api/client.go` and the OpenBao In-Place Migration Guide.

## Usage

Open a file and run **OpenBao Migration Lint — HashiCorp Vault: Check this file**. Findings appear in the Problems panel with the rule id and the fix.

## Free and full version

Free: every finding in the open file, with the Vault line that breaks and the OpenBao fix. Full version ($29 once, one licence key per person or team seat): scan the whole workspace in one pass and export one migration report for the change ticket — [full version](https://getreadystack.com/api/buy/cl/polar_cl_lLldqowNNwX8HlbXeAJMYp5W6WZOIdpQp49P92L6C2o).

Yardstick: DOJ's Fitzpatrick Matrix rates a 15-year litigator at $851/hour for billing year 2026, which is one hour of counsel reading the BSL Additional Use Grant.

This extension is not affiliated with HashiCorp, IBM or the OpenBao project. It reports what the files say; it does not give legal advice on the Business Source License.
