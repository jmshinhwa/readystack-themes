# Farm Loss Notice Lint — crop insurance claim deadlines (7 CFR 457.8, section 14)

![Farm Loss Notice Lint: Crop Insurance Deadlines — finds the line](https://getreadystack.com/img/promo/farm-loss-notice-lint_demo.gif)

![Farm Loss Notice Lint: Crop Insurance Deadlines](https://getreadystack.com/img/promo/sku366657_result_card.jpg)

Checks a crop insurance loss log written in Markdown and marks every notice or claim date that missed a deadline in the Common Crop Insurance Policy Basic Provisions, 7 CFR 457.8, section 14. Each finding shows the date that was due.

Web version (same engine, runs in the browser, nothing uploaded): https://getreadystack.com/tools/farm-loss-notice-lint

**Yardstick:** under section 14(b)(5), if you fail to submit a notice of loss, the loss is considered solely due to an uninsured cause: no indemnity is paid and premiums are still owed.

## What it checks (9 rules)

| Rule | Deadline | Source |
|---|---|---|
| notice-72h | notice of damage within 72 hours of initial discovery, by unit | section 14(b)(1) |
| notice-after-period | notice no later than 15 days after the end of the insurance period, even if not harvested | section 14(b)(1) |
| notice-missing | damage recorded, no notice given, 72 hours passed | section 14(b)(1), (b)(5) |
| written-confirmation-15d | a phone or in-person notice must be confirmed in writing within 15 days | section 14(b)(4) |
| prevented-planting-72h | prevented planting notice within 72 hours after the final planting date (no late planting) | section 14(b)(3) |
| claim-60d | claim for indemnity within 60 days after the insurance period ends for the unit; for revenue protection the later of that and 60 days after the harvest price release | section 14(e)(3) |
| samples-before-harvest | damage reported less than 15 days before harvest: leave representative samples intact | section 14(c)(1) |
| rp-harvest-price-date | revenue protection unit without a harvest price release date (claim date unknown) | section 14(e)(3)(ii) |
| ambiguous-date | a date such as 07/08/2026 instead of 2026-07-08 | ISO 8601 |

Rules re-checked on 2026-09-29 against the 2027 crop year text, FCIC Basic Provisions 27.1-BR (RMA, released June 2026): the section 14 notice and claim deadlines are unchanged from 26-BR. Source: 7 CFR 457.8, Common Crop Insurance Policy Basic Provisions, section 14 "Duties in the Event of Damage, Loss, Abandonment, Destruction, or Alternative Use of Crop or Acreage" (eCFR). Your Crop Provisions and Special Provisions can add their own dates; the end of the insurance period is an input because it differs by crop, county and unit.

## Log format

One heading per unit, then `key: value` lines:

```markdown
## Unit 0001-0001 · Corn · hail
- plan: YP
- damage_discovered: 2026-07-14
- notice_given: 2026-07-20
- notice_method: phone
- written_confirmation: 2026-08-10
- insurance_period_end: 2026-10-01
- claim_submitted:
- harvest_start: 2026-09-20
- samples: left
```

Prevented planting units use `prevented_planting: yes`, `late_planting: no`, `final_planting_date` and `pp_notice`. Revenue protection units use `plan: RP` and `harvest_price_release`.

## Sample result

The sample log (Miller Farms, crop year 2026, checked on 2026-09-28) has six missed deadlines:

| Log line | Date it was due |
|---|---|
| Hail found 2026-07-14, notice 2026-07-20 | 2026-07-17 (72 hours) |
| Phone notice 2026-07-20, written 2026-08-10 | 2026-08-04 (15 days) |
| Drought found 2026-08-20, no notice | 2026-08-23, loss uninsured |
| Wheat period end 2026-07-10, claim 2026-09-14 | 2026-09-08 (60 days) |
| Final planting 2026-05-31, PP notice 2026-06-08 | 2026-06-03 (72 hours) |
| Period end 2026-08-15, notice 2026-09-01 | 2026-08-30 (15 days) |

Checked again on 2026-10-20, the same log has seven: the sorghum unit's claim was due 2026-10-14.

## Commands

- **Farm Loss: Check this log** — runs on open and on save for `*.md` files; findings appear in the Problems panel.
- Free, no key: every rule on the file open in the editor.

## Full version

Sweep every unit log in the workspace at once and write one dated deadline report (every finding, the date each notice or claim was due) for the agency file — [get the full version](https://getreadystack.com/api/buy/cl/polar_cl_TfuT927G0YBnPvOdmJt1uoZ9GIRYV1Gj8M1KJ46x3Ax), $29 once, one licence key per person or team seat.

This tool reads dates; it does not give legal advice or replace your agent or your policy's Crop Provisions.
