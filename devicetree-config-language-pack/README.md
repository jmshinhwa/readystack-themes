# DeviceTree Config Audit

![DeviceTree Config Audit: 23 dtc-Style Rules, 50 Snippets](https://getreadystack.com/img/promo/sku10770_result_card.jpg)

**`status = "ok"` is not one of the five values in the Devicetree Specification v0.4**
(`okay`, `disabled`, `reserved`, `fail`, `fail-sss`). `dtc` compiles it anyway - `status` is just a
string. Zephyr marks a node present only for the exact value `okay`, so the sensor quietly leaves the
build and you debug the driver instead of the line.

23 rules. 50 snippets. Line numbers, and a sentence saying what the correct spelling is and why.

| The line that builds clean | The line that boots |
| --- | --- |
| `status = "ok";` | `status = "okay";` - the only value Zephyr reads as on |
| `status = "enabled";` | `status = "okay";` - there is no `"enabled"` in the spec |
| `compatible = "acme-board";` | `compatible = "acme,board";` - no comma, no binding |
| `interrupt-parent = <2>;` | `interrupt-parent = <&intc>;` - a phandle, not a number |
| `phandle = <1>;` | delete it - `dtc` assigns phandle values itself |

## Free, on the file you have open

- **Audit the open file** - all 23 rules, with line numbers in the output panel
- **Insert a snippet** - all 50, at the cursor, with tab stops
- **Show everything in this pack** - the full rule and snippet list

No licence key, no account, no network call and no build context. Nothing is watermarked and nothing
expires. It works on a bare `.overlay` pasted out of a vendor forum.

Ten of the 23 rules are devicetree. The other 13: TOML (3), MicroProfile `.properties` (3),
AutoHotkey v2 (3), Ren'Py (2), Swift (1), Inkling (1). The 50 snippets ship in 13 sets and also reach
Python, YAML/west, JSON and `.editorconfig`.

## With a licence - scale, a handover file, repetition

The licence never removes a rule. Both sides run the same 23.

- **Audit every file in the workspace** - one pass, same rules, paths and line numbers in one list.
  Honours `max_files` and `exclude_glob`.
- **Write the findings to a file** - CSV, JSON or HTML into the workspace folder. Uses the
  `report_format` setting when it is set, and asks only when it is not.
- **Re-check on every save** - a toggle; after it is on, every save re-runs the check.
- **Apply the suggested replacement** - collects the lines that carry a documented correct value and
  reports how many need a hand edit. It does not rewrite your file: the destructive rewrite path was
  removed after it damaged source lines, and no rule in this build ships a machine-checked
  replacement, so this command currently reports and never edits.

**[Get the licence - $29](https://buy.polar.sh/polar_cl_CFCuxNMjv5zsartvO10MlY2XKN142StTkIxHL43Dlqa)** · one-time · 7-day refund, no questions asked.

A freelance embedded software engineer bills about $103/hour (contractrates.fyi, 2026); a staff
embedded firmware engineer's hour averages $58.66 (ZipRecruiter, June 2026). One sensor missing from
a build costs an afternoon at the bench.

## Try it first, without installing

`index.html` in this folder runs the same 23 rules on text you paste, in your browser. Nothing is
uploaded.

## Install

```
ext install devicetree-config-language-pack
```

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `report_format` | `csv` | Export format: `csv`, `json` or `html` |
| `max_files` | `800` | Maximum workspace files scanned in one pass |
| `exclude_glob` | `**/{build,.west,node_modules,zephyr/samples}/**` | Paths skipped during a workspace scan |
| `show_on_start` | `false` | Audit the open file once when the editor opens |
| `extraRules` | `[]` | Your own rules, checked alongside the 23 that ship inside |

## What this is not

The free devicetree extensions highlight, complete and - inside a configured Zephyr or nRF context -
resolve bindings, and they do that better than this pack does. This is a spelling audit that needs no
context and no toolchain, and it covers the six other config languages in the same repository.
