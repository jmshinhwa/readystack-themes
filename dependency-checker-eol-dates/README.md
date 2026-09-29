# Dependency Checker — EOL Dates

![Dependency Checker — EOL Dates — finds the line](https://getreadystack.com/img/promo/dependency-checker-eol-dates_demo.gif)

![Dependency Checker — EOL Dates](https://getreadystack.com/img/promo/sku358482_result_card.jpg)

Dependency checker for `package.json`, `composer.json` and `requirements.txt`. It reads the framework versions you pinned and tells you which ones are **past** their published end-of-support date, and which ones reach it **within 120 days** — with the date, the days since or until, and the version to move to.

Hub page: https://getreadystack.com/tools/dependency-checker-eol-dates

Yardstick: Snyk Team is listed at $25 per contributing developer per month; this extension is a one-time licence.

## What it found in the sample file

The sample `package.json` (an Angular app with an Express API, `_fixtures/dirty.json`), checked on 2026-09-28:

| Pinned line (left) | Support end and fix (right) |
|---|---|
| `"express": "^4.21.2"` | EOL target 2026-10-01 (no sooner than) → ^5.1 |
| `"@angular/core": "^19.2.0"` | ended 2026-05-19 → ^21 |
| `"eslint": "^8.57.0"` | ended 2024-10-05 → ^9 |
| `"bootstrap": "^4.6.2"` | ended 2023-01-01 → ^5.3 |
| `"angular": "1.8.3"` | ended 2021-12-31 → @angular/core ^21 |
| `"request": "^2.88.2"` | deprecated 2020-02-11 → native fetch |

Six findings: five past end of support (errors) and one inside the 120-day window (warning). The upgraded sample (`_fixtures/clean.json`) returns zero.

## Why a date, not a version number

`npm outdated`, `pip list --outdated` and `composer outdated` compare your pin with the newest release. They do not tell you when the major you are on stops getting security fixes. Angular 19 still installs and builds after 2026-05-19; it simply gets no more patches. Code assistants also tend to suggest the majors they saw most in training, so a freshly generated project can start life on a line that is already out of support.

## The 19 rules

- **npm:** AngularJS 1.x · Angular 16 and older, 17, 18, 19, 20 · Vue 2 · Nuxt 2 · Bootstrap 4 and older · Express 4 · ESLint 8 and older · `request` · `react-scripts` (Create React App)
- **pip (requirements.txt):** Django 3.2 and older · Django 4.x · Django 5.0/5.1
- **Composer:** Laravel 9 and older · Laravel 10 · Laravel 11

Every rule stores its end date and the source it came from (angular.dev, expressjs.com/en/support, eslint.org/version-support, djangoproject.com, laravel.com/docs/releases and others). The source is printed in each finding. Express marks 2026-10-01 as a target ("no sooner than"), and the finding says so.

## How to use it

1. Open any `package.json`, `composer.json` or `requirements*.txt`.
2. Findings appear in the Problems panel on the dependency line. Errors are past end of support, warnings are within 120 days.
3. Run **Dependency Checker: Check this file** from the Command Palette to re-check.

The check runs locally. Nothing is uploaded.

## Free and full version

Free: checks the open manifest and lists every pinned major that is past or within 120 days of its end-of-support date, with the date and the upgrade target.

Full version: scans every package.json, composer.json and requirements file in the workspace at once and exports one dated EOL report (CSV + Markdown) for a client or audit — [get the full version](https://getreadystack.com/api/buy/cl/polar_cl_Zm5aHGvUSteeXkwq8xhpNGDo1hwHYtpcqfNSa21xZvj). $29 once, one licence key per person or team seat.

## Limits

Only the first version number of a range is read (`^19.2.0` → 19.2, `>=4.2,<5` → 4.2). Lock files, Git URLs, `*` and `latest` are skipped. Packages without a published end-of-support date are not flagged.
