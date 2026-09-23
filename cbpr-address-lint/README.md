# CBPR+ Structured Address Lint

![CBPR+ Structured Address Lint](https://getreadystack.com/img/promo/sku142540_result_card.jpg)

**Your AI assistant will happily generate a `pacs.008` with the whole beneficiary address crammed into two `AdrLine` elements. That shape is the one CBPR+ is removing.** This extension reads the postal-address blocks in your ISO 20022 XML and names the ones a correspondent bank has to repair by hand.

Point it at `pacs.008`, `pacs.009` or `pain.001` files. It marks every `<PstlAdr>` block that fails a CBPR+ address rule, on the line where it fails, with the rule behind it.

## Where the dates actually stand

- **2025-11-22** — the hybrid postal address option went live in CBPR+. Town plus country in dedicated elements, at most two `AdrLine` occurrences, and a component that owns a structured element must *not* also be echoed in an address line.
- **2026-11-14** — the date set for removing fully unstructured addresses from CBPR+ messages.
- **2026-08-27** — Swift deferred the payments-related Standards Release 2026 changes, including that removal, and said a revised timetable would be announced by December 2026.

So the cliff moved, but the hybrid rules have been live since November 2025 and a malformed hybrid is rejected rather than repaired today. That gap is exactly where a model trained before August 2026 gives you a confident, wrong answer in either direction.

## The 9 checks

| Rule | Severity | What it catches |
| --- | --- | --- |
| `unstructured_only` | error | `AdrLine` only, no `TwnNm` and no `Ctry` |
| `no_country` | error | structured block with no `<Ctry>` |
| `no_town` | error | hybrid block with no `<TwnNm>` |
| `dup_in_adrline` | error | a structured value echoed inside an `AdrLine` |
| `adrline_max2` | error | more than two `AdrLine` occurrences |
| `ctry_code` | error | `Ctry` is not two upper-case letters |
| `adrline_70` | warn | `AdrLine` past `Max70Text` |
| `charset` | warn | a character outside the permitted SWIFT set |
| `bldgnb_in_strtnm` | warn | house number buried in `StrtNm`, no `BldgNb` |

**6 of the 9 rules are errors** - the shapes that get a payment repaired by hand or returned. The other 3 are warnings.

## What it found in the sample files shipped with this repo

`_fixtures/clean.xml` — a fully structured single-payment `pacs.008` — returns **0 findings**.

`_fixtures/dirty.xml` — the same payment with realistic addresses — returns **13 findings: 9 errors and 4 warnings, across all 4 party address blocks in the message**. One `UltmtCdtr` block alone accounts for four `dup_in_adrline` errors, because street, building number, postcode and town are each present as a structured element *and* repeated in one address line.

## Free, and what asks for a key

Free, with no key: open any ISO 20022 XML and get every failing address block named, with the line number and the rule. That is the whole job for one file, and it finishes.

The **paid layer sits on a different axis — ownership**: a dated CBPR+ address audit file (CSV and Markdown) covering every message in the workspace, with the rule citation per finding, written to disk so you can hand it to your correspondent bank, your migration programme or your auditor. $29 once, one licence key per person or CI seat.

Yardstick: a correspondent bank charges **$15 to $40 to repair one payment by hand**, and an average rejected or repaired payment is reported at around **$12**. This reads the message before you send it.

- Get the full version: https://buy.polar.sh/polar_cl_hvlxO2MoABOcEHmAOJCtxxdriZukvoDX08sKM2VvzGU
- Hub page: https://getreadystack.com/tools/cbpr-address-lint

## Commands

- **CBPR+ Address: Check This File** — lint the active editor.
- **CBPR+ Address: Sweep Workspace and Write Report** — every matching file, one dated report.

## Running it in a browser

The same engine file runs the free web page, unmodified. Nothing is uploaded; the check happens in the page.

## Not a substitute for

Schema validation and your bank's own CBPR+ readiness testing. This reads address shape, not the whole message.

## Licence

See `LICENSE.txt`.
