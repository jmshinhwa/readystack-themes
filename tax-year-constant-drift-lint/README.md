# Tax Year Constant Drift

![Tax Year Constant Drift](https://getreadystack.com/img/promo/sku8097_result_card.jpg)

**Your payroll code has a year hardcoded in it. Nothing fails when that year ends.**

```js
const TAX_YEAR = 2025;                    // error  pinned to a literal
const SS_WAGE_BASE = 176100;              // error  $184,500 for 2026
const CATCH_UP_LIMIT = 7500;              // error  no age band since 2025
const ROTH_CATCHUP_WAGE_MIN = 145000;     // error  Roth-only above it from 2026
const EXEMPT_SALARY_THRESHOLD = 58656;    // error  rule vacated 15 Nov 2024
const CONTRACTOR_REPORTING_MIN = 600;     // error  $2,000 after 31 Dec 2025
const FORM_1099K_THRESHOLD = 5000;        // error  restored to $20,000
const VAT_RATE = 0.19;                    // error  no jurisdiction, no date
const FILING_DEADLINE = "2025-04-15";     // error  moves for weekends
const QUALIFIED_TIPS_CAP = 25000;         // warn   expires 31 Dec 2028
const MILEAGE_RATE = 0.67;                // warn   reissued annually
const SCHEMA_SUNSET = "2025-12-31";       // warn   nothing fails after it
// TODO 2025: confirm the bracket table   // info   ships and is forgotten
const SUPER_CATCH_UP_60_63 = 11250;       // silent this shape is correct
```

Those fourteen lines produce **13 findings** — 9 error, 3 warn, 1 info. The same 26 rules
over **12,189 lines** of ordinary application code (express, body-parser, qs, debug, raw-body)
produce **0 errors and 0 warnings**. It is loud where it should be and quiet everywhere else.

The last line is the point. `SUPER_CATCH_UP_60_63` names its age band, so the rule stands down.
A linter that also shouted at correct code is one you turn off after a day.

## Why this class of bug survives review

A general linter checks syntax and style, not the calendar — a wage base from two years ago
is perfectly valid code. And the assistant that autocompleted the number is the same one you
would ask to confirm it, working from the same training year that produced it.

## What changed in the 2025 refresh

Six federal payroll constants are now wrong in code. The rules name each one with its source and date:

| Constant | What happened | Source |
|---|---|---|
| Catch-up contribution | Ages 60–63 get $11,250 against the standard $7,500 | SECURE 2.0 §109; IRS final regulations, 16 September 2025 |
| Roth catch-up wage test | Catch-up must be Roth above $145,000 prior-year FICA wages | SECURE 2.0 §603; compliance from 1 January 2026 |
| Exempt salary threshold | April 2024 overtime rule vacated nationwide; $35,568 and $107,432 stand | E.D. Tex., 15 November 2024 |
| 1099-NEC / 1099-MISC | $600 floor rises to $2,000 for payments after 31 December 2025 | One Big Beautiful Bill Act, P.L. 119-21, 4 July 2025 |
| 1099-K | Restored to $20,000 and 200 transactions | One Big Beautiful Bill Act, 4 July 2025 |
| Social Security wage base | $176,100 for 2025 → $184,500 for 2026 | SSA announcement, 24 October 2025 |

Qualified tips and overtime-premium deductions are covered too: created by the same statute,
retroactive to 1 January 2025, capped at $25,000 and $12,500, and expiring 31 December 2028.

## Try it before you install

The web version runs the identical 26 rules in your browser, on a file you paste, with no
install and no sign-up. Nothing is uploaded.

## What it does for free

- Check the whole open file against all 26 rules, with no key and no sign-up
- Check just the lines you selected, with real file line numbers
- Read every built-in rule message, so you can see the coverage before you trust it
- Hide info-level noise with the severity setting

## With a licence

- **Whole-workspace scan** — Reads every file in the workspace instead of the one you have open, honouring the file-count limit and the exclude glob.
- **Re-check on every save** — Toggles a save listener so the findings for a file refresh the moment you write it.
- **CSV, JSON or HTML report** — Writes the findings to a file in the workspace root in whichever of the three formats you set.
- **Machine-readable CI report** — Writes a JSON findings file that a CI job can read and fail the build on.
- **Your own extra rules** — Opens the settings for the extra-rules list, which is scanned alongside the 26 that ship inside.

[**$29 once — the whole workspace, every save, and CI**](https://buy.polar.sh/polar_cl_RhVooLdndU0D3yxlYr8NvuZKIfGnejLcXJO7k2wKgnO)

Seven-day full refund. The free file checks stay open whether you buy or not.

Yardstick: an independent senior compliance consultant bills $150 to $300 an hour, and a CPA
charges $200 to $450 an hour for business tax work — one review hour costs more than the licence.

## What it does not do

It does not tell you the correct figure and it is not tax advice. It finds the lines whose
truth has an expiry date and names the authority that republishes them. Verifying the number
is still yours.

## Privacy

No telemetry. Your code never leaves the machine. The only network call the extension makes is
to validate a licence key you typed, and it sends only that key and a public organization id.

## Install

```
ext install tax-year-constant-drift-lint
```
