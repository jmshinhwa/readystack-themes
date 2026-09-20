# Payroll Rate Expiry Lint

![Payroll Rate Expiry Lint](https://getreadystack.com/img/promo/sku130737_result_card.jpg)

A payroll rate table is the one file in a payroll system that is wrong by default. Every figure in it —
the US OASDI wage base, the UK employer secondary threshold, the German Minijob monthly limit, the French
PASS, the Canadian CPP ceiling — is replaced on a fixed day by a body that does not send a pull request.
The code keeps running. The table keeps answering. Nothing throws.

This extension reads your rate tables (`**/*.{json,js,ts}`) and reports two kinds of trouble:

1. **Prior-year statutory constants.** Seven known figures across five countries are recognised by value
   and reported with the day that country resets — 2027-01-01 for the US, Germany, France and Canada,
   2027-04-06 for the UK tax year. The employer Class 1 secondary rate of 13.8% is reported because it
   applied only up to 2025-04-05.
2. **Entries that cannot be checked at all.** A rate entry with no `effective_from`, no end date, no
   `country`, an end date already in the past, a block named `current`, a table keyed to a closed tax
   year, a percent value stored with no `unit`, or an unresolved TODO sitting on a statutory figure.

**15 rules**, run on every open file and across the workspace.

## Measured on the shipped fixtures

- `_fixtures/clean.json` — a seven-entry table, every entry dated and attributed: **0 findings**.
- `_fixtures/dirty.json` — the same seven figures a year out of date: **23 findings**, of which
  **7 are stale statutory constants** across **5 countries** (US, GB, DE, FR, CA).

Both files ship inside the extension, so you can reproduce those two numbers before you trust the tool
on your own tables.

## The free tool is the whole check

Open a rate table and run **Payroll Rate Expiry: Check This File**, or
**Payroll Rate Expiry: Check Workspace**. You get every finding, its line number, its severity and the
reset date that applies. Nothing is held back, nothing is blurred, no counter runs down. The same engine
runs as a single page in the browser at https://getreadystack.com/tools/payroll-rate-expiry-lint — paste
a table, get the same findings from the same `ext/engine.js` and the same `ext/rules.json`.

## The full version

The full version writes the audit out: a dated report and a per-country renewal calendar for the whole
workspace, for team and commercial use, so next year's reset is on a calendar instead of in someone's
memory. One licence key per person or team seat, activated in the editor:
https://buy.polar.sh/polar_cl_Tdqu9vdxrn87T5MbFarHA1yN9HyELld2UyIeh3uK2Xp

**The yardstick:** one hour of outside payroll-tax advice costs more than the full version does once.

## What it does not do

It does not tell you the correct figure for your jurisdiction — a published figure has a source and a date,
and this tool will not invent one. It tells you which figures in your table cannot be the current ones and
when each of them was replaced, so the lookup you do is short and aimed.

## Rules

Every rule lives in `ext/rules.json` as data. Add your own jurisdiction by adding an object with an `id`,
a `kind`, a regular expression and the message you want your team to read.

MIT licensed. Works offline; nothing in your tables leaves the machine.
