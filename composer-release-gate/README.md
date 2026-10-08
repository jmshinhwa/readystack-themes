# composer.json Validate - PHP EOL Release Gate

![composer.json Validate - PHP EOL Release Gate — finds the line](https://getreadystack.com/img/promo/composer-release-gate_demo.gif)

![composer.json Validate - PHP EOL Release Gate](https://getreadystack.com/img/promo/sku432998_result_card.jpg)

Open a `composer.json` and every line that still allows end-of-life PHP, or that `composer validate --strict` rejects before Packagist accepts the package, is underlined with the exact replacement line.

Web version (same engine, runs in the browser): https://getreadystack.com/tools/composer-release-gate

## Why this exists

- **PHP 8.1 reached end of life on 2025-12-31. PHP 8.2 reaches it on 2026-12-31.** 8.3 is supported to 2027-12-31, 8.4 to 2028-12-31, 8.5 to 2029-12-31 (php.net supported-versions and eol pages, read 2026-09-30). A floor like `"php": "^7.4 || ^8.0"` keeps telling Composer that PHP 7.4 (end of life 2022-11-28) is fine.
- `composer validate --strict` stops at the first schema error (an uppercase `name` hides everything after it) and never looks at PHP end-of-life dates.

## What it checks (14 rules)

| Rule | Severity | Fix line it prints |
|---|---|---|
| json-parse | error | where the JSON breaks |
| php-floor-eol | error | `"php": "^8.3"` (oldest branch with 180+ days of support left) |
| php-floor-eol-soon | warn | floor branch ends within 180 days (8.2 on 2026-12-31) |
| php-missing | info | add a `php` constraint |
| platform-php-eol | error | `config.platform.php` pinned to an end-of-life branch |
| name-missing | error | publish error: name is required |
| name-invalid | error | lowercase `vendor/package` matching Composer's schema pattern |
| description-missing | error | publish error: description is required |
| license-missing | warn | add an SPDX id or `proprietary` |
| license-not-spdx | warn | checked against the 575 current SPDX ids Composer ships |
| license-deprecated | warn | `GPL-2.0+` → `GPL-2.0-or-later` |
| version-field | warn | delete it, Packagist reads git tags |
| unbound-constraint | warn | `*` or `>=5.4` with no upper bound → caret range |
| exact-constraint | warn | `1.1.4` → `^1.1.4` |

The composer messages were reproduced with Composer 2.7.1 on 2026-09-30. PHP dates come from https://www.php.net/supported-versions.php and https://www.php.net/eol.php.

## Measured on the sample

The bundled sample `composer.json` (uppercase name, no description, `GPL` + `LGPL-2.1+`, `"php": "^7.4 || ^8.0"`, `config.platform.php` = `7.4.33`, a `*`, a `>=5.4` and a `1.1.4` constraint) gives **10 findings**: 4 errors and 6 warnings. The cleaned file gives 0. The real `composer validate --strict` on the same sample prints one line: the name pattern error.

## Free and full version

Free, no key: check the open `composer.json` (command *composer.json: check this file*, or on save) and read every finding with its fix line. That finishes the job for one package.

Full version: every `composer.json` in the workspace (monorepo packages too) in one sweep, plus a dated Markdown release report you keep as proof that each tagged release met the PHP support window and Packagist rules. $29 once, one licence key per person or team seat: https://getreadystack.com/api/buy/cl/polar_cl_bnseQjpLj5EkVFEneKOVxV674pcmY9qEGImDm4HZEJJ

Yardstick: A PHP developer's hour costs about $65.38 (US median wage for software developers, BLS OEWS 2025).

## Privacy

Everything runs locally in VS Code or in your browser tab. No file leaves your machine.
