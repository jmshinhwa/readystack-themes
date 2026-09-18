# BNPL Disclosure Lint - EU CCD2 2026

![BNPL Disclosure Lint - EU CCD2 2026](https://getreadystack.com/img/promo/sku102892_result_card.jpg)

AI-written storefront code answers from the directive it was trained on. For consumer credit that is
Directive 2008/48/EC, and CCD2 repeals it. This extension reads the template instead of the model.

## The change

**Directive (EU) 2023/2225** - the second Consumer Credit Directive - applies in the EU from
**20 November 2026**. It replaces Directive 2008/48/EC and removes the two exclusions that had kept
buy-now-pay-later outside consumer credit law:

- the **200-euro** lower limit on the credit amount, and
- the carve-out for **interest-free, charge-free** credit.

A "Pay in 4 - 0% interest" block is therefore credit advertising from that date, and Article 8
standard information attaches to the markup that renders it.

## What it checks

The rule set in `ext/rules.json` holds **22 rules**, split in two kinds.

**Missing disclosure (11 rules).** They only fire when the file really offers credit - the engine
first looks for a pay-later context ("buy-now-pay-later", "pay in 3", "instalments", "Klarna",
"deferred payment", and so on). Then it wants, somewhere in the file: the Article 8 warning
`Caution! Borrowing money costs money.`, an APR, a representative example, the total amount payable,
a route to the Standard European Consumer Credit Information form (Article 10), a borrowing rate,
the duration, a named creditor, the cash price of the goods, the 14-day right of withdrawal
(Article 26), and notice of a creditworthiness assessment (Article 18).

**Wrong statement (11 rules).** These fire on the line that carries them: a citation of the repealed
2008/48/EC, reliance on the old 200-euro exemption, "not regulated as consumer credit", "no credit
check / guaranteed approval", a pay-later radio that ships `checked`, the standard information put
behind `display:none` or `aria-hidden="true"`, the APR set in 9px, a bare "Terms apply" line, a
pre-approved credit push, an undisclosed personalised offer, and a mandatory add-on tied to the
credit (Article 14).

## Measured on the shipped fixtures

| file | lines | findings |
|---|---|---|
| `_fixtures/clean.html` | 39 | **0** |
| `_fixtures/dirty.html` | 31 | **20** - 9 high, 9 medium, 2 low |

Run on 17 September 2026 the report also carries the countdown: **64 days** to 20 November 2026.

## Commands

- `CCD2: Check this file` - free, no key. Names every missing disclosure in the open template with
  its rule id and its Article.
- `CCD2: Check this folder` - one pass over every `**/*.{html,htm,jsx,tsx,liquid}` in the workspace.
- `CCD2: Export evidence report` - a dated Markdown report, per-file findings and rule ids.

The last two ask for a licence key. The free command finishes a file on its own.

## Full version

`CCD2: Check this folder` walks the whole storefront folder in one pass and `CCD2: Export evidence
report` writes a dated CCD2 evidence report with per-file findings and rule ids. Licence key:
https://buy.polar.sh/polar_cl_JnseGCHTAOcZ0AlitWyDYryhIwPKIvR6ZdDWi3IEOsc - 29 once, one licence key per person or team seat, 7-day full
refund.

## Yardstick

An EU commercial counsel reviewing one payment flow for consumer-credit disclosure is typically
billed at EUR 250-450 an hour.

## Same engine in a browser

`ext/engine.js` is the whole brain and has no editor dependency, so the same 22 rules run on a
single page: https://getreadystack.com/tools/bnpl-disclosure-lint-ccd2

## Limits

It reads text, not a rendered page - it cannot tell you whether a warning is visible after your CSS
cascade, only whether the markup pushes it out of view. It does not read the member-state law that
transposes CCD2; national rules can ask for more. It is not legal advice.

## Licence

See `LICENSE.txt`.
