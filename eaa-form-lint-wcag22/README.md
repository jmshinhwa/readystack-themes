# EAA Form Lint: WCAG 2.2 AA for HTML

![EAA Form Lint: WCAG 2.2 AA for HTML](https://getreadystack.com/img/promo/sku41980_result_card.jpg)

Paste or open an HTML, Vue or Svelte template and this extension names every WCAG 2.2 Level AA
form failure **on its line**, with the success-criterion number and the one-line fix.

It exists because generated markup fails in a very predictable way. A 70-line signup form written
the way an assistant writes one — `_fixtures/dirty.html` in this repository — returns **28 findings
across 15 success criteria** (24 errors, 4 warnings). Six of those findings sit under the criteria
that were **added in WCAG 2.2**: 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum),
3.3.7 Redundant Entry and 3.3.8 Accessible Authentication. Most models learned forms from
WCAG 2.1-era code, so those four are the ones they keep getting wrong — `autocomplete="off"` on a
password field, `onpaste="return false"`, a 16px checkbox, a "confirm your email" field.

The repaired version of the same page, `_fixtures/clean.html`, returns **0 findings**.

## Why now

The European Accessibility Act (Directive (EU) 2019/882) has applied to new consumer-facing
e-commerce, banking, ticketing and e-book services since **28 June 2025** — 440 days as of
2026-09-11. Member States enforce it through national market surveillance bodies, and the
technical yardstick they point at is EN 301 549, which carries the WCAG success criteria.
A finding arrives as a demand to fix a live service, not as a lint warning.

## What the free command does

`EAA Form Lint: Check this file` runs **18 rules** over the active editor and writes a report:

| Criterion | What it catches |
|---|---|
| 1.1.1 | `<img>` with no `alt` |
| 1.3.5 | identity field with no `autocomplete` token |
| 1.4.4 | viewport that blocks zoom |
| 2.1.1 | click handler the keyboard cannot reach |
| 2.2.1 | timed refresh or redirect |
| 2.4.3 | positive `tabindex` |
| 2.4.7 | focus outline removed with no `:focus-visible` replacement |
| 2.5.7 | dragging with no single-pointer alternative |
| 2.5.8 | interactive target under 24 by 24 CSS pixels |
| 3.1.1 | `<html>` with no `lang` |
| 3.3.1 | `aria-invalid` with no `aria-describedby` |
| 3.3.2 | placeholder used as the label |
| 3.3.7 | the same information asked for twice |
| 3.3.8 | password field hidden from password managers, or paste blocked |
| 4.1.2 | control with no accessible name, icon button, `aria-hidden` on a focusable element |

The rule table lives in `ext/rules.json`; the engine in `ext/engine.js` runs unchanged in Node and
in the browser, so the free web page at <https://getreadystack.com/tools/eaa-form-lint-wcag22>
gives the same lines as the editor.

That is the whole job for one file, with no key.

## The full version

`EAA Form Lint: Audit the whole workspace` scans every template at once and writes a dated
evidence file you keep — one row per finding, per file, mapped to its WCAG 2.2 criterion. It is
what you attach to an accessibility statement or hand to a client who asks what you checked and
when. A licence key unlocks it: https://buy.polar.sh/polar_cl_O5AMXCnn3ZETWE939bA4zjzmM0KqLt9Yp76Xm2x1Pa1

**Yardstick:** a WCAG audit from an accessibility vendor starts around $2,500 for one signup flow,
and answers for the day it was run; this answers for every file, every time you save.

7-day full refund. One licence key per person or team seat.

## Scope and honesty

This is a static text linter. It reads markup, not a rendered page, so it cannot judge colour
contrast, reading order on screen, or anything that needs a live DOM. It finds the machine-checkable
part — which is where generated code fails — and it never claims conformance on your behalf.
