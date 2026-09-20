# SOUP List Lint (IEC 62304)

![SOUP List Lint (IEC 62304)](https://getreadystack.com/img/promo/sku82012_result_card.jpg)

A SOUP list is the register of third-party code inside a medical device: the zlib, the SQLite,
the OpenSSL, the Qt build that shipped with the firmware. IEC 62304 asks for a specific set of
records about each one, and an auditor reads that register row by row. This extension reads it
the same way, inside the editor, before the technical file leaves your hands.

Open the markdown file that holds your SOUP register and run **SOUP List Lint: Check this file**.
Every gap is reported on its own line, with the clause that asks for the record.

## What it checks

Sixteen rules, drawn from five clauses of IEC 62304:2006+AMD1:2015.

| Clause | What the standard asks for | What the linter looks at |
| --- | --- | --- |
| 8.1.2 | Title, manufacturer and unique SOUP designator for each SOUP configuration item | An empty, placeholder (`TBD`, `TODO`, `?`) or duplicated cell; a version that is a range (`^3.45`, `latest`, `see package.json`) rather than the exact build that shipped |
| 5.3.3 | Functional and performance requirements of the SOUP item | A row with no statement of what that library must do for the device |
| 5.3.4 | Hardware and software required by the SOUP item | A row with no OS, runtime, driver or memory requirement |
| 4.3 | Software safety classification, A / B / C | A missing class, or a class written as `Low`, `Medium`, `High`, `1`, `2` |
| 7.1.3 | Evaluation of the published anomaly list of the SOUP item | An evaluation recorded as `No`, recorded with no date at all, dated in the future, or older than 365 days |

Both shapes of register are read: a markdown table with a header row, and a section per item
(`### zlib` followed by `- Manufacturer: …` lines). Column headings are matched by meaning, so
`Supplier`, `Vendor` and `Manufacturer` all count, as do `Version`, `Release` and
`Unique SOUP designator`.

## Free and paid

The free extension and the free web page at
[getreadystack.com/tools/soup-list-lint](https://getreadystack.com/tools/soup-list-lint)
lint one SOUP list, completely: every gap in that file, with its clause, every time you run it.
No item limit, no watermark, no trial window.

The paid licence adds a different job: scanning **every** SOUP list in the workspace at once —
one device family, several repositories — and exporting the result as a dated evidence record in
Markdown and CSV that you file with the technical documentation and hand to the auditor.
One key: <https://buy.polar.sh/polar_cl_LO01ePekkWKRaFbmyA8ZMKGiM4Oh215UEuHrO0mzlpP>

## Yardstick

A regulatory consultant reviewing SOUP documentation bills in the $150–$250 per hour range; a
single register of 30 items is a morning of someone's time, repeated at every version bump.

## Limits, stated plainly

This extension checks that the **records exist, are pinned, are classified and are dated**.
It does not read CVE feeds, does not judge whether an anomaly is hazardous, and does not tell you
what your safety class should be — 62304 leaves those to your hazard analysis and to you.
It is a completeness check on the register, not a substitute for the 7.1.3 evaluation itself.

## Commands

- `SOUP List Lint: Check this file` — lint the open markdown file
- `SOUP List Lint: Check the workspace` — every SOUP list in the workspace (licensed)
- `SOUP List Lint: Export evidence record` — dated Markdown + CSV for the technical file (licensed)

Findings carry a line number, so the report doubles as a work list. Run it again after the fixes;
a register with no findings prints zero.
