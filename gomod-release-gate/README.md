# go.mod Release Gate: /vN suffix and go line check

![go.mod Release Gate: /vN suffix and go line check — finds the line](https://getreadystack.com/img/promo/gomod-release-gate_demo.gif)

![go.mod Release Gate: /vN suffix and go line check](https://getreadystack.com/img/promo/sku431664_result_card.jpg)

Run it on your go.mod before you push a release tag. Every line that will break `go get` for the people who depend on you is listed with its line number and the exact line to write instead.

Web version (same engine, runs in your browser): https://getreadystack.com/tools/gomod-release-gate

## What it checks (12 rules)

| Rule | What it catches | Source |
|---|---|---|
| GM001 | go.mod has no `module` line | go.dev/ref/mod#go-mod-file-module |
| GM002 | a v2+ tag (or a `retract v2.x`) while the module path has no `/v2` suffix. A module with a go.mod file cannot be tagged v2+ without the suffix; without a go.mod the tag resolves as `+incompatible` | go.dev/ref/mod#major-version-suffixes |
| GM003 | `/v0` or `/v1` suffix on the module path (not allowed) | go.dev/ref/mod#major-version-suffixes |
| GM004 | module path `/v3` but the tag is `v2.x` (or the reverse) | go.dev/ref/mod#major-version-suffixes |
| GM005 | no `go` line (the go command assumes go 1.16) | go.dev/ref/mod#go-mod-file-go |
| GM006 | `go` line older than the two supported Go releases | go.dev/doc/devel/release#policy |
| GM007 | `go` line newer than any released Go | go.dev/doc/devel/release |
| GM008 | `toolchain` lower than the `go` line | go.dev/ref/mod#go-mod-file-toolchain |
| GM009 | `replace ... => ../local/path` (ignored outside your repo) | go.dev/ref/mod#go-mod-file-replace |
| GM010 | `require` of a v2+ version on a path without `/vN` | go.dev/ref/mod#incompatible-versions |
| GM011 | `require` path `/v3` with a `v2.x` version | go.dev/ref/mod#major-version-suffixes |
| GM012 | `+incompatible` dependency (pre-modules v2+ tag) | go.dev/ref/mod#incompatible-versions |

## Which Go versions count as supported

Go's release policy: each major release is supported until there are two newer major releases. The engine carries the release dates from go.dev/doc/devel/release: Go 1.24 (2025-02-11), Go 1.25 (2025-08-12), Go 1.26 (2026-02-10), Go 1.27 (2026-08-19). On 2026-09-30 that means Go 1.26 and Go 1.27 are supported, and Go 1.25 stopped getting security fixes on 2026-08-19. A `go 1.24` or `go 1.25` line is flagged with the fix `go 1.26.0`.

## Example

The sample go.mod in this repository gives 6 findings:

```
L3   GM006  go 1.24                                  -> go 1.26.0
L5   GM008  toolchain go1.23.4                       -> toolchain go1.24.0 (or delete it)
L8   GM010  github.com/google/go-github v45.2.0      -> github.com/google/go-github/v45 v45.2.0
L9   GM011  github.com/acme/queue/v3 v2.4.0          -> github.com/acme/queue/v2 v2.4.0
L13  GM009  replace github.com/acme/shared => ../shared -> delete before tagging
L15  GM002  retract v2.0.1 on a path without /v2     -> module github.com/acme/ratelimit/v2
```

The fixed go.mod gives 0 findings.

## Use

Open a go.mod and run **go.mod Release Gate: Check this file** from the command palette. Findings appear in the Problems panel with the line number and the replacement line. Nothing leaves your machine.

## Free and full version

Free: every finding with its line and fix, in VS Code and in the web version, with no key.
Full version: a dated release-gate report for each tag with the go.dev rule cited next to every line, and a CI exit code that stops the tag when a finding is left. One licence key per person or team seat. Full version: https://getreadystack.com/api/buy/cl/polar_cl_Vk28qbhg6Ft9bHizvz8BRLb1VkQXEjCJeBgD10M4Lf5

## Yardstick

Tracking down a rejected v2 tag by hand usually costs a maintainer an hour or more; one hour of a software developer at the US median wage is $65.38 (BLS OEWS, May 2025, occupation 15-1252).

## Why not ask a chatbot

A chatbot answers from its training data, so it often names Go versions that are already out of support. This extension reads your file line by line against the dated release table above.

Licence: see LICENSE.txt.
