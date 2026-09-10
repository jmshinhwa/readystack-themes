# WCAG 2.1 AA Audit: ADA Title II, EAA, 508

![WCAG 2.1 AA Audit: ADA Title II, EAA, 508](https://getreadystack.com/img/promo/sku21264_result_card.jpg)

**Your checklist probably has the wrong deadline.** On 17 April 2026 the US DOJ issued an interim
final rule moving the ADA Title II web deadlines back by one year. Large public entities (population
50,000+) now have until **26 April 2027**; smaller entities and special districts until
**26 April 2028**. Guides, chatbots and internal wikis written before that date still quote
24 April 2026.

This extension audits the file you have open, cites every finding to its exact WCAG success
criterion **and** the matching EN 301 549 clause, then tells you which standard version and which
date actually bind you.

## The part other scanners skip

axe, Lighthouse and eslint-plugin-jsx-a11y detect more than this does, and you should keep using
them. What none of them tell you is **which version you are legally required to meet**:

| Your buyer | Standard that binds you | When |
|---|---|---|
| US public entity, 50,000+ | WCAG 2.1 Level AA | 26 Apr 2027 |
| US public entity under 50,000, special districts | WCAG 2.1 Level AA | 26 Apr 2028 |
| US federal ICT (Section 508) | **WCAG 2.0 Level AA** | in force since 18 Jan 2018 |
| EU, European Accessibility Act | EN 301 549 v3.2.1 → WCAG 2.1 Level AA | in force since 28 Jun 2025 |
| EU, service contract predating the EAA | EN 301 549 v3.2.1 → WCAG 2.1 Level AA | 28 Jun 2027 |

Section 508 still cites **WCAG 2.0** — the 17 criteria added by WCAG 2.1 are not required there.
A scanner running WCAG 2.2 by default will hand a federal team a backlog it is not obliged to clear.
This extension splits your findings into *required here* and *not required here*, and says why.

## Free

- Audit the open file against all 23 rules, every finding cited to its WCAG SC and EN 301 549 clause
- Audit only the lines you selected
- List all 23 rules with the WCAG version and the regimes each one is in scope for
- Reopen the last audit report

One file, done completely. No watermark, no timer, no lockout after N runs.

## With a licence

- **Scan every file in the workspace**, not just the one that is open
- **Write the conformance report to a file** (CSV/JSON/HTML) you can hand to an auditor
- **Machine-readable JSON** so CI can fail the build on new violations
- **Re-audit automatically** every time you save

[Get the full version - $29](https://getreadystack.com) — $29 once, one licence key per person or
team seat, 7-day full refund. For scale: a one-off professional WCAG audit runs about $1,250–$2,750
for a typical site, and a procurement-grade VPAT/ACR starts near $350 and reaches $3,000–$15,000
when written for government procurement.

## Limits — read this

The 23 checks are **line-scoped regular expressions**. They cannot see tags split across lines,
computed or framework-generated markup, colour contrast, focus order or reading order, and they do
not replace manual and assistive-technology testing. They catch what is visible on a single line,
and they tell you which criteria bind you. That is the whole claim.

## Sources

- ADA Title II deadlines: US DOJ interim final rule of 17 April 2026, extending the 24 April 2026
  and 26 April 2027 dates by one year. Technical standard WCAG 2.1 Level AA, unchanged.
- Section 508: Revised 508 Standards, effective 18 January 2018, referencing WCAG 2.0 Level AA.
- EAA: applicable from 28 June 2025. Harmonised standard EN 301 549 v3.2.1 (WCAG 2.1 AA).
  EN 301 549 v4.1.0 entered final deliverable voting in June 2026; v4.1.1 is expected to move to
  WCAG 2.2, and until it is cited, WCAG 2.1 AA is what binds. Service contracts concluded before
  28 June 2025 may run to 28 June 2027; from 28 June 2030 everything in scope must comply.
  Microenterprises (under 10 staff and turnover at most €2M) are exempt for **services only**,
  never for products they place on the market.

## Install

```
ext install wcag-clause-audit
```
