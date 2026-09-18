# targetSdk 36 Deadline Gate (Google Play)

![targetSdk 36 Deadline Gate (Google Play)](https://getreadystack.com/img/promo/sku38186_result_card.jpg)

Reads an `AndroidManifest.xml` and an `app/build.gradle` and tells you what breaks when you
raise `targetSdk` to 36. Google Play's target API level requirement moved to API 36 —
Android 16 — for new apps and for updates to existing apps from **31 August 2026**. An
extension can be requested in Play Console until **1 November 2026**. After that, uploads
for a module below API 36 are refused, and the build already on the store stops reaching
new users on recent Android versions.

Raising the number is the easy part. The cost is in the behaviour changes that switch on
with it, and those are spread across two files that rarely get read together.

## What it checks

17 rules, in two groups.

**Gradle** — `targetSdk` below 36 (with the number of days between the file's "as of" date
and the deadline), `targetSdk` missing from a `defaultConfig` block so Gradle silently
falls back to `compileSdk`, `compileSdk` below 36, Android Gradle Plugin still on 7.x,
Play Billing Library below 7, `ndkVersion` older than r27 where 16 KB page size support
landed, and `useLegacyPackaging true`.

**Manifest** — the edge-to-edge opt-out (`windowOptOutEdgeToEdgeEnforcement` /
`PROPERTY_COMPAT_ALLOW_OPT_OUT_EDGE_TO_EDGE`), which API 36 ignores;
`android:screenOrientation` locks and `android:resizeableActivity="false"`, both ignored
above 600dp at API 36; a component with an `<intent-filter>` and no `android:exported`,
a hard build failure since API 31; `FOREGROUND_SERVICE` with no
`android:foregroundServiceType`, which throws `MissingForegroundServiceTypeException` from
API 34; a `foregroundServiceType` whose matching `FOREGROUND_SERVICE_*` permission is not
requested; and the three permissions Play makes you file a declaration for —
`SCHEDULE_EXACT_ALARM`, `MANAGE_EXTERNAL_STORAGE`, `QUERY_ALL_PACKAGES` — plus
application-wide `usesCleartextTraffic`.

Commented-out lines are blanked before matching, so a line you already disabled is not a
finding.

## Commands

- **targetSdk 36 Gate: Check this file** — runs on the open editor, marks the lines in
  Problems, prints the report in an output channel. Free, no key.
- **targetSdk 36 Gate: Sweep the workspace** — runs every `AndroidManifest.xml`,
  `build.gradle` and `build.gradle.kts` in the folder in one pass and writes a dated
  `targetSdk36-report.md` next to them. Licensed.
- **targetSdk 36 Gate: Enter licence key**

A React Native or Flutter repo has the app manifest, the debug manifest, several library
manifests and three or four Gradle files, and they disagree. The sweep is what turns that
into one list with a date on it that can be pasted into the release ticket.

## Free online

The same engine, byte for byte, runs in the browser at
<https://getreadystack.com/tools/target-sdk-36-deadline-gate> — paste the manifest and the
Gradle file together, set the date, read the findings. Nothing is uploaded.

## Yardstick

A contract Android developer at the common US freelance rate of $50–100/hour bills more for
one afternoon of manifest review than a licence costs once.

## Not legal or policy advice

Findings are advisory. Google Play policy is set by Google and can change; check the Play
Console policy pages for the wording that applies to your listing on the day you upload.
