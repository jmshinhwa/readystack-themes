# Consent Gate HTML Lint (EU/UK ePrivacy)

![Consent Gate HTML Lint (EU/UK ePrivacy)](https://getreadystack.com/img/promo/sku38345_result_card.jpg)

This extension reads an HTML file and reports every `<script>`, `<iframe>` and `<link>` tag that contacts a third party before the visitor has given consent.

It exists because the prior-consent rule is a source-code rule. Article 5(3) of the ePrivacy Directive (2002/58/EC), as implemented by each member state, and regulation 6 of the UK PECR both say that storing or reading information on a visitor's device requires consent *before* it happens. A tag sitting in `<head>` has already happened by the time a banner is drawn.

## What it checks

15 rules, all of them written in `rules.json` and readable:

| Rule | What it catches |
|---|---|
| `analytics-before-consent` | `googletagmanager.com/gtag/js`, `gtm.js`, `analytics.js` loaded unconditionally |
| `ad-pixel-before-consent` | Meta, TikTok, X, LinkedIn, Snap, Pinterest pixels as `src=` tags |
| `ad-pixel-inline-snippet` | the copy-paste Meta/TikTok snippet that builds its own `<script>` element |
| `google-fonts-hotlinked` | `fonts.googleapis.com` / `fonts.gstatic.com` |
| `youtube-embed-not-nocookie` | `youtube.com/embed` instead of `youtube-nocookie.com` |
| `recaptcha-before-consent` | reCAPTCHA / hCaptcha loaded on page view rather than on form use |
| `session-replay-before-consent` | Hotjar, Clarity, FullStory, Smartlook, Mouseflow, Lucky Orange |
| `maps-iframe-before-consent` | Google Maps embeds and `maps.googleapis.com` |
| `tracker-preconnect` | `preconnect` / `dns-prefetch` hints that open a tracker connection |
| `inline-cookie-write` | `document.cookie = "_ga…"` inside an inline script |
| `inline-storage-write` | campaign ids written to `localStorage` / `sessionStorage` |
| `consent-attr-typo` | a script parked as `text/plain` with no category attribute, so no CMP can unblock it |
| `no-cmp-present` | trackers on the page with no consent platform loading at all |
| `cmp-after-tracker` | the consent banner loading below a tag that has already fired |
| `gtag-consent-default-missing` | a Google tag with no Consent Mode v2 default state |

A tag is treated as correctly gated when it carries `type="text/plain"` with a category attribute, or one of the `data-cookieconsent` / `data-category` / `data-cmp` / Klaro / Borlabs / Complianz markers. Gated tags are not reported.

## Commands

- **Consent Gate: Check this file** — the open HTML file, underlined in place.
- **Consent Gate: Sweep the workspace and write the report** — every `**/*.{html,htm}` file at once, into a dated Markdown report. This one asks for a licence key.

## Free and licensed

Checking the file in front of you is free, with all 15 rules, no account and no usage limit. The workspace sweep and the dated report are the licensed part, because that is the artefact you hand to a client rather than the answer you need while typing.

Licence: $29 once - one licence key per person or team seat - 7-day full refund. The yardstick below is what a single missed line has already cost an operator in court.

The same 15 rules run, unchanged, in a single web page: https://getreadystack.com/tools/consent-gate-html-lint — paste markup, read findings, nothing is uploaded.

## What the mistake costs

Landgericht München I, case 3 O 17493/20 of 20 January 2022, ordered a website operator to pay EUR 100 in damages to one visitor over a single hotlinked Google Fonts request. Under GDPR Article 83(5) the ceiling for the same class of breach is EUR 20 million or 4% of worldwide annual turnover.

## Limits

It reads markup, not a running page. A tracker injected at runtime by a bundler, a tag manager container or a WordPress plugin is invisible to a source-level check; verify those in the browser. The rules describe EU/EEA and UK law only, and this is engineering tooling, not legal advice.
