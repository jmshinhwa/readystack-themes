# Cargo.toml Publish Gate - crates.io

![Cargo.toml Publish Gate - crates.io](https://getreadystack.com/img/promo/sku101948_result_card.jpg)

`cargo publish` is a one-way door. crates.io never deletes a version: once
`1.4.2` is uploaded it exists forever, and yanking it does not free the number
for re-use. If the manifest was wrong, the fix is a new version number and a
public row in the release history that says so.

This extension reads the `Cargo.toml` in front of you and names every line that
crates.io or `cargo publish` will refuse, before the upload happens.

Hub: https://getreadystack.com/tools/cargo-publish-gate

## What it checks

13 rules, run offline, on the manifest text itself:

**Hard refusals (the upload does not happen)**

- `description` missing from `[package]` - crates.io refuses the upload.
- `license` and `license-file` both missing - crates.io refuses the upload.
- A dependency pinned to the wildcard `"*"` - crates.io rejects wildcard
  constraints.
- A `git = ` dependency in `[dependencies]` or `[build-dependencies]` -
  crates.io does not accept git sources.
- A `path = ` dependency with no `version = ` next to it - `cargo publish`
  stops, because the registry copy has no path to follow.
- More than five `keywords` - crates.io accepts at most five.
- A keyword longer than 20 characters - crates.io rejects it.
- More than five `categories` - crates.io accepts at most five.

**Frozen-on-upload warnings (the upload happens, and stays that way)**

- `publish = false` - `cargo publish` refuses this crate.
- No `repository` - the crates.io page for that version carries no source link.
- No `readme` - the page body for that version stays empty.
- `edition` absent or `2015` - the published version compiles as 2015.
- `version = "0.0.0"` - a placeholder number gets burned like any other.

`[dev-dependencies]` are treated the way cargo treats them: a path dev-dependency
with no version is stripped at package time, so it is not reported.

## Free and paid

Free: open any `Cargo.toml`, run **Cargo.toml Publish Gate: Check this file**,
and read the full list - every blocker, its line number and its fix. Nothing is
hidden, held back or counted down.

Paid: the same gate over every `Cargo.toml` in the workspace in one pass, plus a
dated report file you keep and attach to the release pull request.

## Yardstick

A contract Rust engineer on the open freelance market starts near $50 an hour,
and re-reading the crates.io manifest rules by hand takes most of that hour -
again at every release.

## Fixtures

`_fixtures/clean.toml` returns 0 findings. `_fixtures/dirty.toml` returns 13
findings, 8 of them hard refusals and 5 frozen-on-upload warnings, measured on 2026-09-17.

## Licence

MIT. $29 once for the paid layer, one licence key per person or team seat,
7-day full refund.
