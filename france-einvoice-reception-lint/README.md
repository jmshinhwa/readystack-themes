# France E-Invoice Reception Lint

![France E-Invoice Reception Lint](https://getreadystack.com/img/promo/sku52828_result_card.jpg)

Since **1 September 2026** every business established in France must be able to **receive** an
electronic invoice. Issuing is phased, but reception is not: from that date a supplier can push a
Factur-X, UBL or CII invoice at you and your platform has to take it, read it, and post it.

That is where generated code breaks. An invoice template written by an AI assistant — or ported
from a German XRechnung mapping — produces XML that validates against EN 16931 and is still
refused in France, because France added its own mandatory mentions on top of the European
semantic model.

This extension reads the invoice XML open in your editor and runs **12 checks**. Eleven are
errors, one (the VAT-on-debits option) is a warning.

## The 12 checks

| # | Check | What a PDP does with it |
|---|-------|-------------------------|
| 1 | BT-1 invoice number, BT-2 issue date, date not later than the as-of date | Refused without a number |
| 2 | BT-24 profile URN is an EN 16931 / Factur-X URN | The PDP routes on this URN |
| 3 | Currency is EUR, or the VAT total is restated in EUR (BT-111) | VAT must be readable in euro |
| 4 | Seller SIREN or SIRET, **Luhn check digit verified** | A typo'd SIREN is not a SIREN |
| 5 | **Buyer SIREN** — added for the French reform | Name and address are not enough |
| 6 | **FR intra-EU VAT key** recomputed from the SIREN | Key = (12 + 3 x (SIREN mod 97)) mod 97 |
| 7 | **Delivery address (BG-15)** — added for the French reform | The billing address does not stand in |
| 8 | BT-72 delivery or supply date | Sets the VAT due date |
| 9 | **Category of operation** — goods, services or mixed — added for the French reform | Drives the VAT treatment |
| 10 | **Option for VAT on debits** on service invoices — added for the French reform | Changes when the buyer deducts |
| 11 | BT-109 + BT-110 = BT-112 | Arithmetic the platform redoes |
| 12 | Late-payment rate **and** the 40 EUR recovery indemnity | Code de commerce, every B2B invoice |

Checks 4, 6 and 11 are real arithmetic, not string matching. Change one digit of the SIREN and
the answer changes.

## What it caught in the sample invoice

The invoice in `_fixtures/dirty.xml` validates as UBL and still comes back with **6 rejects**:

- BT-24 profile URN missing — the PDP cannot route it
- buyer SIREN missing
- VAT number carries key 12 where the SIREN computes **43**
- the delivery block has a date and no address
- BT-112 says 1512 where 1250 net plus 250 VAT give 1500 — off by 12 EUR
- no penalty rate and no 40 EUR indemnity

`_fixtures/clean.xml` is the same invoice with the six lines fixed: 0 findings.

## Why a chatbot is not enough here

A general assistant will happily tell you the mandatory mentions. It will not recompute the Luhn
check digit of a SIREN it has never seen, or the mod-97 VAT key, or re-add your totals — and it is
exactly those three that a PDP recomputes before it accepts the document. This runs offline, on
your file, with no network call.

**Yardstick:** an e-invoicing integrator bills about 95 US dollars an hour to map and re-test one
invoice profile. CGI article 1737 fines 15 EUR per missing or wrong mandatory mention, capped at
15000 EUR a year.

## Free and licensed

- **Free, no key:** check the invoice XML open in the editor against all 12 rules. That is a
  finished job — you get every finding, with line numbers, on the file in front of you.
- **Licensed, 29 US dollars once:** sweep every invoice in the workspace and write one dated
  reception-readiness report. Same rules, different scope. One licence key per person or team
  seat, 7-day full refund. Get a licence: https://buy.polar.sh/polar_cl_a6x1aVkUPqSGx38DFlJw68NPUQdMdCYBpENCR47YuFw

## Commands

- `France E-Invoice: Check This Invoice` — free
- `France E-Invoice: Sweep Workspace And Write Report` — licensed
- `France E-Invoice: Enter Licence Key`

Hub page: https://getreadystack.com/tools/france-einvoice-reception-lint

Nothing leaves your machine. The rule table lives in `ext/rules.json`; the engine in
`ext/engine.js` is the same file that runs the free web page.
