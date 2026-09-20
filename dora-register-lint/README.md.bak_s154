# DORA Register of Information Lint

![DORA Register of Information Lint](https://getreadystack.com/img/promo/sku54671_result_card.jpg)

Open the register CSV your team exports for DORA (Regulation (EU) 2022/2554, Article 28(3)) and press
**DORA Register Lint: Check this file**. Every row is read where it sits — nothing is uploaded, nothing is
sent to a model, nothing leaves the machine. The register lists who holds your data and which functions
would stop if they did; it is not a file you can paste into a chat window.

AI-written export code is now the normal way these files get produced, and the questions this extension
answers are exactly the ones a generator cannot answer about itself: are these twenty characters a real
LEI, does this link resolve to a row that exists, is this contract still live on the date you are filing.

## What it checks — 24 checks, all computed from the file

**Identifiers**
- `lei_checksum` — recomputes the ISO 7064 MOD 97-10 check digits inside every LEI (ISO 17442) and tells you
  the two digits it expected. A transposed character passes every eye and fails the load.
- `lei_length`, `lei_charset`, `lei_placeholder` — 20 characters, upper-case A–Z and 0–9, and no `N/A`,
  `TBD` or twenty zeros standing in for an identifier.
- `lei_name_conflict` — the same LEI filed under two different legal names on two rows.

**References between rows**
- `duplicate_contract_ref` — one contractual arrangement reference used twice.
- `unresolved_link` — a row pointing at an overarching arrangement that no row in the file declares.
- `self_link`, `duplicate_row` — a row that is its own parent, a row filed twice.

**Dates**
- `date_format` — `01/04/2024` is 1 April in Dublin and 4 January in a loader that reads ISO 8601.
- `date_impossible` — `2026-02-30` does not exist.
- `date_order` — an end date before its start date.
- `contract_expired` — an arrangement that ended before the reference date you are filing as of. You choose
  the date; move it and the answer moves with it.

**Codes and amounts**
- `country_shape` / `country_unknown` — ISO 3166-1 alpha-2, not `Norway`, not `NOR`.
- `currency_shape` / `currency_unknown` — ISO 4217 alpha-3, not a symbol.
- `bool_token` — a yes/no column answered `Critical`.
- `amount_format` — `412.000,00` and `1,250,000.00` reported as digits with one optional decimal point.

**File shape**
- `row_field_count` — an unescaped comma that shifted every value after it.
- `missing_column`, `empty_required`, `delimiter_not_comma`, `mojibake` — a required column absent, a
  required cell empty, a semicolon export from a regional Excel, `CrÃ©dit` where `Crédit` was meant.

The column names are matched loosely (`LEI of the ICT third-party service provider`,
`Type of ICT service`, `Start date of the contract`…), so your own export headers are recognised without
renaming anything.

## Free and paid

Free, no key, no account: **check the register CSV open in your editor** — every row, all 24 checks, with
findings in the Problems panel and a written summary in the output channel. That is a finished job.

Paid ($29 once, one licence key per person or CI seat, 7-day full refund): **sweep every register CSV in
the workspace and write one dated report file** — `doraRegister-report.md` — that you can attach to the
audit trail. The full sweep runs free for seven days from the first time you use it, so you see the paid
answer on your own file before you decide. Yardstick: one hour of the compliance analyst who would
otherwise re-check the file by hand costs more than the licence; a manual pass over an 800-row register is
24 × 800 = 19,200 check-row comparisons.

## Numbers from the sample

The 11-row sample register shipped with this repository (`_fixtures/dirty.csv`) produces **24 findings —
19 errors and 5 warnings — on 10 of its 11 rows**. The corrected copy (`_fixtures/clean.csv`) produces none.

## Where else it runs

The same engine file, byte for byte, runs in the browser at
<https://getreadystack.com/tools/dora-register-lint> — paste a register, get the same 24 checks, still
without uploading anything.

Findings are format, arithmetic and consistency facts about your file. They are not legal advice and they
do not tell you whether your register is complete.
