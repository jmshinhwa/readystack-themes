# settings.json Config Kit + Deprecated-Key Audit

32 paste-ready settings.json blocks and 24 rules that name the dead keys in your config. When a setting is renamed, the editor shows no error — it just silently stops doing the thing you configured.

## What it does for free

- Check the settings.json you have open, whole file, no key needed
- Paste any of the 32 settings blocks at the cursor
- Read all 24 rules and all 32 blocks that ship inside

## With a licence

- **Check every settings file in a monorepo in one run** — Opens every file in the workspace and runs the same check on each.
- **Rename every dead key in the editor instead of by hand** — Replaces the offending lines in the editor with the suggested text.
- **A report file you can attach to the pull request** — Writes the findings as a file (CSV, JSON or HTML) into the workspace folder; it uses the report_format setting when that is set, and only asks which format when it is not.
- **Your team's own house rules on top of the built-in 24** — Opens Settings so the user adds their own rules (free = the built-in set).

## Install

```
ext install settings-json-config-audit
```
