# Swift Package Manager Migration: CocoaPods Trunk

![Swift Package Manager Migration: CocoaPods Trunk](https://getreadystack.com/img/promo/sku607451_result_card.jpg)

**Finds every pod in your Podfile or .podspec that still resolves from CocoaPods trunk and writes the exact Swift Package Manager line that replaces it. The sample ShopApp Podfile gives 6 findings from 23 rules.**

CocoaPods trunk turns read-only on **2026-12-02**, with a test run on 2026-11-01 to 11-07 (source: [CocoaPods Trunk Read-only Plan](https://blog.cocoapods.org/CocoaPods-Specs-Repo/)). Existing builds keep working, but from that day no new pod and no new version of a pod can be pushed to trunk. Every `pod 'X'` that comes from trunk stops getting updates, and every library you publish with `pod trunk push` stops getting releases.

## What it shows

Open a `Podfile` or any `*.podspec`. Each finding sits on its line in the Problems panel:

| Podfile line | Swift Package Manager line |
|---|---|
| no `source` line | trunk is the default source (cdn.cocoapods.org) |
| `pod 'Alamofire', '~> 5.8'` | `.package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.8.0")` |
| `pod 'Kingfisher', '~> 7.10.0'` | `.package(url: "https://github.com/onevcat/Kingfisher.git", .upToNextMinor(from: "7.10.0"))` |
| `pod 'SnapKit'` | `.package(url: "https://github.com/SnapKit/SnapKit.git", from: "<version in Podfile.lock>")` |
| `pod 'Firebase/Analytics', '~> 10.0'` | `.product(name: "FirebaseAnalytics", package: "firebase-ios-sdk")` |
| `pod 'AcmeLegacyKit', '1.4.2'` | no Swift package in the map: vendor repo or `.binaryTarget` |

On 2026-10-11 the sample reports 21 days to the trunk test run and 52 days to read-only. Change the date and the clock line changes with it.

## The 23 rules

- 3 source rules: `source` pointing at cdn.cocoapods.org, at github.com/CocoaPods/Specs, or no `source` line at all (trunk by default).
- 2 podspec rules: a podspec released with `pod trunk push`, and `prepare_command`, which trunk has refused for new pods since May 2025 and which has no Swift Package Manager equivalent.
- 1 rule for trunk pods with no known Swift package.
- 17 map rules, each checked against the vendor's own Package.swift: Alamofire, Kingfisher, SnapKit, SDWebImage, RxSwift, Moya, SwiftyJSON, lottie-ios, Realm, GoogleSignIn, IQKeyboardManager, KeychainAccess, Nuke, Sentry, GRDB, CryptoSwift and Firebase (13 Firebase products).

Version rules are translated, not copied: `~> 5.8` becomes `from: "5.8.0"`, `~> 7.10.0` becomes `.upToNextMinor(from: "7.10.0")`, a bare `1.4.2` becomes `exact: "1.4.2"`.

## What it does not flag

Pods with `:path`, `:git` or `:podspec` do not come from trunk, so they are skipped. A Podfile whose only `source` is your private specs repo gives 0 findings.

## Free and team use

The check of the open file is free and complete. A licence key adds the whole-workspace migration plan with a ready Package.swift dependencies block, a dated trunk exposure report and a CI gate that fails a build adding a new trunk pod.

Yardstick: without this you open each vendor repo, read its Package.swift for the URL and product name, and translate every `~>` rule by hand.

Web version and notes: https://getreadystack.com/tools/swift-package-manager-migration-check
