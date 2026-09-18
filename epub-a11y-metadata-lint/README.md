# EPUB Accessibility Metadata Lint (EAA)

![EPUB Accessibility Metadata Lint (EAA)](https://getreadystack.com/img/promo/sku101717_result_card.jpg)

Open an EPUB package file (`.opf`) and this extension reads the accessibility
metadata the way an EU bookseller's ingest script reads it: literally.

Since **28 June 2025** the European Accessibility Act (Directive (EU) 2019/882)
covers e-books, and the accessibility information has to travel **inside the
publication's metadata**, not in an email to the retailer. EPUB Accessibility
1.1 (W3C Recommendation, 2023) is the standard that defines which properties
carry it and what the conformance string looks like. Both are unforgiving about
spelling: `altText` is not `alternativeText`, and `WCAG 2.2 AA` is not
`WCAG 2.2 Level AA`. A value outside the vocabulary is not a smaller claim, it
is no claim at all — the ingest drops it.

## What it does

`EPUB A11y: Check this .opf` runs **18 rules** over the open file and reports
every finding on its own line, with the exact replacement line to paste:

* `schema:accessMode`, `schema:accessModeSufficient` — present, and every value
  inside the vocabulary (`accessModeSufficient` allows only auditory, tactile,
  textual, visual)
* `schema:accessibilityFeature` — present, spelled as schema.org spells it, and
  not `none` sitting next to a list of features
* `schema:accessibilityHazard` — present, including when the answer is `none`
* `schema:accessibilitySummary` — present, and a real sentence rather than
  "This ebook is accessible."
* `dcterms:conformsTo` — one of the strings EPUB Accessibility 1.1 defines, and
  flagged when it still claims the superseded 1.0
* `a11y:certifiedBy` — required whenever a conformance claim is made
* Print page numbers declared with no `dc:source` for the print edition
* EPUB 2 `name`/`content` metadata that an EPUB 3 reader never looks at
* A `textual` alone claim over visual content with no alternative-text feature:
  a claim that cannot be true

## The sample file

`_fixtures/dirty.opf` is the kind of package a generative assistant writes when
you ask it for "accessibility metadata": confident, well indented, and wrong.
The extension reports **12 findings** in it — **9 errors** and 3 warnings — of
which **6** are invented or malformed values (`altText`,
`screenReaderFriendly`, `sight`, `screenReader`, `noFlashing`, and a conformance
string missing the word `Level`). `_fixtures/clean.opf` is the same book after
the fixes: 0 findings.

## Free, and the part that is not

Checking the file you have open is free and finishes the job: every finding,
every fix line, no key, no limit on how many files you open. The paid layer is
a different axis — scope and a document you keep: `EPUB A11y: Sweep this
folder` walks every `.opf` in the workspace in one run and writes a dated
pass/fail report per title, the thing a distributor or a retailer asks you for.

Full version (folder sweep and the dated report): https://buy.polar.sh/polar_cl_oPMAjVdCsJ3pQdXfabWNj50DOpyh2wFYTMd6w11o7Aj

## Yardstick

An EPUB production freelancer bills $50 to $95 an hour.

Hub and the free web version: https://getreadystack.com/tools/epub-a11y-metadata-lint

## Commands

* `EPUB A11y: Check this .opf` — lint the active file (free)
* `EPUB A11y: Sweep this folder` — every `.opf` in the workspace, dated report
* `EPUB A11y: Enter licence key`

## Licence and refund

$29 once, one licence key per person or team seat, 7-day full refund. The key is
validated against the Polar customer portal; no account and no telemetry.

Not legal advice. It reads metadata and reports what the standard says; the
conformance claim is still yours to make.
