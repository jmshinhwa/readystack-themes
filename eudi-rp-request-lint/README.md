# EUDI Wallet Request Lint (OpenID4VP)

![EUDI Wallet Request Lint (OpenID4VP)](https://getreadystack.com/img/promo/sku161547_result_card.jpg)

Reads an OpenID4VP presentation request — the JSON your service sends to a user's EU Digital Identity Wallet — and reports every place it does not match the relying-party rules that start applying on **2026-12-24**.

Nine rules. On the request shipped in `_fixtures/dirty.json` they return **10 findings: 7 errors and 3 warnings**. The same file at `_fixtures/clean.json` returns 0.

## The nine rules

| Rule | What it reads | Where it comes from |
|---|---|---|
| `client_id_unregistered` | `client_id` without a registered identifier prefix (`x509_san_dns:`, `verifier_attestation:`, `openid_federation:`, `decentralized_identifier:`, `x509_san_uri:`, `x509_hash:`) | Implementing Regulation (EU) 2025/848, Art. 3 |
| `purpose_absent` | a DCQL credential entry with no `purpose` string | Regulation (EU) 2024/1183, Art. 5b(5) |
| `whole_credential_asked` | a credential query with no `claims` array | Regulation (EU) 2024/1183, Art. 5b(3) |
| `birth_date_over_age_flag` | `birth_date` requested where no `age_equal_or_over` flag is asked | Regulation (EU) 2024/1183, Art. 5b(3) |
| `response_unencrypted` | `response_mode: direct_post` instead of `direct_post.jwt` | ARF response encryption |
| `nonce_absent` | missing `nonce`, or one under 8 characters | OpenID4VP replay protection |
| `request_unsigned` | no `request_uri`, no `request`, no `client_metadata.jwks_uri` | ARF signed request objects |
| `registration_expired` | `registration_valid_until` / `valid_until` earlier than today | Implementing Regulation (EU) 2025/848 |
| `unknown_credential_type` | a `vct` or `doctype` outside the EUDI PID, mDL, EHIC and PDA1 identifiers | ARF attestation identifiers |

## Why a date matters here

Regulation (EU) 2024/1183 entered into force on 2024-05-20. Implementing Regulation (EU) 2025/848, which creates the national registers of wallet relying parties, applies from **2026-12-24** — the same date by which every Member State must offer at least one wallet. A request that names attributes your registration does not carry is a request a conformant wallet can refuse, and the fix lives in your JSON, not in the register.

`registration_expired` is why the linter takes a date. It compares every registration window in the file against today, so a certificate or registration that lapsed three weeks ago shows up as a finding and not as a green build.

## Free and full

Free: lint one request file and read every finding with the article behind it — that job finishes without a key.

Full version: scan every request file in the workspace in one pass and export a dated relying-party evidence report you keep.

Measure: $29 once is less than one hour of a European contract identity engineer, which is what reading Implementing Regulation (EU) 2025/848 and the ARF against one request set costs in time.

## Use

- Command palette → **EUDI Wallet Request Lint: Lint this file**
- Web version, same nine rules, nothing uploaded: https://getreadystack.com/tools/eudi-rp-request-lint

## Not covered

The linter reads the request document. It does not fetch your `request_uri`, validate a JWT signature, call a national register, or judge whether the purpose string you wrote is truthful. Those need the network and a human.

## Licence

MIT. See LICENSE.txt.
