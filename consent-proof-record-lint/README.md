# Consent Proof Record Lint (GDPR Art.7)

![Consent Proof Record Lint (GDPR Art.7)](https://getreadystack.com/img/promo/sku112765_result_card.jpg)

Your cookie banner works. The question a supervisory authority actually asks is the other one:
**show me the record.** GDPR Article 7(1) puts the burden on the controller — *"the controller shall
be able to demonstrate that the data subject has consented"*. A banner that renders is not a
demonstration. The consent record your code wrote is.

Most consent logs are written by hand, or these days by an assistant that was asked to "store the
consent" and produced a row with a user id, a timestamp and a boolean. That row passes code review.
It does not survive a complaint, because it cannot say **which wording the person read**, **whether
anything was switched on before they touched it**, **how they could take it back**, or **when it ran out**.

This extension reads a consent-record JSON file in your editor and names every field that is missing
or invalid, with the article it comes from.

## What it checks

14 rules, each tied to a named source:

| Rule | Source |
|---|---|
| `subject_ref` — whose consent is this | GDPR Art.7(1) |
| `collected_at` — a moment is attached | GDPR Art.7(1) |
| `timestamp_utc` — full ISO-8601 instant, not a bare local date | GDPR Art.7(1) |
| `purpose_granularity` — one entry per purpose, not one flag for everything | GDPR Art.4(11) |
| `notice_version` — which wording was shown | EDPB 05/2020 on consent |
| `notice_text_hash` — a hash of the exact text, so a rewrite cannot reuse the label | EDPB 05/2020 on consent |
| `prechecked_default` — nothing granted before the person acted | GDPR Recital 32 |
| `withdrawal_method` — the route out, recorded | GDPR Art.7(3) |
| `controller_identity` — who is the controller on this row | GDPR Art.13(1)(a) |
| `consent_expiry` — an end date exists | GDPR Art.5(1)(e) |
| `expiry_too_long` — longer than 13 months from the day it was given | CNIL / EDPB cookie guidance |
| `already_expired` — expired and still relied on | GDPR Art.5(1)(e) |
| `legal_basis` — legitimate interest is not filed as consent | GDPR Art.6(1)(a) |
| `tcf_pair` — a `tc_string` without its `cmp_id` cannot be decoded later | IAB TCF v2.2 |

## Measured on the bundled fixtures

`_fixtures/clean.json` — three well-formed records — reports **0 findings**.
`_fixtures/dirty.json` — four records from a homegrown logger — reports **15 findings**:
**10 errors and 5 warnings**, and it trips **all 14 rules**. Both files ship with the extension, so you
can reproduce those two numbers before you point the linter at anything of your own.

## How to run it

Open a consent-record JSON file and run **Consent Proof Record Lint: Check this file** from the
Command Palette. Findings land in the Problems panel on the line of the record that caused them.
The record shape is flexible: a top-level array, `{ "records": [...] }`, `{ "consents": [...] }`, or a
single object all work, and common field aliases (`timestamp`, `created_at`, `expiry`, `device_id`)
are accepted.

Everything happens on your machine. No network call, no telemetry, nothing leaves the editor —
which matters, because the file you are linting is a log of other people's decisions.

## Scale

Checking one file is free and complete: it tells you every broken field and the article behind it.
When the audit is not one file but the whole log, the full version runs every consent-record file in
the workspace in one pass and writes a dated evidence report you keep and hand to the auditor.
Article 83(5) puts Article 7 consent breaches in the top fine tier: up to €20 million or 4% of worldwide
annual turnover. Article 12(3) gives you one month to answer a data subject's request.
A GDPR consultant reviewing a consent log bills $150 to $250 an hour.
Details: <https://buy.polar.sh/polar_cl_mSv5XPtyBLW8GXFQGDEDDv9sgkuuOvkN3MOH02P3VUY>

## More tools

Hub: <https://getreadystack.com/tools/consent-proof-record-lint>

## Not legal advice

This linter reads structure, not circumstances. It tells you a required field is absent; it cannot tell
you whether your processing is lawful. Confirm the outcome with your own counsel or DPO.
