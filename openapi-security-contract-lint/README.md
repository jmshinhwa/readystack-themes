# OpenAPI Security Contract Lint

![OpenAPI Security Contract Lint](https://getreadystack.com/img/promo/sku55701_result_card.jpg)

Hub page: https://getreadystack.com/tools/openapi-security-contract-lint

An OpenAPI document is not documentation. It is the file your API gateway imports, the file your SDK generator reads, and the file an auditor asks for first. Whatever it declares becomes the contract — including the parts nobody meant to declare.

This extension reads that file the way a reviewer does: line by line, against 18 rules drawn from the OWASP API Security Top 10 (2023), RFC 9700 (BCP 240, January 2025) and RFC 8594.

## Why the file matters right now

Since 11 September 2026 the EU Cyber Resilience Act's reporting clock runs: an actively exploited vulnerability in a product with digital elements sold into the EU is reported within 24 hours, with a follow-up at 72 hours and a final report at 14 days. The OpenAPI document is the written description of the interface being reported on.

## What it reads

Any `.yaml`, `.yml` or `.json` OpenAPI document in your workspace. It is a text pass — no network call, no schema resolution, no upload. The file never leaves the machine.

## The 18 rules

**Authentication declared away**
- `security: []` on an operation — the spec says "no authentication required"
- `security: []` at document level — the whole API declared public
- `paths` present with no top-level `security` block — auth becomes opt-in per operation
- A security scheme defined under `components` but never referenced anywhere

**Credentials in the wrong place**
- `apiKey` with `in: query` — the key lands in proxy logs, browser history and `Referer`
- `scheme: basic` — a static credential replayed on every call
- An `example:` or `default:` carrying a live-looking token (`sk_live_`, `ghp_`, `AKIA…`, a JWT, a PEM private key)

**OAuth grants RFC 9700 forbids**
- `implicit` — the token comes back in the URL fragment; RFC 9700 §2.1.2 says MUST NOT
- `password` — the resource owner password credentials grant; RFC 9700 §2.4 says MUST NOT
- `authorizationUrl` / `tokenUrl` / `refreshUrl` on `http://`
- An OAuth flow with an empty `scopes` map — one all-or-nothing token
- A wildcard or catch-all scope

**Transport and surface**
- A `servers` entry on `http://` (localhost excepted)
- No `https://` server anywhere in the document
- A `/debug`, `/trace`, `/actuator` or `/internal` path published in the same document you hand to external callers

**Contract holes**
- An operation with no `429` response documented
- `additionalProperties: true` on a request schema — the mass-assignment route
- `deprecated: true` with no sunset date named anywhere in the document

## Measured on the fixture that ships with this extension

`_fixtures/dirty.yaml` is 59 lines and declares 2 paths and 3 operations. The engine returns **21 findings — 8 errors and 13 warnings** — touching 17 of the 18 rules. `_fixtures/clean.yaml` is 63 lines and returns 0. The same engine file runs in the extension and on the free web page, so both give the same answer for the same bytes.

## Free

Audit the OpenAPI file open in the editor, top to bottom. Every finding, every line number, every rule reference. Nothing is withheld, redacted or counted down. That job finishes on its own.

## With a licence — $29 once

- Sweep **every** OpenAPI document in the workspace, not only the open tab — versioned copies under `docs/`, per-environment overlays, the generated spec in `build/`
- Write a **dated report** (CSV, JSON or HTML) you keep next to the release as evidence the check was run against this commit
- The JSON output is shaped for a CI step, so a pipeline can fail a branch that reintroduced `security: []`

One licence key per person or CI seat. 7-day full refund.

## What it costs to do by hand

An application-security consultant reading the same contract bills **$150–$250 an hour**, and the OAuth grant and scope questions are the slow part.

## Commands

- `OpenAPI Security: Check this file`
- `OpenAPI Security: Sweep the workspace` (licence)
- `OpenAPI Security: List the rules`
- `OpenAPI Security: Enter licence key`

## Licence and privacy

MIT for the extension source. No telemetry. The licence check is a single HTTPS call to the vendor's key-validation endpoint and sends only the key you typed.
