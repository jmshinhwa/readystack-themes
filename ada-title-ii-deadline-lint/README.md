# ADA Title II Deadline Lint

![ADA Title II Deadline Lint (WCAG 2.1 AA)](https://getreadystack.com/img/promo/sku21118_result_card.jpg)

**Every accessibility statement that still promises April 24, 2026 is now wrong.**
On 2026-04-20 the DOJ interim final rule moved the ADA Title II web deadline to
**April 26, 2027** (28 CFR 35.200(b)). On 2026-05-07 HHS moved the Section 504
deadline to **May 11, 2027** (45 CFR 84.84). Your linter passed both of those lines.

This one does not. Open the file, run **Check this file**, and every superseded date,
every mis-cited standard and every WCAG 2.1 Level AA failure your source can prove
comes back with the success criterion and the regulation beside it.

```
2: Superseded date. DOJ's interim final rule (signed 2026-04-16, effective on
   publication 2026-04-20) moved the ADA Title II web deadline for public entities
   of 50,000 or more from April 24, 2026 to April 26, 2027 - 28 CFR 35.200(b).
2: ADA Title II (28 CFR 35.200) and HHS Section 504 (45 CFR 84.84) both adopt
   WCAG 2.1 Level AA. A conformance claim written against WCAG 2.0 does not meet
   either rule.
3: Unverifiable conformance claim. No agency certifies ADA compliance, and a
   blanket claim is the sentence a demand letter quotes back.
4: Link to a conventional electronic document. Under 28 CFR 35.201 these are
   excepted only when they were posted before the entity's compliance date.
```

## Who this is for

Developers and agencies shipping web code for US state and local government - cities,
counties, school districts, transit authorities, public universities - and for health
organizations that receive HHS funding. Those two groups are the ones 28 CFR 35.200 and
45 CFR 84.84 actually cover.

## The current dates, as of the 2026 extensions

| Rule | Who | Deadline |
|---|---|---|
| ADA Title II, 28 CFR 35.200(b) | public entities, population 50,000+ | April 26, 2027 |
| ADA Title II, 28 CFR 35.200(b) | population under 50,000, special districts | April 26, 2028 |
| HHS Section 504, 45 CFR 84.84 | recipients with 15+ employees | May 11, 2027 |
| HHS Section 504, 45 CFR 84.84 | recipients with under 15 employees | May 10, 2028 |

Standard for all four: **WCAG 2.1 Level AA**. Not 2.0, not Level A, not Section 508.

## Free - no licence key, nothing held back

- Check the file you have open against all 26 rules
- Check only the lines you selected
- List every rule with the success criterion or regulation it cites

No watermark, no trial period, no locked findings. The free tier finishes one file.

## With a licence - $29 once

The paid tier is a different job, not more of the same one:

- **Scan every file in the repository** - the whole workspace instead of the open file, honouring the max-files and exclude-glob settings.
- **Export a dated evidence file as CSV, JSON or HTML** - written to the workspace root, so you can hand the file to counsel, procurement or the accessibility coordinator.
- **Rewrite the superseded deadline dates in place** - replaces the old ADA Title II and Section 504 dates with the current ones. Findings with no safe rewrite are counted and left for a manual edit.
- **Write a machine-readable JSON file for your pipeline** - a VS Code extension has no exit code, so your pipeline reads the file.

$29 once - one licence key per person or team seat - 7-day full refund.
A hybrid WCAG audit (automated plus manual sampling) is quoted at $1,500-$8,000,
and a VPAT/ACR write-up at about $350.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.

[Get the full version - $29](https://buy.polar.sh/polar_cl_wzKKiGELabjwZgIKC7wl7uINCXdVkTvVTPu2e20gq4d)

## What it does not do

It reads source text line by line. It cannot see computed colour contrast, rendered
focus order or anything that only exists after the page runs, and it does not replace
the manual audit you will still want before you certify. It removes the findings an
auditor would otherwise bill you to discover.

## Install

```
ext install ada-title-ii-deadline-lint
```

## Settings

| Setting | What it does |
|---|---|
| `min_severity` | Hide findings below `info`, `warn` or `error` |
| `report_format` | Default format for the exported evidence file |
| `max_files` | Most files to open during a workspace scan |
| `exclude_glob` | Paths to skip during a workspace scan |
| `extraRules` | Extra regex rules of your own, checked alongside the 26 that ship inside |
