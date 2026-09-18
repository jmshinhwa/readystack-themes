# EU Data Act Switching Clause Lint

![EU Data Act Switching Clause Lint](https://getreadystack.com/img/promo/sku55244_result_card.jpg)

Your exit clause was probably written before Chapter VI of the Data Act applied. Regulation (EU) 2023/2854 has applied
since 12 September 2025, and from **12 January 2027** a provider may charge nothing at all for switching. Most terms
files in most repositories still say 90 days' notice, a six-month transition, a two-week download window and an egress
price per gigabyte. AI drafting assistants reproduce that shape, because that is what the pre-2025 templates look like.

This extension reads contract text - `terms.md`, `msa.md`, the DPA, the reseller annex - and names the clauses Chapter VI
no longer allows, one line at a time, each with its article number and the wording that replaces it.

## What it checks (20 rules)

| Area | Rule ids | Chapter VI |
| --- | --- | --- |
| Getting out | `notice_period_over_two_months`, `transition_period_over_30_days`, `auto_renewal_blocks_switching`, `early_termination_penalty` | Art. 23, Art. 25(2) |
| Price of leaving | `switching_charge_without_sunset`, `egress_charge`, `per_gigabyte_export_charge`, `charges_sunset_countdown` | Art. 29 |
| Your data back | `retrieval_window_under_30_days`, `immediate_deletion_on_exit`, `proprietary_export_only`, `missing_export_format_promise` | Art. 25(2), Art. 30 |
| Duties you must state | `missing_right_to_switch`, `missing_exit_assistance_clause`, `no_exit_assistance_promised`, `missing_functional_equivalence` | Art. 25(2), Art. 30 |
| Transparency | `missing_jurisdiction_disclosure`, `missing_data_structures_register`, `missing_switching_contact_point`, `stale_applicability_date` | Art. 26 |

The charge rule is date-aware: run it today and it counts the days left until 12 January 2027; run it after that date and
the same clause is reported as an error rather than a warning.

## Example

The bundled sample contract `_fixtures/dirty.md` produces **21 findings - 14 errors and 7 warnings** across all 20 rules.
The corrected version, `_fixtures/clean.md`, produces **0**. Two of the findings read:

```
L5   error   Art. 25(2) - Notice period of 90 days to start switching. Chapter VI caps the notice
             period for initiating switching at two months (Art. 25(2)).
L10  warn    Art. 29 - This contract still prices leaving. Switching charges must be zero from
             12 January 2027 - 121 days from 2026-09-13.
```

## Free and paid

**Free, no key:** check the file open in the editor. Every finding in that file, with its article, its line and the
replacement wording. That is a complete job - one contract, checked.

**Paid, $29 once:** the workspace sweep and the dated report. One command runs the same 20 checks over every contract
file in the workspace and writes a dated Markdown report with a per-file table - the artefact you hand to counsel or
attach to a tender answer. One licence key per person or team seat. 7-day full refund.
Get a key: <https://buy.polar.sh/polar_cl_PQWEmhUFLQJSTpOot3FMujKCDC8ALMzB8eBRl2DyIVx>

Yardstick: an EU technology lawyer reviewing the exit clauses of one cloud contract bills at EUR 250-450 per hour.

## Commands

- `Data Act Switching: Check This File` - free
- `Data Act Switching: Sweep Workspace and Write Report` - paid
- `Data Act Switching: Enter Licence Key`

## Browser version

The same engine, one page, nothing uploaded: <https://getreadystack.com/tools/data-act-switching-lint>

## Not legal advice

The extension reports text against the wording of Chapter VI of Regulation (EU) 2023/2854. It is a reading aid for the
people who maintain the files, not an opinion on your contract.
