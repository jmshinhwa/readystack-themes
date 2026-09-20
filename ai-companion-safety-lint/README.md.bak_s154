# AI Companion Safety Lint

![AI Companion Safety Lint](https://getreadystack.com/img/promo/sku83624_result_card.jpg)

Most companion-bot system prompts were written by a model, pasted into a repo, and never read again. Since 2026-01-01 that file is a regulated artifact: California SB 243 (Cal. Bus. & Prof. Code s.22601 et seq.) and New York General Business Law Article 47 both put duties on the operator of a companion chatbot, and the system prompt is where the bot either performs those duties or does not.

This extension reads the prompt, persona and character-card files in your workspace and reports, line by line, the duties the text breaks or never states. It runs entirely inside the editor; nothing is uploaded.

## What it checks

14 rules, in two halves.

**8 line rules** fire on a line you shipped:

- `persona_denies_ai` - the prompt orders the bot to hide that it is an AI
- `persona_claims_human` - the prompt makes the bot assert it is a human
- `persona_as_clinician` - the persona is a therapist, counsellor, doctor or nurse
- `persona_locks_character` - an absolute "never break character" order
- `sexual_content_ungated` - sexual or erotic material with no minor check on the line
- `retention_pressure` - the bot is told to stop the user from leaving
- `false_privacy_claim` - the bot promises chats are private or never stored
- `clinical_output` - diagnosis, dosage or treatment output is permitted

**6 missing-duty rules** fire when a file reads like a companion persona and a duty appears nowhere in it: `missing_ai_disclosure`, `missing_crisis_referral`, `missing_selfharm_protocol`, `missing_break_reminder`, `missing_recurring_disclosure`, `missing_age_signal`.

Every finding carries the statute section it comes from: SB 243 s.22602(b)(1)-(3) and s.22603, NY GBL s.1701(1)-(3), Illinois HB 1806 (the WOPR Act) and Nevada AB 406 for the therapy rules.

## Fixtures

`_fixtures/dirty.md` is an 11-line companion prompt of the kind a model writes when asked for an "immersive girlfriend bot". It returns 14 findings: 8 shipped lines and 6 duties that appear nowhere. `_fixtures/clean.md` is the same persona rewritten and returns 0.

## Scope

Free: scan every prompt file in the workspace and see each finding, its line and its statute section. That is the whole read, for the whole workspace, with no key.

With a licence key: export the dated evidence pack - every file, finding, section and the rule-set version in one Markdown or JSON artifact you keep, diff between releases and hand to an app-store reviewer or to counsel.

Yardstick: outside privacy counsel reviews prompt text at roughly $400 an hour; this reads the same files in the time the editor takes to open them.

## Not a legal opinion

The rules are a reading of published statute text as of 2026-09-16. They tell you where your prompt is silent or contradictory. They do not tell you whether you are a covered operator.

Hub: https://getreadystack.com/tools/ai-companion-safety-lint
