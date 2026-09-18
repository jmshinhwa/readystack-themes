# GNU GLOBAL (gtags) Workspace Setup Kit

![GNU GLOBAL (gtags) Workspace Setup Kit](https://getreadystack.com/img/promo/sku11806_result_card.jpg)

**46 config snippets, 26 audit rules, 8 setups in one extension** — because one absolute path like `/home/you/` in `.vscode/settings.json` breaks Go-to-Definition for every teammate who clones the repo.

Configuration faults do not fail. They degrade. Nothing errors, so nothing gets reviewed, and the person who loses the afternoon is never the person who wrote the line.

```json
{
  "compilerPath": "/home/dave/toolchain/bin/g++",   // exists on one laptop
  "cppStandard": "c++03",                            // auto and lambdas parse as errors
  "limitSymbolsToIncludedHeaders": true,             // callers in other files never found
  "gtagsRoot": "${workspaceRoot}/src"                // no longer expands, resolves silently wrong
}
```

Valid JSON. Every linter passes it. All four lines are wrong.

## Free, no key, forever

- **Audit the file you have open** — all 26 rules, each finding with its file, line number and the reason it matters.
- **All 46 setup blocks** for the 8 setups, inserted by typing a prefix in your own files: GNU GLOBAL and gtags (10), formatting baselines (6), themes (6), Tailwind (6), ASP.NET (5), notes workspaces (5), MicroProfile (4), keybindings (4).
- **Your own rules alongside the built-in 26** — add `{ "pattern": "...", "message": "..." }` entries to the `gtags-workspace-config-kit.extraRules` setting and your house conventions are matched in the same pass as the built-in rules, on the free path too.
- **No watermark, no countdown, no lock after N runs.** The 26 rules stay on.

## With a licence

Two things, and they are the two you cannot reasonably do by hand:

- **Audit every configuration file in the workspace in one run** — instead of the one file in front of you, the whole workspace is scanned and reported grouped by file.
- **Re-check on every save** — once a config file is clean, the audit re-runs each time a file is saved, so the machine-specific path someone pastes back in next month is caught the same minute.

Everything above stays free. The licence adds **scope and repetition**, nothing else.

[Get a licence](https://buy.polar.sh/polar_cl_uobf0e1SXkBfCizSA6fpj4XMwWyXUKrY35d1P2SmCPE)

## Try it without installing anything

`index.html` in this repository is the same 26 rules running in a browser tab. Paste a config file and the findings appear as you type. Nothing is uploaded.

## Install

```
ext install gtags-workspace-config-kit
```
