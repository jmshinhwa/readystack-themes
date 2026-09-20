# Angular Removed-API Lint

![Angular Removed-API Lint](https://getreadystack.com/img/promo/sku39068_result_card.jpg)

Paste an Angular file — or open one in VS Code — and this tells you which lines use an API that
Angular has already removed, which ones use an API that is deprecated and on the way out, and which
Angular major your `package.json` is pinned to relative to Angular's own support window.

Free online check: **https://getreadystack.com/tools/angular-removed-api-lint** — same engine file,
byte for byte, running in your browser. Nothing is uploaded.

## Why this exists

Language models learned Angular from years of NgModule-era blog posts and StackOverflow answers.
Ask one for "an Angular service that fetches a user" and it will hand you `HttpClientModule`,
`TestBed.get()`, `implements CanActivate`, `.toPromise()` and `entryComponents`. Some of those stopped
compiling four majors ago; some still compile and quietly rot. The TypeScript compiler only complains
about the ones that are gone from *the version you have installed* — it has nothing to say about the
ones that are deprecated, and nothing at all to say about the day your major stops receiving
security patches.

## The 32 checks

Each check reports one of three levels:

| Level | Meaning |
|---|---|
| **error** | The symbol was removed from Angular. This does not compile on a current major. |
| **warning** | Deprecated. It still works; it is scheduled to stop working. |
| **info** | Still supported, but it is the NgModule-era form and the current docs and schematics emit something else. |

Removed (error): `@angular/http` (v8), `Renderer` (v9), `ModuleWithProviders` without a type argument
(v10), the `async()` test helper (v12), `entryComponents` and `TestBed.get()` (v13), `enableIvy`,
`ngcc` and `relativeLinkResolution` (v16).

Deprecated (warning): `InjectFlags` (v14), class-based route guards and `canLoad` (v15),
`RouterLinkWithHref` (v15), `@angular/flex-layout` and `BrowserModule.withServerTransition()` (v16),
`.toPromise()` (RxJS 7), `HttpClientModule` and `HttpClientTestingModule` (v18), `APP_INITIALIZER`,
`ENVIRONMENT_INITIALIZER`, `AfterRenderPhase`, `ExperimentalPendingTasks` and `allowSignalWrites`
(v19), `provideExperimentalZonelessChangeDetection` and `TestBed.flushEffects()` (v20).

Advisory (info): private `ɵ` imports, `RouterModule.forRoot()`, `*ngIf`/`*ngFor`/`*ngSwitch`,
`BrowserAnimationsModule`, `platformBrowserDynamic()`, a redundant `standalone: true`.

Plus one dated check: Angular supports each major for 18 months — 6 months active, 12 months LTS.
Paste or open a file containing your `"@angular/core"` pin and the check measures that major's window
against today's date. On 2026-09-11, an `^18.2.13` pin reports that support ended 2025-11-19, 296 days
earlier.

Comment lines are stripped before matching, so a commented-out import is not a finding.

## What is free and what is not

Free, no key, no account: **Check this file** runs all 32 checks against the file open in the editor
and shows the replacement line for every hit. The web page above does the same thing for a paste.
That is a finished job — you can upgrade a file with it and never pay anything.

Paid ($29 once, one key per person or team seat, 7-day full refund):
**Sweep workspace and write report** walks every `.ts`, `.html` and `.json` outside `node_modules`,
and writes a dated `angularRemovedApi-report.md` into your workspace root — a file you own, can
commit, and can hand to a client or an auditor. Licence: https://buy.polar.sh/polar_cl_2wSKxziqGHTfu7JassC9u93PIE4YL8ThOikL64MVZVc

Yardstick: a freelance Angular upgrade consultant bills $80–$150/hour to read the same files by hand.

## Commands

- `Angular Removed-API Lint: Check this file` — free.
- `Angular Removed-API Lint: Sweep workspace and write report (licence)`
- `Angular Removed-API Lint: Enter licence key`

Findings are advisory. Read the Angular update guide before you move a major.
