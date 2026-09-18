# CRA Annex II User Docs Lint

![CRA Annex II User Docs Lint](https://getreadystack.com/img/promo/sku79782_result_card.jpg)

Annex II of the EU Cyber Resilience Act (Regulation (EU) 2024/2847) lists nine items that must reach the user together with the product: who the manufacturer is, where a vulnerability can be reported, the intended purpose and security environment, the known and foreseeable risks, the internet address of the EU declaration of conformity, **the end date of the support period**, instructions for installing security updates and for secure decommissioning, and how the machine-readable software bill of materials can be accessed.

Most of that text now gets drafted by an assistant and read by nobody. The prose looks finished. What is missing is exactly what an assistant cannot know: a calendar date that is still in the future, your own reporting mailbox, the URL where your declaration of conformity actually sits.

This extension reads the documentation file you have open and reports, line by line, which Annex II item is missing, vague or already expired.

## What it checks

19 rules over one markdown file:

- **Manufacturer block** - legal name, postal address, electronic contact address.
- **Vulnerability contact** - a single point of contact for reports, plus where the coordinated vulnerability disclosure policy lives.
- **Product identification** - type, batch, model or version.
- **Intended purpose, security environment, essential functions and security properties.**
- **Known and foreseeable risks** that lead to significant cybersecurity risk.
- **EU declaration of conformity** - the word alone is not enough; an internet address has to be there.
- **Support period** - an explicit calendar date. An open-ended promise ("as long as the product is on sale") is reported as an error, a date in the past is reported as expired, and a date less than five years from today is flagged for review.
- **Update and decommissioning instructions** - how a user installs security updates, and how stored user data is erased at end of life.
- **SBOM access** - where the CycloneDX or SPDX bill of materials can be fetched.
- **Template residue** - `[Company Name]`, `XX/XX`, `TODO` and friends still sitting in shipped text.

## Measured on the bundled fixtures

`_fixtures/clean.md` is a complete Annex II document for a door controller: **0 findings**. `_fixtures/dirty.md` is the kind of page an assistant produces in one pass: **15 findings - 11 errors and 4 warnings**, including the open-ended support promise on line 13 and two template placeholders on lines 3 and 5.

## Free and full version

Free, no key, and finished on its own: lint the file you have open, with every finding on its line. The full version works on a different axis - scope and ownership: it sweeps every documentation file in the workspace in one command and writes a dated evidence report (Markdown + CSV) you keep with your technical file. $29 once, one licence key per person or team seat, 7-day full refund: https://buy.polar.sh/polar_cl_mS0E5k9PqMWkUFlrIn7VEYPbBJmAX5ybAjvyM2dC7Zw

Yardstick: a compliance consultant reviewing one technical file bills about EUR 150 per hour.

## Dates that matter

Reporting obligations under the Cyber Resilience Act apply from 11 September 2026. The remaining obligations, including the Annex II information duties, apply from 11 December 2027. Fines for breaches of the Article 13 obligations reach EUR 15 million or 2.5% of worldwide annual turnover.

## Commands

- `CRA Annex II: Lint this file` - free, runs on the active file.
- `CRA Annex II: Sweep workspace and write report` - full version.

Runs offline. Nothing is uploaded. The same engine runs in the browser: https://getreadystack.com/tools/cra-annex-ii-docs-lint

This extension is a lint over documentation text. It is not legal advice and it does not certify conformity.
