# Xcode 26 SDK Gate for GitHub Actions

![Xcode 26 SDK Gate for GitHub Actions](https://getreadystack.com/img/promo/sku436475_result_card.jpg)

**Since 28 April 2026 App Store Connect rejects uploads that were not built with Xcode 26 or later using an iOS 26 SDK — and the GitHub-hosted `macos-15` runner still defaults to Xcode 16.4.**

Open any file in `.github/workflows/` and this extension shows, job by job, which Xcode the job really builds with (explicit pin or runner-image default) and marks every line that blocks an App Store or TestFlight upload, with the exact replacement line next to it.

## What it maps

For every job that archives or uploads an Apple build (`xcodebuild`, `fastlane`, `gym`, `upload_to_testflight`, `altool`, `flutter build ipa` …):

```
job "testflight" → macos-15 → Xcode 16.4 (image default) → rejected by App Store Connect since 28 Apr 2026
job "archive"    → macos-26 → Xcode 26.6 (image default) → meets the Xcode 26 upload minimum
```

## The 10 rules

| Rule | Line that breaks | Fix line |
|---|---|---|
| runner-macos-14 | `runs-on: macos-14` (Xcode 15.0.1–16.2, default 15.4; retired 2 Nov 2026) | `runs-on: macos-26` |
| runner-removed | `macos-13` or older | `runs-on: macos-26` |
| macos-15-default-xcode | `runs-on: macos-15` with no Xcode selection (default 16.4) | `sudo xcode-select -s /Applications/Xcode_26.3.app` |
| xcode-pin-below-26 | `xcode-version: '16.4'`, `Xcode_16.x.app`, `DEVELOPER_DIR` | `xcode-version: '26.3'` |
| xcode-not-on-image | `Xcode_26.6.app` on macos-15 (it ships 26.0.1, 26.1.1, 26.2, 26.3) | a listed version, or `macos-26` |
| deployment-target-below-13 | `IPHONEOS_DEPLOYMENT_TARGET=12.0` (iOS 13 floor since 9 Sep 2026) | `IPHONEOS_DEPLOYMENT_TARGET=13.0` |
| sdk-flag-below-26 | `-sdk iphoneos18.5` | `-sdk iphoneos` |
| self-hosted-unpinned | `runs-on: [self-hosted, macOS]` with no selection | `sudo xcode-select -s /Applications/Xcode_26.app` |
| macos-latest-floating | `runs-on: macos-latest` (today macOS 26, Xcode 26.6) | `runs-on: macos-26` |
| job-xcode-map | one line per shipping job: runner → Xcode → verdict | — |

On the bundled sample workflow (`_fixtures/dirty.yml`, 6 shipping jobs) the gate reports 7 errors, 1 warning and 1 info besides the 6 map lines; the clean sample reports only its 2 map lines.

## Runner images it knows

| Label | Xcode installed | Default |
|---|---|---|
| macos-14, -large, -xlarge | 15.0.1, 15.1, 15.2, 15.3, 15.4, 16.1, 16.2 | 15.4 |
| macos-15, -large, -intel, -xlarge | 16.0–16.4, 26.0.1, 26.1.1, 26.2, 26.3 | 16.4 |
| macos-26, -large, -intel, -xlarge, macos-latest | 26.0.1, 26.1.1, 26.2, 26.3, 26.4.1, 26.5, 26.6 | 26.6 |

Taken from the actions/runner-images Readmes (macos-14 image 20260629, macos-15 20260824, macos-15-arm64 20260907, macos-26 20260824).

## Sources

- Apple, Upcoming Requirements: "Since April 28, 2026 Apps uploaded to App Store Connect must be built with Xcode 26 or later using an SDK for iOS 26, iPadOS 26, tvOS 26, visionOS 26, or watchOS 26" and "Since September 9, 2026 iOS and iPadOS apps uploaded to App Store Connect must target iOS 13 or later." — https://developer.apple.com/news/upcoming-requirements/
- GitHub, actions/runner-images issue 13518: macOS 14 deprecation from 6 July 2026, brownouts from 5 October 2026, unsupported from 2 November 2026.

Yardstick: an hour of a US software developer costs $65.38 at the BLS OEWS 2025 median wage.

## Free and full version

Free: the check, the job map and every fix line for the workflow you have open, here and on the web page at https://getreadystack.com/tools/xcode-26-sdk-gate — no key.

Full version: `Sweep workspace and write report` scans every workflow in the repository at once and writes a dated SDK-compliance report (Markdown + JSON) for release sign-off — https://getreadystack.com/api/buy/cl/polar_cl_9GcYCuRt3auGWhF1S2qpt0JzVgCvrrwJv3I9D26uFfl

Nothing leaves your machine; the engine runs locally on the file text.
