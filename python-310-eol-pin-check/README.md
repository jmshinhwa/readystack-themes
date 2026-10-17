# Python 3.10 End of Life — Pin Check & Fix

![Python 3.10 End of Life — Pin Check & Fix — finds the line](https://getreadystack.com/img/promo/python-310-eol-pin-check_demo.gif)

![Python 3.10 End of Life — Pin Check & Fix](https://getreadystack.com/img/promo/sku598551_result_card.jpg)

**Finds every place your project still pins Python 3.10 — 17 rules across Dockerfiles, GitHub Actions, tox, nox, `.python-version`, `runtime.txt`, Pipfile, conda, AWS Lambda, Google Cloud Run functions and Azure — each with its line, the dated fact for that place, and the one-line fix.** On the sample `deploy.yml` it finds six pins: 4 errors and 2 warnings.

Python 3.10 reached end of life on **2026-10-01**: 3.10.22 was the final release and the PSF ships no further security patches ([endoflife.date](https://endoflife.date/api/python.json)). The cloud runtimes follow with their own dates:

| Where the pin is | Dated fact | Source |
|---|---|---|
| AWS Lambda `python3.10` | deprecation 2026-10-31 · block function create 2027-07-29 · block function update 2027-08-31 | [AWS Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) |
| Cloud Run functions `python310` | deprecation 2026-10-04 · decommission 2027-04-04 | [Google runtime support](https://cloud.google.com/functions/docs/runtime-support) |
| Azure Functions Python 3.10 | expected end of support October 2026 · 3.12 is the last version on the Linux Consumption plan | [Azure supported languages](https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages) |
| Replacement | 3.13 security support until 2029-10-31 · 3.12 until 2028-10-31 | [endoflife.date](https://endoflife.date/api/python.json) |

## The sample: `deploy.yml` (left = the pinned line · right = the fix)

| Pinned line | Fix |
|---|---|
| L10 `python-version: ['3.10', '3.11', '3.12']` | `'3.13'` in the matrix |
| L19 `container: python:3.10-slim` | `python:3.13-slim` |
| L30 `python-version: '3.10'` | `python-version: '3.13'` |
| L31 `aws lambda … --runtime python3.10` | `--runtime python3.13` (deprecation 2026-10-31) |
| L32 `gcloud functions deploy … --runtime python310` | `python313` (decommission 2027-04-04) |
| L33 `--linux-fx-version "PYTHON\|3.10"` | `PYTHON\|3.12` (Linux Consumption) |

## What it checks (17 rules)

- `FROM python:3.10*`, compose `image:`, CI `container:` and `public.ecr.aws/lambda/python:3.10` → `python:3.13` with the same tail. Buster/bullseye tails are listed by hand: there is no 3.13 image for them.
- `actions/setup-python` `python-version: '3.10'` and matrices (inline or list). A matrix that already lists 3.13 is left to you.
- `tox.ini` `envlist`/`[testenv:py310]`/`basepython`, `noxfile.py` sessions, `requires-python`/`python_requires` that cap at 3.10, and the `Python :: 3.10` classifier — reported with the date only. A library may keep 3.10 support on purpose.
- `.python-version`, `.tool-versions`, `runtime.txt`, Pipfile `python_version`, conda `python=3.10`, `.pre-commit-config.yaml` `language_version`.
- AWS SAM/CloudFormation `Runtime: python3.10`, serverless.yml, Terraform `runtime = "python3.10"`, `aws lambda --runtime`, CDK `Runtime.PYTHON_3_10`.
- Google `--runtime python310`, Terraform and `app.yaml` `runtime: python310` (App Engine follows its own runtime schedule; the PSF date still applies).
- Azure `linuxFxVersion` / `--linux-fx-version` `Python|3.10` → `Python|3.12`.

## How to use it

- Open a file and run **Python 3.10 End of Life: Check this file**. Each pin shows in Problems with its date and source. The light bulb (Quick Fix) rewrites that one line. This is free and needs no key.
- **Fix all 3.10 pins in the workspace** rewrites every safe line in every file at once, shows a preview first and writes a dated record of each change. It asks for a [licence key](https://getreadystack.com/api/buy/cl/polar_cl_T5u1TmZEv7E3AJdUtY7kLZzZUsO5PxXsXz7vh1auiYI) ($29 once). A team key ($149) adds the company exposure report (which repos and services still run 3.10, and which hit a cloud block date first) and a CI gate that fails a build adding a new 3.10 pin.

Why not just grep for `3.10`? grep misses `python310`, `PYTHON_3_10` and `py310`, matches unrelated version strings, and gives no date for the place it found. Upwork's own hiring page lists software developers at $10–$100 an hour; this sweep by hand is billed at that rate.

Every date above is copied from the linked source, not computed. Web version (same engine, runs in your browser): https://getreadystack.com/tools/python-310-eol-pin-check
