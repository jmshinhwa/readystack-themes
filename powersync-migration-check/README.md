# PowerSync Migration Check: Realm Sync & Data API

![PowerSync Migration Check: Realm Sync & Data API — finds the line](https://getreadystack.com/img/promo/powersync-migration-check_demo.gif)

![PowerSync Migration Check: Realm Sync & Data API](https://getreadystack.com/img/promo/sku394490_result_card.jpg)

**Sample `orders.ts` (22 lines): 6 findings from 16 rules.** Each finding names the dead MongoDB call on the left and the PowerSync replacement on the right.

MongoDB deprecated Atlas Device Sync, the Atlas Device SDKs (Realm Sync), the Atlas Data API and custom HTTPS Endpoints in September 2024. All of them reached end-of-life on **2025-09-30**. Code that still logs in through `Realm.App`, opens a Flexible Sync session or posts to `data.mongodb-api.com` no longer syncs. PowerSync's MongoDB module reached general availability in March 2025 and is the migration path MongoDB pointed Device Sync users to.

Hub page and web version: https://getreadystack.com/tools/powersync-migration-check

Yardstick: every rule is measured against MongoDB's end-of-life notice for Device Sync, the Data API and HTTPS Endpoints (2025-09-30) and the PowerSync client API (`PowerSyncDatabase`, `connect`, `fetchCredentials`, `uploadData`, Sync Rules).

## What it checks (16 rules)

| id | finds | PowerSync replacement |
|---|---|---|
| RS01 | `realm-web` import | `@powersync/web` / `@powersync/react-native` |
| RS02 | `new Realm.App({ id })` | `new PowerSyncDatabase({ schema })` + `db.connect(connector)` |
| RS03 | Flexible Sync config (`flexible: true`, `flexibleSyncConfiguration()`) | Sync Rules `bucket_definitions` |
| RS04 | `subscriptions.update/add` | server-side Sync Rules |
| RS05 | `partitionValue` | bucket parameter |
| RS06 | Data API base URL `.../endpoint/data/v1` | your backend + MongoDB driver, or the local copy |
| RS07 | custom HTTPS Endpoint URL | your own API; writes via `uploadData()` |
| RS08 | `api-key` header sent to the Data API | short-lived JWT from `fetchCredentials()` |
| RS09 | `/action/find`, `insertOne`, `aggregate` … | `db.getAll` / `db.watch` / `db.execute` |
| RS10 | `Realm.Credentials.*` login | your auth provider's JWT |
| RS11 | `user.mongoClient()` | local SQL query |
| RS12 | `user.functions.*` / `callFunction` | endpoint on your backend |
| RS13 | `@realm/react` `AppProvider` / `UserProvider` | `PowerSyncContext.Provider`, `useQuery` |
| RS14 | `syncSession`, `uploadAllLocalChanges` | `connect` / `disconnect` / `waitForFirstSync` |
| RS15 | RealmSwift / `io.realm.kotlin.mongodb` / `package:realm` used with sync | PowerSync Swift, Kotlin or Dart SDK |
| RS16 | App Services client API URL | your auth and API |

Files: `.js .jsx .ts .tsx .mjs .swift .kt .dart`. Comment lines are skipped.

## Why not just grep for "realm"

Local-only Realm databases still work: the SDKs stayed open source. A grep for `realm` flags every schema and query you can keep. These rules only fire on the sync, Data API, endpoint and App Services login paths that stopped, and each finding carries the replacement call.

## The date input

The check takes two inputs: the source text and a date. The date sets the clock on every message: before 2025-09-30 a finding is a warning with the days left; on or after it, an error with the days since sync stopped.

## Free and full version

Free, no key: open a file and run the check; every finding appears in the Problems panel and in the web version. The full version scans the whole workspace and saves one Markdown migration report (file, line, dead call, PowerSync replacement) for your team, unlocked with a licence key.

## Privacy

Nothing leaves your machine. The engine is one JavaScript file with a JSON rule list (`engine.js`, `rules.json`); the web version runs the same file in the browser.
