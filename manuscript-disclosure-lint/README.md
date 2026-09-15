# Manuscript Disclosure Lint (LaTeX & Markdown)

![Manuscript Disclosure Lint](https://getreadystack.com/img/promo/sku64951_result_card.jpg)

A manuscript is rejected before peer review more often for a missing paragraph than for a
weak result. Editorial office staff work through a submission form that asks, one field at a
time, for the statements that are supposed to already be in the file: data availability,
funding with the award ID, competing interests, author contributions, ethics approval,
consent, trial registration, ORCID, an open-access licence, and — since the ICMJE
Recommendations were updated for generative AI — a declaration of whether an AI tool was
used in the writing and for what. If one of them is absent the paper comes back unread,
and the clock on the next issue starts again.

This extension reads the `.tex` or `.md` file you are editing and reports which of those
statements are missing, thin, or out of date. It runs entirely on your machine: an
unpublished manuscript never leaves the editor.

## What it checks

16 rules, every one of them pointed at a line in your file:

| Area | Rules |
| --- | --- |
| Generative AI | disclosure missing; an AI tool listed on the author line |
| Data | no data availability statement; "from the authors on request" as the only route; a statement with no repository, accession or DOI |
| Money | no labelled funding statement; a funder named without an award number |
| People | no ethics approval where participants, patients or animals appear; no informed-consent statement; a trial described without a registration identifier |
| Credit | no competing-interests statement; no author contributions; contributions written as prose instead of CRediT roles (ANSI/NISO Z39.104-2022) |
| Identity & access | no ORCID iD anywhere; no open-access licence line |
| Out of date | a promised 12-month embargo — the 2024 NIH Public Access Policy, effective for papers accepted on or after 2026-07-01, makes the Author Accepted Manuscript public in PubMed Central on the official date of publication, with no embargo option |

That last rule is the one a chatbot gets wrong. Models trained before mid-2026 still describe
the old 12-month window, and text written from that advice contradicts the policy the paper
will actually be held to.

## Using it

- **Manuscript Disclosure Lint: Check this file** — runs the 16 rules over the open document,
  marks the lines in the Problems panel, and prints a list with the wording to paste for each
  gap. This is the free part and it is not limited in any way.
- **Manuscript Disclosure Lint: Sweep workspace and write report** — runs the same 16 rules
  over every `.tex` and `.md` file in the folder and writes a dated
  `manuscriptDisclosure-report.md` you keep, hand to a co-author, or attach to a
  submission-readiness check for a whole thesis or a lab's back catalogue. That part asks for
  a licence key. The first sweep starts a 7-day trial of it.
- **Manuscript Disclosure Lint: Enter licence key** — for the key.

## A reference point

A manuscript formatting and compliance service quotes roughly $150-$400 per paper for the
same read-through; a journal's own editorial office returns the file instead. The rule set
here is the checklist, not the service.

## Free online version

The same engine, byte for byte, runs in the browser at
<https://getreadystack.com/tools/manuscript-disclosure-lint> — paste a manuscript, get the
same findings, nothing uploaded.

## Notes

Results are advisory. Journals differ, and a target journal's author guidelines always win
over a general rule set. The 16 rules follow the ICMJE Recommendations, the CRediT standard
(ANSI/NISO Z39.104-2022), and the open-access conditions attached by NIH, UKRI, Plan S and
Horizon Europe.

Licence: see `LICENSE.txt`.
