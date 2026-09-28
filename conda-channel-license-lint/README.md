# Conda License Lint: Anaconda defaults channel

![Conda License Lint: Anaconda defaults channel — finds the line](https://getreadystack.com/img/promo/conda-channel-license-lint_demo.gif)

![Conda License Lint: Anaconda defaults channel](https://getreadystack.com/img/promo/sku326549_result_card.jpg)

**Six paid Anaconda channel lines in one environment.yml, found and fixed in the editor.** For Python and data teams at organisations with 200 or more people, every `defaults`, `anaconda`, `repo.anaconda.com` or `pkgs/main::` line in a conda file pulls packages from Anaconda's licensed repository.

Full rule reference: https://getreadystack.com/tools/conda-channel-license-lint

Yardstick: Anaconda Business is listed at $50 per user per month; conda-forge is free for everyone.

## What it checks (8 rules)

| Rule | Severity | What it catches |
|---|---|---|
| `defaults-channel` | error | `- defaults` in `channels:` — short-hand for repo.anaconda.com/pkgs/main and pkgs/r (plus pkgs/msys2 on Windows) |
| `anaconda-channel` | error | `- anaconda` — the anaconda.org mirror of defaults, under the same terms |
| `repo-anaconda-url` | error | any `https://repo.anaconda.com/...` channel URL |
| `pkgs-channel-name` | error | `pkgs/main`, `pkgs/r`, `pkgs/msys2` short names |
| `channel-pinned-dependency` | error | `defaults::pandas`, `pkgs/main::numpy=1.26` — a pin that bypasses a clean channel list |
| `condarc-default-channels` | error | `.condarc` `default_channels:` entries pointing at repo.anaconda.com |
| `implicit-defaults` | warn | a channel list without `- nodefaults`, so conda still adds the channels from your conda configuration |
| `mixed-with-conda-forge` | warn | conda-forge listed next to an Anaconda channel |

## Why a clean-looking file still fails

Anaconda's Terms of Service require a paid licence for organisations with 200 or more people that use the defaults channel. The `anaconda` channel on anaconda.org is a mirror of defaults and carries the same terms. conda-forge, bioconda and other community channels are free.

Three traps a quick read misses:

1. **Channel pins.** `defaults::pandas` in `dependencies:` downloads from Anaconda even if `channels:` only lists conda-forge.
2. **Implicit defaults.** `conda env create` adds the channels from your conda configuration after the file's own list. Miniconda and Anaconda installers configure `defaults` there. Only `- nodefaults` stops it.
3. **CI prompts.** Anaconda Distribution 2025.06-0 and later ship the conda-anaconda-tos plugin: the channels repo.anaconda.com/pkgs/main, pkgs/r and pkgs/msys2 need `conda tos accept` (or `CONDA_PLUGINS_AUTO_ACCEPT_TOS`) before a non-interactive build can use them.

## Worked example

`_fixtures/dirty.yml` (a churn-model environment) gives 6 findings:

```
L3  defaults-channel           - defaults
L4  anaconda-channel           - anaconda
L5  repo-anaconda-url          - https://repo.anaconda.com/pkgs/r
L6  pkgs-channel-name          - pkgs/msys2
L9  channel-pinned-dependency  - pkgs/main::numpy=1.26
L10 channel-pinned-dependency  - defaults::pandas
```

The fixed file lists `- conda-forge` and `- nodefaults`, pins `conda-forge::pandas`, and gives 0 findings.

## Files

It runs on `environment*.yml`, `environment*.yaml`, `.condarc` and `condarc`. Findings show in the Problems panel with the line number, the reason and the conda-forge fix. Nothing leaves your machine.

## Free and full version

Free: every finding for the open file, no key. Full version: one scan of every environment file and `.condarc` in the workspace, exported as a licence-audit report you keep. A web version of the same engine runs at the hub link above.

Not legal advice: whether your organisation is licensed is between you and Anaconda. This tool shows which lines reach Anaconda's repository.
