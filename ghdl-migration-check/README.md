# GHDL Migration Check — Vivado xsim to GHDL

![GHDL Migration Check — Vivado xsim to GHDL — finds the line](https://getreadystack.com/img/promo/ghdl-migration-check_demo.gif)

![GHDL Migration Check — Vivado xsim to GHDL](https://getreadystack.com/img/promo/sku410505_result_card.jpg)

Flags the VHDL lines that AMD Vivado's xsim simulator accepts but GHDL rejects or needs a flag for — before your first `ghdl -a` run in CI stops on them.

Tool page: https://getreadystack.com/tools/ghdl-migration-check

Yardstick: Mouser lists a Vivado ML Enterprise node-locked seat (EF-VIVADO-ENTER-NL) at $5,063.25 (checked 2026-09-29). GHDL is free under GPL-2.0.

## What it checks (12 rules)

| Rule | Line it flags | GHDL fix |
|---|---|---|
| GH01 unisim-library | `library unisim;` | compile UNISIM with GHDL's `compile-xilinx-vivado.sh`, pass `-P<dir>` |
| GH02 xpm-macro-library | `library xpm;` | XPM macros are SystemVerilog; use an inferred VHDL FIFO/RAM or a behavioural model |
| GH03 unimacro-library | `library unimacro;` | compile with the vendor script, or generic RTL |
| GH04 secureip-library | `library secureip;` | encrypted models; stub the block |
| GH05 synopsys-packages | `use ieee.std_logic_unsigned.all;` | `-fsynopsys`, or better `ieee.numeric_std` |
| GH06 vhdl2008-process-all | `process(all)` | `--std=08` (GHDL defaults to 93c) |
| GH07 vhdl2008-matching-op | `?=`, `?/=`, `?<` … | `--std=08` |
| GH08 vhdl2008-std-env | `std.env.stop;` | `--std=08`, or `assert … severity failure` |
| GH09 vhdl2008-context | `context vunit_lib.vunit_context;` | `--std=08` |
| GH10 vhdl2008-to-string | `to_string(`, `to_hstring(` | `--std=08` |
| GH11 shared-variable-not-protected | `shared variable errors : integer;` in a file that needs `--std=08` | protected type, or `-frelaxed` |
| GH12 encrypted-ip-envelope | `` `protect begin_protected `` | ask the vendor for a plain model |

If a comment in the file already sets a flag — for example `-- ghdl -a --std=08 -fsynopsys` — the rules that flag covers stay silent.

## Measured on the sample

`tb_uart_rx.vhd`, a 34-line testbench that ran in Vivado xsim: **6 findings — 3 errors, 3 warnings**.

| Vivado xsim line | GHDL fix |
|---|---|
| `library unisim;` | compile UNISIM: compile-xilinx-vivado.sh |
| `library xpm;` | inferred VHDL FIFO, no XPM |
| `shared variable errors : integer` | protected type, or -frelaxed |
| `use ieee.std_logic_unsigned.all;` | use ieee.numeric_std.all; |
| `process(all)` | ghdl -a --std=08 |
| `std.env.stop;` | --std=08 |

Command line the file needs: `ghdl -a --std=08 -fsynopsys`.

## How to use

1. Open a `.vhd` or `.vhdl` file.
2. Run **GHDL Migration Check: Check this file** from the Command Palette. Findings appear in the Problems panel with the fix in the message.
3. Or paste the file into the free web page at the tool link above — same engine, nothing uploaded.

## Free and full version

Free, no key: check the open file, every finding, every fix, the `ghdl -a` command line.
Full version ($29 once, one licence key per person or team seat): scan every `.vhd` file in the workspace in one pass and export a Markdown migration report with the flag set per library. [Get the full version](https://getreadystack.com/api/buy/cl/polar_cl_xKrdYeTAeNRUpn4SK67wtaLXOUBVYfW8S0l0f1emErz)

## Sources

- GHDL command reference (`--std`, `-fsynopsys`, `-frelaxed`): https://ghdl.github.io/ghdl/using/InvokingGHDL.html
- GHDL vendor primitives (`compile-xilinx-vivado.sh`): https://ghdl.github.io/ghdl/getting/PrecompVendorPrimitives.html
