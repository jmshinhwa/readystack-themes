# Connection String & Secret Audit — 8 Stacks

![Connection String & Secret Audit — 8 Stacks](https://getreadystack.com/img/promo/sku10429_result_card.jpg)

**Free scanners catch the token a provider issued. They do not catch the password you typed.**

`Server=tcp:reporting.database.windows.net,1433;Database=reporting;Password=Sup3rSecret!;` has no
provider, no shape, and nobody who can revoke it for you. On GitHub's free tier it is not a partner
pattern, so nothing flags it — generic secret detection lives inside GitHub Secret Protection at
**$19 per active committer per month**, and it reports *after* the push has landed.

This runs in your editor, on the file that has not been pushed yet.

**26 rules · 32 safe-replacement snippets · 8 stacks** — Azure IoT Hub, SQL Server, SQLTools,
AKS / Kubernetes, .NET MAUI, Java MicroProfile, R, and R Markdown / Quarto.
Nothing is uploaded. There is no account.

## Free — no key, no account, nothing leaves the machine

- **Audit this file** — all 26 rules against the file you have open, every finding with its line number
- **Audit only the selected lines** — the same 26 rules, scoped to what you highlighted
- **Insert a safe replacement snippet** — any of the 32 environment-variable forms, at your cursor
- **Show the rules and snippets inside** — the full list of all 26 rules and 32 snippets

That is one file, finished. No watermark, no timer, no usage counter.

## With a licence — $29 once

The free tier finishes a file. A licence covers the two jobs that come after it.

- **Scale — audit every file in this workspace.** The same 26 rules across the whole repository
  instead of the one file open in front of you, honouring your `max_files` and `exclude_glob` settings.
- **Handover — write the findings out as a file.** Exports CSV, JSON or HTML into the workspace
  folder, so the result is something you keep in the repo and hand to a reviewer or an auditor.
  It uses your `report_format` setting when one is set, and asks only when it is not.

A third paid command, **Replace the offending line with the safe form**, reports which findings ship a
documented safe replacement (11 of the 26 rules do) and applies the rewrite for any rule that defines a
mechanical one. As of v0.1.0 no rule defines a mechanical rewrite, so it counts the lines and hands them
back for a manual edit — the replacement text is in the rule list, and the 32 snippets (free) insert it
at your cursor. Buy this for the workspace audit and the export, not for that command.

**$19 per active committer per month** is what the hosted equivalent is published at, billed for as
long as your team keeps committing. This is **$29 once**, per developer, and it runs locally.
Full refund within 7 days: <https://buy.polar.sh/polar_cl_1tgGYRxH9pxpXj2qrSYA5SmeCbtVqYcXEKLoD4CR3y7>

## Install

```
ext install connection-string-secret-audit
```
