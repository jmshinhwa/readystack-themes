# YugabyteDB Migration Check: CockroachDB SQL

![YugabyteDB Migration Check: CockroachDB SQL — finds the line](https://getreadystack.com/img/promo/yugabytedb-migration-check_demo.gif)

![YugabyteDB Migration Check: CockroachDB SQL](https://getreadystack.com/img/promo/sku392238_result_card.jpg)

**YugabyteDB migration check for CockroachDB schema and migration files.** Open a `.sql` file exported from CockroachDB and every line that YugabyteDB YSQL rejects, or silently reads differently, is underlined with the rewrite next to it.

Measured on the sample `orders.sql` in this repo: **6 findings** — telemetry switched off, `INT` (64-bit in CockroachDB, 32-bit in YSQL), `unique_rowid()`, `STRING`, an inline `INDEX` inside `CREATE TABLE`, and `UPSERT INTO`. The rewritten file returns 0.

Yardstick: the CockroachDB Licensing FAQ (docs.cockroachlabs.com/docs/stable/licensing-faqs) for the licence rules, and PostgreSQL syntax as implemented by YugabyteDB YSQL for the SQL rules.

Web version (same engine, runs in the browser, nothing uploaded): https://getreadystack.com/tools/yugabytedb-migration-check

## Why teams are moving now

Cockroach Labs retired the free CockroachDB Core edition with **24.3.0 on 2024-11-18**. From that date every release — including patch releases for 23.1 to 24.2 — ships under the CockroachDB Software License:

- a cluster without a licence key gets a **7-day grace**, then is throttled to **5 concurrent open SQL transactions**;
- **Enterprise Free** is limited to businesses with **less than $10M annual revenue**, renewed yearly;
- Enterprise Free and Trial clusters are throttled after **7 days without sending telemetry**;
- the Enterprise Trial lasts **30 days**.

YugabyteDB is Apache-2.0 and speaks the PostgreSQL dialect (YSQL). CockroachDB also speaks "PostgreSQL wire protocol", which is why the schema looks portable. It is not: CockroachDB added its own types, defaults and statements, and a plain PostgreSQL linter accepts `INT` as valid SQL, so the 64-bit to 32-bit change passes without a warning.

## What it checks — 25 rules

| Group | Rules |
|---|---|
| Licence and settings (4) | `licence-image` (cockroachdb/cockroach image v23.1+ or latest), `licence-key-setting`, `licence-telemetry-off`, `cluster-setting` |
| Types and keys (5) | `string-type` (STRING → TEXT), `bytes-type` (BYTES → BYTEA), `int-width` (INT → BIGINT), `serial-width` (SERIAL → BIGSERIAL), `unique-rowid` (→ identity) |
| DDL (10) | `hash-sharded-index`, `column-family`, `inline-index`, `inverted-index` (→ GIN), `storing-clause` (→ INCLUDE), `configure-zone`, `multi-region-locality`, `alter-primary-key`, `on-update-expr`, `virtual-column` |
| DML and operations (6) | `upsert` (→ INSERT ... ON CONFLICT), `as-of-system-time`, `changefeed`, `crdb-internal`, `split-at`, `bulk-io` (IMPORT / BACKUP / RESTORE) |

Comments and string literals are skipped, so `'STRING'` inside a value or a `-- UPSERT` note never fires. Statements that wrap over several lines still match.

## Use

1. Open a `.sql` file. Findings appear in the Problems panel as you type and save.
2. Each message ends with `->` and the YSQL rewrite.
3. The licence rules also add how many days have passed since 2024-11-18, so the ticket carries the date.

The free version checks the file you have open, completely, with no key.
The full version scans every `.sql` migration in the workspace in one pass and exports the findings as a Markdown migration report for the change ticket.

## Privacy

The engine runs locally. No SQL leaves your machine, in VS Code or on the web page.

## Limits

This is a static check of SQL text. It does not connect to either database, does not compare row counts, and does not rewrite files for you. Query plans and performance after the move are out of scope.

License: see LICENSE.txt.
