# EU AI Act Article 50 Disclosure Lint

![EU AI Act Article 50 Disclosure Lint](https://getreadystack.com/img/promo/sku39634_result_card.jpg)

Article 50 of Regulation (EU) 2024/1689 has applied since **2 August 2026**. It is the transparency article: if your software talks to a person as an AI, or produces synthetic image, audio, video or text, the person has to be told, and the output has to carry a machine-readable mark. Article 99(4) prices a miss at up to **EUR 15,000,000 or 3% of total worldwide annual turnover**, whichever is higher.

The obligation lands on lines of code, not on a policy page. This extension reads the source file you have open and points at those lines.

## What it reads

TypeScript, JavaScript, Python, Vue and Svelte files. Ten rules, each carrying the paragraph it comes from:

| Rule | Paragraph | What it looks for |
| --- | --- | --- |
| `chat-no-ai-disclosure` | 50(1) | a conversational model call in a file that renders no AI disclosure |
| `genimage-no-machine-marking` | 50(2) | image generation with no C2PA, SynthID or IPTC `DigitalSourceType` marking |
| `genaudio-no-machine-marking` | 50(2) | synthesised or cloned voice with no machine-readable marking |
| `alt-text-marking-only` | 50(2) | human-readable alt text used as the only mark |
| `marking-stripped-after-generation` | 50(2) | EXIF/XMP stripped in a file that generates media |
| `deepfake-no-visible-label` | 50(4) | face swap, lip sync or avatar clone with no "artificially generated" label |
| `emotion-biometric-no-notice` | 50(3) | emotion recognition or biometric categorisation with no notice |
| `disclosure-in-comment-only` | 50(1) | the disclosure wording exists, but only inside a source comment |
| `ai-sdk-import-unmapped` | 50 | a generative SDK imported into a file with no Article 50 marker at all |
| `art50-deadline` | 50 | how long the article has been in force on the day you run it |

A disclosure sitting in a `//` comment is never counted as evidence, because a comment reaches nobody.

## Free

Run `Article 50: Lint This File`. You get every finding in the open file, the paragraph number on each one, the offending line quoted, and the fix. On the two fixtures shipped with the extension, `_fixtures/dirty.ts` (43 lines) returns 14 findings — 10 errors, 2 warnings, 2 notes — and `_fixtures/clean.ts` returns 0. That job finishes without a licence key, forever, on as many files as you like.

The same ten rules run in the browser with nothing installed: https://getreadystack.com/tools/ai-act-article-50-lint

## Full version — workspace sweep and the dated record

The next job is a different one: proving it for the whole repository, on a date, to somebody who is not you. `Article 50: Sweep Workspace` walks every matching file and writes a dated transparency record — file by file, paragraph by paragraph, with the clean files listed as clean — for your DPO, your auditor, or a market surveillance authority asking what you shipped and when.

$29 once, one licence key per person or team seat, 7-day full refund: https://buy.polar.sh/polar_cl_HkduVIVNm8Az4pn2Kb4lT1WFFZg1LPla2OKZ53TlbaL

Yardstick: an EU technology lawyer reviewing one repository for Article 50 transparency bills around EUR 300 an hour.

## Not a legal opinion

The rules are pattern rules over source text. They find the surfaces that Article 50 talks about and the markers that are missing from them. Whether a given system is exempt under the "obvious to a reasonably observant person" clause in paragraph 1, or under the artistic and satirical clause in paragraph 4, is a decision for your counsel. This extension makes sure the decision is made on purpose instead of by accident.
