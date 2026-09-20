# Payroll Deduction Code Audit 2026

"Does the code an AI wrote still obey the rule?" — for payroll integrations the answer lives in one
small file almost nobody reviews: the **deduction code map**. It is the CSV that tells your payroll
engine which internal benefit code is pre-tax, which is after-tax, which plan section supports the
exclusion, and which W-2 Box 12 letter the amount reports under. Nothing in that file is syntax. A
row can be perfectly valid CSV and still put an employee's taxable wages on the wrong line of a W-2.

This extension audits that file. Open a deduction map and run **Payroll Deduction Code Audit: Audit
this file**. Twelve rules read the rows, and every finding comes back with the line number.

## What the twelve rules look for

| # | Rule | Why it matters |
|---|------|----------------|
| 1 | `roth_marked_pretax` | Roth deferrals are always after-tax. A pre-tax flag understates taxable wages. |
| 2 | `garnishment_pretax` | Garnishments, child support and levies are withheld after tax. |
| 3 | `missing_tax_treatment` | With no value, nothing in the map says whether the code reduces taxable wages. |
| 4 | `duplicate_code_conflict` | The same code appearing twice with two treatments makes the result order-dependent. |
| 5 | `pretax_without_plan_basis` | A pre-tax row with no plan basis (125, 401k, 403b, 457b, 132) has nothing supporting the exclusion. |
| 6 | `bad_box12_letter` | Only the IRS W-2 Box 12 letters are accepted (A–H, J–N, P–T, V, W, Y, Z, AA, BB, DD, EE, FF, GG, HH, II). |
| 7 | `deferral_without_box12` | An elective-deferral code with no Box 12 letter (D, E, G, S, AA, BB, EE) reports nowhere. |
| 8 | `hsa_without_box12_w` | HSA contributions report in Box 12 under code W. |
| 9 | `hsa_no_employer_split` | Box 12 code W is employer plus employee combined, so the employer amount has to be in the map. |
| 10 | `stale_plan_year` | Deduction limits reset every January 1; a row dated `2024-01-01` read in plan year 2026 is stale. |
| 11 | `missing_effective_date` | An undated row cannot be tied to a plan year. |
| 12 | `no_withholding_order` | A garnishment code with no order column cannot be ranked against the other deductions. |

## Measured on the bundled samples

Two sample maps ship with the extension in `_fixtures/`.

- `clean.csv` — 9 deduction codes, 9 rows, **0 findings**.
- `dirty.csv` — 10 deduction codes, 11 rows, **13 findings: 7 high, 6 medium**, covering all twelve rules.

A sample line from `dirty.csv` and what the audit says about it:

```
ROTH401K,Roth 401(k) deferral,pre_tax,401k,AA,0.00,150.00,2026-01-01
→ HIGH  L3  roth_marked_pretax  Roth deferrals are always after-tax.
MEDPPO,Medical PPO premium legacy,post_tax,,,300.00,140.00,2026-01-01
→ HIGH  L12 duplicate_code_conflict  MEDPPO first seen on line 11.
```

## Why the timing matters

A wrong deduction flag does not throw. It rides through every pay run of the year and first becomes
visible when Forms W-2 go to employees and to the SSA by **January 31**. From there the fix is a
W-2c per affected employee, plus a re-run of the affected pay periods.

## The yardstick

Hand-checking one deduction map against the Box 12 letter list, row by row, is about half a day of
a payroll analyst's time — and it has to happen again every plan year.

## Free and full

The free tier is complete on its own: every deduction code in the open map is audited against the
twelve rules and each broken line is named with its line number.

Full version: audits every deduction map in the workspace at once and writes a dated exposure
report you keep as the payroll audit trail — <https://buy.polar.sh/polar_cl_nAgRlEvSuB50Wdx5AxIH3jJ7eqwgOTIAwUFRk26gtYC>

## Also on the hub

<https://getreadystack.com/tools/payroll-deduction-code-audit>

## Column names the audit understands

`code` / `deduction_code`, `description`, `tax_treatment`, `plan_basis`, `box12`, `employer_amount`,
`employee_amount`, `effective_date`, `order`. Headers are matched case-insensitively and quoted CSV
fields are handled.
