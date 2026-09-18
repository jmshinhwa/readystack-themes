# EN 16931 e-Invoice Lint — DE / FR / IT / BE / PL

![EN 16931 e-Invoice Lint](https://getreadystack.com/img/promo/sku7933_result_card.jpg)

Free online check: **https://getreadystack.com/tools/en16931-einvoice-lint**

This extension reads the invoice payload or field mapping you are editing — the JSON, YAML or XML
your code fills in before it hands a document to an access point — and checks it against the
EN 16931 core invoice model and the national rule set (CIUS) of the country it detects.

## What it checks

29 rules, in four groups.

**Core EN 16931 business terms.** BT-1 invoice number, BT-2 issue date, BT-5 currency,
BT-24 specification identifier, BT-23 business process, BT-31 seller VAT identifier,
BT-48 buyer VAT identifier, BT-49 buyer electronic address, BG-23 VAT breakdown,
BT-112 total with VAT, BT-115 amount due, BT-9 / BT-20 payment due date or terms,
BT-30 seller legal registration identifier, BG-25 invoice lines.

**National CIUS fields, applied only to the country it detects.** Leitweg-ID (BT-10) for
XRechnung 3.0 in Germany; SIREN / SIRET (scheme 0009) for France; Codice Destinatario or PEC
for FatturaPA in Italy; NIP for KSeF in Poland; enterprise number (Peppol scheme 0208) for Belgium.
Spain (Verifactu) is recognised for the date rules.

**Things that validate as XML but fail as an invoice.** A zero or exempt VAT category with no
BT-120 exemption reason and no BT-121 VATEX code. An electronic address with no EAS scheme
identifier. A stale XRechnung 1.x / 2.x specification identifier. A UBL 2.0 namespace.
Monetary amounts carrying more than two decimals. A CII date declared format 102 but written
with dashes.

**Dates, against the day you run it.** A Factur-X MINIMUM or BASIC WL profile, a PDF or e-mail
fallback switch, and any mandate date hardcoded in the file are compared with the real dates for
the detected country: France 2026-09-01 issuing (art. 289 bis CGI), Germany 2025-01-01 receipt and
2027-01-01 issuing (§ 14 UStG), Poland 2026-02-01 / 2026-04-01 (KSeF), Belgium 2026-01-01,
Italy since 2019 (D.Lgs. 127/2015). The severity changes when the date passes, so a warning in
January is an error in September. This is the part generated code gets wrong most often: the
model was trained before the dates moved.

## Commands

- **e-Invoice Lint: Check this file** — free, no key. Findings appear inline as diagnostics and
  as a text report in the output channel.
- **e-Invoice Lint: Sweep workspace and write report (licence)** — walks every
  `**/*.{json,xml,yaml,yml}` in the folder, applies all 29 rules to each, and writes a dated
  `einvoiceLint-report.md` you keep, commit and hand to an auditor.
- **e-Invoice Lint: Enter licence key**

## Free and paid

Checking the file in front of you is free and complete: every rule runs, nothing is withheld,
no watermark, no counter. The licence covers a different job — the whole workspace in one pass and a dated report file
of your own. $29 once, one licence key per person or team seat, 7-day full refund:
https://buy.polar.sh/polar_cl_KQWFnU1FA20UW0fJUPyv4JcDLH8BLJkK3rf722j26cC

## Yardstick

A German tax adviser's time fee is set by StBVV § 13 at EUR 30–70 per half hour, that is
EUR 60–140 an hour. One review of one mapping costs more than the licence.

## Notes

Everything runs locally. No file, no fragment and no telemetry leaves your machine; the online
version runs the same engine in your browser tab. Findings are advisory and are not legal advice.
