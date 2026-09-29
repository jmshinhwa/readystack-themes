# Risk Register Lint — NIS2 Art. 21(2)

![Risk Register Lint — NIS2 Art. 21(2) — finds the line](https://getreadystack.com/img/promo/nis2-risk-register-lint_demo.gif)

![Risk Register Lint — NIS2 Art. 21(2)](https://getreadystack.com/img/promo/sku365858_result_card.jpg)

**6 findings in one NIS2 risk register:** two missing Art. 21(2) measures, one risk owner "TBD", one likelihood written as "high", one 4x5 = 20 risk marked Accept, and one review dated 2025-06-30 that is 455 days old on 2026-09-28. That is the bundled sample register, checked by 16 rules.

Risk Register Lint reads the Markdown risk register your security team keeps next to its policies and checks it the way an auditor reads it: are all ten risk-management measures of NIS2 Article 21(2) covered, and is every risk row complete?

Details and the browser version: https://getreadystack.com/tools/nis2-risk-register-lint

## What it checks (16 rules)

**Coverage — 10 rules, one per Art. 21(2) letter.** The Directive (EU) 2022/2555 lists ten measures that essential and important entities must take:

- (a) risk analysis and information system security policies
- (b) incident handling
- (c) business continuity, backup management, disaster recovery, crisis management
- (d) supply chain security
- (e) acquisition, development and maintenance, including vulnerability handling and disclosure
- (f) assessing the effectiveness of risk-management measures
- (g) basic cyber hygiene and cybersecurity training
- (h) cryptography and encryption
- (i) human resources security, access control and asset management
- (j) multi-factor authentication and secured communications

If no risk row cites a letter, you get one finding on the table header line.

**Row completeness — 6 rules.**

- `owner-missing`: owner is empty, TBD, n/a or "?" (ISO/IEC 27001 cl. 6.1.2 c) 2))
- `score-invalid`: likelihood or impact is not an integer 1-5
- `treatment-invalid`: treatment does not start with mitigate, accept, transfer or avoid
- `review-date`: last review is not a YYYY-MM-DD date, or lies in the future
- `review-stale`: last review is more than 365 days before today (ISO/IEC 27001 cl. 8.2 "planned intervals")
- `high-risk-accepted`: likelihood x impact is 15 or more and the treatment is Accept

## The table it expects

Any Markdown table whose header has an Owner and a Treatment column. Other columns are found by name: ID, Art. 21(2) (or Measure / Article), Likelihood, Impact, Last review. Cite measures as `(a), (e)` or `21(2)(d)`.

```
| ID | Risk | Art. 21(2) | Owner | Likelihood | Impact | Treatment | Last review |
|----|------|------------|-------|------------|--------|-----------|-------------|
| R6 | Leaver accounts stay active | (i) | IT ops | 3 | 3 | Mitigate: offboarding ticket | 2025-06-30 |
```

## Why it matters

Article 34 lets authorities fine essential entities up to at least EUR 10,000,000 or 2 % of worldwide annual turnover, and important entities up to at least EUR 7,000,000 or 1.4 %. Article 20 makes the management body approve these measures. A register with a silent gap in (d) or (h) is the first thing a supervisor asks about.

A chatbot can reformat the table, but it does not count which of the ten letters are cited, and it does not know today's date against your review column. This extension does both, deterministically, offline, on every save.

Yardstick: the sample register shows 6 findings in under a second; the same checks by hand mean reading every row against ten letters and a calendar.

## Use

Open any `.md` risk register. Findings appear in the Problems panel with line numbers. Run **Risk Register: Check this file** from the command palette for a report.

The free version checks one register completely, all 16 rules. The full version (licence key) scans every register in the workspace in one pass and exports a dated audit evidence file that maps each finding to its Art. 21(2) letter.

This tool checks structure and coverage. It is not legal advice and does not judge whether your measures are adequate.
