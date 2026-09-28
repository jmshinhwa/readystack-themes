# RDS Extended Support Cost Lint for Terraform

![RDS Extended Support Cost Lint for Terraform — finds the line](https://getreadystack.com/img/promo/rds-extended-support-cost-lint_demo.gif)

![RDS Extended Support Cost Lint for Terraform](https://getreadystack.com/img/promo/sku323914_result_card.jpg)

**Finds the RDS and Aurora databases in your `.tf` files that AWS is billing for Extended Support right now, and prices the surcharge per year.**

Run on the sample `dirty.tf` (6 databases, today = 2026-09-27) it reports **28,032 dollars a year** of Extended Support surcharge that is already billing, plus one PostgreSQL 14 instance that starts billing on 2027-03-01. It ships **12 rules** (one per engine major version) and takes **2 inputs**: the Terraform file text and the date to evaluate.

Yardstick: one 4-vCPU instance left on MySQL 8.0 pays AWS 3,504 dollars a year at the us-east-1 rate of 0.100 USD per vCPU-hour, and 7,008 dollars a year once year 3 pricing starts.

Full notes: https://getreadystack.com/tools/rds-extended-support-cost-lint

## Why this exists

RDS for MySQL 8.0 left standard support on 2026-07-31. From 2026-08-01, every instance still on 8.0 is enrolled automatically in RDS Extended Support and billed per vCPU-hour on top of the normal instance price. AWS also bills the standby of a Multi-AZ deployment. Nothing in `terraform plan` shows it; it shows up on the invoice.

The dates also moved. In June 2026 AWS extended MySQL 5.7 Extended Support (RDS and Aurora MySQL version 2) to 2029-06-30, from the earlier end date of 2027-02-28, at year 3 pricing throughout. Answers written before that still quote the old date.

## Sample result (dirty.tf, 2026-09-27, us-east-1 rates)

| Resource | Engine version | Surcharge |
|---|---|---|
| aws_db_instance.orders | mysql 8.0.39, db.r6g.2xlarge, Multi-AZ | 16 vCPU = 14,016 dollars/yr |
| aws_db_instance.legacy | mysql 5.7.44, db.m5.xlarge | year 3 rate, 7,008 dollars/yr |
| aws_rds_cluster_instance.events | aurora-postgresql 12.19, 2 x db.r6g.large | 4 vCPU = 3,504 dollars/yr |
| aws_db_instance.reports | postgres 13.14, db.r6i.large | 2 vCPU = 1,752 dollars/yr |
| aws_rds_cluster_instance.auth | aurora-mysql 2.11.3, db.t3.medium | 1,752 dollars/yr, doubles 2026-12-01 |
| aws_db_instance.analytics | postgres 14.12, db.r6g.xlarge | billing starts 2027-03-01, 3,504 dollars/yr |

Total billed now: 28,032 dollars a year.

## What it reads

- `aws_db_instance`: `engine`, `engine_version`, `instance_class`, `multi_az`, `count`, `engine_lifecycle_support`.
- `aws_rds_cluster` + `aws_rds_cluster_instance`: the cluster's engine and version, each instance's class and `count` (linked through `cluster_identifier = aws_rds_cluster.NAME.id`).
- vCPU per class: large = 2, xlarge = 4, Nxlarge = 4 x N; micro, small, medium = 2.
- Versions set through a variable are skipped, not guessed.

## The 12 rules (standard support end, year 1 billing, year 3 billing, end of Extended Support)

- RDS for MySQL 5.7: 2024-02-29, 2024-03-01, 2026-03-01, 2029-06-30
- RDS for MySQL 8.0: 2026-07-31, 2026-08-01, 2028-08-01, 2029-07-31
- RDS for PostgreSQL 11: 2024-02-29, 2024-04-01, 2026-04-01, 2027-03-31
- RDS for PostgreSQL 12: 2025-02-28, 2025-03-01, 2027-03-01, 2028-02-29
- RDS for PostgreSQL 13: 2026-02-28, 2026-03-01, 2028-03-01, 2029-02-28
- RDS for PostgreSQL 14: 2027-02-28, 2027-03-01, 2029-03-01, 2030-02-28
- Aurora MySQL version 2 (5.7): 2024-10-31, 2024-12-01, 2026-12-01, 2029-06-30
- Aurora MySQL version 3 (8.0): 2028-04-30, 2028-05-01, no year 3, 2029-07-31
- Aurora PostgreSQL 11, 12, 13, 14: same dates as RDS for PostgreSQL

Rates: 0.100 USD per vCPU-hour in years 1 and 2, 0.200 in year 3 (US East). Other regions differ; treat the figure as the US East baseline. A version within 180 days of its billing start is a warning. `engine_lifecycle_support = "open-source-rds-extended-support-disabled"` is reported as an automatic major upgrade instead of a charge.

Sources: AWS release calendars for RDS for PostgreSQL, Aurora MySQL and Aurora PostgreSQL; "Amazon RDS Extended Support charges" in the RDS User Guide; AWS What's New, June 2026, MySQL 5.7 Extended Support through June 2029.

## Use

Open a `.tf` file. Findings appear in the Problems panel with the line of `engine_version` (or the cluster instance).
