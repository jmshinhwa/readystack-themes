# Resilience Plan Lint — CER Directive checks for critical infrastructure risk assessment files

![Resilience Plan Lint (CER Directive) — finds the line](https://getreadystack.com/img/promo/resilience-plan-lint_demo.gif)

![Resilience Plan Lint (CER Directive)](https://getreadystack.com/img/promo/sku335211_result_card.jpg)

Checks a critical entity's risk assessment and resilience plan (Markdown) against EU CER Directive 2022/2557, Articles 12 to 15. Each gap comes back with its line number, the article it breaks and the fix.

Web version and rule list: https://getreadystack.com/tools/resilience-plan-lint

Yardstick: an online CER Directive trained-professional course costs $297. It teaches the articles, but it does not check your plan line by line.

## What it checks (9 rules)

| Rule | Article | What the plan must say |
|---|---|---|
| CER-15-INITIAL | Art. 15(1) | Initial incident notice to the competent authority no later than 24 hours after becoming aware |
| CER-15-REPORT | Art. 15(1) | Detailed report no later than one month after the initial notice |
| CER-15-MISSING | Art. 15(1) | An incident notification procedure exists at all |
| CER-12-CYCLE | Art. 12(1) | Re-assessment whenever necessary and at least every four years |
| CER-12-FIRST | Art. 12(1) | First risk assessment within nine months of the designation notice |
| CER-12-HAZARDS | Art. 12(1) | Natural hazards, accidents, public health emergencies and antagonistic threats (terrorism, sabotage, insider) |
| CER-12-DEPEND | Art. 12(1) | Which sectors depend on you, and which you depend on |
| CER-13-LIAISON | Art. 13(3) | A named liaison officer or equivalent as point of contact |
| CER-13-MEASURES | Art. 13(1) | Physical protection, recovery and business continuity, personnel security and background checks, staff training and exercises |

## Worked example (the sample plan in `_fixtures/dirty.md`)

The sample is a water utility plan notified on 2026-08-14. The lint returns six findings (five errors, one warning):

| Plan says | CER requires |
|---|---|
| 72 hours initial notice | 24 hours (Art. 15) |
| Detailed report in 60 days | One month (Art. 15) |
| Review every five years | At least every four years |
| First assessment 2027-06-30 | Due 2027-05-14 (nine months) |
| No public health hazard | All hazards (Art. 12) |
| No liaison officer | Named contact (Art. 13) |

## Why NIS2 templates get this wrong

NIS2 incident reporting has three steps: a 24-hour early warning, a 72-hour incident notification and a one-month final report. CER Article 15 has two: an initial notification within 24 hours and a detailed report within one month. A plan copied from a NIS2 template often carries the 72-hour step as the first notice. For CER, that notice is 48 hours late.

## Deadline logic

If the plan states the designation notice date ("Designation notified: 2026-08-14"), the first-assessment deadline is nine calendar months later (2027-05-14). If the plan gives a later completion date, that line is flagged. If the plan gives no completion date and the deadline has passed on the date you check, the plan is flagged as overdue.

## Usage

Open a `.md` plan and run **Resilience Plan Lint: Check current file** from the Command Palette. Findings appear in the Problems panel. The free check covers one file at a time and has no limit on runs.

Full version: scan every plan in the workspace at once and export a dated gap report for the auditor file — [one licence key](https://buy.polar.sh/polar_cl_roT2BUBnJjC4ZxUPjFykawCuTQbNsbn1GgRWi03ruw0).

## Limits

The lint reads text. It cannot tell whether your measures are adequate. It only checks that the plan covers each Article 12–15 element and that the deadlines match the directive. National transposition laws may add stricter duties. Check your competent authority's guidance.
