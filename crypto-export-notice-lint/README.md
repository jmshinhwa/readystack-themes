# Crypto Export Notice Lint (EAR 742.15)

![Crypto Export Notice Lint (EAR 742.15)](https://getreadystack.com/img/promo/sku164614_result_card.jpg)

Hub: https://getreadystack.com/tools/crypto-export-notice-lint

"AI wrote this code — does it clear the regulation?" is the 2026 question. For a repository that ships encryption, the regulation is not in the code at all. It is in one paragraph of the README, and that paragraph is the part an assistant is most likely to get wrong, because the paragraph it learned from was written before 2016.

## What it reads

The export-control notice in your Markdown: `README.md`, `EXPORT.md`, `NOTICE.md`, `SECURITY.md` — any heading whose title contains *export*, *encryption* or *cryptograph*. The check runs against the ten items below. There is no network call and nothing leaves the editor.

## The ten checks

| # | check | what it looks for |
|---|-------|-------------------|
| 1 | `no_export_notice` | the file describes encryption (AES, TLS, libsodium, OpenSSL, a keystore) and carries no export notice at all |
| 2 | `missing_bis_email` | `crypt@bis.doc.gov` — the BIS address in EAR 742.15(b)(1) |
| 3 | `missing_nsa_email` | `enc@nsa.gov` — the ENC Encryption Request Coordinator, the address people forget |
| 4 | `missing_source_url` | the internet location of the published source, the thing the notification actually reports |
| 5 | `missing_eccn` | an ECCN: 5D002, 5E002, 5A002 or 5D992 |
| 6 | `removed_tsu_citation` | License Exception TSU / EAR 740.13(e) for encryption source code — BIS removed that paragraph in the 20 September 2016 encryption rule and moved the notification to 742.15(b) |
| 7 | `false_exemption_claim` | "open source, so it is not subject to the EAR", or EAR99 used as the classification for encryption source |
| 8 | `missing_notification_date` | no date, so nobody can say which release the email covered |
| 9 | `stale_notification` | a notification from an earlier calendar year; the message counts the days and points at the annual self-classification report due 1 February |
| 10 | `missing_renotify_clause` | no line saying a fresh email goes out when the internet location changes |

## What it found on the sample notices

Two fixtures ship with the source. `_fixtures/clean.md` — a notice with both addresses, ECCN 5D002, a dated notification and a re-notify line — returns **0 findings**. `_fixtures/dirty.md` — a normal-looking open-source export paragraph — returns **6 findings**: 4 errors and 2 warnings, including a notification dated 2019-03-04, which the engine reports as **2758 days** old as of 2026-09-21.

## Free and licensed

Free, with no key and no limit: `Crypto Export Notice Lint: Check File` runs all ten checks on the file open in the editor and writes the findings into the Problems panel and an output channel. That job finishes on its own.

Licensed, on a different axis — scope and ownership: `Check Workspace` sweeps every Markdown file in the repository and writes `cryptoExport-report.md`, a dated file you keep in the repo and hand to whoever asks. The sweep runs free for seven days from the first time you use it, then asks for a licence key. Seven-day full refund, one key per person or CI seat.

## The yardstick

US export-control counsel is commonly quoted at 300-600 USD per hour, and a release review is not billed in minutes.

## Not legal advice

This extension reads text and reports which of ten documented items are absent. Classification of your own code, and the decision to publish it, stay yours. Primary sources: 15 CFR 742.15(b), the BIS encryption rule of 20 September 2016, and 15 CFR 740.17(e)(3) for the annual self-classification report.
