# PCI DSS 6.4.3 Payment Script Lint

A linter for the one file an assessor always opens: the page where a customer types a card number.

PCI DSS v4.0.1 requirement **6.4.3** says every script loaded and executed in the consumer's browser on a payment page must be authorised, must have its integrity assured, and must appear in a written inventory with a business justification. Requirement **11.6.1** says a change- and tamper-detection mechanism must alert on unauthorised modification of the payment page's HTTP headers and content, evaluated at least weekly. Both were future-dated best practices until **2025-03-31**. Since that date they are ordinary requirements, and v4.0.1 is the only active version of the standard — v3.2.1 retired 2024-03-31 and v4.0 retired 2024-12-31.

This extension reads the payment template in front of you and marks the lines that break those two requirements.

## The 16 checks

**Inventory (6.4.3)** — `inventory-missing`, `script-not-inventoried`, `inventory-no-justification`.
A page that loads third-party scripts with no `<!-- pci-script-inventory -->` block, a script whose host is not listed in it, or an entry whose justification is a placeholder.

**Integrity (6.4.3)** — `script-no-integrity`, `script-over-http`, `script-integrity-no-crossorigin`, `script-unpinned-version`, `tag-manager-on-payment-page`.
No `integrity=` hash, plain `http://`, a hash that the browser will not enforce because `crossorigin=` is absent, a URL pinned to `@latest`, and loaders that inject further scripts at runtime.

**Authorisation (6.4.3)** — `csp-missing`, `csp-unsafe-inline`, `csp-report-only`, `inline-script-no-nonce`.
No Content-Security-Policy, a `script-src` that allows `'unsafe-inline'` or a wildcard, a policy that is report-only, and inline scripts with neither nonce nor hash.

**Tamper detection (11.6.1)** — `tamper-detection-missing`, `tamper-interval-too-long`.
No declared mechanism, or one evaluated less often than every seven days.

**Dates and versions** — `future-dated-claim-expired`, `stale-standard-version`.
Comments and docs that still call 6.4.3 or 11.6.1 future-dated, or that cite a retired version. The message counts the days since 2025-03-31 against today's date.

## Try it on the samples

`_fixtures/dirty.html` — a five-script payment page with no inventory: **14 findings, 9 errors, 5 warnings**.
`_fixtures/clean.html` — the same page with an inventory, hashes, a nonce-based policy and a daily tamper check: **0 findings**.

## Commands

- **PCI Script Lint: Check this file** — the open editor, all 16 rules, no key needed.
- **PCI Script Lint: Check the workspace** — every `.html`, `.htm`, `.php`, `.twig`, `.liquid` and `.ejs` file, written out as a dated report.
- **PCI Script Lint: Enter licence key**

## Free and licensed

Free: check the file open in your editor. That job finishes on its own — you know which scripts on that page fail, on which line, against which requirement.

Licensed, $29 once: the workspace sweep and the dated script inventory report you hand to the assessor. One licence key per person or team seat. A measuring stick: PCI consultants and QSAs typically bill $150-$300 an hour for the same payment-page script review.

## Notes

The checker runs locally. It reads files, writes nothing except the report you ask for, and makes no network call except validating a licence key you typed. The same engine (`engine.js` + `rules.json`) runs in the browser version, free and without installing anything: https://getreadystack.com/tools/pci-payment-script-lint

Findings are guidance for the developer who owns the template. They are not an assessment, and they do not replace your QSA or your acquirer's requirements.
