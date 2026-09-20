# AI Output Disclosure Lint — SB 942

![AI Output Disclosure Lint SB 942](https://getreadystack.com/img/promo/sku84818_result_card.jpg)

Your generation code says the compliance flag flips on **January 1, 2026**. That date is dead: **AB 853 moved California SB 942 to August 2, 2026**, and it has been operative ever since. Model-written service code repeats the repealed date because most of the text it learned from was written before the amendment.

This extension reads a JavaScript or TypeScript file and reports where the code drops the disclosures the California AI Transparency Act asks a covered provider for. **12 rules**, each anchored to a duty in the statute:

| What it looks at | Why the statute cares |
| --- | --- |
| `sharp()` pipelines with no `withMetadata()`, `withoutMetadata()`, `exiftool -all=`, `-map_metadata -1` | the **latent disclosure** must survive the export, not be stripped by the resize or the transcode |
| `watermark: false`, `contentCredentials: false`, `signManifest: false` | the latent disclosure belongs in **every** output of a covered system, not in the ones a caller opts into |
| generation calls with no `c2pa` / Content Credentials signer in the file | nothing marks the output as machine made |
| no user-visible "AI-generated" string next to the returned asset | the **manifest disclosure** a user may ask for |
| `/remove-watermark`, `stripCredentials`, `disableDisclosure` | the disclosure must be permanent or extraordinarily difficult to remove, to the extent technically feasible |
| generation routes with no `/detect` route | a covered provider publishes a **free, publicly accessible AI detection tool** for its own output |
| `requireAuth` / `checkSubscription` on the detection route | that tool has to be free and public, not gated |
| `prisma.*.create`, `analytics.track` inside the detection path | the tool may not collect or retain personal information from the people who use it |
| `issueLicense` with no `revoke` anywhere | **96 hours** from discovering a licensee stripped the disclosure to revoking that licence |

The statute reaches a covered provider — a publicly accessible generative AI system with **over 1,000,000 monthly users or visitors** in California — and the penalty is **$5,000 per violation, per day**, with each day counted separately.

## What the two shipped fixtures measure

`_fixtures/dirty.ts` is a 48-line Express image service. The lint returns **15 findings** on it, firing **11 of the 12 rules**. `_fixtures/clean.ts` is the same service written with `withMetadata()`, a c2pa signer, an `AI-generated` label, an ungated `/detect` route and a `revokeLicense` function: **0 findings**. Same engine, same rules file, no configuration between the two.

## Free and full

Free, no key: lint the file in front of you — every rule, line numbers, and the clause behind each hit. That is a finished job for one file.

Full (`$29` once, one licence key per person or CI seat, 7-day refund): sweep the whole workspace and write a dated evidence report, Markdown and CSV, that you can hand to counsel or fail a build on. A privacy attorney reading the same repository by hand bills $400–$600 an hour.

Key: https://buy.polar.sh/polar_cl_vKksAjW9Bi3k8yFOtHV0BWFyP0dGt5w8qsiIU2Q8Bxq

Browser version of the same engine, no install: https://getreadystack.com/tools/ai-disclosure-lint-sb942

## Command

`SB 942: Lint Open File` — Command Palette. Runs on `.ts`, `.js`, `.tsx`, `.jsx`.

Rules live in `rules.json` as plain regex objects; the engine file is the same one the web page runs.
