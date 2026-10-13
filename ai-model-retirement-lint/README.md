# OpenAI Model Deprecation Lint - retired model IDs in code

![OpenAI Model Deprecation Lint - retired model IDs in code — finds the line](https://getreadystack.com/img/promo/ai-model-retirement-lint_demo.gif)

![AI Model Retirement Lint](https://getreadystack.com/img/promo/sku29987_result_card.jpg)

**Three of the model IDs in a typical `llm.config.js` already return an error.**

For apps calling model APIs: a retired model ID returns an error in production on the retirement date, not in staging.

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
  gemini:    "gemini-2.5-flash",               // retires 2026-10-20 (Vertex AI)
  voice:     "whisper-1",                      // shuts down 2027-02-26
  images:    "gpt-image-1",                    // shuts down 2026-10-23
};
```

Eight findings in that file. Two of them fail **today**.

## Why your assistant will not catch this

The model that autocompleted `claude-3-5-sonnet-20241022` into your config was trained
before Anthropic announced its retirement. Ask it, and it confirms the dead ID as correct.
Its own model ID is often on the same list.

## What is in the box

- **35 rules** across OpenAI, Anthropic and Gemini, each carrying the vendor's published
  date and the vendor's own recommended replacement.
- Three severities: `error` = the call fails now, `warn` = a published shutdown date ahead,
  `info` = the vendor has named an earliest retirement date.
- Covers the 2026-10-23 OpenAI sweep (12 model IDs), the 2026-10-20 Gemini 2.5 retirement
  on Vertex AI, the 2026-12-11 GPT-5 snapshot cut, the 2027-02-26 transcription-model
  removal, and every Claude model retired to date.

## Free, with no key

- **Check this file for retired model IDs** - all 35 rules, line numbers, dates, replacements
- **List every model ID and date I know** - the whole dated table, browsable
- **Show the last report**

Nothing is hidden, timed, counted, or watermarked. Checking the file you have open is
free and complete.

## With a licence key ($29 once)

A different job, not a bigger portion of the same one:

| | Free | With a key |
|---|---|---|
| The file you have open | all 35 rules | all 35 rules |
| Every file in the repository | - | yes |
| Fail a CI build on a dead ID | - | yes |
| Rewrite the ID to the vendor's replacement | - | yes |

[**Get the full version - $29**](https://getreadystack.com/api/buy/cl/polar_cl_EOiE7ckv1WZujsc6UOfnGhc0lxBYyaPS8uZLl2Fo9Ap)

Full workspace sweep and report: licence key.

One key per person or team seat.

## Sources

Every date ships from the vendor's own deprecation page, read on 2026-09-09:
OpenAI API deprecations, Anthropic model deprecations, Google Vertex AI / Gemini
model retirements.

## Install

```
ext install ai-model-retirement-lint
```
