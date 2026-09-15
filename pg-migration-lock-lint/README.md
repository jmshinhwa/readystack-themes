# Postgres Migration Lock Lint

![Postgres Migration Lock Lint](https://getreadystack.com/img/promo/sku68909_result_card.jpg)

Reads the migration you have open and names every statement that takes a lock Postgres will not share — `ACCESS EXCLUSIVE`, `SHARE`, `SHARE ROW EXCLUSIVE` — and prints the rewrite that does the same thing without stopping traffic.

Works on raw `.sql` migration files, Rails `ActiveRecord::Migration` classes, and Django `migrations.Migration` operation lists.

## Why this file and not a linter in CI

An assistant writes a migration in seconds and it reads perfectly. The lock behaviour is not in the text — it is in which Postgres version you are on and which other statement is already running. Four examples from the rule set:

- `ADD COLUMN x int DEFAULT 0` is fine on PostgreSQL 11 and later, and rewrites the whole table on 10. The extension does **not** flag the safe form; a lot of advice still does.
- `ADD COLUMN x timestamptz DEFAULT now()` is a volatile default, so the fast path does not apply and every row is rewritten under `ACCESS EXCLUSIVE`.
- `SET NOT NULL` skips its table scan on PostgreSQL 12 and later **only** when a validated `CHECK (x IS NOT NULL)` already exists. Without that constraint it still scans.
- A migration with no `lock_timeout` is the actual outage: the DDL waits behind one long `SELECT`, and every query that arrives after the DDL waits behind the DDL. The table is readable, and nothing can read it.

## What it reports

36 rules, one message each, naming the lock mode, the failure (Postgres SQLSTATEs `23502`, `25001`, `42703` where they apply), and the safe rewrite. On the bundled `_fixtures/dirty.sql` — a 20-statement generated migration — it returns 22 findings: 16 at error severity (writes stop, or the statement aborts) and 6 at warning severity (the statement is instant but breaks the release still running). `_fixtures/clean.sql` makes the same schema change, split across statements that do not block, and returns 0.

Rule families: index builds (`CREATE INDEX`, `DROP INDEX`, `REINDEX`, `CLUSTER`), column changes (`ADD COLUMN` defaults, `ALTER COLUMN TYPE`, `SET NOT NULL`, `DROP COLUMN`, `RENAME`), constraints (`FOREIGN KEY`, `CHECK`, `PRIMARY KEY`, `UNIQUE` and the `NOT VALID` / `USING INDEX` two-step), transaction shape (`CONCURRENTLY` inside `BEGIN`, backfill inside the DDL transaction, missing `lock_timeout`), data statements (`UPDATE`/`DELETE` with no `WHERE`, `TRUNCATE`, `VACUUM FULL`), Rails DSL (`add_index`, `add_reference`, `change_column`, `change_column_null`, `remove_column`, `rename_column`, `add_foreign_key`, `disable_ddl_transaction!`), and Django operations (`AddIndex`, `AlterField`, `RenameField`, `RemoveField`, `RunPython`, `AddIndexConcurrently` with `atomic = False`).

Target: PostgreSQL 12 through 17. PostgreSQL 14 receives its last minor release in November 2026, so the 14 → 17 upgrade window is when most of these statements get written.

## Use

Open a migration file and run **Postgres Migration Lock Lint: Check this file** from the command palette. Findings appear in the Problems panel, on the line that carries the lock.

Free tier: the file you have open, all 36 rules, full messages. Full version ($29 once): every migration in the workspace in one pass, plus the review exported as Markdown or JSON to attach to the change ticket, and an exit-code gate for CI — https://buy.polar.sh/polar_cl_zaJ9pwhlczNQZUXiIKP3wGCzfzxe2LYQ6mMD02xD1j5

The same 36 rules run in the browser, on text you paste, with nothing uploaded: https://getreadystack.com/tools/pg-migration-lock-lint

Yardstick: independent Postgres consultancies bill migration review at $150/hour and up; this is one review, priced once.

## Licence

Free tier is unrestricted. The licence key for the full version is validated against the Polar customer portal API; the key check lives in `ext/license.js`.
