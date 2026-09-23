# MyInvois Field Check — Malaysia e-Invoice (UBL 2.1)

![MyInvois Field Check — Malaysia e-Invoice (UBL 2.1)](https://getreadystack.com/img/promo/sku154421_result_card.jpg)

Reads a MyInvois e-Invoice JSON payload and reports every field IRBM will reject, with the rule name and the line number, before you POST it to the submission API.

Hub: https://getreadystack.com/tools/myinvois-field-check

## What it reads

The extension parses the JSON form of UBL 2.1 that the MyInvois API accepts — the `{"_": value}` array-of-one shape, with `Invoice` at the root. Any `.json` file without an `Invoice` root is ignored, so your `package.json` and `tsconfig.json` stay quiet.

## The 15 rules

| Rule | What fails |
| --- | --- |
| `supplier_tin_missing` | No `PartyIdentification` with `schemeID="TIN"` on the supplier |
| `supplier_tin_format` | TIN is not one or two letters plus 9–12 digits |
| `supplier_general_tin` | `EI00000000010` used as the supplier — it is the general public TIN, a buyer-side value |
| `supplier_msic_code` | `IndustryClassificationCode` is not a 5-digit MSIC 2008 code |
| `supplier_msic_name` | MSIC code carries no `name` business activity description |
| `supplier_contact_phone` | Supplier telephone missing or shorter than 8 digits |
| `buyer_registration_missing` | Buyer has a TIN but no BRN, NRIC, PASSPORT or ARMY identifier |
| `invoice_type_code` | `InvoiceTypeCode` outside 01, 02, 03, 04, 11, 12, 13, 14 |
| `einvoice_version` | `listVersionID` is neither `1.0` nor `1.1` |
| `currency_code` | `DocumentCurrencyCode` is not three capital letters |
| `exchange_rate_missing` | Non-MYR document with no `TaxExchangeRate` `CalculationRate` |
| `line_classification_code` | Line `ItemClassificationCode` is not a 3-digit code in 001–045 |
| `line_tax_type_code` | `TaxCategory` `ID` outside 01, 02, 03, 04, 05, 06, E |
| `note_reference_missing` | Credit, debit or refund note with no `BillingReference` |
| `signature_missing` | `listVersionID` 1.1 with no `UBLExtensions` signature block |

## Measured on the bundled fixtures

`_fixtures/clean.json` returns 0 findings. `_fixtures/dirty.json` returns 6 findings: the e-Invoice type code `INV`, a USD document with no exchange rate, the 4-digit MSIC code `0111`, the general public TIN in the supplier slot, the 4-digit classification code `0022`, and the tax type code `SST`. All six parse as valid JSON and pass an ordinary JSON schema check — the shape is right and the values are wrong.

## Why the values are the hard part

The codes are not guessable. There are 45 classification codes, seven tax type codes, eight e-Invoice type codes, and a five-digit MSIC taken from your own LHDN profile. A language model asked for a MyInvois payload will produce a well-formed document with `"SST"` where `"02"` belongs, because `SST` is what the tax is called everywhere except in the field.

## The yardstick

Section 120(1)(d) of the Income Tax Act 1967 sets a fine of RM200 to RM20,000, or imprisonment up to six months, or both, for each non-compliant e-Invoice. IRBM's six-month relaxation period that follows the 1 July 2026 phase runs to 31 December 2026. Confirm your own phase and dates against the current LHDN e-Invoice Guideline; this extension checks fields, not your filing obligation.

## Commands

- **MyInvois Field Check: Check this file** — lints the open JSON document.
- **MyInvois Field Check: Check workspace** — walks every `.json` in the workspace.

## Free and paid

Free: lint any MyInvois e-Invoice JSON in the editor and see every missing or invalid IRBM field, named and on a line number. Paid: export a dated workspace audit file for your tax agent and gate CI on every commit — $29 once, one licence key per person or CI seat: https://buy.polar.sh/polar_cl_HPayV45meyb7kv9EsjIQWbwGYX2LdSe0UeuJf3cB4Py

MIT-licensed rule metadata. Not tax advice.
