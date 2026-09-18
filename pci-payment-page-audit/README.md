# PCI Payment Page Script Audit

Open the HTML page that takes a card number. This extension reads it and reports every place where the page
breaks the script-integrity rules of **PCI DSS v4.0.1 — Requirement 6.4.3** (every payment-page script
authorised, inventoried and integrity-assured) and **Requirement 11.6.1** (a mechanism that detects and alerts
on unauthorised change to the payment page). Both requirements stopped being "best practice" and became
mandatory on **31 March 2025**.

The audit is static. It runs on the file in front of you, offline, with no telemetry and no account.

## What it looks for

15 rules, all of them things a generated or hand-copied payment page does by default:

| # | Rule | Requirement |
|---|------|-------------|
| 1 | Third-party script with no `integrity=` hash | 6.4.3 |
| 2 | `integrity=` present but `crossorigin=` missing, so the hash is silently skipped | 6.4.3 |
| 3 | Cross-origin stylesheet with no `integrity=` | 6.4.3 |
| 4 | No Content-Security-Policy declared or documented on the page | 6.4.3 / 11.6.1 |
| 5 | CSP allows `unsafe-inline`, `unsafe-eval` or a wildcard script source | 6.4.3 |
| 6 | Inline `<script>` with no `nonce=` | 6.4.3 |
| 7 | Session-replay or heatmap recorder on the card page | 3.3.1 / 6.4.3 |
| 8 | Tag manager on the card page, able to inject scripts after deployment | 6.4.3 |
| 9 | Card number `<input>` in the merchant DOM instead of a hosted field | SAQ scoping |
| 10 | Security-code `<input>` in the merchant DOM | 3.3.1 |
| 11 | Any resource loaded over plain `http://` | 4.2.1 |
| 12 | Form posting to a plain `http://` endpoint | 4.2.1 |
| 13 | Script element built at runtime, so it cannot be inventoried from source | 6.4.3 / 11.6.1 |
| 14 | Card-shaped key written to `localStorage` / `sessionStorage` | 3.2.1 |
| 15 | No `report-to` / `report-uri` target, so a tampered page raises no alert | 11.6.1 |

Every finding carries the line number, the requirement it maps to, and the fix.

## Measured on the bundled fixture

`_fixtures/dirty.html` is a 31-line payment page of the kind a generator produces: jQuery from a CDN, a tag
container, a session recorder, the card fields in the merchant's own form.

- 18 findings
- 12 of them blocking (severity `error`), 6 warnings
- 14 of the 15 rules trigger

`_fixtures/clean.html` is the same page after the fixes: hosted fields, one pinned script with `integrity` and
`crossorigin`, a nonce CSP with a `report-to` endpoint, HTTPS throughout. It returns **0 findings**. Pin the
jQuery tag in the dirty file and the count drops from 18 to 17, so you can watch each fix land.

## Free and paid

The free extension and the free web page share the same engine file. Free audits the page you have open and
gives you the complete finding list for it — that job finishes with no key.

The paid tier answers a different question: not "is this page clean" but "is the whole shop clean, and can I
prove it later". It audits every payment page in the workspace in one pass and exports a dated script
inventory and justification file — the artefact your QSA or your SAQ A-EP self-assessment asks for, in a form
you keep. $29 once, one licence key per person or team seat, 7-day full refund.

## Yardstick

A QSA gap assessment against the payment-page requirements is a four-figure engagement, typically quoted from
about $5,000 for a single storefront.

## Also on the web

The same 15 rules, running in the browser with nothing uploaded: https://getreadystack.com/tools/pci-payment-page-audit

## Scope

This is a source-level audit of files you give it. It does not fetch your live site, does not replace an ASV
scan, and does not make a merchant compliant on its own. It finds the lines that a payment-page review will
stop on.
