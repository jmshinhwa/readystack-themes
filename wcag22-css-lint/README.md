# WCAG 2.2 CSS Lint - Focus & Target Size

![WCAG 2.2 CSS Lint - Focus & Target Size](https://getreadystack.com/img/promo/sku43513_result_card.jpg)

WCAG 2.2 became a W3C Recommendation on 5 October 2023 and added five success criteria on top of WCAG 2.1. Three of them are decided almost entirely in CSS: **2.5.8 Target Size (Minimum)**, **2.4.11 Focus Not Obscured (Minimum)** and **2.4.13 Focus Appearance**. Stylesheet tooling and code assistants built on 2.1-era material do not look for them, so the rules pass review and the criteria fail.

This extension reads the stylesheet itself - not a rendered page - and reports the declarations that break a criterion, with the criterion number, its conformance level and the line.

## What it checks

14 rules, covering 11 success criteria:

| Criterion | Rule |
| --- | --- |
| 2.5.8 AA *(new in 2.2)* | interactive selector sized under 24 CSS px |
| 2.4.11 AA *(new in 2.2)* | fixed or sticky bar with no `scroll-padding-top` anywhere in the file |
| 2.4.13 AAA *(new in 2.2)* | focus ring thinner than 2px |
| 2.4.7 AA | `outline: none` with no `:focus-visible` ring and no replacement in the rule |
| 1.4.13 AA | `:hover` reveals content that no `:focus-within` rule reveals |
| 1.4.12 AA | `line-height` under 1.5 on body text; spacing locked with `!important` |
| 1.4.10 AA | fixed `min-width` above 320px on a page-level box |
| 1.4.4 AA | `text-size-adjust: none`; root `font-size` pinned in px |
| 1.3.1 A | `.sr-only` built with `display: none` or `visibility: hidden`; wording that exists only in `content:` |
| 2.2.2 A | animation set to `infinite` |
| 2.3.3 AAA | the file animates but never answers `@media (prefers-reduced-motion: reduce)` |

## Using it

1. Open a `.css` or `.scss` file.
2. Command palette → **WCAG 2.2 CSS Lint - Focus & Target Size: Check this file**.

Findings open as a report next to the file. Two sample stylesheets ship in `_fixtures/`: `dirty.css` is 61 lines and returns 14 findings across 11 criteria; `clean.css` is the same component set after the fixes and returns none.

## Free and licensed

Linting the open file is free and finishes the job on its own - all 14 rules, every criterion number, no watermark, no usage counter, no limit on how often you run it.

A licence key adds a different job: **Sweep workspace and write report** reads every stylesheet in the workspace in one pass and writes a dated criterion-by-criterion table (Markdown + CSV) - the paper record that sits behind an accessibility statement, with file and line for each criterion. Enter it with **Enter licence key**.

$29 once - one licence key per person or team seat - 7-day full refund. An accessibility consultant reading one stylesheet by hand bills a $150-$250 hour.

## Yardstick

An accessibility consultant reading one stylesheet by hand bills a $150-$250 hour; a third-party WCAG audit of a whole site is quoted in the thousands.

## Scope

CSS is one layer. These rules read declarations and selectors, so they see what a stylesheet can decide on its own; contrast pairs that depend on computed inheritance, and anything decided in markup (labels, headings, aria), are outside them. A finding is a place to look with the criterion already identified, not a conformance claim.

## Browser version

The same engine and the same 14 rules run as a page, with nothing to install: https://getreadystack.com/tools/wcag22-css-lint
