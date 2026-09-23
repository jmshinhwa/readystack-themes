# Immobilienanzeige GEG 87 Lint

![Immobilienanzeige GEG 87 Lint](https://getreadystack.com/img/promo/sku142248_result_card.jpg)

Lints German property-ad HTML for the certificate fields that **§ 87 GModG** (the
Gebäudemodernisierungsgesetz, still cited by most portals as GEG) makes mandatory in every
commercial listing, and — the part a human proof-reader misses — checks that the efficiency
class you print actually matches the kWh figure you print next to it.

Hub: https://getreadystack.com/tools/geg-87-listing-lint

## What § 87 actually demands

When an Energieausweis exists at the moment the ad is placed, the ad must contain:

1. the **type** of certificate — Energiebedarfsausweis (§ 81) or Energieverbrauchsausweis (§ 82);
2. the **Endenergiebedarf or Endenergieverbrauch** value from the certificate;
3. the **wesentliche Energieträger** used for heating;
4. for a Wohngebäude, the **Baujahr** named in the certificate;
5. for a Wohngebäude, the **Energieeffizienzklasse** named in the certificate.

For a Nichtwohngebäude, § 87 (2) requires the figure split into Wärme and Strom separately.
A missing or wrong mandatory field is an Ordnungswidrigkeit under § 108 (1) no. 16 GModG and
can be fined up to **10,000 euro** per ad.

## The check no proof-reader runs

Anlage 10 fixes the class bands: A+ under 30, A under 50, B under 75, C under 100, D under 130,
E under 160, F under 200, G under 250, H from 250 kWh/(m²·a) upward. When a CMS renders the class
from one database column and the kWh value from another, the two drift apart and the ad states
two contradictory facts about the same building. The bundled dirty fixture prints
`Endenergiebedarf: 182 kWh` beside `Energieeffizienzklasse: C`; 182 is class F.

The linter also flags a certificate whose issue date is more than ten years old (§ 79 (4)),
a kWh figure shipped without the unit `kWh/(m²·a)`, and an unrendered template token such as
`{{ traeger }}` standing where a mandatory figure belongs.

## Rules

13 rules, all listed in `ext/rules.json` with the clause each one enforces. Every finding carries
the line number in the template file, the statute reference and the wording that fixes it.

## Running it

- Open a listing template and run **GEG 87: Lint this property ad** from the command palette.
- Findings appear as diagnostics on the line that carries the defect.
- The same engine runs unchanged in the browser on the free web page — paste an ad, get the findings.

Diagnostics are advisory. A Bedarfsausweis drawn up by an Energieberater with an on-site visit
runs about 300 to 500 euro in 2026; this linter does not replace it, it checks that what the
certificate says arrives intact in the ad.

## Free and full

Free: lint the property ad you have open and see every § 87 field that is missing, expired or
contradicted by the kWh value.

Full version: scan every listing template in the workspace or CI feed at once and write a dated
audit record you keep as proof of what the ad said on the day it ran —
https://buy.polar.sh/polar_cl_sOwHAKyyi7buuu6frpXCErjfL8UmizPvqNmPz0ptuox

## Fixtures

`_fixtures/clean.html` — a compliant Leipzig listing, 0 findings.
`_fixtures/dirty.html` — the same agency's broken template, 7 findings.
