# PostgreSQL 14 Upgrade Lint (Aurora/RDS 2027)

![PostgreSQL 14 Upgrade Lint (Aurora/RDS 2027)](https://getreadystack.com/img/promo/sku325988_result_card.jpg)

Flags every line in your `.sql`, `.conf` and `.tf` files that PostgreSQL 15, 16 or 17 removed or renamed, and prints the fix next to it. Built for teams on **Amazon Aurora PostgreSQL 14** and **RDS for PostgreSQL 14**, whose standard support ends on **28 February 2027**.

Web version and hub page: https://getreadystack.com/tools/pg14-upgrade-blocker-lint

## Why now

AWS release calendar for PostgreSQL 14 (Aurora and RDS): end of standard support 28 February 2027 · Extended Support year 1 pricing from 1 March 2027 · year 3 pricing from 1 March 2029 · end of Extended Support 28 February 2030.

Yardstick: Extended Support is billed at $0.100 per vCPU-hour in US East (Ohio) in years 1 and 2 and $0.200 in year 3. One 8-vCPU instance running 8,760 hours a year: 8 x $0.100 x 8,760 = $7,008 a year, on top of the instance price.

`pg_upgrade --check` and the Aurora pre-upgrade check read the catalog of the running cluster. They do not read the backup scripts, monitoring queries and `ALTER SYSTEM` files in your repository, so a function body that calls a removed function upgrades fine and fails at run time.

## What the sample file shows

The bundled sample `_fixtures/dirty.sql` has 6 blockers. Left: the line that breaks. Right: the fix.

| Breaks on 15 / 16 / 17 | Fix |
|---|---|
| `SELECT pg_start_backup('nightly', true);` | `SELECT pg_backup_start('nightly', true);` |
| `SELECT pg_stop_backup();` | `SELECT * FROM pg_backup_stop();` |
| `CREATE EXTENSION adminpack;` | `DROP EXTENSION adminpack (removed in 17)` |
| `LANGUAGE plpythonu` | `LANGUAGE plpython3u` |
| `checkpoints_timed FROM pg_stat_bgwriter` | `num_timed FROM pg_stat_checkpointer` |
| `vacuum_defer_cleanup_age = 10000` | `hot_standby_feedback = on` |

## The 21 rules

- PostgreSQL 15: `pg_start_backup()`, `pg_stop_backup()`, `pg_backup_start_time()`, `pg_is_in_backup()`, `plpython2u` / `plpythonu`, `stats_temp_directory`, `pg_dump --no-synchronized-snapshots`
- PostgreSQL 16: `force_parallel_mode`, `promote_trigger_file`, `vacuum_defer_cleanup_age`, `lc_collate` / `lc_ctype` server variables, `pg_walinspect` `*_till_end_of_wal()`, views built with `CREATE RULE "_RETURN"`
- PostgreSQL 17: `old_snapshot_threshold`, `db_user_namespace`, `adminpack`, `trace_recovery_messages`, `pg_stat_statements` `blk_read_time` / `blk_write_time`, `pg_stat_bgwriter` checkpoint columns, `buffers_backend` / `buffers_backend_fsync`, `colliculocale` / `daticulocale`

Sources: the "Migration to Version 15 / 16 / 17" sections of the PostgreSQL release notes (postgresql.org/docs/release/15.0, 16.0, 17.0) and the AWS Aurora PostgreSQL and RDS for PostgreSQL release calendars.

Lines inside `--` comments and `#` config comments are skipped, so a note like `-- adminpack dropped before the upgrade` does not count.

## Use

1. Open a `.sql`, `.conf` or `.tf` file. Findings appear in the Problems panel with the version that removed the feature and the fix.
2. Run **PostgreSQL 14 Upgrade Lint: Check this file** from the command palette at any time.
3. The target defaults to PostgreSQL 17, the newest version with a full release calendar on both Aurora and RDS.

## Free and paid

Free, with no key: the open file, every rule, every fix, in VS Code and on the web page.

Paid ($29 once, one licence key per person or team seat): scan every migration in the workspace at once and export one upgrade-blocker report (Markdown + CSV) to attach to the upgrade ticket. [Get the full version](https://buy.polar.sh/polar_cl_s5avrba8KowKm6k2clM21lHLbLMEFg3UCrkFv41dVza)

The rules run on your machine. Nothing in your files is uploaded; only a licence key is sent to the licence server when you enter one.
