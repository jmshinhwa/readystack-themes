# Lockfile Due Diligence: npm install-script lint

![Lockfile Due Diligence — finds the line](https://getreadystack.com/img/promo/lockfile-due-diligence-lint_demo.gif)

![Lockfile Due Diligence](https://getreadystack.com/img/promo/sku328955_result_card.jpg)

**6 findings in one sample package-lock.json** — an install script, a sha1-only hash, a plain-http tarball, a git dependency tracking `#main`, a tarball from a host that is not the npm registry, and a direct dependency pinned to `"latest"`. The same file with those six entries fixed scores 0.

This extension reads the `package-lock.json` you have open and lists every third-party component entry that needs a due-diligence decision, with the line number and the fix. It runs locally; nothing leaves your machine.

Hub page and web version: https://getreadystack.com/tools/lockfile-due-diligence-lint

## Why now

Regulation (EU) 2024/2847, the Cyber Resilience Act, Article 13(5): manufacturers shall exercise due diligence when integrating components sourced from third parties, including free and open-source components. The main obligations apply from **2027-12-11** (vulnerability reporting under Article 14 already applies from 2026-09-11). Article 64(2) sets fines of up to 15 million euros or 2.5% of worldwide annual turnover for breaches of Article 13. Every finding message carries the number of days left until 2027-12-11.

`npm audit` matches your tree against published advisories. It does not tell you which packages run code on install, which tarballs came over http or from an unknown host, or which entries have no usable integrity hash. Those are the entries this lint lists.

## The 8 rules

| Rule | What it flags | Fix |
|---|---|---|
| LDD001 | `hasInstallScript: true` (preinstall / install / postinstall) | Read the script, allow-list it or use `--ignore-scripts` |
| LDD002 | `resolved` with no `integrity` | Reinstall so npm records sha512 |
| LDD003 | `integrity` is `sha1-` only | Regenerate with npm 7+ |
| LDD004 | `resolved` starts with `http://` | Use an https registry |
| LDD005 | `git+`, `github:` or `git@` source | Publish to a registry or pin a full 40-character commit |
| LDD006 | https tarball from a host other than registry.npmjs.org / registry.yarnpkg.com / registry.npmmirror.com | Record who controls the host |
| LDD007 | `lockfileVersion` 1 or missing (no `hasInstallScript` data) | Upgrade to lockfileVersion 3 |
| LDD008 | direct dependency range `*`, `latest`, `next`, `x` or empty | Use a real semver range |

Yardstick: each rule maps to one question under CRA Art. 13(5) — do you know what this component runs, where it came from, and that the bytes are the ones you reviewed.

## How to use

1. Open any `package-lock.json`.
2. Findings appear in the Problems panel with the rule id, the package and version, and the fix.
3. Fix an entry and save; the list updates on the next scan.

## Free and full version

Free: scan one package-lock.json: every install script, weak or missing integrity, http, git and off-registry source, with its line and the fix. Nothing is hidden and there is no limit on how often you scan.

Full version ($29 once, one licence key per person or team seat): scan every lockfile in the workspace at once and export a dated due-diligence record (Markdown and CSV) for your CRA technical documentation.

## Limits

This lint reads lockfile metadata. It does not download packages, read the install scripts themselves, or judge whether a script is malicious; it tells you where a human decision is due. It is not legal advice.

License: see LICENSE.txt.
