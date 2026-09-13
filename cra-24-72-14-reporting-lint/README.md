# CRA 24/72/14 Reporting Lint (Article 14)

![CRA 24/72/14 Reporting Lint (Article 14)](https://getreadystack.com/img/promo/sku36068_result_card.jpg)

**On 11 September 2026 the EU Cyber Resilience Act's reporting obligation started applying — including to products already on the market.** From that date, a manufacturer who becomes aware of an *actively exploited vulnerability* or a *severe incident* owes three filings on a clock measured in hours: an early warning within **24 hours**, a notification within **72 hours**, and a final report within **14 days** of a corrective measure being available. They go to **ENISA** and to the **CSIRT designated as coordinator** for your main establishment, through the single reporting platform.

Most `SECURITY.md` files in public repositories were written before any of that existed. They promise a reply "within 5 business days", point at a supervisory authority, or repeat the December 2027 date that belongs to the *other* obligations. This extension reads that file and names every line that will not survive contact with Article 14.

![Findings in the output panel](https://getreadystack.com/img/cra-24-72-14-reporting-lint/demo.gif)

## What it checks — 18 rules, offline

| Group | Examples |
| --- | --- |
| The clock | 24-hour early warning, 72-hour notification, 14-day final report |
| The recipients | ENISA named, coordinating CSIRT named, single reporting platform named |
| The triggers | "actively exploited" defined, "severe incident" defined |
| The mistakes | December 2027 quoted as the reporting start date, reports routed to a supervisory authority, the GDPR 72-hour clock treated as the same obligation, a response window measured in days sitting beside one measured in hours |
| The supporting facts | single point of contact, coordinated disclosure policy, SBOM reference, support period end date in ISO form — and whether that date has already lapsed or falls short of five years |

Every finding carries the article it comes from and one concrete line to write instead. Nothing is sent anywhere: the rule table ships inside the extension and the whole run happens in your editor.

## Use it

1. Open `SECURITY.md`, your disclosure policy, or the incident runbook.
2. Run **CRA 24/72/14: Check this file** from the command palette.
3. Read the findings in the output panel and fix them.

That is the free scope, and it is the whole rule set — no watermark, no trial counter, no withheld finding.

The full version widens the **scope**: it sweeps every Markdown file in the workspace in one pass, works out which checks are answered *nowhere* in the repository rather than merely missing from one file, and writes a single dated `CRA-24-72-14-READINESS.md` you can hand to an auditor. Run **CRA 24/72/14: Sweep the whole workspace** to unlock it with a licence key.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.

## Settings

- `craReporting.min_severity` — hide findings below `info`, `warn` or `error`.
- `craReporting.today` — pin the date used for support-period arithmetic, so a report reproduces later.
- `craReporting.include_glob` — which files the workspace sweep reads. Defaults to `**/*.md`.

## Honest limits

This is a linter for a *document*, not a legal opinion and not a conformity assessment. It tells you that your runbook never names a CSIRT; it cannot tell you whether your product is in scope, which class it falls into, or whether a given vulnerability is being actively exploited. Article 14 also allows a one-month final report for severe incidents, and open-source stewards carry a lighter duty under Article 24 — the rules here flag the manufacturer path.

Regulation (EU) 2024/2847, Articles 13, 14 and 16; Annex I Part II; Annex II. Other tools from the same workshop: https://getreadystack.com
