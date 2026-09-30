# Crashlytics Migration Lint for App Center

![Crashlytics Migration Lint for App Center — finds the line](https://getreadystack.com/img/promo/crashlytics-migration-lint_demo.gif)

![Crashlytics Migration Lint for App Center](https://getreadystack.com/img/promo/sku394778_result_card.jpg)

Finds every leftover **Visual Studio App Center** SDK call in your mobile code and names the **Firebase Crashlytics** call that replaces it.

Microsoft retired App Center on **2025-03-31**: since then you cannot sign in and API calls fail. Microsoft extended App Center **Analytics & Diagnostics** until **2026-06-30**. After that date, `Crashes.TrackError`, `Analytics.TrackEvent` and the rest of the SDK still compile and still run. Nothing breaks the build, so a crash dashboard that went quiet is easy to miss.

Home page and the free web version: https://getreadystack.com/tools/crashlytics-migration-lint

## What it checks (18 rules)

| Rule | Leftover App Center code | Crashlytics replacement |
|---|---|---|
| AC_IMPORT | `using Microsoft.AppCenter…`, `import com.microsoft.appcenter…`, `import AppCenter`, `from 'appcenter-crashes'` | Plugin.Firebase.Crashlytics / firebase-crashlytics / FirebaseCrashlytics / @react-native-firebase/crashlytics |
| AC_PACKAGE | NuGet, Gradle, CocoaPods, SPM and npm references | the matching Crashlytics package + Gradle plugin |
| AC_START | `AppCenter.Start(…)` / `AppCenter.start(…)` | FirebaseApp from google-services.json / GoogleService-Info.plist |
| AC_SECRET | `ios=<guid>;android=<guid>` app secrets | delete; Firebase uses its config file |
| AC_TRACK_ERROR | `Crashes.TrackError(ex, props)` | `recordException` / `record(error:)` / `recordError` + `setCustomKey` |
| AC_TRACK_EVENT | `Analytics.TrackEvent(…)` | Crashlytics `log()` or Google Analytics `logEvent()` |
| AC_TEST_CRASH | `Crashes.GenerateTestCrash()` | a thrown exception / `fatalError()` / `crash()` |
| AC_USER_ID | `AppCenter.SetUserId` | `setUserId` |
| AC_ENABLED | `SetEnabledAsync` toggles | `setCrashlyticsCollectionEnabled` |
| AC_CONSENT | `ShouldAwaitUserConfirmation`, `NotifyUserConfirmation` | collection off + `sendUnsentReports` / `deleteUnsentReports` |
| AC_ATTACH | `GetErrorAttachments`, `ErrorAttachmentLog` | `log()` (64kB per session) + custom keys |
| AC_LAST_SESSION | `HasCrashedInLastSessionAsync` | `didCrashOnPreviousExecution` |
| AC_CALLBACKS | `SendingErrorReport` and other send callbacks | no equivalent; remove |
| AC_DISTRIBUTE | `Distribute.CheckForUpdate` and in-app updates | no equivalent; TestFlight / Google Play Console |
| AC_CODEPUSH | `react-native-code-push`, `codePush(App)` | Microsoft's standalone CodePush server, or drop OTA |
| AC_CLI | `appcenter-cli`, `appcenter distribute release` in pipelines | Azure Pipelines; Crashlytics symbol upload |
| AC_CONFIG | `appcenter-config.json`, `AppCenter-Config.plist` | google-services.json / GoogleService-Info.plist |
| AC_LOGLEVEL | `AppCenter.LogLevel` | `-FIRDebugEnabled` / `setprop log.tag.FirebaseCrashlytics DEBUG` |

Crashlytics limits the fixes respect: a maximum of 64 custom key-value pairs, each up to 1 kB, and 64kB of log per session.

## The consent trap

If you port App Center's user-confirmation flow line by line, you usually delete `ShouldAwaitUserConfirmation` and move on. Crashlytics then sends reports automatically and the consent prompt no longer controls anything. The AC_CONSENT rule flags each confirmation call and gives the three Crashlytics calls that restore the flow.

## Sample

The sample .NET MAUI `App.cs` in this repo gives **17 findings (11 errors, 5 warnings, 1 info)**. The migrated version of the same file gives 0.

## Free and paid

Free, no key: open any C#, Kotlin, Java, Swift, Objective-C, JS/TS, Gradle, JSON or YAML file and the findings appear in the Problems panel with line numbers and the replacement call. The web version does the same for a pasted file.

With a licence key, the workspace migration report sweeps every project in the repo and exports a Markdown or CSV checklist to attach to the migration pull request: [workspace migration report](https://getreadystack.com/api/buy/cl/polar_cl_3pE3q8vQYeZ5uwT1EhEjh4AWesRqFpkXz2B8g4VIF1m), $29 once.

Yardstick: Sentry Team is $26/mo billed annually; Firebase Crashlytics is no-cost; this lint covers the code you have to change to reach either one.

Source for the dates: Microsoft Learn, "Visual Studio App Center Retirement" (learn.microsoft.com/appcenter/retirement), last updated 2026-04-15.
