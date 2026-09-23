# i18n fr-CA Lint — Quebec Bill 96

![i18n fr-CA Lint — Quebec Bill 96](https://getreadystack.com/img/promo/sku150649_result_card.jpg)

Your `fr-CA.json` was written in Paris. Quebec reads it.

This extension lints a French-Canadian locale resource — `fr.json`, `fr-CA.json`, `app_fr.arb`, a Chrome `_locales` messages file — against the francization rules that the Office quebecois de la langue francaise (OQLF) applies to software offered in Quebec under the Charter of the French Language, as amended by Bill 96 and fully in force since June 1, 2025.

It is a linter, not a translator. It reads the file you already have and tells you which line an inspector or a complaint would land on, and what the Quebec wording is.

## The 9 rules

| Rule | What it catches | Severity |
| --- | --- | --- |
| `fr-fr-term` | France-French words the OQLF replaces in Quebec: e-mail, chat, shopping, week-end, spam, smartphone, podcast, parking, newsletter, live | error |
| `english-left` | A value with no French accent that still reads as English — a shipped English screen in the French build | error |
| `euro-currency` | `€` or `EUR` in a file that should price in Canadian dollars | error |
| `date-slash` | `21/09/2026` instead of `2026-09-21` or `21 septembre 2026` | warn |
| `number-separator` | `1,234.56` instead of `1 234,56` | warn |
| `caps-accent` | `TERMINE`, `ETAT`, `ACCES` — Quebec keeps the accent on capitals | warn |
| `empty-or-todo` | An empty, `TODO` or `FIXME` value that falls back to English at runtime | error |
| `locale-tag` | An `@@locale` or `locale` key set to `fr` or `fr-FR` instead of `fr-CA` | error |
| `anglicism` | digital, supporter, opportunité, canceller, checker, initier, items, update | warn |

## What it reports

The sample file shipped in `_fixtures/dirty.json` is 13 lines long. The linter returns 13 findings on it, 8 of them error level, each with the line number, the word it found and the Quebec word to use instead. The matching `_fixtures/clean.json` returns zero findings, so you can see exactly what a clean pass looks like.

A random JSON file is left alone: the engine only lints a resource that declares a French locale tag or that already carries French accented text.

## Why not a chatbot

Ask a general assistant for a French UI string and it answers in France French — `e-mail`, `shopping`, `week-end`, `chat`. Those are the four the OQLF replaces with `courriel`, `magasinage`, `fin de semaine` and `clavardage`. A chatbot also does not read your file line by line, so it cannot tell you which of two thousand keys is still English.

## What it costs to have a person do it

A Canadian language-service provider bills fr-CA revision at $0.10 to $0.15 a word, so a 12,000-word UI string set is $1,200 to $1,800 per pass — and you pay it again on the next release.

## Free and licensed

Every one of the 9 rules runs on the file you have open, with no licence key, in the editor and on the free web page. A licence key adds a different job: one sweep across every locale file in the workspace, a Markdown report, a CSV or JSON export you keep, and a CI exit code. $29 once, one licence key per person or CI seat. [Licence](https://buy.polar.sh/polar_cl_Y5cWABRkmxDgVdi4iAzT8S7r6r9j1U7fX036H3VfCQU)

## The web version

The same engine, byte for byte, runs in the browser at https://getreadystack.com/tools/i18n-fr-ca-bill96-lint — paste a locale file, nothing is uploaded.

## The exposure this is pointed at

Under the Charter of the French Language a company faces $3,000 to $30,000 a day for a French-language violation, and the francization certificate threshold dropped to firms with 25 employees or more on June 1, 2025.

## Commands

- `i18n fr-CA Lint: Check this file` — lints the active locale file (free)
- `i18n fr-CA Lint: Sweep the workspace` — every locale file at once, with export (licence key)

MIT for the extension code. The rule data cites public OQLF terminology and the Charter of the French Language; it is not legal advice.
