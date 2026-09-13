# pyproject.toml Release Gate (PEP 639)

![pyproject.toml Release Gate (PEP 639)](https://getreadystack.com/img/promo/sku37307_result_card.jpg)

Reads the `pyproject.toml` open in your editor and reports every piece of `[project]` metadata
that will not survive your next release. 19 checks, no network, no telemetry.

Free online check: https://getreadystack.com/tools/pyproject-release-gate

## Why this exists

Packaging metadata changed twice in a short window, and most of the `pyproject.toml` files being
written today were written against the older rules — by hand, by an old template, or by an
assistant trained before the change.

* **PEP 639** replaced `license = { text = "MIT" }` and the `License :: OSI Approved :: …`
  classifiers with a single SPDX expression plus `license-files`. setuptools implements this from
  **77.0.0**. If a file carries an SPDX expression *and* a `License ::` classifier, that
  combination is refused — the build stops rather than warns.
* **Interpreter floors go stale on a calendar.** Python 3.7 reached end of life 2023-06-27, 3.8 on
  2024-10-07, 3.9 on 2025-10-31, and 3.10 on 2026-10-31. A `requires-python = ">=3.8"` written in
  2023 is a promise you no longer keep, and a `Programming Language :: Python :: 3.8` classifier
  advertises it on your project page.

None of this shows up in your tests. It shows up when you tag a release — and a version number on
PyPI cannot be re-used, so a bad upload costs you a version, not a minute.

## What it checks

| Area | Checks |
| --- | --- |
| Interpreter | floor past end of life; floor within a year of end of life; upper cap on `requires-python`; `requires-python` absent |
| Classifiers | advertises an end-of-life Python; contradicts `requires-python`; deprecated `License ::` classifier |
| Licence (PEP 639) | `license` as a table; SPDX expression alongside a `License ::` classifier; identifier not on the SPDX list; lower-case `and`/`or`/`with`; `license-files` pattern that is absolute or escapes the project |
| Build | no `[build-system] requires`; `setuptools` pin too old to read the SPDX `license` field |
| Metadata | field both static and in `dynamic`; distribution name not in normalised form; no `readme`; no `[project.urls]` |

Every finding carries the line number, the spec that moved, and the replacement text.

## Commands

* **pyproject Gate: Check this file** — free. Findings appear as editor diagnostics and as a
  written summary in the output panel.
* **pyproject Gate: Sweep workspace and write report (licence)** — walks every
  `**/pyproject.toml` in the folder and writes a dated `pyprojectGate-report.md` you keep in the
  repo. This is the paid part.
  Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.
* **pyproject Gate: Enter licence key**

## Free and paid

Free finishes one job completely: for the file in front of you, you get all 19 checks with nothing
withheld, no watermark, no counter, no time limit. The paid tier changes the *scope and the
ownership* of the answer — every manifest in a monorepo in one pass, and a dated report file that
lives in the repo and goes into a pull request. One key, one seat, 7-day full refund.

## Yardstick

One hour of a senior Python developer's time costs more than the licence, in any market that
publishes to PyPI — and without this the review has to happen by hand at every release.

## Dates and accuracy

The interpreter end-of-life dates come from the CPython release cycle and live in
`rules.json` alongside the rules, so the checks are date-aware: the same file is a warning before
a cutoff and an error after it. Results are advisory and are not legal advice.
