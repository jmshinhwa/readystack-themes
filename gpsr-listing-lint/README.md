# GPSR Listing Lint

![GPSR Listing Lint](https://getreadystack.com/img/promo/sku57790_result_card.jpg)

Article 19 of the EU General Product Safety Regulation (Regulation (EU) 2023/988) says that an offer
for distance sale must *clearly and visibly* show four things: the manufacturer's name plus a postal
and an electronic address; where the manufacturer is not established in the Union, the name, postal
and electronic address of the Responsible Person (Art. 16(1) GPSR, or Art. 4(1) of Regulation (EU)
2019/1020); information identifying the product, **including a picture of it**, its type and any
other identifier; and any warning or safety information, in a language consumers in that Member
State can easily understand.

Most catalogues carry that data somewhere — on the packaging, in a PIM, in an e-mail from the
importer. Article 19 is about the *offer*, which in practice means the feed row. This extension reads
the feed row.

## What it does

Open a product feed — `products_export.csv`, a Merchant-style `feed.xml`, a semicolon-delimited
export from a PIM — and run **GPSR: Scan this feed**. Every row is checked against 12 rules. You get
the line number, the rule id and the article it fails, in the Problems panel and in a report.

The column names are matched by vocabulary, not by one fixed schema: `manufacturer`,
`manufacturer_name`, `brand`, `hersteller`, `fabricant` all resolve to the same field, and so do
`responsible_person`, `eu_representative`, `importer`. CSV, TSV, semicolon and pipe delimiters are
detected from the header. XML `<item>` blocks are read tag by tag. Nothing leaves the machine.

## The 12 rules

| id | article | what it catches |
|----|---------|-----------------|
| `A19a-NAME` | 19(a) | no manufacturer name on the row |
| `A19a-POST` | 19(a) | no manufacturer postal address |
| `A19a-ELEC` | 19(a) | no e-mail or contact URL |
| `A19a-NOREPLY` | 19(a) | contact address is an unmonitored mailbox |
| `A19a-NOBRAND` | 19(a) | `Generic`, `Unbranded`, `OEM` in the manufacturer field |
| `A19b-RP` | 19(b) | manufacturer outside the EU/EEA, no Responsible Person |
| `A19b-RP-EU` | 19(b) | Responsible Person's address is not in the Union |
| `A19b-RP-ELEC` | 19(b) | Responsible Person has no electronic address |
| `A19c-PIC` | 19(c) | no picture of the product |
| `A19c-ID` | 19(c) | no type, model, MPN or GTIN |
| `A19d-WARN` | 19(d) | age limit, battery, CE or chemical signals, no warning text |
| `A19d-LANG` | 19(d) | warning is English, the target market is not |

Placeholders count as empty: `N/A`, `TBD`, `-`, `unknown`, `see packaging`, `same as above`.
"See packaging" is exactly the answer Article 19 does not accept, because the consumer reading the
offer has not got the packaging yet.

## Two sample feeds

`_fixtures/clean.csv` — 6 rows, 0 findings. `_fixtures/dirty.csv` — 13 rows, 12 findings: 9 errors
and 3 warnings, one per rule. Run the scan on both; the dirty file is the fastest way to see what
each rule looks like when it fires.

## Free and paid

The scan is free and complete for the file you have open: every failing row, every line number, no
licence key, no upload. The paid layer is a different job — exporting a dated evidence pack for the
**whole workspace catalogue** (every feed file, every failing row, per-rule counts, as CSV and
Markdown) so it can be handed to a marketplace, an importer or an auditor. $29 once, one licence key
per person or team seat, 7-day full refund: https://buy.polar.sh/polar_cl_MeEOXqXAf3FoF5aXVJjeeyaoJJNIODsmsm5CK0skgvG

For scale: an EU Responsible Person service is sold as a monthly subscription, per brand, and
hand-checking a feed at ten seconds a row is about fourteen hours for five thousand rows.

## Dates worth writing down

GPSR has applied since 13 December 2024. The new EU product liability rules (Directive (EU)
2024/2853) must be transposed by 9 December 2026 and apply to products placed on the market from
that date.

## Not what it does

It does not decide whether a product is safe, whether a warning is the legally correct one for the
category, or whether an address is real. It checks that the offer carries the fields Article 19 asks
for, and it tells you which row does not.

More tools: https://getreadystack.com/tools/gpsr-listing-lint
