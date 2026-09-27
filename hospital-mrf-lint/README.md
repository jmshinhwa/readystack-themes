# Hospital Price Transparency MRF Lint

![Hospital Price Transparency MRF Lint](https://getreadystack.com/img/promo/sku95197_result_card.jpg)

Lints a hospital **standard charges machine-readable file** (the CMS JSON template) against
**45 CFR Part 180** before you publish it to your website. It runs offline, inside the editor,
on the file you already have open. Nothing is uploaded.

Hub: https://getreadystack.com/tools/hospital-mrf-lint

## Who this is for

US hospital revenue-cycle engineers, chargemaster analysts and the contractors who generate the
standard charges file out of Epic, Cerner, Meditech or a home-grown export. You are the person who
has to answer when CMS emails the hospital about the file.

## What it checks

15 rules, all offline, each one carrying the paragraph it comes from:

- the six required top-level fields (`hospital_name`, `last_updated_on`, `version`,
  `hospital_location`, `hospital_address`, `license_information`) and the licensing state
- `version` names a real CMS template version (2.0.0, 2.1.0, 2.2.0)
- `last_updated_on` is `YYYY-MM-DD`, and is not stale: 45 CFR 180.50(d)(2) wants an update at
  least every 365 days, and the linter counts the days against today's date
- the affirmation block exists and `confirm_affirmation` is the boolean `true`, not the string
- every item has a plain-language description and at least one code with a CMS-listed code type
- `setting` is `inpatient`, `outpatient` or `both`
- gross charge and discounted cash price are present for every item
- a rate published as a percentage or an algorithm also carries an `estimated_amount` in dollars
- the methodology is one of the five CMS values, and `other` carries `additional_payer_notes`
- dollar amounts are JSON numbers, not strings
- placeholder prices (`0`, `9999999`, `N/A`, `call for price`) are caught as placeholders
- drug items carry both a unit and a type of measurement

## Try it on the samples

`_fixtures/clean.json` returns 0 findings. `_fixtures/dirty.json` returns 17 findings, 15 of them
errors, including a `last_updated_on` that is 580 days old against the 365-day update duty in
45 CFR 180.50(d)(2), a `setting` of `OP`, a `gross_charge` published as a string and a negotiated
percentage with no `estimated_amount`.

## Why a generic JSON validator does not do this

A JSON formatter tells you the braces balance. The CMS template is a shape with conditional duties:
`estimated_amount` is required only when the rate is a percentage or an algorithm,
`additional_payer_notes` only when the methodology is `other`, and the file is late only relative to
today. A chat assistant guesses field names from an older template version and cannot count the days
since your last publish.

## What it costs to get this wrong

Under 45 CFR 180.90 CMS can impose a civil monetary penalty of 10 dollars per bed per day, capped at
5500 dollars a day and 2007500 dollars a year for one hospital. A 250-bed hospital sits at 2500
dollars a day while the file is non-compliant.

A hospital price-transparency review by a revenue-integrity consultancy is commonly quoted as a
five-figure engagement; this extension is 29 dollars once.

## Free and full

Free, with no key: open a standard charges JSON file, run **Hospital MRF Lint: Check this file**,
and every one of the 15 rules reports with a line number. That is the whole check for one file.

The full version adds the other axis - scale and the paper trail: sweep every hospital location file
in the workspace in one pass and export one dated evidence report you keep for the file, with the
finding counts per location and the rule text beside each one. 29 dollars once, one licence key per
person or CI seat, 7-day full refund.

## Commands

- `Hospital MRF Lint: Check this file` - lint the open JSON file
- `Hospital MRF Lint: Sweep the workspace` - every location file at once (full version)
- `Hospital MRF Lint: Write the evidence report` - dated Markdown report (full version)

## Licence

See LICENSE.txt. The rule text quotes 45 CFR Part 180 and the CMS machine-readable file template
data dictionary; it is not legal advice.
