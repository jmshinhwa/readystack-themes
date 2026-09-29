# Aurora MySQL 5.7 to 8.0 Upgrade Blocker Lint

![Aurora MySQL 5.7 to 8.0 Upgrade Blocker Lint — finds the line](https://getreadystack.com/img/promo/aurora-mysql57-upgrade-blocker-lint_demo.gif)

![Aurora MySQL 5.7 to 8.0 Upgrade Blocker Lint](https://getreadystack.com/img/promo/sku359553_result_card.jpg)

Finds the lines in your `.sql`, `.cnf` and Terraform files that break when an Aurora MySQL version 2 (MySQL 5.7) cluster moves to Aurora MySQL version 3 (MySQL 8.0), and shows the 8.0 replacement next to each one. 28 rules, every one taken from the MySQL 8.0 Reference Manual list "Features Removed in MySQL 8.0" and its keyword table.

Web version and rule list: https://getreadystack.com/tools/aurora-mysql57-upgrade-blocker-lint

## Why now

AWS release calendar for Aurora MySQL version 2: end of standard support 31 Oct 2024, RDS Extended Support year 1 pricing from 1 Dec 2024, **year 3 pricing from 1 Dec 2026**, end of Extended Support 30 Jun 2029. Aurora MySQL version 3 (8.0) has standard support until 30 Apr 2028.

Yardstick: AWS's published Extended Support rate for US East (Ohio) is $0.100 per vCPU-hour in years 1-2 and $0.200 per vCPU-hour from year 3. One 8 vCPU writer instance at $0.200 x 8 vCPU x 8,760 hours = **$14,016 a year**, or $1,168 a month (730 hours). In years 1-2 the same instance was $7,008 a year. The upgrade stops that bill; this lint lists what stands in the way.

## What it checks (28 rules)

- Terraform / CLI: `engine_version = "5.7.mysql_aurora.2.x"` and the `aurora-mysql5.7` parameter group family
- Query cache: `query_cache_*` variables, `SQL_CACHE`, `FLUSH/RESET QUERY CACHE`, `Qcache_*` status counters
- Accounts: `PASSWORD()`, `IDENTIFIED BY PASSWORD`, `GRANT ... IDENTIFIED BY`, `NO_AUTO_CREATE_USER`, `old_passwords`
- Removed variables: `tx_isolation`, `tx_read_only`, `log_warnings`, `innodb_locks_unsafe_for_binlog`, `sync_frm`, `secure_auth`, `ignore_db_dirs` and more, global `sql_log_bin`
- Removed SQL modes: `DB2`, `MAXDB`, `MSSQL`, `ORACLE`, `POSTGRESQL`, `NO_FIELD_OPTIONS` and the rest
- Syntax: `GROUP BY col DESC`, `EXPLAIN EXTENDED`, `PROCEDURE ANALYSE`, `\N` as NULL
- Functions: `ENCODE()`, `DECODE()`, `ENCRYPT()`, `DES_ENCRYPT()`, spatial names without `ST_` (`GeomFromText`, `AsText`, `GLength` ...)
- `INFORMATION_SCHEMA.INNODB_SYS_*` views renamed in 8.0.3
- Client options `--ssl=1`, `--ssl-verify-server-cert`; `mysql_install_db`
- Partitioned `ENGINE=MyISAM` tables (cannot be upgraded)
- Unquoted new reserved words used as names: `rank`, `groups`, `system`, `window`, `lead`, `lag`, `of` ...

Comments are ignored, except MySQL's executable `/*! ... */` comments.

## Sample result

The bundled sample `dirty.sql` (23 lines of legacy scripts) gives **14 findings on 13 lines**; the rewritten `clean.sql` gives 0. Example pairs:

| Breaks on 8.0 | Fix |
|---|---|
| `SET GLOBAL query_cache_type = 1;` | delete it: the query cache is gone |
| `SET SESSION tx_isolation = ...` | `transaction_isolation` |
| `GRANT ... IDENTIFIED BY 's3cret'` | `CREATE USER`, then `GRANT` |
| `PASSWORD('rotate-me')` | `ALTER USER ... IDENTIFIED BY` |
| `rank INT NOT NULL` | `` `rank` INT NOT NULL `` |

## Free and full version

Free: the open file is checked against all 28 rules, in VS Code and in the browser, with every finding and fix shown. Nothing is hidden.

Full version ($29 once, one licence key per person or team seat): one command scans the whole workspace, every migration, parameter group and Terraform module, and writes a dated Markdown upgrade report for the change ticket. [Get the full version](https://getreadystack.com/api/buy/cl/polar_cl_qv2gQ0tQkHF96H9237ZN1YkkaO0PWzOKZFBiM46xuj3)

## Limits

This is a text linter. It does not connect to your cluster. Run AWS's own upgrade prechecks as well; this tool catches the problems while they are still in the repository.

Sources: MySQL 8.0 Reference Manual, 1.4 "What Is New in MySQL 8.0" (Features Removed) and 11.3 "Keywords and Reserved Words"; AWS Aurora MySQL release calendar; AWS Aurora pricing page (RDS Extended Support example).
