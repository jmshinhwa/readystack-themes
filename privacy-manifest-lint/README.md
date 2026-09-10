# Privacy Manifest Lint

![Privacy Manifest Lint - xcprivacy & ITMS-91053](https://getreadystack.com/img/promo/sku23939_result_card.jpg)

Checks PrivacyInfo.xcprivacy and your C#, Dart, JS, Swift and Kotlin source for Apple required-reason APIs, and decodes all 17 reason codes back to the category they belong to.

> Five defects in these nine lines. Xcode reports none of them; App Store Connect reports all of them.

```xml
<key>NSPrivacyAccessedAPICategory</key>      <!-- key is NSPrivacyAccessedAPIType -->
<string>NSPrivacyAccessedAPICategoryUserDefault</string>   <!-- ...Defaults, plural -->
<key>NSPrivacyAccessedAPIReasons</key>       <!-- ...APITypeReasons -->
<array>
	<string>CA92.2</string>                  <!-- no such code; all 17 end in .1 -->
	<string>AC6B.1</string>                  <!-- real, but MDM only. SDK wrapper = C56D.1 -->
</array>
```

Open the file, run **Check this file**, and each line is named with the category it belongs to and Apple's own condition for it. Works on `.cs`, `.dart`, `.ts`, `.js`, `.swift`, `.m` and `.kt` too, which is where Xcode stops looking.

## What it does for free

- Decodes all 17 reason codes back to the category they belong to, with Apple's condition
- Flags reason codes Apple never issued - the ones a chatbot invents
- Finds required-reason API call sites in C#, Dart, JS/TS, Swift, Obj-C and Kotlin
- Flags misspelled manifest keys and category names

## With a licence

- **Whole repo, not one open file** — Scans every file in the workspace, honouring max_files and exclude_glob.
- **Take the report away as CSV, JSON or HTML** — Writes the findings into the workspace as a file you keep.
- **CI JSON your pipeline can gate on** — Machine-readable output so a build fails before App Store Connect does.
- **Fixes the misspelled keys in place** — Applies the exact replacement to the matched text only.

[Get the full version - $29](https://getreadystack.com) - $29 once, one licence key per person or team seat, 7-day full refund.


## Install

```
ext install privacy-manifest-lint
```
