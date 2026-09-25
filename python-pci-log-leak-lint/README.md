# Python Log Leak Lint: PCI DSS Card Data

![Python Log Leak Lint: PCI DSS Card Data](https://getreadystack.com/img/promo/sku239038_result_card.jpg)

Checks every `logger.*`, `logging.*`, `print(...)` and `raise X(...)` statement in a Python file for card numbers, CVV, track data, PINs, passwords and auth headers, and names the PCI DSS v4.0.1 requirement each one breaks.

**Measured:** a Flask payment handler (`_fixtures/dirty.py`) checked on 2026-09-24 gives **6 findings**: L12 `request.json` logged whole · L16 `card_number` logged · L20 `cvv` in an f-string · L28 `print` of `track2` · L37 `password` logged · L38 `request.headers` logged. The fixed version (`_fixtures/clean.py`) gives 0. **10 rules.**

Hub page and browser version: https://getreadystack.com/tools/python-pci-log-leak-lint

## Who it is for

Python backend developers at card-accepting merchants, payment service providers and fintechs (Flask, Django, FastAPI, Celery workers) who are preparing for a PCI DSS v4.0.1 assessment. It is also for anyone reviewing a payment handler that an AI coding assistant wrote. It helps when you need to know, line by line, whether a log call writes cardholder data or sensitive authentication data.

## What it checks (10 rules)

| Rule | What reaches the log | Requirement |
|---|---|---|
| pan-in-log | card number variable (masked `[-4:]`, last4, mask/redact are allowed) | Req 3.5.1 |
| cvv-in-log | CVV / CVC / security code | Req 3.3.1.2 |
| track-in-log | track 1 / track 2 / magstripe data | Req 3.3.1.1 |
| pin-in-log | PIN or PIN block | Req 3.3.1.3 |
| password-in-log | password / passphrase value | Req 8.3.2 |
| auth-header-in-log | `request.headers`, API key, bearer or access token | Req 8.3.2 |
| request-dump-in-log | a whole request body (`request.json`, `request.form`, `json.dumps(payload)`) | Req 3.3.1 |
| locals-dump-in-log | `locals()`, `vars()`, `__dict__` | Req 3.3.1 |
| pan-literal-in-log | a 13-19 digit number that passes the Luhn check inside log text | Req 3.5.1 |
| sentry-default-pii | `sentry_sdk.init(..., send_default_pii=True)` | Req 3.3.1 and 3.5.1 |

## How it reads your code

- Plain message text is ignored, so `logger.info("password reset for %s", user)` is not a finding. Only the values that go into the message count: the arguments, the f-string `{expressions}` and concatenations.
- A call that wraps over several lines is joined into one statement before it is checked.
- Comment lines are skipped.
- Each finding carries the line number, the requirement and a fix. It also gives a date: under the 12-month log retention of Req 10.5.1, a line written today (for example 2026-09-24) is still stored on 2027-09-24.

## Why a general linter does not answer this

General Python linters check style, and some check for hard-coded passwords. They do not tell you that a CVV in a log line breaks Req 3.3.1.2 or that a Luhn-valid number in a message is a stored PAN. An AI chat answer about "PCI logging" gives no line numbers in your file.

## Yardstick

Semgrep Teams, a general code-scanning service, lists $35 per contributor per month once a team is past its free 10-contributor tier.

## Free and full version

- Free: the open Python file is checked against all 10 rules, and every leaking line is listed with its line number, requirement and fix. For one file, that is the whole job.
- Full version (licence key): checks every .py file in the repository in one run and exports the findings as a Markdown evidence table for your PCI DSS assessment.

## Commands

- Open the Command Palette and type "Python Log Leak Lint" to run the check on the active editor. Findings appear in the Problems panel.

## What it does not do

It does not prove PCI DSS compliance and it does not replace a QSA. It does not follow data across files. Variable names that hide a card number (for example `x`) are not caught. The whole-body and `locals()` rules are warnings, because on a non-payment route they may be harmless.

## Licence

See LICENSE.txt.
