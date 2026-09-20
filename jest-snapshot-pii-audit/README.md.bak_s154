# Jest Snapshot PII Audit

![Jest Snapshot PII Audit](https://getreadystack.com/img/promo/sku104838_result_card.jpg)

When an assistant writes a test for you, it reaches for a response it can see. Often that is a real one — a staging payload, a curl you pasted into the chat, a recorded fetch. `toMatchSnapshot()` writes the whole thing to disk, and `__snapshots__/*.snap` goes into git with the customer still inside it.

This extension reads `.snap` files and names every line that carries real personal data or a live credential, with the GDPR article it touches and what to write instead.

## The 15 rules

`email_real` · `national_id_us` · `national_id_uk` · `iban_valid` · `payment_card` · `phone_number` · `jwt_token` · `api_credential` · `session_cookie` · `public_ip` · `date_of_birth` · `person_name` · `postal_address` · `special_category` · `precise_geolocation`

Five of them are arithmetic rather than pattern-matching, which is what keeps the noise down:

- **`iban_valid`** rearranges the account number and takes it mod 97. An invented IBAN fails and is never reported.
- **`payment_card`** runs Luhn over 13–19 digits and requires a real issuer prefix (4, 51–55, 22–27, 34/37, 6011, 65).
- **`public_ip`** excludes loopback, RFC 1918, carrier-grade NAT, link-local and the RFC 5737 documentation ranges, so only a routable address is reported. The Court of Justice treated a dynamic IP held by an operator as personal data in C-582/14 (Breyer).
- **`person_name`** and **`postal_address`** compare the value against a placeholder vocabulary — `Jane`, `Doe`, `foo`, `[redacted]`, `${…}`, all-zero postcodes — and stay quiet when the fixture was obviously invented.

`national_id_uk` skips the `QQ` prefix HMRC reserves for examples. `phone_number` skips the `+1 555 01xx` and `+44 7700 900xxx` drama ranges.

## Measured, not estimated

The bundled `_fixtures/dirty.snap` is 42 lines of ordinary snapshot output. The engine returns **18 findings, 9 rated high, covering all 15 rules**. The bundled `_fixtures/clean.snap` renders the same component with placeholder values and returns **0 findings**. Both files ship inside the package; run them yourself.

## Why the usual tooling misses it

Secret scanners match credential shapes. `"firstName": "Anna"` beside `"dateOfBirth": "1979-04-02"` and a postcode is not a credential shape, and that is precisely the combination GDPR Art. 4(1) calls personal data — the part an Art. 33 breach notification has to describe within 72 hours of you becoming aware. A general chatbot cannot help either, because a repository under a data processing agreement is usually the one thing you may not paste into it.

## Free and licensed

Free, no key required: scan the `.snap` file you have open and get every finding with its rule, article and line number. That finishes that file.

The licensed version does a different job — one pass across every `.snap` in the repository, written out as a dated evidence file for a DPO or auditor: <https://buy.polar.sh/polar_cl_y4LAdYzCMCP3Q2C9fJwDLRnlRT3tcPnMekwHv0Dfyxw>

For scale: a freelance privacy consultant reading one repository by hand bills $80-150 an hour.

## Runs in a browser as well

`engine.js` and `rules.json` are the whole brain, and the same two files run as a single web page with no server. Paste a snapshot, get the same 15 rules. Nothing is uploaded, in the editor or on the page.

## Commands

- **Jest Snapshot PII Audit: Scan current file** — report findings for the open `.snap`
- **Jest Snapshot PII Audit: Scan workspace** — every `.snap` under the workspace root

More tools: <https://getreadystack.com/tools/jest-snapshot-pii-audit>

MIT licensed engine rules; see LICENSE.
