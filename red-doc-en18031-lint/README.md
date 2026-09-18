# RED Cybersecurity DoC Lint (EN 18031)

![RED Cybersecurity DoC Lint (EN 18031)](https://getreadystack.com/img/promo/sku96629_result_card.jpg)

Your EU declaration of conformity is the one page that market surveillance reads first, and since
**1 August 2025** it has to carry the radio cybersecurity requirements of Directive 2014/53/EU that
**Delegated Regulation (EU) 2022/30** switched on. Most declarations in circulation were written
before that and still say *1 August 2024* — the date that Delegated Regulation (EU) 2023/2444
replaced.

This extension lints the declaration where it already lives: a Markdown file in the repository, next
to the firmware it describes. Open it, run **RED DoC Lint: check this file**, and every gap appears
with its line number and the article behind it.

## What it checks — 18 rules

**12 error-level rules**

| Rule | What it catches |
|---|---|
| `red_directive` | no reference to Directive 2014/53/EU (Annex VI point 5) |
| `rtte_repealed` | the repealed R&TTE Directive 1999/5/EC is still cited |
| `delegated_2022_30` | Delegated Regulation (EU) 2022/30 is never referenced |
| `art_3_3_d` | Article 3(3)(d), network protection, is not named |
| `old_2024_date` | the withdrawn 1 August 2024 application date |
| `en18031_restriction` | EN 18031 cited with no note of the Official Journal restrictions |
| `notified_body` | EN 18031 cited with no notified body name and four-digit number |
| `sole_responsibility` | the Annex VI point 3 sentence is missing |
| `object_identifier` | no model, type, batch or serial number (Annex VI points 1 and 4) |
| `manufacturer_address` | no postal address of the manufacturer (Annex VI point 2) |
| `signature_block` | no place and date of issue, name, function (Annex VI point 9) |
| `issued_before_applicability` | dated before 1 August 2025, so it cannot cover (EU) 2022/30 |

**6 advisory rules** — `eu_not_ec_title`, `art_3_3_e`, `art_3_3_f`, `en18031_edition`,
`software_version`, `declaration_age` (a declaration more than 365 days old, measured against
today's date).

## Measured on the bundled fixtures

The repository ships two declarations. `_fixtures/clean.md` returns **0 findings**.
`_fixtures/dirty.md` — a 2024-era declaration for a Wi-Fi smart plug — returns **13 findings**:
**8 errors and 5 warnings**, of which **6** are the ones that stop a CE mark: the 1999/5/EC
citation, the 1 August 2024 date, the undated `EN 18031-1`, the missing restriction note, the
missing notified body, and an issue date of 2024-11-05 — 269 days before the requirements applied,
and 681 days old today.

## Free and paid

Free, no key: lint the open file against all 18 rules, in VS Code or in the browser at
<https://getreadystack.com/tools/red-doc-en18031-lint>. That finishes the job for one declaration.

Paid, $29 once, one licence key per person or CI seat, 7-day full refund: sweep **every**
declaration in the workspace in one pass and write one dated audit report file to keep with the
technical documentation. The payment page is linked from the web version.

**Yardstick:** EU RED compliance consultancy is typically billed at $150 to $250 per hour, and a
notified body assessment costs far more again.

## Notes

- The rule table is `ext/rules.json`; the same engine file runs in VS Code and in the browser.
- No telemetry, no network calls except licence validation.
- Legal engineering aid, not legal advice. The declaration stays your responsibility — that is what
  Annex VI point 3 says.

MIT licensed. Hub: <https://getreadystack.com/tools/red-doc-en18031-lint>
