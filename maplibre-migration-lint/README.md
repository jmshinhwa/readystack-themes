# MapLibre Migration Lint — Mapbox GL JS v2+

![MapLibre Migration Lint — Mapbox GL JS v2+](https://getreadystack.com/img/promo/sku390572_result_card.jpg)

**MapLibre migration check for Mapbox GL JS v2+ code.** It reads package.json, package-lock.json, yarn.lock, JS/TS/JSX/TSX, HTML, Vue, Svelte and CSS files and flags every line that keeps your map on the Mapbox licence or the Mapbox bill, or that breaks once you swap `mapbox-gl` for `maplibre-gl`. Each finding names the line and the MapLibre fix.

Free web version and docs: https://getreadystack.com/tools/maplibre-migration-lint

## Why this matters

- **Licence.** mapbox-gl v2.0.0 (8 December 2020) left BSD-3-Clause. Its LICENSE.txt now says the SDK is licensed under the Mapbox TOS, only for developers with an active Mapbox account. v1.13.3 is the last BSD release; MapLibre GL JS was forked from 1.13 and stays BSD-3-Clause.
- **Billing.** From v2.0.0 on, a billable map load happens whenever a Map object is initialised. The Mapbox price list for Mapbox GL JS map loads: up to 50,000 a month free, then $5.00 per 1,000 (50,001–100,000), $4.00 (100,001–200,000), $3.00 (200,001–1,000,000), $2.50 (1,000,001–5,000,000).
- **Yardstick:** 300,000 map loads a month = 50,000 free + 50,000 × $5.00/1,000 ($250) + 100,000 × $4.00/1,000 ($400) + 100,000 × $3.00/1,000 ($300) = **$950 a month** on the Mapbox price list.
- **Breakage.** MapLibre GL JS 2.0.0 removed `accessToken` and all `mapbox://` URL handling. MapLibre 3.0.0 removed the deprecated `mapboxgl-` CSS classes. MapLibre has `setSky` but no `setFog` and no `setConfigProperty`.

A chatbot usually renames the import and stops there. The map then loads blank (mapbox:// style), the controls lose their styling (mapboxgl- classes) and the geocoder still bills your Mapbox token.

## The 17 rules

| Rule | Severity | What it flags |
|---|---|---|
| mapbox-gl-v2-dependency | error | `"mapbox-gl": "^2…"`, `"^3…"`, `"latest"`, `"*"`, `">=1"` in package.json |
| mapbox-gl-v1-frozen | info | mapbox-gl 1.x: still BSD, frozen at 1.13.3 |
| mapbox-gl-v2-lockfile | error | package-lock, yarn.lock or pnpm entries resolving mapbox-gl 2.x/3.x |
| mapbox-gl-cdn | error | api.mapbox.com/mapbox-gl-js/v2 or v3, unpkg/jsdelivr mapbox-gl@2/3 |
| mapbox-gl-import | warn | `from 'mapbox-gl'`, `require('mapbox-gl')`, `import('mapbox-gl')` |
| mapbox-gl-css | warn | mapbox-gl.css imports and links |
| mapbox-access-token | error | `mapboxgl.accessToken =`, `mapboxAccessToken`, `pk.` tokens |
| mapbox-api-url | warn | direct api.mapbox.com style/tile/geocoding requests, `access_token=pk.` |
| mapbox-style-url | error | `mapbox://styles/…` |
| mapbox-source-url | error | `mapbox://` tilesets, sprites and glyphs |
| mapboxgl-namespace | warn | `new mapboxgl.Map`, `mapboxgl.Marker` and the rest of the global |
| mapboxgl-css-class | warn | `.mapboxgl-ctrl…`, `mapboxgl-popup…` selectors |
| react-map-gl-mapbox-entry | warn | `from 'react-map-gl'` (v7) and `'react-map-gl/mapbox'` (v8) |
| mapbox-geocoder | warn | @mapbox/mapbox-gl-geocoder |
| mapbox-gl-draw-classes | info | @mapbox/mapbox-gl-draw control class names |
| mapbox-setfog | warn | `map.setFog()` |
| mapbox-standard-config | warn | `setConfigProperty()` and the Mapbox Standard style |

The sample store-locator.js (a Mapbox GL JS v3 map page) gives 13 findings from 11 of the 17 rules: 3 errors, 9 warnings, 1 info. Its MapLibre version gives 0.

## Use

Open a file and run **MapLibre Migration Lint: Check this file**. Findings show in the Problems panel. Comment lines are skipped. Everything runs offline; no code leaves your machine.

Note: switching the library does not end Mapbox billing if your style or tiles still come from api.mapbox.com. The mapbox-api-url and mapbox-access-token rules point at those lines.

## Free and full version

Free: every finding in the open file, with the MapLibre fix. Full version: scan the whole workspace in one pass and export one migration report for the pull request, [$29 once](https://getreadystack.com/api/buy/cl/polar_cl_jYm4blWtSExV7LvGc7v8hHfID9il3bpCX6vw444Vmis), one licence key per person or team seat.

Sources: mapbox-gl-js LICENSE.txt and CHANGELOG 2.0.0 · mapbox.com/pricing (Mapbox GL JS map loads) · maplibre-gl-js CHANGELOG 2.0.0 and 3.0.0 · npm registry.
