# EU Liability Window Lint (PLD 2024/2853)

![EU Liability Window Lint](https://getreadystack.com/img/promo/sku79612_result_card.jpg)

On 9 December 2026, Directive (EU) 2024/2853 applies in every Member State and Directive 85/374/EEC is repealed. Software is a product under Art. 4(1) — standalone, embedded, or a model. This extension reads a `CHANGELOG.md` or release-notes file the way that Directive reads it, and reports the lines that will not hold up.

## The four facts a release entry has to carry

1. **A date.** Art. 17(2) runs a 10-year liability window from the day that version was placed on the market. A heading like `## 2.4.0` with no `YYYY-MM-DD` does not record that day, so the window has no start.
2. **A support window.** Annex II(8) of the Cyber Resilience Act (EU) 2024/2847 requires the end date of the support period in the information supplied to users. Art. 11(2)(c) PLD reads the same window: a defect stays within your control when it turns on updates you did or did not supply.
3. **An identified defect.** "Fixed a security issue" names nothing. A CVE or GHSA identifier is what connects a release to the defect it removed.
4. **No exclusion clause doing work it cannot do.** Art. 15: liability towards an injured person may not be limited or excluded by a contractual provision. "Provided AS IS, without warranty of any kind" stays in your LICENSE and stops shielding you from a PLD claim.

Annex II(2) CRA also asks for a single point of contact for reporting, and since 11 September 2026 an actively exploited vulnerability has to reach ENISA within 24 hours — so the file needs somewhere to send it.

## The 12 rules

| id | severity | what it catches |
| --- | --- | --- |
| `undated_release` | high | release heading with a version and no `YYYY-MM-DD` |
| `void_disclaimer` | high | AS-IS / no-liability / at-your-own-risk wording (Art. 15) |
| `security_fix_without_cve` | high | security change with no CVE or GHSA id |
| `old_directive_citation` | high | text still citing Directive 85/374/EEC |
| `deadline_drift` | high | a product-liability date that is not 2026-12-09 |
| `no_support_window` | high | no dated support window anywhere in the file |
| `no_security_contact` | med | no reporting contact (Annex II(2) CRA) |
| `unversioned_heading` | med | `## Latest`, `## Current` — names no product |
| `stale_support_claim` | med | active-support claim the release dates do not back |
| `yanked_without_reason` | med | a withdrawn version with no reason and no id |
| `future_date` | low | a release dated after today |
| `vague_fix_language` | low | "various fixes", "bug fixes" — nothing named |

## Measured on the fixtures in this package

- `_fixtures/clean.md` — 27 lines → **0 findings**
- `_fixtures/dirty.md` — 25 lines → **15 findings** (8 high, 4 medium, 3 low), covering all 12 rules

## Free and full

Free, no key: the open file, all 12 rules, every finding with its line number and the article behind it. That job finishes on its own.

Full version — $29 once: every changelog in the workspace in one pass, plus a dated Markdown + CSV evidence record you keep and file. One licence key per person or team seat, 7-day full refund. https://buy.polar.sh/polar_cl_SLbJNzFJbhPz5hbdDSJNmtMORqZFq3eprmVBa2NojFU

Yardstick: one hour of EU product-compliance counsel bills around $300, and one repository's release history takes longer than an hour to read.

Same engine, in a browser, nothing uploaded: https://getreadystack.com/tools/pld-liability-window-lint

## Not legal advice

The rules cite the articles they come from so you can check them. They do not tell you whether you are liable; they tell you which line in your own file does not answer.
