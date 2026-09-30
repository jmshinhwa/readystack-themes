# Brave Search API Migration Check — Google Custom Search & Bing v7

![Brave Search API Migration Check — Google Custom Search & Bing](https://getreadystack.com/img/promo/sku392657_result_card.jpg)

Google's Programmable Search documentation says: *"The Custom Search JSON API is closed to new customers. Existing Custom Search JSON API customers have until January 1, 2027 to transition to an alternative solution."* Microsoft retired the Bing Search APIs on 2025-08-11. This extension reads your JavaScript, TypeScript and Python files and marks every line that still speaks Google Custom Search or Bing v7, with the Brave Search API rewrite for that exact line.

Free tool on the web, same engine: https://getreadystack.com/tools/brave-search-api-migration-check

**Yardstick:** the US median pay for software developers is $64.44 an hour (BLS Occupational Outlook Handbook); tracing every parameter and response field of a search integration by hand is that hour, several times over.

## What it catches — 19 rules

| Google / Bing line | Brave Search API |
|---|---|
| `googleapis.com/customsearch/v1` | `https://api.search.brave.com/res/v1/web/search` |
| `build("customsearch", …)` / `cse().list()` | plain HTTPS GET, no discovery client |
| `api.bing.microsoft.com/v7.0/…` (retired 2025-08-11) | `/res/v1/web/search`, `/images/search`, `/news/search` |
| `Ocp-Apim-Subscription-Key` header | `X-Subscription-Token` header |
| `key=` in the query string | header only |
| `cx` engine ID | `site:` operators in `q`, or a Goggle |
| `start` (1-based result index: 1, 11, 21 …) | `offset` = page index 0–9: `floor((start-1)/count)` |
| `offset` above 9 | max 9 |
| `count`/`num` above 20 | Brave caps `count` at 20 |
| `dateRestrict: 'm6'` | `freshness: pd/pw/pm/py` or `YYYY-MM-DDtoYYYY-MM-DD` |
| Bing `freshness: 'Day'` | `pd` / `pw` / `pm` |
| `siteSearch` | `site:example.com` inside `q` |
| `safe=active` / Bing `safeSearch` | `safesearch: off / moderate / strict` |
| `lr`, `gl`, `cr`, `hl`, `mkt`, `setLang` | `country` + `search_lang` |
| `searchType: 'image'` | `/res/v1/images/search` |
| `data.items` | `data.web.results` |
| `.link`, `.snippet`, `.displayLink` | `.url`, `.description`, `.meta_url.hostname` |
| Bing `webPages.value` | `web.results` |
| `totalResults`, `totalEstimatedMatches` | no total; stop on `query.more_results_available` |

Parameter and response rules only run in files that reference a search endpoint, so `start:` in your router config stays quiet.

## Why the page-2 bug matters

The trap that a quick rewrite (by hand or by a chatbot) walks into: Google's `start` counts **results** from 1, Brave's `offset` counts **pages** from 0 and stops at 9. Pass `start=11` straight through as `offset=11` and page 2 of your agent's search breaks. The fix line the extension prints is `offset = Math.floor((start - 1) / count)`.

## Worked example (the bundled sample `search.js`)

A 20-line RAG-agent search helper written against Google Custom Search gives **8 findings** (5 errors, 3 warnings):

| Line | Broken line | Brave fix |
|---|---|---|
| 7 | `key: GOOGLE_KEY` | header `X-Subscription-Token` |
| 8 | `cx: ENGINE` | `site:docs.example.com` in `q` |
| 11 | `start: String(page * 10 + 1)` | `offset: String(page)` |
| 12 | `dateRestrict: 'm6'` | `freshness: '2026-03-29to2026-09-29'` |
| 13 | `siteSearch: 'docs.example.com'` | `site:` operator in `q` |
| 15 | `googleapis.com/customsearch/v1` | `api.search.brave.com/res/v1/web/search` |
| 17 | `data.items` | `data.web?.results` |
| 17 | `it.link`, `it.snippet` | `r.url`, `r.description` |

The migrated file gives 0 findings.

## Use

- Open a `.js`, `.ts`, `.mjs` or `.py` file: findings appear in the Problems panel as you type.
- Command palette: **Brave Search Migration: Check current file**.
- The status bar shows the finding count for the open file.

## Free and full version

The free extension checks the open file completely — every line, every rule, every Brave rewrite, no limit. The full version (one licence key, one payment) adds a workspace-wide scan and an exportable migration report for the whole repository, for handing to a team or attaching to the pull request: [Get the full version](https://getreadystack.com/api/buy/cl/polar_cl_BRotSWt4oCajWR07G0RStXi8mYXz3Hcf3rUDN1WGb96).

## Sources

- Google: Custom Search JSON API overview (closure notice, 2027-01-01 transition date, 100 free queries/day, $5 per 1,000 queries up to 10k/day).
- Brave: Web Search API query reference (`count` max 20, `offset` max 9, `freshness`, `safesearch`, `X-Subscription-Token`).
- Microsoft: Bing Search APIs retirement on 2025-08-11.

The rules are checked against published documentation; they do not call any search API and send nothing off your machine.
