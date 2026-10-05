# pubspec Publish Gate - pub.dev pre-publish check

![pubspec Publish Gate - pub.dev pre-publish check](https://getreadystack.com/img/promo/sku439548_result_card.jpg)

**pubspec publish: 6 findings** on a 24-line example `pubspec.yaml`, checked against **10 rules** taken from the dart.dev pubspec, dependencies and publishing pages.

A version uploaded to pub.dev is permanent. dart.dev says "a published package lasts forever" and that the pub.dev policy "disallows unpublishing packages except for very few cases". You can retract a version only within **7 days** of publication, and a retracted version stays visible with a RETRACTED badge. So the time to catch a wrong `pubspec.yaml` is before `dart pub publish`, not after.

This extension reads every `pubspec.yaml` in the workspace as you edit and puts each problem in the Problems panel: the line, what pub.dev does with it, and the exact replacement line.

## What it maps (the example, 6 findings)

| Broken line | Fix |
|---|---|
| `name: Geo-Helpers` | `name: geo_helpers` |
| `description: Geo helpers.` (12 characters) | one plain-text sentence of 60-180 characters |
| `version: 1.4` | `version: 1.4.0` |
| `geo_core: path: ../geo_core` | hosted constraint, e.g. `geo_core: ^1.2.0` |
| `tile_math: git: url: ...` | hosted constraint from pub.dev |
| `dependency_overrides: collection: 1.17.2` | delete the block, widen the real constraint |

## The 10 rules

1. **path-dependency** - "you cannot upload a package to the pub.dev site if it has any path dependencies in its pubspec."
2. **git-dependency** - "Git dependencies are not allowed as dependencies for packages uploaded to pub.dev."
3. **dependency-overrides** - "your package's dependency overrides are ignored by all users of your package." The override that makes your tests pass does nothing for anyone who adds your package.
4. **publish-to-none** - `publish_to: none` prevents publication.
5. **name-invalid** - lowercase `[a-z0-9_]`, not starting with a digit.
6. **version-format** - three numbers separated by dots, optional prerelease or build suffix.
7. **description-length** - dart.dev asks for 60 to 180 characters of plain text. Folded (`>-`) descriptions are joined before counting.
8. **sdk-constraint-missing** - the `environment:` sdk constraint is required.
9. **repository-missing** - neither `homepage` nor `repository` is set.
10. **topics-invalid** - at most 5 topics, 2-32 characters, lowercase letters, digits and single hyphens, starting with a letter.

Each finding links to the dart.dev section it comes from. Yardstick: the official dart.dev pages (pubspec, dependencies, publishing) as read on 2026-09-30 - nothing else.

## How to use

Open a Dart or Flutter package. Every `pubspec.yaml` is checked on open and on save. Type "pubspec Publish Gate" in the Command Palette to run a check on demand. A clean file shows no problems.

The same engine runs in the browser: paste a `pubspec.yaml` at https://getreadystack.com/tools/pubspec-publish-gate and read the same findings. Nothing is uploaded.

## Free and full version

Free, no key: every finding with its line and replacement, in the editor and on the web page.

Full version: a dated pre-publish report for every `pubspec.yaml` in a workspace, plus a CI exit-code gate that stops a bad version before it becomes permanent on pub.dev - https://getreadystack.com/api/buy/cl/polar_cl_IhVfFhiVs73PkDTXwRi0KtJl170ibyq2wCMHd2n01Vu

## Limits

The check reads `pubspec.yaml` as text. It does not resolve versions, contact pub.dev, or measure archive size (dart.dev's limit is 100 MB after gzip and 256 MB uncompressed). Run `dart pub publish --dry-run` as the last step.
