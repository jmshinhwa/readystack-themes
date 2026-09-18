# Ren'Py Release Gate

![Ren'Py Release Gate](https://getreadystack.com/img/promo/sku64314_result_card.jpg)

Ren'Py compiles your script, so your script looks fine.

That is the whole problem. Your own save file is three chapters deep, `config.developer` has been `True` since the prototype, and every `persistent` flag you read was written into your persistent file months ago. A first-time player has none of that state. The bugs that survive your testing are exactly the bugs that only a stranger can trigger, and they trigger after the store page is live.

This extension reads `.rpy` files and reports the lines that pass Ren'Py's compile step and then break in someone else's session.

## The fourteen rules

**Breaks a player's session**
- `unescaped_substitution` - a bare `[` in dialogue. Ren'Py reads it as an interpolation and raises an unknown-substitution error on the line a player happens to reach.
- `unbalanced_text_tag` - a text tag opened and never closed, or a stray brace. `{i}Late again, she thought.` compiles; the rest of the scene renders italic or dies.
- `persistent_no_default` - `persistent.seen_ending_a` read with no `default persistent.seen_ending_a`. You have the value. A new player gets `None`.
- `tab_indent` - Ren'Py indentation is spaces. One tab from a pasted snippet stops the build.

**Breaks a player's saves**
- `define_not_default` - `define` used for a variable that is reassigned during play. `define` values are not saved and not rolled back.
- `missing_save_directory` - no `config.save_directory`. Rename or re-version the project later and every existing save is orphaned.

**Ships something you did not mean to ship**
- `developer_mode_shipped` - `config.developer = True` puts the console and the developer menu in the build.
- `console_enabled` - `config.console = True`, same door, held open explicitly.
- `autoreload_enabled` - `config.autoreload = True` pinned in a shipped build.
- `source_rpy_in_build` - build rules present, but nothing excludes `game/**.rpy`, so readable script source travels with the distribution.

**Breaks on a machine that is not yours**
- `nonportable_asset_path` - `"C:/Users/dev/art/logo.png"`, a backslash separator or a leading `/`. Fine on your disk, missing on Linux, macOS and Android builds.
- `removed_image_cache_size` - `config.image_cache_size`, superseded by `config.image_cache_size_mb`.
- `deprecated_im_api` - `im.Scale`, `im.MatrixColor` and the rest of the deprecated image manipulators.
- `placeholder_version` - `config.version` still `"1.0"` from the template, the string your storefront and your crash reports quote back at you.

## What it does on a real file

The `_fixtures/dirty.rpy` shipped with this extension is 28 lines and compiles without complaint. The gate returns **14 findings: 10 errors and 4 warnings**. `_fixtures/clean.rpy` is the same scene, gated: 0 findings.

## Using it

1. Open a `.rpy` file.
2. Command palette: **Ren'Py Release Gate: Check this file**.
3. Findings land in the Problems panel with line numbers, and in a report view with the fix for each.

## Free and licensed

Free, with no key and no counter: one `.rpy` file, every finding in it, every fix. That is a finished job for one file.

The licence adds the other axis - scope and a document you keep: **Sweep workspace and write report** walks every `.rpy` file in the project in one pass and writes a release report for CI, a publisher or your own archive. $29 once, one key per person or CI seat, seven-day full refund.

Yardstick: putting one title on Steam costs $100 in Steam Direct fees, before a single crash report arrives.

## The same engine in a browser

https://getreadystack.com/tools/renpy-release-gate runs the identical rule set on pasted text, with no install.

## Licence

See `LICENSE.txt`.
