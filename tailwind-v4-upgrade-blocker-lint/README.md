# Tailwind v4 Upgrade Blocker Lint

Your AI wrote Tailwind v3. Your build is Tailwind v4. Most of it compiles anyway - that is the problem.

This extension reads the file you have open and reports every construct that Tailwind CSS v4 removed or silently redefined, with the line number and the v4 replacement. It ships **19 rules**. On the bundled 73-line v3 fixture all 19 fire and raise **35 findings**; on the migrated copy of the same file they raise **0**.

## Why a lint and not the upgrade tool

`npx @tailwindcss/upgrade` renames what it can rename and stops. The cases that survive it are exactly the ones that still compile, so nothing in your pipeline goes red:

| The line you still ship | What v4 does with it |
| --- | --- |
| `class="border"` | paints `currentColor`, not `gray-200` |
| `class="ring"` | 1px, not 3px, and `currentColor`, not `blue-500` |
| `class="shadow-sm"` | one step larger than it was in v3 (`shadow-xs` is the old look) |
| `class="outline-none"` | `outline-style: none`, so the focus ring is gone in forced-colors mode |
| `class="first:*:pt-0"` | targets nothing - stacked variants read left to right in v4 |

Those five render differently in the browser and identically in your terminal. They are found by eye, in review, usually by the client.

## The nineteen rules

**Removed outright.** `@tailwind` directives, `bg-opacity-*` / `text-opacity-*` / `border-opacity-*` and friends, `flex-shrink-*` and `flex-grow-*`, `overflow-ellipsis`, `decoration-slice` and `decoration-clone`, `bg-gradient-to-*`, square-bracket CSS variables such as `bg-[--brand]`, a v3 dash prefix such as `tw-flex`, and reversed stacked-variant order.

**Silently redefined.** Bare `border`, bare `ring`, bare `shadow` / `rounded` / `blur`, the `-sm` scale step across shadow, rounded, blur and drop-shadow, `outline-none`, and `space-x-*` / `space-y-*`.

**Configuration.** A `tailwind.config.js` with no `@config` line, custom utilities left inside `@layer utilities` instead of `@utility`, `@apply` in a component `<style>` block with no `@reference`, and the deprecated dot-path `theme(colors.slate.700)` lookup.

## Use

1. Open any `.css`, `.html`, `.jsx`, `.tsx`, `.vue` or `.svelte` file.
2. Run **Tailwind v4 Upgrade Blocker Lint: Scan this file** from the command palette.
3. Read the findings. Each one carries the line number and the v4 replacement.

That finishes the file in front of you, with no licence key and no account.

The full version adds a different axis - scale and ownership: one command scans every file in the workspace and writes a dated Markdown migration report with a per-file count you can hand to your team. 29 dollars once, one licence key per person or team seat, 7-day full refund.

## Yardstick

A front-end contractor sweeping the same codebase by hand bills 60-120 an hour, and the silent cases need a visual diff of every component rather than a search.

## Browser floor

Tailwind v4 assumes Safari 16.4, Chrome 111 and Firefox 128. This extension does not check your analytics for you; if you still serve older browsers, settle that before the migration rather than after.

## Also on the web

The same 19 rules, the same engine file, running in the browser with nothing to install: https://getreadystack.com/tools/tailwind-v4-upgrade-blocker-lint

## Licence

See LICENSE.txt. Tailwind CSS is a trademark of Tailwind Labs Inc.; this extension is an independent tool and is not affiliated with or endorsed by Tailwind Labs.
