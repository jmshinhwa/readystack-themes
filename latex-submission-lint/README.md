# LaTeX Submission Lint

![LaTeX Submission Lint: Desk-Reject Check](https://getreadystack.com/img/promo/sku50640_result_card.jpg)

A manuscript that compiles is not a manuscript that is accepted for review. Before an editor
ever opens your paper, an editorial assistant at Elsevier, Springer Nature, IEEE or PLOS runs
a checklist against the file you uploaded: is there a data availability statement, a funding
statement, a competing-interest declaration, CRediT roles, a line about generative-AI use, an
ORCID for the corresponding author, keywords, line numbers for the reviewers. If one of those
is absent, the submission is returned to you with a form letter and the clock restarts. None
of that is a compilation error, so `latexmk` and Overleaf both report success.

This extension reads a `.tex` file and reports the seventeen things that get a paper handed
back, each with the line it is on:

**Statements the editorial office looks for and cannot find** — data availability, funding,
competing interest, CRediT author contributions, generative-AI use, ORCID, keywords,
continuous line numbering.

**Things in the source that break the publisher's build or the review** — `subfigure`,
`epsfig`, `psfig`, `caption2`, `epsf`, `t1enc` and `here`; a `draft` class option; an absolute
figure path such as `/Users/you/Desktop/figs/setup.eps`, which exists on your laptop and
nowhere on the publisher's build machine; EPS, PS and BMP figures; `\todo{}` and `% TODO`
notes left in the text; a manuscript split across `\input` files when the system wants one
flattened source; an acknowledgements section that names your lab in a double-anonymous
submission; and a `\date{}` from a previous year.

## What it reports

Run **LaTeX Submission Lint: Check this file** on an open `.tex` file. You get a report with
one line per finding: the rule, the severity, the line number, and a sentence saying what the
publisher does about it. On the sample manuscript shipped in `_fixtures/dirty.tex` the
seventeen rules produce 18 findings, 6 of them at error severity and 9 of them statements that
are missing from the manuscript entirely. On `_fixtures/clean.tex` they produce none.

## Free and licensed

Free: the file you have open, all seventeen rules, the full line-numbered report. Nothing is
watermarked, time-limited or locked after N runs.

Licensed ($29 once): the same seventeen rules across every `.tex` file in the project, the
include chain of a split manuscript followed from the root file, and one exported
submission-readiness report for the whole paper —
[get the full version](https://buy.polar.sh/polar_cl_uLmgCBAZSFSJQ8Yvoose6IUOjSzo0hTMNwRg221VgCt). One licence key per person or team
seat, 7-day full refund.

## Yardstick

Manuscript editing services price per word, from about $0.05, so a 6,000-word paper
runs to roughly $300 and a revision cycle takes days.

## Web version

The same engine, the same seventeen rules, in one page with nothing to install:
<https://getreadystack.com/tools/latex-submission-lint>

## Scope

It reads LaTeX source as text. It does not compile your document, does not contact a server,
and does not replace your target journal's own author guidelines — journals differ, and the
guidelines page for your journal is the authority. The rules here are the requirements that
are common to the large publishers' submission checklists.
