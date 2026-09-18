# HMRC Fraud Prevention Header Lint

![HMRC Fraud Prevention Header Lint for Making Tax Digital (VAT and Income Tax)](https://getreadystack.com/img/promo/sku23608_result_card.jpg)

```
your-hmrc-client.js
  ERROR  line 2  WEB_APP_DIRECT is not an HMRC connection method  -> WEB_APP_VIA_SERVER
  ERROR  line 3  Gov-Client-Device-Id is misspelled               -> Gov-Client-Device-ID
  ERROR  line 4  Timezone must be UTC+HH:MM, not Europe/London    -> UTC+00:00
  ERROR  line 5  Timestamp has no milliseconds                    -> 2026-09-09T14:30:05.123Z
  ERROR  line 6  HMRC spells this key colour-depth                -> colour-depth=16
  WARN   line 6  Screens is missing colour-depth entirely
  ERROR  line 7  HMRC uses the American spelling                  -> Gov-Vendor-License-IDs
  ERROR  line 8  Product-Name must be percent-encoded             -> Acme%20Books
```

Eight findings across seven header lines, all of which pass code review. HMRC's header is
`Gov-Vendor-License-IDs` - American spelling - and `Gov-Client-Screens` uses `colour-depth`,
British spelling. 34 rules, taken from HMRC's own connection-method tables. Runs offline.

## What it does for free

- Check the open file against all 34 rules, offline
- Check only the lines you select
- Reopen the last report with line numbers and the correct spelling

## With a licence

- **Scan the whole workspace** — Header code is spread across the HTTP client, the middleware and the tests. This reads every file instead of the one you have open.
- **Export a CSV, JSON or HTML report** — Writes the findings to a file you can keep as evidence of what you checked and when.
- **Machine-readable output for CI** — Prints JSON so a pipeline can fail the build before a bad header reaches HMRC.
- **Auto-correct the misspelled header names** — Rewrites the header names that have exactly one correct spelling; anything needing judgement is left for you and listed in the report.

## Install

```
ext install hmrc-fraud-prevention-header-lint
```

## Licence

$29 once - one licence key per person or team seat, 7-day full refund.

[Get the full version - $29](https://getreadystack.com)

HMRC's own Test Fraud Prevention Headers API only grades a live request you have already
built and sent, using sandbox credentials. It never reads your source.
