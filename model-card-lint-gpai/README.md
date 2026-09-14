# Model Card Lint — EU GPAI (AI Act Art. 53)

![Model Card Lint - EU GPAI (AI Act Art. 53)](https://getreadystack.com/img/promo/sku48562_result_card.jpg)

A model card is the only document a downstream deployer, an enterprise procurement reviewer and an EU regulator all read about your model. Most cards on the Hub are still the Hugging Face template with the prose filled in and the obligations left empty.

This extension reads the Markdown card you have open — `README.md` in a model repository, or any `.md` — and reports, line by line, what the Hub metadata spec and the EU AI Act general-purpose AI duties expect to find and do not.

**28 rules**, in four groups:

- **Hub metadata** (9): `license`, and `license_name` + `license_link` whenever `license: other` is declared; `pipeline_tag`, `library_name`, `language`, `datasets`, `tags`, `model-index`, and the frontmatter block itself.
- **Template leftovers** (5): `[More Information Needed]`, unrendered `{{ ... }}` expressions, TODO/TBD markers, `your-username/`-style placeholders, and headings with nothing underneath them. A line that is still a placeholder is not counted as documentation by any other rule either.
- **EU AI Act GPAI** (11): the public summary of training content (Art. 53(1)(d)), the copyright policy including machine-readable TDM rights reservations (Art. 53(1)(c)), provider identity and contact, intended use, out-of-scope use, evaluation, limitations and bias, energy consumption, training compute against the Art. 51 systemic-risk presumption of 10^25 FLOP, the authorised representative in the Union (Art. 54), and the placing-on-the-market date that decides whether you are on the already-due clock or the 2 August 2027 legacy clock.
- **Provenance and staleness** (3): a card whose text says "fine-tuned from" while frontmatter carries no `base_model`, a `base_model` whose upstream licence terms are never stated, and an "as of 2025" line that has outgrown its year.

Two of the rules are date-aware: they take today's date and tell you how many days you are past 2 August 2026, or how many are left until 2 August 2027.

## What it does

Open a model card, run **Model Card Lint: Check this file**. Findings come back as editor diagnostics with the line number, the rule id, the article the rule comes from, and the line to write instead. The two fixtures in this repository are the calibration: `_fixtures/clean.md` returns 0 findings, `_fixtures/dirty.md` — 34 lines of an ordinary generated card — returns 29 findings, 12 of them errors, across 25 of the 28 rules.

## Free

Lint the model card you have open against every rule, as often as you like. No key, no account, no upload — the engine runs locally.

The same engine runs in the browser, with nothing sent anywhere: https://getreadystack.com/tools/model-card-lint-gpai

## Full version — $29 once

Lint every model card in the repository in one pass, and export the dated audit as a file you keep: Markdown for the reviewer, JSON a CI step can fail on. One licence key per person or CI seat, 7-day full refund. https://buy.polar.sh/polar_cl_mHiMKq8aRodhSAoK7NzNGXWSa5Nxn3sBnksN74QXeId

For scale: an hour of an EU AI Act compliance consultant starts near $200, and the Act's own ceiling for a GPAI provider is €15,000,000 or 3% of worldwide annual turnover (Art. 101).

## Why a chatbot is not enough

Ask a general model to improve your model card and it returns better prose. It does not count the four `[More Information Needed]` still in the file, it does not know that `license: other` needs two more keys, and it will confidently name an article number that does not say what it claims. This extension counts, and the count is reproducible.

## Not legal advice

The rules encode publicly published obligations and the Hub metadata spec. They are a checklist for the author, not an opinion about your model.
