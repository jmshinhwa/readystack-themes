# Play Declaration Gap Lint (AndroidManifest)

Your AndroidManifest.xml is the file Google Play reads first. Some lines in it do not just
ask the user for a permission — they open a form in Play Console that a human reviewer will
read, and one of them throws a SecurityException at runtime on Android 14 before a reviewer
ever sees the app. This extension reads the manifest you have open and names each of those
lines, with the Play surface that goes with it.

Generated code is where this bites hardest. An assistant that writes a manifest writes the
permission, not the declaration behind it: it will happily add `QUERY_ALL_PACKAGES` for a
"share to other apps" feature, add `android:foregroundServiceType="location"` without
`android.permission.FOREGROUND_SERVICE_LOCATION`, or use `specialUse` without the subtype
property Play reviews by hand. The manifest builds. The upload is what fails.

## What it checks — 15 checks

1. `QUERY_ALL_PACKAGES` — App visibility permission declaration
2. `MANAGE_EXTERNAL_STORAGE` — All files access permission declaration
3. `ACCESS_BACKGROUND_LOCATION` — Location permissions declaration
4. SMS and Call Log permissions (six of them) — Permissions declaration form
5. `REQUEST_INSTALL_PACKAGES` — Install unknown apps declaration
6. `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` — Photo and video permissions declaration
7. `android.permission.health.*` — Health apps declaration (Health Connect)
8. `USE_FULL_SCREEN_INTENT` — Full-screen intent permission declaration
9. `USE_EXACT_ALARM` — restricted to alarm clock and calendar apps
10. `SCHEDULE_EXACT_ALARM` — not granted by default from Android 13
11. `com.google.android.gms.permission.AD_ID` — Data safety advertising ID answer
12. A service bound with `BIND_ACCESSIBILITY_SERVICE` — prominent disclosure
13. Any `android:foregroundServiceType` — foreground service use case declaration
14. A foreground service type whose `FOREGROUND_SERVICE_*` permission is missing — Android 14 (API 34) throws
15. `specialUse` without `PROPERTY_SPECIAL_USE_FGS_SUBTYPE` in the same `<service>`

Commented-out permissions are ignored, attributes may wrap over several lines, and a
`<queries>` block is never reported — it is the answer, not the problem.

## Measured on the sample manifests in this repository

- `_fixtures/dirty.xml` — 58 lines, 17 permissions, 3 services: **19 findings** (15 errors,
  4 warnings). All 15 checks fire; they name 14 Play Console surfaces plus 1 Android 14
  runtime crash.
- `_fixtures/clean.xml` — 44 lines: **0 errors, 1 warning** (one `dataSync` service, whose
  permission is present, still needs a use case in the foreground service declaration).

## Free and licensed

Free, with no key and no limit: **Play Declaration Gap: Check this file** reads the
AndroidManifest.xml open in your editor, marks each line in the Problems panel, and prints
the full list in the output channel. The same engine, byte for byte, runs in the browser at
the product page — nothing is uploaded.

Licensed: **Sweep workspace and write report** runs the same 15 checks over every manifest
the workspace has (app module, library modules, merged manifests from SDKs) and writes
`playDecl-report.md` next to your project — a dated worksheet, one block per manifest, that
you keep in the repository and hand to whoever fills in Play Console. The full sweep runs
free for seven days from the first time you use it. After that it asks for a licence key:
$29 once, one licence key per person or CI seat.
Key link: https://buy.polar.sh/polar_cl_9pjxdAKOI372jyFZtBN3s5u8ajfGhvBhh1rwf3TGsGE

Yardstick: a freelance Android release engineer bills $60-$120 an hour, and reading a large
app's manifests against every current Play declaration is most of a day.

Hub page: https://getreadystack.com/tools/play-declaration-gap-lint

Findings are advisory and are not legal advice. Policy surfaces move; the rule set is dated
in each report.
