# CRAN Policy Submission Lint

![CRAN Policy Submission Lint](https://getreadystack.com/img/promo/sku57570_result_card.jpg)

Reads an R package the way a CRAN volunteer reads it: not "does it compute", but "does it obey the
CRAN Repository Policy". `R CMD check --as-cran` already tells you about undocumented arguments and
missing imports. It says nothing about a `Description:` field that opens with the package name, a
`License: MIT` string with no `+ file LICENSE`, a `library(dplyr)` call sitting in `R/`, or a
function that calls `setwd()` on the user's session. Those are prose rules, applied by a person, and
they are where first submissions get sent back.

This extension encodes **25 of those rules** and reports them with a line number and the fix.

## What it checks

**DESCRIPTION (10 rules)** — Title in title case with no trailing period; Description that does not
open with "This package" or the package name and is a real sentence; a `License:` string CRAN
actually accepts (bare `MIT`, `BSD`, `Apache-2.0` and other SPDX ids are refused); exactly one
`person()` carrying `role = "cre"`; no four-component or `.9000` development version; no
`example.com` placeholder maintainer address; a `Date:` field that is neither in the future nor over
a month old; packages listed in `Imports:` rather than `Depends:`.

**NAMESPACE (1 rule)** — `exportPattern()`, which exports your internals along with your API.

**R sources (14 rules)** — `library()`/`require()` in package code; `install.packages()`;
`setwd()`; `options()`, `par()` or `Sys.setenv()` changed with no `on.exit()` to put them back;
writes to `~/`, `/tmp/` or `Sys.getenv("HOME")` instead of `tempdir()`; `T` and `F` for `TRUE` and
`FALSE`; `print()`/`cat()` where `message()` belongs; `\dontrun{}` in examples; non-ASCII source
characters; `<<-` and `assign(..., envir = .GlobalEnv)`; `installed.packages()`; `set.seed()` inside
a function; `:::` into another package; `source()` at package level.

## Free and paid

Free, forever, uncapped: **check the file you have open** — an `R/*.R` file, `DESCRIPTION` or
`NAMESPACE` — against all 25 rules, in the editor or in the browser tool. That finishes one job:
this file is clean.

The licence covers a different axis — **scope and a file you keep**: sweep every file in the
package in one command and write a dated `cran-policy-lint-report.md` you can commit next to the
tarball or paste into your submission comments. $29 once, one key per person or CI seat, 7-day full
refund — [get a licence key](https://buy.polar.sh/polar_cl_3p5QJlCGs0PUdsfxchdv4o2Jyr2C8Op4waTgt0xQNDs).

Yardstick: a freelance R developer in North America bills $50–$100 an hour (Upwork, 2026); one
rejected submission is a round trip of rework plus another wait in the queue.

## Why this exists now

Package sources drafted with an AI assistant arrive with `library()` calls, `T`/`F` and `setwd()` in
them, because that is what the R the model learned from looks like — it learned from scripts, and a
script is allowed to do all three. A package is not.

## Commands

- `CRAN Policy Lint: Check this file`
- `CRAN Policy Lint: Sweep workspace and write report (licence)`
- `CRAN Policy Lint: Enter licence key`

Multi-file paste: separate files with a `#### FILE: R/foo.R ####` line and the engine scopes each
block on its own. The browser tool at
<https://getreadystack.com/tools/cran-policy-submission-lint> runs the identical engine, byte for
byte, with nothing uploaded.

Findings are advisory. CRAN's own policy page is the authority.
