# Apache ECharts Migration: Highcharts Licence Map

![Apache ECharts Migration: Highcharts Licence Map](https://getreadystack.com/img/promo/sku604232_result_card.jpg)

**Open a package.json and see every Highcharts dependency on its own line, with the exact Apache ECharts line that replaces it. The sample project in this repo shows 6 findings in one file.**

Highsoft's end-user licence agreement (section 1.4, "Commercial Use") requires a separate Commercial Use License for "any use within a for-profit company, non-profit organization, or government entity", for freelance or consulting work, and for "internal business operational context, such as for prototyping, research and development, or internal presentations". The free terms cover Personal Use and Educational Use only. Section 2.3 says Highsoft may log CDN traffic, verify domains and crawl public websites to find unlicensed use.

If your team is moving to Apache ECharts (Apache-2.0), the hard part is finding every place the old library is still pulled in. Wrappers such as `highcharts-react-official`, `highcharts-angular` and `highcharts-export-server` are MIT themselves, but they render through the `highcharts` package, so they keep you inside the EULA.

## What it finds — 14 rules

| Where | What it flags | Replacement line it gives |
|---|---|---|
| package.json | `highcharts` | `"echarts": "^6.1.0"` |
| package.json | `highcharts-react-official` | `"echarts-for-react": "^3.0.6"` |
| package.json | `highcharts-angular`, `angular-highcharts` | `"ngx-echarts": "^22.0.0"` |
| package.json | `highcharts-vue` | `"vue-echarts": "^8.3.2"` |
| package.json | `@highcharts/dashboards` | `"echarts": "^6.1.0"` + one instance per grid cell |
| package.json | `highcharts-export-server` | ECharts server-side SVG (`ssr: true`, `renderToSVGString()`) |
| package.json | `@highcharts/map-collection` | `echarts.registerMap('world', geoJson)` |
| package.json | `@types/highcharts` | remove (deprecated stub) |
| package.json | `@highcharts/grid-lite` | note only: governed by its own Grid Lite EULA |
| .csproj | `Highsoft.Highcharts`, `Highsoft.Highstock` | ECharts script tag, render from controller JSON |
| HTML | `<script src="…code.highcharts.com…">` | `https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js` |
| JS / TS / Vue | `import … from 'highcharts'`, `require('highcharts/modules/…')` | `import * as echarts from 'echarts';` |

Every finding shows the file, the line, the version you have now, the replacement line and the EULA clause it relates to. Findings appear in the Problems panel.

## How to use

1. Open a `package.json`, `.csproj`, HTML, JS, TS, JSX, TSX or Vue file.
2. Run **Apache ECharts Migration: Highcharts Licence Map: Check this file** from the Command Palette.
3. Work down the Problems panel: each entry tells you which line to delete and which line to add.

A clean project (only `echarts`, `echarts-for-react`, `react`) shows 0 findings.

## The measuring stick

The replacement versions were read from the npm registry on 2026-10-11: echarts 6.1.0 (Apache-2.0), echarts-for-react 3.0.6 (MIT), vue-echarts 8.3.2 (MIT), ngx-echarts 22.0.0 (MIT). The EULA quotes come from https://shop.highcharts.com/license-eula, read the same day. This tool does not decide whether your use is commercial; it shows you where Highcharts is, so your team or counsel can decide.

## Full version

The whole-workspace migration plan, a dated licence-exposure report for the company, team keys and a CI gate that fails a build adding new Highcharts use are described at https://getreadystack.com/tools/apache-echarts-migration-check

The same engine runs in the browser at https://getreadystack.com/tools/apache-echarts-migration-check — paste a package.json and see the same findings.

Highcharts is a registered trademark of Highsoft AS. Apache ECharts is a project of the Apache Software Foundation. This extension is not affiliated with either.
