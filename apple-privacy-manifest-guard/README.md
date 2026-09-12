# Privacy Manifest Guard

![Apple Privacy Manifest Guard for React Native](https://getreadystack.com/img/promo/sku33316_result_card.jpg)

Flags every line that needs a PrivacyInfo.xcprivacy entry and names the exact Apple reason code, before App Store Connect answers with ITMS-91053.

## What it finds

```
  4  UserDefaults.standard.set(token, forKey: "session")
     NSPrivacyAccessedAPICategoryUserDefaults - undeclared, this upload fails
     ITMS-91053. Legal reasons: CA92.1, 1C8F.1, C56D.1, AC6B.1.

 18  <string>C56D.9</string>
     Not one of the 14 reason codes Apple accepts - fails ITMS-91055.
```

## What it does for free

- Check the open file end to end - every required-reason API call, named with its category
- Check just the lines you selected
- Read out all 5 categories and the 14 reason codes Apple accepts

## With a licence

- **Whole-repository scan** — Reads every file in the workspace, including the SDKs and pods you did not write, in one pass.
- **Declaration report as a file** — Writes the findings to CSV, JSON or HTML so you can keep it, diff it or hand it to a reviewer.
- **CI output** — Machine-readable JSON so your build fails on a missing declaration instead of App Store Connect.

Mid-level freelance iOS developers bill $85-$145/hr in the 2026 US market.

[**Get the full version - $29**](https://readystack.example/buy) - $29 once, one licence key per person or team seat, 7-day full refund.


## Install

```
ext install apple-privacy-manifest-guard
```
