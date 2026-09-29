# MySQL 8.4 Upgrade Lint (RDS MySQL 8.0)

![MySQL 8.4 Upgrade Lint (RDS MySQL 8.0) — finds the line](https://getreadystack.com/img/promo/mysql84-upgrade-blocker-lint_demo.gif)

![MySQL 8.4 Upgrade Lint (RDS MySQL 8.0)](https://getreadystack.com/img/promo/sku357095_result_card.jpg)

Six lines in the bundled sample runbook break a MySQL 8.0 → 8.4 upgrade: `STOP SLAVE`, `CHANGE MASTER TO`, `START SLAVE`, `SHOW SLAVE STATUS`, `FLUSH HOSTS` and `SET PERSIST_ONLY default_authentication_plugin`. This extension finds lines like them in your `.sql`, `my.cnf`, `.ini` and Terraform parameter-group files with 34 rules taken from the MySQL 8.4 reference manual, and prints the replacement on every line.

Tool page: https://getreadystack.com/tools/mysql84-upgrade-blocker-lint

## Why now

Amazon RDS for MySQL 8.0 reached the end of standard support on **31 July 2026** (AWS RDS for MySQL release calendar). Every RDS MySQL 8.0 instance still running has been enrolled in RDS Extended Support since **1 August 2026**. Year 3 pricing starts on 1 August 2028 and Extended Support ends on 31 July 2029.

Yardstick: AWS's own pricing example for RDS for MySQL is **$0.100 per vCPU-hour** in US East (Ohio) for years 1 and 2. One 8-vCPU instance running 8,760 hours a year: 8 × $0.100 × 8,760 = **$7,008 a year**, on top of the instance price.

## What it checks

MySQL 8.4 LTS removed, not just deprecated, a long list of statements, options and variables. Attempting to use them now raises a syntax error or refuses to start the server. The rules cover:

- Replication statements: `START SLAVE`, `STOP SLAVE`, `RESET SLAVE`, `SHOW SLAVE STATUS`, `SHOW SLAVE HOSTS`, `CHANGE MASTER TO`, `RESET MASTER`, `SHOW MASTER STATUS`, `SHOW MASTER LOGS`, `PURGE MASTER LOGS`
- `MASTER_*` options such as `MASTER_HOST`, `MASTER_AUTO_POSITION`, `MASTER_LOG_POS` and `GET_MASTER_PUBLIC_KEY` (use the `SOURCE_*` names)
- `FLUSH HOSTS` (use `TRUNCATE TABLE performance_schema.host_cache`)
- Server variables and options: `default_authentication_plugin`, `binlog_transaction_dependency_tracking`, `transaction_write_set_extraction`, `skip-host-cache`, `ssl` / `have_ssl` / `have_openssl`, `slave_rows_search_algorithms`, `log_bin_use_v1_events`, `master_info_repository`, `relay_log_info_repository`, `avoid_temporal_upgrade`, `show_old_temporals`, `--old`, `--new`, `--language`, `--skip-innodb`, `--no-dd-upgrade`
- Group Replication: `group_replication_ip_whitelist`, `group_replication_primary_member`, `group_replication_recovery_complete_at`
- Removed plugins: `keyring_file`, `keyring_encrypted_file`, `keyring_oci`, `authentication_fido`
- Removed `Com_slave_*` / `Com_show_master_status` status variables that monitoring queries still read
- Warnings: `IDENTIFIED WITH mysql_native_password` (no longer enabled by default in 8.4) and `DISABLE ON SLAVE` (deprecated)

Lines inside `--` comments, `/* */` openers and `#` / `;` config comments are skipped.

## How to use

1. Open a `.sql`, `.cnf`, `.ini` or `.tf` file.
2. Findings appear in the Problems panel with the line number, what 8.4 removed and the line to write instead.
3. Run **MySQL 8.4 Upgrade Lint (RDS MySQL 8.0): Check this file** from the command palette at any time.

Nothing leaves your machine. The same engine runs in the free web page on the tool page above.

## Why the built-in checks miss these

The RDS pre-upgrade check and `util.checkForServerUpgrade()` read the objects inside the running database. They do not read the runbooks, cron scripts, Ansible templates, `my.cnf` files and Terraform parameter groups in your Git repository. A `SHOW SLAVE STATUS` in a monitoring script upgrades without a complaint and fails the first time it runs on 8.4. Chatbots trained on years of MySQL 5.7 and 8.0 examples still write `CHANGE MASTER TO`.

## Free and full version

Free, no key: lint the open file, every rule, every fix. The full version (one licence key, $29 once) scans every migration, `my.cnf` and parameter group in the workspace at once and exports one upgrade-blocker report as Markdown and CSV for the upgrade ticket: https://getreadystack.com/api/buy/cl/polar_cl_pDhhhYZlkALQMCGNQVCneKjQVhPTdXCo63mRO2H3r2E

## Sources

- MySQL 8.4 Reference Manual, "What Is New in MySQL 8.4 since MySQL 8.0", section "Features Removed in MySQL 8.4"
- Amazon RDS for MySQL User Guide, "MySQL versions" release calendar (8.0: end of standard support 31 July 2026, Extended Support year 1 from 1 August 2026)
- Amazon RDS for MySQL pricing, "RDS Extended Support pricing example" ($0.100 per vCPU-hr, US East (Ohio))
