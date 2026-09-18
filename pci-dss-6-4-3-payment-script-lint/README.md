# PCI DSS 6.4.3 Payment Page Script Lint

![PCI DSS 6.4.3 Payment Page Script Lint](https://getreadystack.com/img/promo/sku42829_result_card.jpg)

Reads a payment page and reports it against **PCI DSS v4.0.1 Requirements 6.4.3 and 11.6.1** — the two requirements that stopped being "best practice" and became mandatory on **2025-03-31**.

Online, free, nothing uploaded: <https://getreadystack.com/tools/pci-dss-6-4-3-payment-script-lint>

## Why these two requirements catch people out

6.4.3 asks for three things about every script that runs in the buyer's browser on a payment page: a method that confirms the script is **authorized**, a method that assures its **integrity**, and an **inventory** with a written business or technical justification for each one. 11.6.1 asks for a change- and tamper-detection mechanism on the payment page and its HTTP headers *as the consumer browser receives them*.

Both were future-dated in PCI DSS v4.0, which is why so much still-circulating guidance — and most code an assistant writes for you — treats them as optional. As of 2026-09-11 that date is 529 days past.

The mistakes are mechanical, and that is what this checks:

- `<script src>` with no `integrity` attribute
- `integrity` present but `crossorigin` missing, so the browser makes an opaque request and **skips the hash check entirely** — the tag looks protected and is not
- a tag manager on the payment page, which injects scripts at run time, so nothing on the page can be authorized in advance
- `'unsafe-inline'` or a bare `https:` in `script-src`, which authorizes everything
- inline blocks with no nonce
- no written justification anywhere near the tag
- no tamper-detection mechanism declared
- a card-number input served from your own DOM, which moves the page out of SAQ A

## What it does

14 checks. It works on `.html`, `.htm`, `.jsx`, `.tsx`, `.vue`, `.svelte` and `.php`.

A file is only treated as a payment page if it loads a known payment provider script, declares a card-number field, carries a `<!-- pci:payment-page -->` marker, or sits at a payment-route path (`/pay`, `/billing`, `/cart`, `/order-review` and similar). Anything else gets one informational line saying so and is left alone.

Findings land in the Problems panel with the requirement number attached, and in an output channel as text.

### Commands

| Command | Key needed |
| --- | --- |
| `PCI DSS 6.4.3 Payment Page Script Lint: Check this file` | no |
| `PCI DSS 6.4.3 Payment Page Script Lint: Sweep workspace and write report (licence)` | yes |
| `PCI DSS 6.4.3 Payment Page Script Lint: Enter licence key` | — |

## Free and paid

**Free:** check the payment page open in your editor against all 14 checks. Every finding, every requirement number, every suggested fix. No key, no limit, no watermark, no counter.

**Paid ($29 once):** sweep the whole workspace and write the dated script inventory to `pciScriptLint-report.md` in your repo — every file, every script, every justification status, with the date on it. That file is the artifact an assessor asks for, and it is yours to keep, commit and diff.

The line between them is scope and ownership, not capability. One file is a complete job; a repo-wide dated inventory is a different job.

QSA assessment time bills at roughly $200 an hour. 7-day full refund, no questions.

## How to record a justification

```html
<!-- pci:justification — Braintree client SDK. Required to create the hosted-field
     iframes that receive the PAN. Pinned at 3.97.3, hash in docs/pci/inventory.md. -->
<script src="https://js.braintreegateway.com/web/3.97.3/js/client.min.js"
        integrity="sha384-..." crossorigin="anonymous"></script>
```

Or `data-pci-justification="..."` on the tag itself. Tamper detection is declared once per page with `<!-- pci:tamper-detect ... -->`.

## Limits

Static analysis of source text. It cannot see scripts injected at run time, headers set by your CDN, or a CSP delivered by a server you did not check in. Findings are advisory and are not legal advice or an assessment.
