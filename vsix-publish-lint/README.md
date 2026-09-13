# VSIX Publish Lint

![VSIX Publish Lint](https://getreadystack.com/img/promo/sku41398_result_card.jpg)

Reads a VS Code extension `package.json` and reports the manifest problems that stop `vsce package` / `vsce publish`, and the ones that do not stop it but ship a degraded Marketplace listing. Sixteen rules, entirely offline, no network call and no telemetry.

## Why the manifest is the awkward file

`vsce` validates in order and stops at the first problem it meets — after your `vscode:prepublish` script has already compiled. So a manifest with six problems is six build-and-fail cycles, each one discovered at the end. And the checks that do not fail the upload are never mentioned at all: a missing `icon` means the grey default tile, a missing `repository` means relative README image paths have nothing to be rewritten against, and a description over 200 characters is simply cut off in search results.

## What it checks

Ten rules produce an **error** — `vsce` refuses:

- `package.json` does not parse as JSON
- `engines.vscode` missing
- `engines.vscode` is `"*"` rather than a concrete range
- `devDependencies["@types/vscode"]` declares a newer VS Code than `engines.vscode` allows
- `publisher` missing — there is no `publisher.name` id without it
- `name` is not a valid id segment (lowercase, digits, hyphen, underscore)
- `version` is not plain `x.y.z`
- `categories` contains a name outside the closed list (`"Linter"` instead of `"Linters"` is the usual one)
- `badges[].url` points at a host outside the approved list
- neither `main`/`browser` nor `contributes` is present, so the extension installs and does nothing

Six rules produce a **warning** — it ships, degraded:

- `repository` missing
- `license` field missing
- `icon` missing
- `"*"` in `activationEvents`
- an `onCommand:` activation event that duplicates a command already in `contributes.commands`
- `description` longer than 200 characters

Every finding carries the rule id, the severity, the line number in your file, what breaks, and the field to change.

## Measured on the bundled fixtures

`_fixtures/dirty.json` returns **12 findings — 6 errors and 6 warnings**. The same manifest corrected, `_fixtures/clean.json`, returns **0**.

## Free and paid

Free lints the manifest you have open, against all 16 rules, as often as you like, offline. Nothing is watermarked, time-limited or held back; the free tier finishes that job.

The licence key covers a different job — ownership of the output: lint every extension manifest in the workspace in one pass, and write the result out as a JSON or SARIF file you keep and can gate CI on. $29 once, one licence key per person or team seat, 7-day full refund.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.

**Yardstick:** specialised freelance developer work is listed at $75–$150 an hour on Upwork's 2026 rate guide.

## Hub

https://getreadystack.com/tools/vsix-publish-lint

## Licence

See `LICENSE.txt`.
