# JS Licence Key Gate: GPL and evaluation keys shipped in closed-source code

![JS Licence Key Gate: GPL & Eval Keys — finds the line](https://getreadystack.com/img/promo/js-licence-key-gate_demo.gif)

![JS Licence Key Gate: GPL & Eval Keys](https://getreadystack.com/img/promo/sku358010_result_card.jpg)

**4 GPL and evaluation keys shipped** in one `widgets.ts`: that is what this extension found in its own test file, a normal dashboard bootstrap for a closed-source SaaS (7 findings: 4 errors, 3 warnings, from 15 rules).

Commercial JavaScript UI components do not fail when the licence is wrong. They take a key string at runtime: `licenseKey: 'non-commercial-and-evaluation'`, `schedulerLicenseKey: 'GPL-My-Project-Is-Open-Source'`, `license_key: 'gpl'`, `licenseKey: 'GPL'`. The page renders, the tests pass, and the product ships under terms that only allow evaluation, non-commercial use or a GPL release of your whole product. npm licence checkers read the `license` field of each package; none of them reads the key your code passes.

Hub page and free web version: https://getreadystack.com/tools/js-licence-key-gate

## What it checks (15 rules)

| Rule | Component | Fires on |
|---|---|---|
| HOT_EVAL_KEY | Handsontable | `licenseKey: 'non-commercial-and-evaluation'` (proprietary since 7.0.0) |
| HOT_NO_KEY | Handsontable | imported, no `licenseKey` in the file |
| FC_GPL_KEY | FullCalendar Premium | `'GPL-My-Project-Is-Open-Source'` |
| FC_CC_KEY | FullCalendar Premium | `'CC-Attribution-NonCommercial-NoDerivatives'` |
| FC_PREMIUM_NO_KEY | FullCalendar Premium | resource/timeline plugin, no `schedulerLicenseKey` |
| TINYMCE_GPL_KEY | TinyMCE 7+ | `license_key: 'gpl'` (TinyMCE 7.0 moved to GPLv2+) |
| TINYMCE_NO_KEY | TinyMCE 7+ | loaded, no `license_key` / `apiKey` |
| CKEDITOR_GPL_KEY | CKEditor 5 | `licenseKey: 'GPL'` |
| CKEDITOR_NO_KEY | CKEditor 5 | imported, no `licenseKey` (required since v44.0.0) |
| AGGRID_NO_KEY | AG Grid Enterprise | imported, no `setLicenseKey` |
| MUIX_NO_KEY | MUI X Pro / Premium | imported, no `LicenseInfo.setLicenseKey` |
| SYNCFUSION_NO_KEY | Syncfusion | imported, no `registerLicense` |
| MAPBOX_GL_V2 | mapbox-gl | 2.0.0+ is proprietary, billed per map load |
| DHTMLX_GANTT_GPL | dhtmlx-gantt | the npm build is the GPLv2 Standard edition |
| HIGHCHARTS_COMMERCIAL | Highcharts | free only for personal, school and non-profit use |

Every finding names the line, the licence the key string declares, and the fix (key from config, the last permissive version such as handsontable 6.2.2 or tinymce 6.8.x, or a permissive fork such as maplibre-gl).

## Yardstick

AG Grid Enterprise lists at $999 per developer (perpetual, one year of updates). A licence review by counsel during due diligence is billed by the hour; this check runs in the editor as you type.

## Use

Open any `.js`, `.jsx`, `.ts`, `.tsx`, `.vue` or `.svelte` file. Findings appear in the Problems panel with the rule id. The free web version at the hub link runs the same engine (`engine.js` + `rules.json`) in the page; nothing is uploaded.

## Limits

The check reads one file at a time. A key set in `main.ts` while the component is imported in `grid.ts` shows as a warning in `grid.ts`. The whole-workspace scan with an exportable licence inventory (CSV + Markdown) is the paid tier and asks for a licence key. This is a technical check, not legal advice: the licence text of each vendor decides.

## Files

`extension.js`, `engine.js`, `rules.json`, `report.js`, `license.js`, `README.md`, `LICENSE.txt`.
