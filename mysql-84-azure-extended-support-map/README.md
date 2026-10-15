# mysql 8.4 Azure Extended Support Map

![mysql 8.4 Azure Extended Support Map](https://getreadystack.com/img/promo/sku675394_result_card.jpg)

Finds every Azure Database for MySQL server your Terraform, Bicep, ARM or az CLI files still pin to 5.7 or 8.0, with the file line, the Extended Support billing date, a yearly vCore cost and the exact `version = "8.4"` line to write. On the 44-line sample `dirty.tf` it reports 6 findings: one 5.7 server billed since 2026-10-01 (2,452.80 USD a year at 4 vCores) and two 8.0 servers billed from 2027-02-01 (1,226.40 USD a year each).

Yardstick: Azure bills Extended Support at 0.07 USD per vCore-hour (East US list price from the Azure retail price API, effective 2025-11-01). One 4-vCore server left on 5.7 costs 2,452.80 USD a year just to stand still.

Web version (same engine, runs in your browser): https://getreadystack.com/tools/mysql-84-azure-extended-support-map

## What changed

From the Azure Database for MySQL version policy (last updated 2026-09-11):

| Version | Azure standard support ends | Extended Support starts | Extended Support ends |
|---|---|---|---|
| MySQL 5.7 | 2026-09-30 | 2026-10-01 | 2029-03-31 |
| MySQL 8.0 | 2027-01-31 | 2027-02-01 | 2029-05-31 |

Servers on these versions are enrolled automatically and billed per vCore per hour. Stopped servers are not charged. Read replicas and HA standbys are billed for the extra vCores they use. Upgrading to a version still in standard support ends the billing.

## What it checks (9 rules)

| Rule | Looks for | Writes instead |
|---|---|---|
| flex-57 | `azurerm_mysql_flexible_server`, `azapi_resource`, Bicep or ARM flexibleServers on 5.7 (also through `var.x` defaults) | `version = "8.0.21"`, apply, then `version = "8.4"` |
| flex-80 | the same resources on `8.0.21` | `version = "8.4"` |
| single-server | `azurerm_mysql_server` or `Microsoft.DBforMySQL/servers` | a flexible server on 8.4 |
| cli-pin | `az mysql flexible-server create/upgrade --version 5.7/8` | `--version 8.4` |
| param-gone-80 | `query_cache_type`, `query_cache_size`, `tx_isolation` server parameters | delete before the 5.7 to 8.0 upgrade |
| param-gone-84 | `default_authentication_plugin`, `expire_logs_days` | `authentication_policy`, `binlog_expire_logs_seconds` |
| replica-first | `create_mode = "Replica"` on an old version | upgrade the replica before its primary |
| native-password | `mysql_native_password` | `caching_sha2_password` (8.4 default for new accounts) |
| no-version-pin | a flexible server with no `version` | `version = "8.4"` |

The upgrade path follows the Microsoft major version upgrade article: its examples are 5.7 to 8.0 and 8.0 to 8.4, and online validation is not available yet for 8.0 to 8.4, so run the community upgrade checker first.

## How to use

1. Open a `.tf`, `.bicep`, ARM `.json`, `.sh` or `.ps1` file.
2. Run **mysql 8.4 Azure Extended Support Map: Check this file**.
3. Each finding lands in the Problems panel with the line to write.

Everything runs locally. No file leaves your machine.

## Full version

The single-file check is complete without a key. With a licence key, **Sweep workspace and write report** reads every file in the workspace and writes a dated migration plan (Markdown) that maps each server and blocking parameter to its 8.4 line, and the same rules run as a CI step that fails a build adding a new 5.7 or 8.0 pin. Details: https://getreadystack.com/tools/mysql-84-azure-extended-support-map

## Sources

- https://learn.microsoft.com/en-us/azure/mysql/concepts-version-policy
- https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-upgrade
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mysql_flexible_server (`version`: `5.7`, `8.0.21`, `8.4`)
- https://prices.azure.com/api/retail/prices (meter "Extended Support vCore")
