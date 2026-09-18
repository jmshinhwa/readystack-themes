# MAUI iOS Submission Gate

![MAUI iOS Submission Gate](https://getreadystack.com/img/promo/sku94625_result_card.jpg)

App Review reads `Platforms/iOS/Info.plist` before it reads any of your C#. In a .NET MAUI solution that file is one of the few things you still edit by hand, and it is where the rejections live.

This extension reads the Apple property lists in your project as text and applies **16 checks**. Every finding names the key, the line it sits on, what App Review or App Store Connect does with it, and the edit that clears it.

## What it looks at

`**/*.plist` — in a MAUI project that is `Platforms/iOS/Info.plist` and `Platforms/iOS/Entitlements.plist`.

## The 16 checks

**Purpose strings (Guideline 5.1.1(i))** — every key ending in `UsageDescription` gets one verdict:

| Check | What it catches |
|---|---|
| `purpose_empty` | `<string></string>` — the prompt shows no reason at all |
| `purpose_placeholder` | `$(PRODUCT_NAME)`, `TODO`, "needs access", "description here" |
| `purpose_too_short` | under 15 characters — names the data, not the use |
| `purpose_no_reason` | no `to` / `so that` / `for` clause anywhere in the sentence |

**Superseded keys**

| Check | What it catches |
|---|---|
| `bluetooth_deprecated` | `NSBluetoothPeripheralUsageDescription` with no `NSBluetoothAlwaysUsageDescription` |
| `location_always_deprecated` | `NSLocationAlwaysUsageDescription` with no `…AlwaysAndWhenInUse…` |
| `exits_on_suspend` | `UIApplicationExitsOnSuspend`, removed in iOS 10 |

**Capabilities the strings do not back**

| Check | What it catches |
|---|---|
| `bg_location_no_string` | `UIBackgroundModes` declares `location`, no always-usage string |
| `bg_audio_no_mic` | `UIBackgroundModes` declares `audio`, no `NSMicrophoneUsageDescription` |
| `skad_no_att` | `SKAdNetworkItems` present, `NSUserTrackingUsageDescription` missing |
| `healthkit_partial_strings` | HealthKit read string without the write string |
| `ats_arbitrary_loads` | `NSAllowsArbitraryLoads` is `true` with no per-domain exceptions |
| `aps_env_development` | `aps-environment` still `development` in an entitlements file |

**Export compliance**

| Check | What it catches |
|---|---|
| `export_key_missing` | no `ITSAppUsesNonExemptEncryption` — the questionnaire stops every upload |
| `export_bool_as_string` | the key written as `<string>false</string>`; App Store Connect ignores it |
| `export_true_no_code` | flag true, no `ITSEncryptionExportComplianceCode` — the US BIS annual self-classification report falls due each 1 February |

## Measured on the sample

`_fixtures/clean.plist` returns **0 findings**. `_fixtures/dirty.plist` returns **13 findings — 10 at error, 3 at warning**. Both files ship with the extension, so you can re-run the numbers yourself.

## Free and licensed

**Free, no key:** all 16 checks on any plist you open, with line numbers and fixes.

**Licence key ($29 once):** the export axis — a dated Submission Evidence report in Markdown covering every plist in the solution, a file you keep, attach to the release ticket, or hand to a client. 7-day full refund.

Freelance iOS release consultants list $60–$150/hour on Upwork for submission review; one 5.1.1(i) rejection costs a re-cut build and a second App Review cycle.

Hub: https://getreadystack.com/tools/maui-ios-submission-gate
