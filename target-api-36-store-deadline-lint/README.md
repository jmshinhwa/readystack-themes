# Target API 36 & Xcode 26 Store Deadline Lint

![Target API 36 & Xcode 26 Store Deadline Lint](https://getreadystack.com/img/promo/sku30879_result_card.jpg)

Finds the targetSdk, NDK, Gradle plugin and Xcode versions in your repo that Google Play and App Store Connect already refuse, with the date each one stopped being accepted.

## What it finds

```
build.gradle:6   error  compileSdk 35 - cannot build against Android 16
build.gradle:12  error  targetSdkVersion 35 - Play has rejected updates since 2026-08-31
build.gradle:8   error  ndkVersion 27 - native libs not 16 KB aligned (blocked since 2025-11-01)
```

## What it does for free

- Check the open build file against every rule - no key, no limit, nothing hidden
- Browse the full dated table of Play and App Store Connect requirements
- Line numbers, severity, the date the store started refusing it, and the version to move to

## With a licence

- **Scan every build file in the repository** — One command walks every module, flavour, Podfile and CI workflow instead of the one file you happen to have open.
- **Fail the build in CI** — Machine-readable output and an exit code, so a blocked targetSdk or Xcode pin cannot reach the release branch.
- **Export a dated release-readiness report** — A file with every finding and its store deadline, for the person who has to sign the release off.
- **Re-check on every save** — The check runs again each time a build file is saved, so a version bump never lands unnoticed.

[**Get the full version - $29**](https://getreadystack.com) - $29 once, one licence key per person or team seat, 7-day full refund.

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.


## Install

```
ext install target-api-36-store-deadline-lint
```
