# SPL Registration Lint - FDA Establishment XML

![SPL Registration Lint - FDA Establishment XML](https://getreadystack.com/img/promo/sku152375_result_card.jpg)

An SPL establishment registration is accepted or rejected by a machine. The FDA Electronic
Submissions Gateway reads your Structured Product Labeling XML, and a wrong document code, a
D-U-N-S number typed with dashes, or a `setId` that repeats the document `id` comes back as a
rejection instead of an acknowledgement. This extension reads the same file in your editor and
names every blocking line before you send it.

Drug establishment registration is renewed once a year, and the window is **October 1 -
December 31** (FD&C Act section 510(b)(2)). A registration that is not renewed inside that window
lapses on December 31. This linter knows today's date, so it tells you where you stand in that
window rather than only what the XML says.

## What it checks - 9 rules

| Rule | What it catches |
| --- | --- |
| `doc_type` | Document `<code>` is not `51725-0` ESTABLISHMENT REGISTRATION |
| `loinc_system` | Document code is not declared under the LOINC OID `2.16.840.1.113883.6.1` |
| `doc_uuid` | `<id>` or `<setId>` is not a UUID, or `setId` repeats `id` |
| `version_number` | `<versionNumber>` missing, zero or not a positive integer |
| `effective_date` | `<effectiveTime>` is not a valid eight-digit YYYYMMDD date |
| `reg_window` | `effectiveTime` falls before October 1, outside the annual window |
| `lapse_clock` | The registration is dated for an earlier year and has already lapsed |
| `duns_root` | No organization carries a D-U-N-S id under root `1.3.6.1.4.1.519.1` |
| `duns_format` | A D-U-N-S number is not exactly nine digits |

## A worked example

The sample file `_fixtures/dirty.xml` is a registration dated `20251110`. Linted as of
`2026-09-21` it returns **7 blocking errors** on lines 4, 6, 7, 8, 12 and 18, including:

```
ERR L6  lapse_clock  This registration is dated 20251110, so it expired on 2025-12-31,
                     264 days ago.
ERR L12 duns_format  D-U-N-S number "12-345-6789" is not nine digits.
```

Change the `effectiveTime` to `20261001` and fix the six lines and the same file returns
0 findings. The clock is real arithmetic against the date you pass, not a stored string.

## How it runs

Open any `.xml` file and run **SPL Registration Lint: Check this file** from the command
palette. Findings appear as diagnostics on the exact line, with the corrected line in the
message. Nothing leaves your machine - the rules and the engine are in the extension.

## Free and full version

Free, with no key: lint the open SPL registration XML file against all 9 rules and get every
blocking error with its line number. That finishes one file.

Full version - $29 once: sweep every `.xml` file in the submission folder in one pass and export
a dated readiness report you keep with the submission record. One licence key per person or CI
seat. Get the full version: https://buy.polar.sh/polar_cl_5DGxPviszTwjOqxMnoZEuBHdaWberjjix1mAZ1mQljU

Yardstick: a regulatory-affairs consultant bills $100-$200 per hour, and a rejected gateway
submission costs a re-check and a resubmission cycle inside a window that closes on December 31.

Browser version and the rest of the tools: https://getreadystack.com/tools/spl-registration-lint

This extension checks the structure of an SPL file. It is not legal or regulatory advice.
