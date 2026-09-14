# SQL Card Data Lint (PCI DSS Req 3)

![SQL Card Data Lint (PCI DSS Req 3)](https://getreadystack.com/img/promo/sku55916_result_card.jpg)

Your assistant wrote the migration. It stored the card.

This extension reads a `.sql` file and names every column, index, view and seed row that
keeps cardholder data or sensitive authentication data, with the PCI DSS Requirement 3 rule
id next to each one. It runs on the file open in your editor — nothing leaves the machine,
and no database connection is asked for.

Hub: https://getreadystack.com/tools/sql-card-data-lint

## What it found in the sample migration

The 35-line sample migration in `_fixtures/dirty.sql` — a plain "add saved payment methods"
schema — returns **13 findings from 10 rules**: 9 errors and 4 warnings, across 2 tables.
6 of those lines are the ones an assessor reads first:

```
card_number VARCHAR(19)              ->  card_token VARCHAR(64)
cvv CHAR(4)                          ->  column deleted (3.3.1.2)
pin_block CHAR(16)                   ->  column deleted (3.3.1.3)
track2_data VARCHAR(40)              ->  column deleted (3.3.1.1)
UNIQUE INDEX ON (card_number)        ->  UNIQUE INDEX ON (card_token)
VALUES ('411111...1111')             ->  VALUES ('tok_test_9f2c41ab')
```

Findings are printed masked: a Luhn-valid literal is reported as `411111...1111`, never in full.

## The 10 rules

| rule | requirement | what it catches |
|---|---|---|
| `sad-cvv-stored` | 3.3.1.2 | `cvv`, `cvc`, `csc`, `card_verification_value` columns |
| `sad-track-stored` | 3.3.1.1 | `track1`, `track2_data`, `magstripe`, `discretionary_data` |
| `sad-pin-stored` | 3.3.1.3 | `pin`, `pin_block`, `pvv`, `encrypted_pin` |
| `pan-plaintext-column` | 3.5.1 | account number in a readable char/text/numeric column |
| `pan-searchable-key` | 3.5.1 | an index or unique key built on the account number |
| `pan-in-log-table` | 3.3.1 | card columns inside a log, audit, history or webhook table |
| `auth-response-blob` | 3.3.2 | the whole gateway response kept as json/blob |
| `pan-view-unmasked` | 3.4.1 | a view that selects the account number without masking |
| `live-pan-literal` | 6.5.5 | a Luhn-valid card number written into the migration itself |
| `no-retention-column` | 3.2.1 | a card table with no purge, retain-until or expiry column |

A column that already reads `card_token`, `card_hash`, `card_last4`, `card_first6`, `masked_pan`
or `card_fingerprint` is left alone, so a compliant schema returns zero findings — the
`_fixtures/clean.sql` sample does exactly that.

## Why now

The PCI DSS v4 requirements that were future-dated became mandatory on 31 March 2025, so every
one of them is assessed at your next annual assessment. Requirement 3 is assessed against the
schema you actually deployed, not against the intent in the pull request. Generated migrations
are where the wrong column lands, because the model has no idea which of your tables is in scope.

## Free and full

Free, no key: check the `.sql` file open in your editor, with the rule id and a suggested
replacement for every finding.

Full version: sweep every migration in the workspace at once and write a dated findings report
you keep — the artifact you hand to a QSA or attach to a change ticket — plus team and
commercial use. A QSA-led gap analysis of your data stores is commonly quoted as a five-figure
engagement; this reads the same migrations in the editor for $29 once, one licence key per
person or team seat, 7-day full refund.

Get a licence: https://buy.polar.sh/polar_cl_HL23mfuzaP3RMTfsQGzbUYmVSiTyJBd8Czg9B1TIuJT

## Commands

- `SQL Card Data Lint: Check this file` — the open `.sql` file
- `SQL Card Data Lint: Sweep the workspace and write a report` — full version

MIT-licensed engine. The rule table lives in `ext/rules.json`; the same file drives the free
web page, so the browser and the editor return identical findings.
