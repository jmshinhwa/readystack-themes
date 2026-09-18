# Config & DSL Lint + Snippets — 9 Sets

![Config & DSL Lint + Snippets — 9 Sets](https://getreadystack.com/img/promo/sku10090_result_card.jpg)

**Your config files are never compiled. Nothing fails until deploy.**

`eslint.config.js` · `pyproject.toml` · `.dts` overlays · MicroProfile `.properties` · AutoHotkey v2 · Ren'Py · Inkling · Swift · `settings.json` — none of these are type-checked. A wrong line does not error. It is ignored, the build stays green, and you find out in staging.

ESLint v10 removed the eslintrc system in February 2026 and ESLint v9 reached end of life on 2026-08-06. The day your CI bumps the major, `.eslintrc.json` is read by nothing — no error, zero problems reported, and every rule you had is gone.

**28 rules across 9 file kinds. In the editor. Offline. No toolchain.**

| The line that breaks | What to write instead |
| --- | --- |
| `.eslintrc.json` | `eslint.config.js` — ESLint 10 reads nothing else |
| `"python.pythonPath": ".venv/bin/python"` | `"python.defaultInterpreterPath": ".venv/bin/python"` |
| `/dts-v1/` | `/dts-v1/;` — otherwise `dtc` stops at line one |
| `status = "enabled"` | `status = "okay"` — anything else leaves the node disabled |
| `MsgBox, Hello` | `MsgBox("Hello")` — v2 removed comma command syntax |

## Free — no key, no file limit, offline

- **Audit this file** — the open file against all 28 rules, with line numbers
- **Audit only the selected lines** — the same 28 rules on the lines you highlighted
- **Insert a snippet from the pack** — any of the 36 snippets at the cursor

That is the whole check, not a sample of it. The free tier is the same `scan()` function the paid commands call.

## With a licence — a different job, not a bigger number

- **Scan the whole workspace** — one pass over every file in the repository, one report
- **Re-check on every save** — a toggle; once it is on, every save re-runs the check
- **Export the findings as a report** — writes CSV, JSON or HTML into the workspace folder
- **Apply the suggested fix** — where a rule carries a machine-safe replacement, it rewrites just the matched text; everything else is counted and left for you to edit by hand

$29 once, refundable for 7 days → **https://buy.polar.sh/polar_cl_rvApWbLcqMhAIqiOEhiXEf2qoShcoNxkA0AXm2wPzPw**

A freelance senior software engineer averaged $101/hr in 2026 (contractrates.fyi, 584 verified rate submissions). This is about seventeen minutes of that.

## The 9 sets

MicroProfile `.properties` · Bonsai Inkling · DeviceTree `.dts` · AutoHotkey v2 · Ren'Py · TOML · Swift · ESLint flat config (JS/TS) · VS Code `settings.json` / JSONC

## Install

```
ext install config-dsl-lint-snippet-pack
```

Your own rules go in `config-dsl-lint-snippet-pack.extraRules` and are checked alongside the 28 that ship inside.
