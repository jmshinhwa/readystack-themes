# Currency Minor Unit Lint

![Currency Minor Unit Lint](https://getreadystack.com/img/promo/sku31949_result_card.jpg)

Finds the money lines that send the wrong amount to a payment API: the x100 that charges 100x in JPY, the toFixed(2) that truncates KWD, and the currency codes that stopped being legal tender.

## What it finds

```
line  3  [error]  Math.round(x * 100) charges 100x in the 16 zero-decimal currencies (JPY, KRW, VND...)
line  5  [info]   Zero-decimal currency: 500 JPY is amount 500 - the * 100 above charges 100x here
line  6  [error]  BGN stopped being legal tender on 2026-02-01. Charge EUR (1 EUR = 1.95583 BGN)
line  7  [error]  amount is a decimal literal - 10.99 is read as 10 or rejected outright
line  7  [warn]   KWD is a 3-decimal currency: 1.5 is 1500, not 150, and the last digit must be 0
line  8  [warn]   ISK needs a two-decimal value ending in 00 - 5 ISK is amount 500
line 10  [warn]   Math.round on a float tax rounds 1.005 down to 1 (it is stored as 1.00499999999999989)
line 11  [error]  toFixed(2) prints 1200.00 for JPY and truncates KWD 1.234 to 1.23
--- 15 findings over 8 lines, from 24 rules ---
```

## What it does for free

- Check the file you have open against all 24 rules
- Every finding names the line, the currency and the date - nothing is hidden or watermarked
- Read the 24 rules before you install anything
- Reopen the last findings panel

## With a licence

- **Every file in the repository** — One command over the whole checkout, billing and invoicing tree instead of the file you happen to have open.
- **A CI gate** — Machine-readable output so the build fails before a 100x amount can merge.
- **CSV, JSON or HTML report** — The findings as a file you can hand to finance or attach to a payments audit.
- **Rewrite the retired codes in place** — Replaces BGN and HRK with EUR on the matched text only, leaving the rest of the line untouched.
- **Re-check on every save** — The money lines are checked each time you save, so a wrong amount never reaches a commit.

Payment processors publish a $15.00 fee for every dispute received, and it is not returned when you lose the dispute.

[**Get the full version - $29 once**](https://buy.polar.sh/polar_cl_acLdPf1V4wK36zA20Zdz5ARBivvJMJv1kJ9JI2lqb50) - $29 once, one licence key per person or team seat, 7-day full refund.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.


## Install

```
ext install currency-minor-unit-lint
```
