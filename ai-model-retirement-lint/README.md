# AI Model Retirement Lint

![AI Model Retirement Lint](https://getreadystack.com/img/promo/sku29987_result_card.jpg)

**Three of the model IDs in a typical `llm.config.js` already return an error.**

A retired model ID is not a syntax error. It is a valid string, it type-checks, and every
test goes green - right up to the day the vendor's API answers 404 instead of a completion.

```js
// llm.config.js - committed by an AI coding assistant
export const MODELS = {
  chat:      "gpt-4-turbo",                    // shuts down 2026-10-23
  cheap:     "gpt-3.5-turbo-0125",             // shuts down 2026-10-23
  reasoning: "o3-mini-2025-01-31",             // shuts down 2026-10-23
  claude:    "claude-3-5-sonnet-20241022",     // RETIRED 2025-10-28
  fast:      "claude-3-haiku-20240307",        // RETIRED 2026-04-20
  gemini:    "gemini-2.5-flash",               // shuts down 2026-10-16
  voice:     "whisper-1",                      // RETIRED 2026-08-26
  images:    "gpt-image-1",                    // shuts down 2026-10-23
};
```

Eight findings in that file. Three of them fail **today**.

## Why your assistant will not catch this

The model that autocompleted `claude-3-5-sonnet-20241022` into your config was trained
before Anthropic announced its retirement. Ask it, and it confirms the dead ID as correct.
Its own model ID is often on the same list.

## What is in the box

- **33 rules** across OpenAI, Anthropic and Gemini, each carrying the vendor's published
  date and the vendor's own recommended replacement.
- Three severities: `error` = the call fails now, `warn` = a published shutdown date ahead,
  `info` = the vendor has named an earliest retirement date.
- Covers the 2026-10-23 OpenAI sweep (12 model IDs), the 2026-09-28 and 2026-10-16
  shutdowns, the 2026-12-11 GPT-5 snapshot cut, and every Claude model retired to date.

## Free, with no key

- **Check this file for retired model IDs** - all 33 rules, line numbers, dates, replacements
- **List every model ID and date I know** - the whole dated table, browsable
- **Show the last report**

Nothing is hidden, timed, counted, or watermarked. Checking the file you have open is
free and complete.

## With a licence key ($29 once)

A different job, not a bigger portion of the same one:

| | Free | With a key |
|---|---|---|
| The file you have open | all 33 rules | all 33 rules |
| Every file in the repository | - | yes |
| Fail a CI build on a dead ID | - | yes |
| Rewrite the ID to the vendor's replacement | - | yes |

[**Get the full version - $29**](https://buy.polar.sh/polar_cl_EOiE7ckv1WZujsc6UOfnGhc0lxBYyaPS8uZLl2Fo9Ap)

One key per person or team seat. 7-day full refund.

## Sources

Every date ships from the vendor's own deprecation page, read on 2026-09-09:
OpenAI API deprecations, Anthropic model deprecations, Google Vertex AI / Gemini
model retirements.

## Install

```
ext install ai-model-retirement-lint
```
