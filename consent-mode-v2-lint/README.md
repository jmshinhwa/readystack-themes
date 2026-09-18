# Consent Mode v2 Lint

![Consent Mode v2 Lint for GA4 & Google Ads](https://getreadystack.com/img/promo/sku17648_result_card.jpg)

**Finds the consent-signal bugs that silently switch off Google Ads conversions and remarketing for your EEA and UK traffic — in your source, before you ship.**

A wrong consent key does not throw. Nothing turns red. The page loads, the tag fires, and the data quietly stops arriving. `adStorage` instead of `ad_storage`, `true` instead of `'granted'`, `region: ['EU']` — every one of these is accepted by the browser and ignored by Google.

Since **15 June 2026** this costs more than it used to. Google Signals no longer governs whether data reaches Google Ads; `ad_storage` alone does. A loose consent implementation that used to be rescued by that fallback now simply loses advertising data.

## What it checks — 20 rules

**18 line rules** for hand-written `gtag()` / HTML / JS:
misspelled and camelCase consent keys · boolean, numeric and unquoted consent values ·
`'true'`/`'false'` instead of `'granted'`/`'denied'` · `region: ['EU']` (there is no EU shorthand — ISO 3166-2 only) ·
`wait_for_update` under 500 ms or given as a string · `url_passthrough` / `ads_data_redaction` off ·
`dataLayer.push(['consent', …])` · `'defaults'`/`'updates'` command typos ·
a consent **default** that grants an advertising signal · `allow_google_signals` after the June 2026 change ·
leftover placeholder tag IDs · `anonymize_ip` (a no-op in GA4).

**2 structure rules** for a **GTM container export (`.json`)**: tags with no consent settings at all, and Google Ads conversion tags marked *No additional consent required*.

Every finding gives the line number, what is wrong, and the correct value.

## Free — and the free part is finished, not crippled

- Check the open file against all 20 rules
- Check just the lines you select
- Reopen the last report
- List every rule, so you can see what was **not** tested

No watermark, no trial clock, no locked results. The answer is never withheld.

## With a licence — $29 once

The paid tier is the same brain over a **wider scope**:

- **Every file in the repository**, not just the open one — a stray snippet on an old landing page cannot hide
- **A report file** (CSV, JSON or HTML) you can hand to a client or a DPO
- **CI-readable JSON**, so a broken consent block fails the build instead of production

One licence key per person or team seat · 7-day full refund.
A freelancer's consent-mode setup or audit runs **$400–$1,200**; an agency **$1,200–$2,500+**.

## Try it without installing

The free web version runs the **same 20 rules** in the browser — paste a snippet or a GTM export and see the findings.

## Install

```
ext install consent-mode-v2-lint
```
