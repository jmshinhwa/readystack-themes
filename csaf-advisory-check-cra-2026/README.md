# CSAF Advisory Check for CRA 2026

![CSAF Advisory Check for CRA 2026](https://getreadystack.com/img/promo/sku32327_result_card.jpg)

```
advisory.json:50   6.1.11  cwe.name is "Authentication Bypass" but CWE-287 is officially "Improper Authentication"
advisory.json:59   6.1.6   product_id "CSAFPID-0001" is listed as affected and as fixed in the same vulnerability
advisory.json:62   6.1.1   product_id "CSAFPID-0009" is used here but no full product name in the product tree defines it
advisory.json:70   6.1.9   baseScore is 9.1 but the vector computes to 9.8
advisory.json:71   6.1.9   baseSeverity is HIGH but a base score of 9.8 is CRITICAL
—— 12 finding(s) across 1 file(s) · 43 checks ——
```

That is a schema-valid CSAF 2.0 advisory. Those twelve findings come from eleven **mandatory** tests in
section 6.1 of the specification, and a JSON schema cannot see any of them.

From **11 September 2026**, a manufacturer placing software on the EU market must report an actively
exploited vulnerability to ENISA and its national CSIRT within **24 hours**, with a technical
notification at 72 hours and a final report at 14 days. The advisory is written in that window. This
extension checks it where you write it, offline, before it is published.

## What it checks — 43 checks (32 mandatory + 11 profile)

* The **32 mandatory tests** of CSAF 2.0 section 6.1 (6.1.1 to 6.1.26 and 6.1.28 to 6.1.33).
* The **11 profile tests** of section 6.1.27, applied only when `/document/category` matches the profile
  (`csaf_base`, `csaf_security_incident_response`, `csaf_informational_advisory`, `csaf_security_advisory`, `csaf_vex`).
* Plus **12 CSAF Base required fields**. Section 6.1.26 leaves those to JSON schema validation, which an
  editor does not do by itself; turn them off with `includeBaseFields` if your pipeline already validates.

Some of what that means in practice:

| Test | What it catches |
| --- | --- |
| 6.1.1 / 6.1.2 / 6.1.3 | a product id referenced but never defined, defined twice, or defined in a relationship that loops back to itself |
| 6.1.6 | the same product listed as affected and as fixed in one vulnerability |
| 6.1.9 | **the base, temporal and environmental scores are recomputed from the vector string** — CVSS v2, v3.0 and v3.1 — and compared with what the document claims, severity labels included |
| 6.1.11 | the CWE name does not belong to the CWE id, checked against **944 weaknesses** from the MITRE catalogue carried inside the extension |
| 6.1.14 / 6.1.16 / 6.1.21 / 6.1.22 | a revision history that is not ascending by date, a document version that is behind its own newest revision, a skipped version number, the same number used twice |
| 6.1.27.9 / 6.1.27.10 | a VEX document where `known_not_affected` has no impact statement or `known_affected` has no action statement, following product groups through |
| 6.1.31 | `"4.2.0 and earlier"` written into a `product_version` branch that must name exactly one version |

Findings arrive as editor diagnostics on the exact line, and as a list in the **CSAF Advisory Check**
output panel. Nothing leaves your machine: there is no network call anywhere in the checking path.

## Commands

Free, no licence key, no counter, no watermark:

* **Check this advisory** — all 43 checks over the open document, every finding shown.
* **Show the findings panel** — reopen the last report.
* **List the checks that ship inside** — the 43 test numbers and titles.

In the licensed version:

* **Check every advisory in the workspace** — one pass over the repository, not one file.
* **Export the conformance evidence file** — CSV, JSON or HTML, a file you keep and hand to an auditor or a customer.
* **Write the CI checker into this repository** — drops `.csaf-check/` with the same engine and a runner that exits non-zero, so a pipeline stops before a non-conformant advisory is published.
* **Check on save: turn on or off** — re-check while you write.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `includeBaseFields` | `true` | also report the 12 CSAF Base required fields |
| `skipTests` | `[]` | test numbers to leave out, e.g. `["6.1.11"]` |
| `filePatterns` | `**/*.json` | glob for the workspace pass; files without `csaf_version` are skipped |
| `reportFormat` | `csv` | format of the evidence file (`csv`, `json`, `html`) |
| `runOnSave` | `false` | turn check-on-save on at startup (licensed) |

## The free tier is the whole job for one advisory

You are writing one advisory against a 24-hour clock. Free checks that advisory completely — all 43
checks, every finding, no hidden results. The licence changes the **scope**: the whole repository in one
pass, an evidence file you own, and a gate in CI. $29 once, one licence key per person or team seat,
7-day full refund. Published CRA cost calculators calibrate this work at EUR 45 per hour of engineering
and consulting effort.

## Specification

OASIS *Common Security Advisory Framework Version 2.0*, OASIS Standard, 18 November 2022, section 6.1.
CWE data: MITRE Comprehensive CWE Dictionary (view 2000), downloaded 2026-09-10, deprecated entries removed.
This extension is not affiliated with OASIS, MITRE, ENISA or the European Commission, and it is not legal advice.
