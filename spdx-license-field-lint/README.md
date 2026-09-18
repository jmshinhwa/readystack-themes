# SPDX License Lint: PEP 639 & Copyleft

![SPDX License Field Lint for package.json, pyproject.toml and Cargo.toml](https://getreadystack.com/img/promo/sku23117_result_card.jpg)

**Six lines in one manifest, six licence problems — before the SBOM is even started.**

| Your manifest says | What it should say |
| --- | --- |
| `"license": "GPL-3.0"` | `"GPL-3.0-only"` — deprecated in SPDX List 3.0; `GPL-3.0` never meant "or later" |
| `"license": "Unlicense"` | `"UNLICENSED"` — `Unlicense` is a public-domain dedication. One word gives the code away |
| `license = {text = "MIT"}` | `license = "MIT"` — PEP 639; setuptools dropped the table form after 2026-02-18 |
| `"License :: OSI Approved ::"` | delete the classifier — PEP 639 deprecated the whole trove family |
| `"license": "MIT/Apache-2.0"` | `"MIT OR Apache-2.0"` — the npm slash syntax was removed |
| `"license": "SSPL-1.0"` | not OSI-approved; §13 extends copyleft to your whole service stack |

Open a `package.json`, `pyproject.toml`, `Cargo.toml`, `composer.json` or `*.gemspec` and run
**Lint licence fields in this file**. Every finding gives you the line, the reason, and the exact
string to write instead.

## Free — and it finishes the job

- Lints the manifest you have open against all **73 rules**, nothing held back
- Every finding names the **exact SPDX string** to write instead
- Names what the licence **costs you**: network copyleft, relinking, not-OSI-approved
- Flags **PEP 639** leftovers: `License ::` classifiers and the `license = {text=..}` table

## Why not just ask npm, or a chatbot

`npm publish` and `setuptools` warn about the one package you are publishing — never about the
hundreds you consume — and neither flags a deprecated SPDX id. Ask a chatbot which string to
write and it answers `GPL-3.0` and `License :: OSI Approved :: MIT License`, because that is what
most of its training text says. Both were deprecated: the first in SPDX License List 3.0, the
second by PEP 639.

## Full version — $29 once

The open file is one manifest. A monorepo has hundreds, and the licence you have to answer for
is in the ones you did not open.

- **Every manifest in the repository, in one pass**
- **Licence inventory as CSV, JSON or HTML** — the artefact you paste into the SBOM licence
  column or hand to procurement, instead of retyping findings by hand
- **Rewrites the identifier for you** — a repo full of `GPL-3.0` becomes `GPL-3.0-only` without a
  hand edit per file

**$29 once · one licence key per person or team seat · 7-day full refund.**
An open-source licence audit runs 40–160 hours and thousands to tens of thousands of dollars per
program; commercial SCA licence-compliance subscriptions start around $1,500/year.

→ **[Get the full version — $29](https://buy.polar.sh/polar_cl_2aVJUYKnFr7h6WfPcOmXd27R9KXw2jEpdVXJc4G6fJk)**

## Install

```
ext install spdx-license-field-lint
```

No account, no telemetry, no network call — except the one that validates your licence key.
