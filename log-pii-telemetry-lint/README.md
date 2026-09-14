# PII-in-Logs Lint

![PII-in-Logs Lint (console.log(req.body))](https://getreadystack.com/img/promo/sku53832_result_card.jpg)

Finds the lines in a Node or TypeScript service that put **personal data into a log, a crash report or an analytics call** — and names the line, the rule and the one-line fix.

The line it is built around is this one:

```js
console.log('signup payload', req.body);
```

Nothing is wrong with it at compile time, nothing is wrong with it in review, and it runs for years. What it does is copy every signup body — name, email, date of birth, sometimes a card — into stdout, from stdout into the log shipper, from the shipper into the vendor's index, and from the index into the backups. GDPR Art. 5(1)(c) says you collect the minimum; Art. 32 says you secure it; Art. 33 gives you **72 hours** to notify a supervisory authority once you become aware that it leaked. The 72 hours start when someone notices the log, not when the line was written.

A coding assistant writes that line by default. Asked to "add logging", it logs the object it has, because the object it has is the request. That is the gap this extension covers: the code compiles, the tests pass, and the personal data ships.

## What the 22 rules look for

| Group | Examples |
| --- | --- |
| Request objects in logs | `console.log(req.body)`, `req.headers`, `req.cookies`, `req.originalUrl`, `JSON.stringify(req)`, `util.inspect(user)` |
| Person records and fields | a whole `user` object; `email`, `phone`, `ssn`, `dateOfBirth`, `iban`, `cardNumber`, `passport`, `taxId` |
| Credentials and sessions | `password`, `accessToken`, `apiKey`, `otp`, `sessionId`, `authorization`, cookies |
| Logger configuration | `pino({ ... })` with no `redact`, a `winston` file transport with no `maxFiles`/`maxsize`, a `level: 'debug'` committed to the repo, `DEBUG=*` |
| Third parties | `sendDefaultPii: true`, `morgan('combined')` writing the client IP, `analytics.identify(..., { email })`, ORM `log: ['query']` |
| Leaks outward | `res.status(500).send(err.stack)`, personal data interpolated into a template literal where a structured logger can no longer redact it |
| Source hygiene | a real-looking mailbox hardcoded where RFC 2606's `example.com` belongs |

An IP address is personal data in the EU — *Breyer*, CJEU C-582/14 — which is why `morgan('combined')` and `sendDefaultPii: true` are in the list and not treated as neutral defaults.

## Measured on the shipped fixtures

Two files ship with the source, one route each, same routes, different habits:

- `_fixtures/dirty.js` — 45 lines, **24 findings** (15 errors, 9 warnings), every one of the 22 rules fires at least once.
- `_fixtures/clean.js` — the same service written with `redact`, `sendDefaultPii: false`, rotation, ids instead of records: **0 findings**.

Run the check on both and compare the output; that is the whole behaviour of the tool.

## Free and paid

**Free, no key, no limit:** the file you have open. Every offending line is marked in the editor with the rule, the article it touches and the fix. That answer is complete on its own — you can clean a file with it and never open the rest.

**Paid ($29 once):** the same 22 rules across every `.js`/`.ts` file in the workspace, and the findings written out as a report file you keep — for the CI job, the ticket, or the auditor who asks which services log what. One licence key per person or CI seat, 7-day full refund.

The split is scope and ownership. Nothing is watermarked, nothing expires, no rule is withheld from the free file check.

## Using it

Two commands in the Command Palette: one checks the file in front of you, one sweeps the workspace. Findings appear as editor diagnostics and as a written report in the output channel. The rules live in `ext/rules.json` as plain regular expressions with their messages, so you can read exactly what is being matched before you trust it.

## Yardstick

GitHub Advanced Security lists at $49 per active committer per month ($30 Code Security + $19 Secret Protection) and looks for secrets — keys and tokens — not for the customer's name travelling in a log line.

The same 22 rules run free, in the browser, on one file: <https://getreadystack.com/tools/log-pii-telemetry-lint>
