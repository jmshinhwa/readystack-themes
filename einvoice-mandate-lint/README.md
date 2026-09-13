# E-Invoice Mandate Lint - EU 2026

![E-Invoice Mandate Lint - EU 2026](https://getreadystack.com/img/promo/sku40981_result_card.jpg)

Open a UBL 2.1 or UN/CEFACT CII invoice XML file. The linter reads the specification
identifier (BT-24) and the seller country, decides which national mandate applies, and
marks every line that would make a national platform reject the document.

An XSD or Schematron pass tells you the file is legal UBL. It does not tell you that the
profile you declared was retired in February 2025, that Poland replaced FA(2) with FA(3)
on 1 February 2026, or that your buyer has no SIREN on a domestic French invoice that has
had to travel through an approved platform since 1 September 2026.

## What it checks

**35 rules**, in five groups:

- **Syntax** - is the root element a UBL `Invoice`/`CreditNote` or a CII `CrossIndustryInvoice`.
- **Specification identifier (BT-24)** - missing, unknown, or naming one of the retired
  profile versions in the table below.
- **EN 16931 core** - invoice number, issue date, type code, currency, seller and buyer
  legal name, seller VAT identifier, both country codes, the four monetary totals, the
  document VAT amount, and at least one invoice line.
- **Arithmetic (BR-CO-10, BR-CO-15, BR-CO-16, BR-CO-25)** - the line amounts are summed and
  compared with the declared totals, and the amount due is recomputed from
  `TaxInclusiveAmount - PrepaidAmount + PayableRoundingAmount`.
- **National mandates** - 6 countries: France, Germany, Belgium, Poland, Spain, Italy.
  A country rule only fires once its mandate date has passed, measured against the date you
  pass in (the editor uses today).

## Profiles it recognises

| CustomizationID | Status |
| --- | --- |
| Peppol BIS Billing 3.0 | current |
| EN 16931 core, no CIUS | current |
| XRechnung 3.0 (KoSIT) | current |
| XRechnung 2.3 | retired 2025-02-06 |
| XRechnung 2.2 | retired 2024-02-01 |
| Factur-X 1.0 BASIC / EN 16931 | current |
| Factur-X MINIMUM | not EN 16931 compliant |

## Mandate dates the rules are measured against

| Country | Receive from | Issue from |
| --- | --- | --- |
| France | 2026-09-01 | 2026-09-01 (SMEs 2027-09-01) |
| Germany | 2025-01-01 | 2027-01-01 (all sellers 2028-01-01) |
| Belgium | 2026-01-01 | 2026-01-01 |
| Poland (KSeF FA(3)) | 2026-02-01 | 2026-02-01 (all VAT payers 2026-04-01) |
| Spain (Verifactu) | 2027-01-01 | 2027-01-01 (non-CIT 2027-07-01) |
| Italy (SdI) | 2019-01-01 | 2019-01-01 |

## Example

Running the linter on the bundled `_fixtures/dirty.xml` - a French domestic B2B invoice
generated from a German template - returns **9 errors and 1 warning**, including:

```
L5   EINV-PROFILE-RETIRED  XRechnung 2.3 was retired on 2025-02-06; use ...xrechnung_3.0
L23  EINV-FR-SIREN         found "FR 732 829 320" (not 9 or 14 digits)
L43  EINV-BR-CO-10         declared 4800.00, lines add up to 5000.00
L45  EINV-BR-CO-15         declared 5900.00, 5000.00 + 1000.00 = 6000.00
L46  EINV-BR-CO-16         declared 6000.00, expected 5900.00
```

The bundled `_fixtures/clean.xml` returns 0 errors and one informational line stating the
mandate dates it was measured against.

## Free and paid

Linting the file you have open is free and complete - all 35 rules, all 6 mandates, every
finding shown, no watermark and no trial counter. A licence key unlocks a different job:
scanning every invoice XML in the workspace in one pass and exporting the findings as JSON,
CSV or SARIF that you keep and run in CI.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.

An EN 16931 / Peppol integration consultant reviews an invoice mapping at about $170 an hour.

Web version and the rest of the toolkit: https://getreadystack.com/tools/einvoice-mandate-lint

## Notes

The mandate dates and profile identifiers live in `rules.json`. They are data, not code, so
you can read exactly what the linter believes before you trust a finding.
