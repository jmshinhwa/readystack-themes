# security.txt Lint — RFC 9116 + CRA contact point

![security.txt Lint - RFC 9116 + CRA contact point](https://getreadystack.com/img/promo/sku54858_result_card.jpg)

Your `/.well-known/security.txt` is the address a stranger uses to tell you that your product is
being exploited. Since **11 September 2026** the EU Cyber Resilience Act (Regulation (EU) 2024/2847,
Article 14) has run three clocks from the moment you learn about an actively exploited vulnerability:
an early warning within **24 hours**, a vulnerability notification within **72 hours**, and a final
report within **14 days**. Those clocks start when the report reaches you. A `security.txt` with an
expired `Expires:` line is, in the words of RFC 9116, a file that **MUST be ignored** — the reporter
sees nothing, and your first clock is already running before anyone in your company knows.

This extension lints `security.txt` the way a scanner and a reporter read it, with **13 rules** from
RFC 9116 and the CRA coordinated-vulnerability-disclosure expectation (Annex I, Part II(5)).

## What it checks

| Rule | Why it breaks |
| --- | --- |
| `contact_missing`, `contact_not_uri` | `Contact` is mandatory and must be a URI — `security@example.com` is not one, `mailto:security@example.com` is |
| `expires_missing`, `expires_invalid`, `expires_past`, `expires_over_year` | `Expires` is mandatory, must be a full RFC 3339 timestamp, must be in the future, should be under a year out |
| `field_duplicate` | `Expires`, `Canonical` and `Preferred-Languages` may appear only once |
| `insecure_url` | every web URI must be `https://` |
| `canonical_wellknown` | `Canonical` must be the `/.well-known/security.txt` URI that scanners actually fetch |
| `policy_missing` | no published disclosure policy for the reporter to follow |
| `csaf_not_provider` | `CSAF` must be a `provider-metadata.json` URI, not an advisory index |
| `unknown_field` | `Contacts:` or `Policy-URL:` are dropped silently by every parser |
| `malformed_line` | a line without a colon is not parsed at all |

## Run it

Open a `security.txt` and run **security.txt Lint: Check this file** from the Command Palette.
Findings arrive as diagnostics on the exact line, with the rule reference and, for dates, the
computed number of days.

On the 10-line sample file shipped in `_fixtures/dirty.txt` it returns **9 findings** — 5 errors and
4 warnings — including an `Expires` value that ran out **75 days** before the file was linted.
The clean sample returns 0.

## Free and full

Linting the file you have open is free and finishes the job: every rule, every line, no key.
The full version scans **every** `security.txt` in the workspace in one pass and writes a dated JSON
report you keep for the audit file. Reviewing a disclosure policy with a security consultant starts
around **$150 an hour**; this reads the file in under a second.

Full version: [workspace sweep + dated JSON report](https://buy.polar.sh/polar_cl_ix6VvnndFPQPoppGXnx8ybXWfh7W2eldbZaTM2Zh2br) - $29 once, one licence key
per person or team seat, 7-day full refund.

## Why not a chatbot

A general model will happily write you a `security.txt`. It will also leave out `Expires` (the one
field RFC 9116 added and made mandatory), write `Contact: security@example.com` without the
`mailto:` scheme, and it cannot know today's date — so it cannot tell you that the file on your
server went stale 75 days ago. Those are exactly the lines this tool counts.

More tools: https://getreadystack.com/tools/security-txt-cra-lint

MIT licensed. Findings are computed locally; nothing leaves your machine.
