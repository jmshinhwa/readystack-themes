# NIS2 Incident Runbook Lint (Article 23)

![NIS2 Incident Runbook Lint (Article 23)](https://getreadystack.com/img/promo/sku46696_result_card.jpg)

**Your runbook names one deadline. NIS2 Article 23 sets three.**

An incident-response runbook drafted with an AI assistant usually reads well and usually carries one number: 72 hours. That number is the GDPR Article 33 habit. NIS2 Article 23(4) is staged: an **early warning within 24 hours** of becoming aware of a significant incident, an **incident notification within 72 hours**, and a **final report not later than one month** after that notification, with an intermediate report whenever the CSIRT asks and a progress report when the incident is still running at the one-month mark.

This extension reads the runbook you have open and reports, line by line, which of those obligations the text does not carry.

## What it found on the sample runbook shipped with it

`_fixtures/dirty.md` is a 32-line plan of the kind an assistant produces. The linter returns **15 findings, 8 of them errors**:

| Line in the runbook | What Article 23 says |
| --- | --- |
| early warning "within 48 hours of the incident being contained" | 24 hours, counted from becoming aware - Article 23(4)(a) |
| "incident notification to the regulator within 5 days" | 72 hours from awareness - Article 23(4)(b) |
| "final report within 14 days of the notification" | one month after the incident notification - Article 23(4)(d) |
| no mention of unlawful or malicious acts, or cross-border impact | both belong in the 24-hour early warning - Article 23(4)(a) |
| no definition of a significant incident | severe operational disruption, considerable financial loss, or considerable material or non-material damage to others - Article 23(3) |
| `[name]`, `[email]` left in the escalation list | at 03:00 an unfilled contact is a missed deadline |
| "Last reviewed: 2024-11-05" | 22.2 months before the check date |

`_fixtures/clean.md` is the same runbook written correctly and returns **0 findings**, so you can see both ends of the ruler before you point it at your own file.

## The 16 rules

Three deadline rules (24 hours, 72 hours, one month) that read the number on the line and compare it, not just look for the words. The awareness trigger. The unlawful-or-malicious and cross-border statements. The contents of the 72-hour notification: initial assessment, severity, impact, indicators of compromise. Intermediate report, progress report, final report contents (root cause and mitigation measures). The CSIRT or competent authority as addressee. The Article 23(3) significance criteria. Informing the recipients of your services. Whether the entity declares itself essential or important under Annex I or II. Unfilled placeholders. A review date, flagged when it is older than twelve months relative to the date you check against.

## How to run it

1. Open a runbook in Markdown.
2. **NIS2: Check this runbook** from the command palette, or save the file with checking on save enabled.
3. Findings appear in the Problems panel with the line and the article. Nothing leaves the machine; the rules are a local JSON file you can read.

The same engine, byte for byte, runs in the browser at <https://getreadystack.com/tools/nis2-incident-runbook-lint> - paste a runbook, nothing is uploaded.

## Free and licensed

Free, with no registration and no expiry: the runbook you have open, all 16 rules, every finding.

Licensed: the workspace sweep. One command walks every Markdown runbook in the workspace and writes a single dated report file listing each file, each finding and the rule it failed - the artefact an auditor asks for. A licence key is one seat, 29 dollars once, 7-day full refund: <https://buy.polar.sh/polar_cl_Q5sXD7c9oqRLoEPaJWOpB8gz9waQqKebymb4y36LpKx>

For scale: the BDU consulting market survey puts the average NIS2 consultant day rate at EUR 1,300. This runs before you book that day.

## Notes

Article 34 sets the penalty ceiling for essential entities at EUR 10,000,000 or two percent (2%) of total worldwide annual turnover, whichever is higher, and for important entities at EUR 7,000,000 or 1.4%. The rules cite Directive (EU) 2022/2555. Results are advisory and are not legal advice; sector-specific thresholds under Implementing Regulation (EU) 2024/2690 are not modelled.
