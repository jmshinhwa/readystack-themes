# CRA Reporting Clock Lint (EU 2024/2847)

![CRA Reporting Clock Lint (EU 2024/2847)](https://getreadystack.com/img/promo/sku36900_result_card.jpg)

Opens the `SECURITY.md` in your editor and checks it against the clocks and
clauses of the EU Cyber Resilience Act, Regulation (EU) 2024/2847.

Three dates decide what this file has to say. Chapter IV, on the notification of
conformity assessment bodies, has applied since **11 June 2026**. The Article 14
reporting obligations have applied since **11 September 2026**. The rest of the
Regulation applies from **11 December 2027**. Most published security policies
were written before the middle date and still describe a disclosure practice
that the Regulation has since overtaken.

## What it checks

17 rules, each carrying the article or annex point it comes from:

| Clock or clause | Source |
| --- | --- |
| Early warning within 24 hours, to the coordinator CSIRT and ENISA | Art. 14(2)(a) |
| Vulnerability notification within 72 hours | Art. 14(2)(b) |
| Final report within 14 days of a corrective measure | Art. 14(2)(c) |
| Severe incident: separate track, final report within 1 month | Art. 14(4) |
| Support period of at least 5 years | Art. 13(8) |
| End date of the support period stated to users | Annex II(7) |
| Coordinated vulnerability disclosure policy in place and enforced | Annex I Part II(5) |
| Software bill of materials, machine-readable, top-level dependencies | Annex I Part II(1) |
| Single contact point for vulnerability reports | Annex II(2) |
| Notifications routed through the single reporting platform | Art. 16 |
| Manufacturer or open-source software steward, declared | Art. 24 |
| EU declaration of conformity and CE marking referenced | Art. 28, Art. 30 |

It also flags four things that are present and wrong rather than absent: a stated
response window of 30 to 180 days sitting next to a 24-hour duty, a support
period shorter than five years, a support end date that has already passed as of
today's date, and text that dates the start of the reporting obligations to
December 2027 or December 2024.

## Free and full

Free: lint the `SECURITY.md` you have open and get every missing or contradicted
clause named, with its article number and its deadline.

Full version: scan every `SECURITY.md` in the workspace in one pass and write the
corrected, clause-referenced policy text out to a dated audit file you keep.

## The yardstick

The human alternative is having EU product-compliance counsel read the same file
by the billable hour. Art. 64(2) of the Regulation caps the fine for an
infringement of the Article 13 or Article 14 obligations at EUR 15,000,000 or
2.5% of total worldwide annual turnover, whichever is higher.

## What it is not

It is not legal advice and it does not file anything for you. It reads one
Markdown file and tells you which clause numbers that file does not answer.
Nothing leaves your machine.

More: https://getreadystack.com/tools/cra-reporting-clock-lint
