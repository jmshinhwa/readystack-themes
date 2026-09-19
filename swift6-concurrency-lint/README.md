# Swift 6 Concurrency Migration Lint

![Swift 6 Concurrency Migration Lint](https://getreadystack.com/img/promo/sku109792_result_card.jpg)

Swift 6 language mode turns data-race safety from a warning into a compiler error. Code that builds cleanly in Swift 5 — a `static var shared` singleton, a top-level `var` cache, a `DispatchQueue` used as a lock — stops building the moment a target is switched over. Assistants still write that Swift 5 shape by default, because most of the Swift on the public internet predates the strict-concurrency rules.

This extension reads `**/*.swift` and reports the lines that will not survive the switch, before you flip the flag.

## What it checks

Eleven rules, all of them about isolation and mutable state:

| Rule | Severity | What it catches |
| --- | --- | --- |
| `global_var` | error | top-level `var` — rejected as non-concurrency-safe global |
| `static_var` | error | `static var shared` and friends — the same global, inside a type |
| `dispatch_semaphore` | error | `DispatchSemaphore` blocking a cooperative-pool thread |
| `tools_version_5` | error | `swift-tools-version: 5.x` in `Package.swift` — the package can never enter Swift 6 mode |
| `unchecked_sendable` | warn | `@unchecked Sendable` — checker silenced, race unchanged |
| `nonisolated_unsafe` | warn | `nonisolated(unsafe)` escape hatch |
| `queue_sync_lock` | warn | serial-queue `.sync { }` locking, invisible to the isolation checker |
| `escaping_not_sendable` | warn | `@escaping` without `@Sendable` |
| `detached_task` | warn | `Task.detached` leaving actor isolation |
| `dispatch_main_in_async` | warn | `DispatchQueue.main.async` in a file that already uses `async`/`await` |
| `preconcurrency_import` | info | `@preconcurrency import` shim hiding module errors |

Each finding carries the line number, the reason the Swift 6 compiler objects, and the replacement shape (`actor`, `@MainActor`, `static let`, `await`, `Mutex`).

## Measured on the bundled fixtures

`_fixtures/dirty.swift` is 47 lines of ordinary Swift 5 service code. The engine returns **13 findings, 6 of them build-blocking errors**. `_fixtures/clean.swift` is the same service rewritten as an `actor` with a `Sendable` value type and returns **0 findings**. The two files are in the repository, so the numbers above can be reproduced.

## Free and paid

The free extension lints the files you open and names every blocker with its line and its fix — that job finishes without a licence key. The paid tier exports one migration report for the whole repository: every file ranked by blocking errors, in a form you can commit, attach to a ticket, or read in CI. The split is ownership and scale, not a crippled free tier: nothing is hidden, watermarked, or counted down.

## Yardstick

One hour of a contract iOS engineer, at the $100/hour rates common in the US market, costs more than this licence does once.

## The same engine in a browser

`index.html` is a single page that runs `ext/engine.js` with the same `ext/rules.json` — paste a Swift file, get the same findings, no install and no upload. Hub page: <https://getreadystack.com/tools/swift6-concurrency-lint>

## Notes

- The lint is textual, not a full Swift parser: it reads lines, skips comments, and does not resolve types. It is a migration triage list, not a substitute for a Swift 6 build.
- Rules live in `ext/rules.json`. The list is a flat array; adding a rule is adding an object.
- No telemetry, no network calls during linting.
