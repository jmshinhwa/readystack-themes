# PostgreSQL 17 Upgrade Map: Azure Extended Support

![PostgreSQL 17 Upgrade Map: Azure Extended Support](https://getreadystack.com/img/promo/sku642178_result_card.jpg)

**Finds every Azure PostgreSQL Flexible Server in your Terraform still pinned to 11, 12, 13 or 14, shows what Extended Support costs it per month, and gives the exact `version = "17"` line.** In our sample `main.tf` it found 6 findings across 4 servers: 715.40 USD a month already billed, plus 102.20 USD a month more from 2027-02-01.

Free web version and docs: https://getreadystack.com/tools/postgresql-17-azure-extended-support-map

Yardstick: Azure bills Extended Support at 0.07 USD per vCore-hour (East US list price on prices.azure.com), so one 4-vCore General Purpose server costs 204.40 USD a month to stay where it is.

## What changed

Microsoft's Extended Support page for Azure Database for PostgreSQL lists these dates:

| Version | Azure Standard Support ends | Extended Support billing | Extended Support ends |
|---|---|---|---|
| 11 | 2026-07-31 | since 2026-09-01 | 2027-03-31 |
| 12 | 2026-07-31 | since 2026-09-01 | 2027-11-13 |
| 13 | 2026-07-31 | since 2026-09-01 | 2028-11-12 |
| 14 | 2027-01-31 | from 2027-02-01 | 2029-11-11 |

Servers were enrolled automatically on 2026-08-01. Versions 11, 12 and 13 got a one-month grace period, and billing started on 2026-09-01. Microsoft's FAQ says you cannot opt out. The only way to stop the charge is to upgrade to a supported version. A stopped server is not billed, and an upgrade made partway through a month is billed only for the time before it.

## What the extension reports

Open any `.tf` file. Every `azurerm_postgresql_flexible_server` gets a diagnostic on the line that pins its version:

- **pg11 / pg12 / pg13**: billed since 2026-09-01, Extended Support end date, vCores read from `sku_name` (for example `GP_Standard_D4s_v3` = 4), the monthly cost and the cost so far.
- **pg14**: billing starts 2027-02-01, with the number of days left.
- **version from a variable**: `version = var.x` is resolved to the variable's `default` in the same file, and the finding points at that default line.
- **PremiumV2_LRS on 11, 12 or 13**: the azurerm docs say PremiumV2_LRS storage does not support those versions.
- **ignore_changes = [version]**: your upgrade edit would never reach Azure.
- **version with no value in the file**: a reminder to check the `.tfvars` file.

That is 7 rules, and they take 2 inputs: the file text and today's date. The fix is the same line every time, `version = "17"`. azurerm accepts 11 to 18, and Azure's supported-versions page lists 17.11 as the current minor release. A major upgrade done in place cannot be undone, so test it on a copy first. Extensions such as pgvector or timescaledb then need `ALTER EXTENSION ... UPDATE`, as Microsoft's FAQ notes.

## Example

```hcl
resource "azurerm_postgresql_flexible_server" "orders" {
  version  = "11"                 # pg11-extended-support: 204.40 USD a month
  sku_name = "GP_Standard_D4s_v3"
}
```

becomes

```hcl
  version  = "17"
```

## Commands

- Free: diagnostics appear as you open a `.tf` file, and the Command Palette entries under "PostgreSQL 17 Upgrade Map" re-run the check on the open file.
- The full version produces one dated Markdown report for the whole workspace, listing every server in every `.tf` file with its PostgreSQL 17 target, monthly cost and billing date, ready to attach to the migration ticket.

## Sources

- https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/extended-support
- https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/concepts-supported-versions
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server
- https://prices.azure.com/api/retail/prices (meter "Extended Support vCore", Azure Database for Postgres Extended Support)

Prices are East US list prices and can differ by region or agreement. The check reads your files locally and sends nothing anywhere.
