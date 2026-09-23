# Webfont License Audit

A linter for the one question a foundry audit letter actually asks: **which typeface does this stylesheet serve to a browser, and under what licence?**

Point it at a workspace and it reads every `.css`, `.scss` and `.less` file, parses each `@font-face` block, and reports the licence risks it finds with a rule id, a severity and a line number.

## What it reads

- the `font-family` declared inside each `@font-face` block
- every `src: url(...)` in that block, including `data:` URIs
- `@import` lines and remote hosts anywhere in the file
- whether the file carries a licence line at all

## The 12 rules

| id | severity | what it catches |
| --- | --- | --- |
| `proprietary-selfhost` | error | a foundry family (25 names: Helvetica Neue, Gotham, Avenir, Proxima Nova, DIN Next, Frutiger, Graphik, Canela, Apercu and more) served from your own server |
| `desktop-format-served` | error | a `.ttf`, `.otf` or `.eot` binary handed to browsers, the format most desktop EULAs licence for installed use only |
| `font-data-uri` | error | the font binary base64-embedded into the stylesheet |
| `ofl-reserved-font-name` | error | an SIL OFL family shipped under a modified name, which the Reserved Font Name clause forbids |
| `google-fonts-remote` | error | `fonts.googleapis.com` / `fonts.gstatic.com` called from the page |
| `adobe-typekit-remote` | warn | a Typekit kit loaded remotely, whose licence is bound to the domains inside the kit |
| `myfonts-counter` | warn | the MyFonts pageview counter, meaning the licence tier moves with traffic |
| `fontawesome-pro` | warn | a Font Awesome Pro kit or CDN reference, a per-seat paid plan |
| `third-party-font-cdn` | warn | Bunny Fonts, Fontsource on jsDelivr or unpkg, cdnfonts |
| `no-license-note` | warn | `@font-face` present and no licence line anywhere in the file |
| `ofl-attribution-missing` | warn | an OFL family (23 names) served with no OFL notice travelling alongside it |
| `insecure-license-url` | info | a licence or foundry reference over plain `http://` |

## Measured on the shipped fixtures

`_fixtures/clean.css` — an Inter and JetBrains Mono stack with its OFL notice — returns **0 findings**.
`_fixtures/dirty.css` returns **14 findings**: 7 errors, 6 warnings, 1 info. Every one of the 12 rules fires on it, so you can see each message before you run the linter on your own repository.

## Why a chatbot is not this

A model can describe the SIL Open Font License from memory. It cannot see the four `@import` lines and the five `@font-face` blocks in the stylesheet you are shipping tonight, and it will not give you the line numbers. This reads your files.

## The yardstick

On 2022-01-20 the Landgericht München I decided case 3 O 17493/20: a website that fetched a font from `fonts.googleapis.com` transmitted the visitor's IP address, and the court awarded the visitor 100 euro. A solicitor's reply to a single warning letter is billed by the hour.

## Free and full

Free, with no key: the scan above, across the whole workspace, every finding with its line number. That job finishes on its own.

Full version: export the whole finding list as a dated `FONT-LICENSE-AUDIT.md` plus a CSV evidence pack — the artefact you keep, hand to a foundry auditor, or file with your own legal team. https://buy.polar.sh/polar_cl_swHA4hMj6MekPR1NJiBDnHzv3WHxuyGOWy04M1oYI2K

## Command

`Webfont License: Scan Workspace` from the command palette.

## Hub

https://getreadystack.com/tools/webfont-license-audit
