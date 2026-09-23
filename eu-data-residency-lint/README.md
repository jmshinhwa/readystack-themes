# EU Data Residency Lint (Terraform, GDPR Ch. V)

`region = "eu-west-2"` is London. `region = "us-east-1"` is Virginia. `location = "US"` is a Google Cloud multi-region spread across several American data centres. None of those three lines looks wrong in a pull request, and a code assistant will write all of them for you — which is exactly the question a 2026 reviewer is asking: does the code the assistant wrote hold up against the regulation we are audited on?

This extension reads your infrastructure code and resolves every cloud region literal to a country. It then scores that country against GDPR Chapter V:

- **EEA** — the EU 27 plus Iceland, Liechtenstein and Norway. Not a transfer at all.
- **Adequacy decision** — outside the EEA but covered by a European Commission adequacy decision. Lawful, but the decision has to be named in your Article 30 record. The United Kingdom and Switzerland live here, and both are easy to mistake for "European" because AWS calls them `eu-west-2` and `eu-central-2`.
- **United States** — lawful only where the receiving organisation is self-certified under the EU-US Data Privacy Framework.
- **Third country** — no adequacy decision. Standard contractual clauses or binding corporate rules, plus a transfer impact assessment (Articles 46-49).

GDPR Article 83(5) places Chapter V infringements in the upper fine band: up to EUR 20 million or 4% of total worldwide annual turnover, whichever is higher.

## What it checks

18 checks run against a 64-region table covering AWS, Azure and Google Cloud:

| | |
|---|---|
| Placement | US region · third-country region · adequacy-decision region · Google Cloud multi-region `location` · hardcoded availability zone |
| Configuration that hides a region | Terraform state backend · provider block with no region pinned · aliased provider · region read from an undefined variable · region literal absent from the table |
| Copies you forgot | S3 replication destination · DynamoDB global table replica · secret or key replica · log or backup destination ARN · edge function replicated worldwide |
| Evidence | No transfer basis named anywhere in the file · US region with no Data Privacy Framework marker · no customer-managed key on a non-EEA store |

## Worked example

The extension ships with two fixtures. `dirty.tf` is 90 lines of ordinary-looking Terraform for a CRM; it returns **19 findings, 11 of them errors, across 6 countries** — United States, United Kingdom, India, Brazil, Singapore and Japan — plus one region literal (`il-central-1`) that is not in the table and has to be confirmed by hand. `clean.tf` is the same infrastructure kept inside the EEA and returns **0 findings**.

## Free and paid

Scanning a file is free. All 18 checks, every file type, no watermark, no usage counter, no time limit — open a file, read the diagnostics, fix the lines, and that job is finished.

The licence covers a different axis: **ownership of the evidence**. One command sweeps the whole workspace and writes a dated Markdown transfer register — every file, every line, every region, country and adequacy status in one document you keep, commit and hand to an auditor. $29 once, one key per person or CI seat.

Yardstick: external privacy counsel bills from $200 an hour for Chapter V transfer reviews, and the register has to be redone every time the infrastructure changes.

## Commands

- **EU Data Residency: Check This File** — diagnostics for the open editor.
- **EU Data Residency: Sweep Workspace** — the transfer register (licensed).

## Run it in the browser first

https://getreadystack.com/tools/eu-data-residency-lint

## Limits

The checks are static. A region literal built at apply time from a remote data source cannot be resolved from the file, and the extension says so (`region-indirect`) rather than guessing. The residency table covers 64 named regions; anything outside it is reported as `region-unknown` for a human to confirm. This is a linter, not legal advice.
