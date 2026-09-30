# Forgejo Migration Check — Gitea 1.22 cutoff

![Forgejo Migration Check — Gitea 1.22 cutoff](https://getreadystack.com/img/promo/sku402849_result_card.jpg)

Lints `docker-compose.yml` and `compose.yaml` files for the lines that break a Gitea to Forgejo switch, before you pull a new image onto your Gitea data.

Full rule list and web version: https://getreadystack.com/tools/forgejo-migration-check

## Why a compose file can break the switch

- On 18 December 2024 Forgejo announced that Gitea 1.22 is the last version to allow a transparent upgrade to Forgejo. Future Forgejo versions do not support upgrades from Gitea v1.23 or above; past that point there is only best effort with manual database edits.
- The Forgejo upgrade guide describes two steps: upgrade from any Gitea version up to and including v1.22.x to Forgejo v10.0.x, then from v10.0.x to any later Forgejo.
- Forgejo majors have fixed end-of-life dates. Forgejo 11.0 LTS ended on 2026-07-16. Forgejo 16.0 ends on 2026-10-29. Forgejo 15.0 LTS is supported until 2027-07-15.
- Forgejo was MIT up to and including v8.0 and is GPL v3+ from v9.0.

Docker does not know any of this. It will pull `forgejo:11` onto a `./gitea:/data` volume without a warning, and a floating `gitea/gitea:latest` tag moves past 1.22 on the next pull.

## Rules (8)

| Rule | Severity | Fires on |
|---|---|---|
| `gitea-past-1-22` | error | `gitea/gitea:1.23` or later |
| `gitea-floating-tag` | error | `gitea/gitea:latest`, `nightly`, a bare major or no tag |
| `forgejo-first-hop` | error | first Forgejo image on Gitea data that is not `10.0.x` |
| `forgejo-eol` | error | Forgejo major whose end-of-life date has passed |
| `forgejo-eol-soon` | warning | Forgejo major that ends within 45 days |
| `forgejo-floating-tag` | warning | Forgejo image not pinned to a major |
| `gitea-act-runner` | warning | `gitea/act_runner` next to Forgejo — use `code.forgejo.org/forgejo/runner` |
| `forgejo-gpl-build` | info | a `build:` next to Forgejo (GPL v3+ from v9.0) |

The end-of-life table covers Forgejo 7.0 to 20.0 (14 majors) as published on the Forgejo release schedule. "Today" is your system date, so the same file gives a different answer after a major ends.

## Sample: acme-git staging compose file

A five-service rehearsal file (checked on 2026-09-29) gives six findings:

| Line in the compose file | Fix |
|---|---|
| `forgejo:11` on `./gitea:/data` | start on `forgejo:10.0.x`, then move up |
| `forgejo:11` — ended 2026-07-16 | `forgejo:15` LTS, supported to 2027-07-15 |
| `forgejo:16` — ends 2026-10-29 | plan 15 LTS before 2026-10-29 |
| `gitea/gitea:1.23.8` | no transparent path past 1.22 |
| `gitea/gitea:latest-rootless` | pin `gitea/gitea:1.22.x` |
| `gitea/act_runner:0.2.11` | `code.forgejo.org/forgejo/runner` |

The production file after the switch (`forgejo:15`, `./forgejo:/data`, Forgejo runner) gives zero findings.

## Use

- Open any compose file: findings appear in the Problems panel with the line and the fix.
- Command palette: type "Forgejo" to run the check on the open file.
- The checker reads the file text only. It does not connect to your server or read the database.

## Free and full version

Free, no key: every rule on every compose file you open, with each finding and its fix.
Full version: export the dated two-hop migration report (Markdown + JSON) for the change ticket, one file per compose file in the workspace — [get a licence key](https://getreadystack.com/api/buy/cl/polar_cl_1qyxPLso98eYI1iIvuEtSmbl4VeFu6MnCMqQA2onMBc).

For scale: Gitea Enterprise, the vendor's paid support plan, lists $19 per user per month ($9.50 on a 1-year commitment) at about.gitea.com/pricing.

## Sources

- forgejo.org/2024-12-gitea-compatibility (18 December 2024)
- forgejo.org/docs/latest/admin/upgrade
- forgejo.org/docs/latest/admin/release-schedule
