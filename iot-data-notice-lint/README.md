# IoT Data Notice Lint: EU Data Act Art. 3

![IoT Data Notice Lint: EU Data Act Art. 3 — finds the line](https://getreadystack.com/img/promo/iot-data-notice-lint_demo.gif)

![IoT Data Notice Lint: EU Data Act Art. 3](https://getreadystack.com/img/promo/sku298003_result_card.jpg)

Checks the pre-contract **product data notice** of a smart or connected device against **Regulation (EU) 2023/2854 (Data Act), Article 3(2) and 3(3)**, line by line, inside VS Code. Open the Markdown page you publish before a sale (product page section, datasheet, app onboarding text) and the Problems panel lists every item the buyer must be told that your page does not say, plus lines that charge for data access or give no retention period.

Free web version (same engine, runs in your browser, nothing uploaded): https://getreadystack.com/tools/iot-data-notice-lint

## Why now
- The Data Act applies from 12 September 2025, including the Article 3(2)-(3) notice owed before every sale, rental, lease or related-service contract.
- Article 3(1) (data accessible by default, free of charge, machine-readable) applies to connected products and related services placed on the market after 12 September 2026 (Article 50).
- Article 40(4): where personal data is involved, data protection authorities may fine up to the amount in GDPR Article 83(5): EUR 20,000,000 or 4% of worldwide annual turnover (€20,000,000 or 4%).

## The 17 rules
| Rule | Source | What it checks |
|---|---|---|
| art3-2a | Art. 3(2)(a) | type, format and estimated volume of product data |
| art3-2b | Art. 3(2)(b) | whether data is generated continuously and in real time |
| art3-2c | Art. 3(2)(c) | on-device or remote storage, intended retention |
| art3-2d | Art. 3(2)(d) | how to access, retrieve, erase; technical means; terms of use; quality of service |
| art3-3a | Art. 3(3)(a) | nature, volume, collection frequency of data the data holder obtains |
| art3-3b | Art. 3(3)(b) | related service data and how to retrieve it |
| art3-3c | Art. 3(3)(c) | the data holder's own use, purposes, third parties |
| art3-3d | Art. 3(3)(d) | identity: trading name and geographical address |
| art3-3e | Art. 3(3)(e) | a quick means of contact |
| art3-3f | Art. 3(3)(f) | how to share with a third party and end the sharing |
| art3-3g | Art. 3(3)(g) | right to lodge a complaint with the Article 37 competent authority |
| art3-3h | Art. 3(3)(h) | trade secrets in the data, and who holds them |
| art3-3i | Art. 3(3)(i) | contract duration and how to terminate |
| q-access-fee | Art. 3(1), 4(1) | a fee, price or paid plan on a data export/access line |
| q-vague-retention | Art. 3(2)(c) | "as long as necessary", "indefinitely" instead of a period |
| q-vague-volume | Art. 3(2)(a) | "small amount of data" with no figure |
| q-not-machine-readable | Art. 3(1) | PDF-only or proprietary export with no CSV/JSON/XML |

Set `placed_on_market: YYYY-MM-DD` in the front matter. For a date on or before 12 September 2026 the two Article 3(1) rules drop to warnings; after it they are errors.

## Example (bundled sample notice)
The sample thermostat notice in `_fixtures/dirty.md` returns 6 findings: 4 of the 13 Article 3 items missing (3(2)(b) real time, 3(3)(g) complaint, 3(3)(h) trade secrets, 3(3)(i) duration and termination) and 2 bad lines (retained "as long as necessary"; export "included in Nordlicht Plus at €4.99 per month").

## Yardstick
A lawyer billed at the DOJ Fitzpatrick Matrix rate for 15 years of practice costs $851/hour (billing year 2026).

## Free and full version
Free: one open file, all 17 rules, line numbers and a fix for each gap, no key. Full version ($29 once, one licence key per person or team seat): sweep a whole workspace of product notices and write one dated Data Act evidence report. [Licence key](https://buy.polar.sh/polar_cl_DxvsrxKs95Kdnm3qJUyVwQ93Ie7YzTgVfCaNu12sXW0)

## Commands
- `IoT Data Notice Lint: EU Data Act Art. 3: Check this file`: free. The check also runs when a Markdown file that mentions "product data", "connected product" or "Data Act" is opened or saved.
- `...: Sweep workspace and write report (licence)`: the full version.
- `...: Enter licence key`.

Not legal advice. The lint checks that each item is stated; it cannot check that what you state is true for your device.

Sources: Regulation (EU) 2023/2854, OJ L 2023/2854, Articles 3, 4, 37, 40, 50 (eur-lex.europa.eu, read 2026-09-26).
