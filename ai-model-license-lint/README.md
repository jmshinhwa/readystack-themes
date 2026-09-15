# AI Model License Lint

![AI Model License Lint](https://getreadystack.com/img/promo/sku67226_result_card.jpg)

Your assistant suggested `meta-llama/Llama-3.2-11B-Vision-Instruct`. It compiled, it
worked, and nobody read the licence. The Llama 3.2 Community License withholds its
grant from individuals domiciled in, and companies with a principal place of business
in, the European Union, for the multimodal builds. An EU-established team using those
weights does not have a narrower licence. It has none.

This extension reads the open-weight model identifiers in the file you have open and
names, for each one, the licence clause that actually binds you and the case that
breaks it. It is a text linter: no network call, no telemetry, no model download.

## What it flags

22 rules across the licences that carry conditions people miss:

- **Llama 3.2 / Llama 4 multimodal** — EU principal-place-of-business exclusion.
- **Llama Community License** — the 700 million MAU cap, the required `Built with
  Llama` notice, the Notice-file text, the rule that a derivative's name must begin
  with `Llama`, and the Acceptable Use Policy pass-through.
- **Gemma** — Terms of Use rather than an OSI licence; use restrictions must be passed
  downstream, and a README or SBOM that calls Gemma "open source" is a misstatement.
- **FLUX.1 [dev]** — Non-Commercial License. `FLUX.1 [schnell]` is Apache 2.0.
  **FLUX.1 [pro]** — weights are not publicly released at all.
- **Stable Diffusion 3.x** — Stability AI Community License, free for commercial use
  only below USD 1 million in annual revenue. A revenue trigger, not a usage trigger.
- **Stable Diffusion 1.5 / SDXL** — CreativeML OpenRAIL-M and OpenRAIL++-M behavioural
  use restrictions, which must be reproduced downstream.
- **Codestral, Mistral Large, Pixtral Large** — non-production and research licences.
  Mistral 7B, Mixtral and NeMo are Apache 2.0.
- **Qwen's largest builds** — Qwen LICENSE and its 100 million MAU cap, where the
  smaller sizes are Apache 2.0.
- **Repository hygiene** — gated repos where the acceptance is logged against a person
  rather than the company, model loads with no revision pin, and files that reference
  restricted weights without pointing at any NOTICE or model card.

## Measured on the bundled fixtures

`_fixtures/dirty.py` is 33 lines of ordinary model-loading code. The linter returns
**17 findings, 5 of them blocking**, naming 7 distinct licences. `_fixtures/clean.py`
loads Whisper, Mistral 7B and Qwen2.5-7B, pinned and attributed, and returns **0**.

## Use

Open a `.py`, `.js`, `.ts`, `.json`, `.yaml` or `.md` file and run **AI Model License
Lint: Check This File** from the command palette. Findings appear in the Problems
panel on the line that caused them.

## Free and paid

Scanning and the clause for every finding are free and complete: you can read the file,
see the obligation, and fix the code without paying anything. The paid tier is a
different job — it exports the evidence: a generated NOTICE / attribution file and a
dated per-model obligation report for the whole workspace, in the form procurement and
counsel ask for, plus a CI exit code so a new model identifier cannot land unreviewed.
$29 once, one licence key per person or team seat, 7-day full refund:
https://buy.polar.sh/polar_cl_n48nKSGuBUvKyot5tlEi3ACu4uVv6EJrVAOvB2JgLDv

## Yardstick

Outside technology counsel bills roughly USD 350–600 per hour for an open-source and
model-licence review, and the review is repeated every time the model list changes.

Licence texts change in place. Every finding names the clause so you can check it
against the licence shipped with the exact revision you pin. Rules dated 2026-09-14.

Hub: https://getreadystack.com/tools/ai-model-license-lint
