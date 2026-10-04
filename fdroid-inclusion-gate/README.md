# F-Droid Inclusion Gate — non-free Gradle dependency map

![F-Droid Inclusion Gate - non-free Gradle dependency map](https://getreadystack.com/img/promo/sku425922_result_card.jpg)

Moving an Android app to F-Droid? Open `build.gradle`, `build.gradle.kts` or `libs.versions.toml` and this extension lists every dependency, plugin and Maven repository that F-Droid's Inclusion Policy treats as non-free, each on its own line, with the FOSS line that replaces it.

Web version (same engine, runs in your browser): https://getreadystack.com/tools/fdroid-inclusion-gate

**Checked against:** the F-Droid Inclusion Policy (f-droid.org/docs/Inclusion_Policy) and the non-free library signatures plus allowed-repository list in fdroidserver's `scanner.py`, both read on 2026-09-30.

## Why this matters

The Inclusion Policy says proprietary tracking or advertising libraries and analytics tools "such as Google Play Services and Firebase and Crashlytics and proprietary ad/tracking SDKs are strictly forbidden in all applications", and that upstream developers must use a FLOSS alternative or "a build flavour that does not require these dependencies". It also says apps "which fail to rebuild (such as requiring Play Services) or contain undisclosed anti-features will receive a rejection." F-Droid builds your app from source, so one leftover `implementation("com.google.firebase:…")` line stops the build.

Many teams are editing `build.gradle` this quarter anyway: since August 31 2026, Google Play requires new apps and app updates to target Android 16 (API level 36). That is a good moment to add a `foss` flavour next to `play`.

## What it finds (25 rules)

- Google Play Services (`com.google.android.gms:*`), with specific replacements for location, maps, ads/UMP and sign-in
- Firebase (`com.google.firebase:*`), FCM push, Analytics, Crashlytics and the `google-services` plugin
- Play Core: in-app update, review, asset and feature delivery
- Play Billing, RevenueCat, PayPal, Play Install Referrer
- ML Kit, Google IMA ads, Google Android Libraries (Places), Mapbox v2+, AWS Android SDK, ObjectBox plugin
- Tracker SDKs (Flurry, Umeng, Bugly, Baidu, Yandex, Facebook, HyperTrack, BugSense, Crittercism)
- `jcenter()` and any `maven { url … }` outside fdroidserver's allowed list (Maven Central, Google Maven, Sonatype, JFrog, JitPack, Clojars)
- A project with non-free items and no `foss` product flavour
- Non-free items already isolated in a `play` flavour are shown as info: those are fine as long as the foss flavour builds

## Replacement lines it suggests

| Non-free line | FOSS line |
|---|---|
| `firebase-messaging`, OneSignal, Pushy | `org.unifiedpush.android:connector` (UnifiedPush) |
| `firebase-crashlytics` | `ch.acra:acra-mail` (ACRA, opt-in) |
| `play-services-location` | `android.location.LocationManager` (platform API) |
| `play-services-maps` | `org.osmdroid:osmdroid-android` or `org.maplibre.gl:android-sdk` |
| `com.google.mlkit:barcode-scanning` | `com.journeyapps:zxing-android-embedded` |
| Play Billing, Play Core, Install Referrer | `playImplementation(...)` in a play flavour |

## Example

The sample `build.gradle.kts` in `_fixtures/dirty.gradle` gives 14 findings: 10 non-free items (Firebase BOM, FCM, Analytics, two Crashlytics lines, Play location, Google Maps, Play review, Play Billing, ML Kit) and 4 warnings (the `google-services` plugin, `jcenter()`, one unknown Maven repo, no foss flavour). The migrated sample with `foss` and `play` flavours gives 0 errors and 2 info lines.

## Commands

- **F-Droid Inclusion Gate: check this file** — free, runs on the open Gradle file, no key.
- **Workspace migration plan** — every module in the workspace, a dated migration plan with each item mapped to its replacement, and a CI gate that fails a build adding new non-free use. This part needs a licence key: https://getreadystack.com/api/buy/cl/polar_cl_cwMtl6XHYorRHyRdNoC1vSKhkAoFBIfoP1YYc1Tj4Be

## Limits

This reads Gradle text. It does not decompile an APK, and it cannot see a dependency pulled in transitively by a free-looking library. F-Droid reviewers still read the source and decide; this tool gets you to that review without the obvious build failures.

Licence: see LICENSE.txt.
