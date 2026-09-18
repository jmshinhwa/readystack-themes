# SVG Asset Compliance Lint

![SVG Asset Compliance Lint](https://getreadystack.com/img/promo/sku62703_result_card.jpg)

An SVG is the one image format that is also source code. It can carry a script element, an
`onclick` attribute, a `javascript:` link, a font pulled from a third-party server, the name of
whoever exported it, and no accessible name at all — and a browser preview will render every one
of those without complaint. This extension reads the file as text and applies **14 rules** to it.

## What the 14 rules cover

| Family | Rules | Examples |
| --- | --- | --- |
| Accessible name and scaling | 5 | `svg_no_accessible_name`, `svg_empty_title`, `svg_placeholder_title`, `svg_missing_role_img`, `svg_missing_viewbox` |
| Anything that can execute | 4 | `svg_inline_script`, `svg_event_handler`, `svg_javascript_uri`, `svg_foreign_object` |
| Outbound requests and metadata | 3 | `svg_external_href`, `svg_remote_font`, `svg_author_metadata` |
| Build hygiene | 2 | `svg_embedded_raster`, `svg_duplicate_id` |

Eight of the 14 are reported as errors; the other 6 as warnings. Every rule carries the standard or
the case it rests on, and a one-line fix.

## Measured on the sample files in this package

`_fixtures/dirty.svg` is a 21-line Illustrator export of the kind that lands in a repository every
week. Against the 14 rules it returns **13 findings, 6 of them errors**, firing 12 of the 14 rules.
Delete the script element, the `onclick` attribute and the `javascript:` link and the same file
returns 10 findings, 3 errors — the accessible name, the third-party font and the outbound image
are still there. `_fixtures/clean.svg` returns 0 findings.

## The three that survive a design export

- **No accessible name.** `<title>Layer 1</title>` is what the design tool called the layer, not a
  text alternative. WCAG 2.2 SC 1.1.1 and EN 301 549 clause 9.1.1.1 both want a real one, or the
  asset marked `aria-hidden="true"`.
- **A call out to a third-party server.** An `@font-face` rule inside the SVG that points at
  `fonts.gstatic.com` sends the visitor's IP address there before any consent banner has drawn.
  LG Munchen I, 20 Jan 2022 (3 O 17493/20) awarded EUR 100 in damages for exactly that
  embedding on a single page (LG München I, 20 January 2022).
- **Script a sanitizer will run.** An SVG served from your own origin executes its script in your
  origin. `foreignObject` is the standard way around sanitizers that only allow-list SVG tags.

## Free and paid

Checking **the file open in front of you** is free, in the editor and on the web page, against all
14 rules, with no limit and no watermark. That job finishes: you get every finding for that file.

The **licence key** unlocks a different job on a different axis — scope and ownership. It sweeps
every SVG in the workspace in one command and writes a dated conformity report file that you keep
and can hand to an auditor. $29 once, one licence key per person or CI seat, 7-day full refund.
[Licence](https://buy.polar.sh/polar_cl_KCrTfoF5x1HdHBSeZ3leRSthm5ZGowlYQNOgE2VIwVT)

Yardstick: a manual accessibility audit of a component library is quoted in the thousands of
dollars, and it looks at the rendered pages rather than at the asset files underneath.

## Commands

- **SVG Asset Compliance Lint: Check this file** — the open editor, free.
- **SVG Asset Compliance Lint: Sweep the workspace and write the report** — every matching file.

## The same engine in a browser

The free web page runs the identical `engine.js` and `rules.json`, inlined byte for byte, with
nothing uploaded anywhere: <https://getreadystack.com/tools/svg-asset-compliance-lint>

## Licence

See `LICENSE.txt`. The rule texts cite public standards and one published judgment; they are not
legal advice.
