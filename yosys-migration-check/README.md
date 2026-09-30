# Yosys Migration Check — Vivado-only blockers in your Verilog

![Yosys Migration Check - Vivado-only blockers — finds the line](https://getreadystack.com/img/promo/yosys-migration-check_demo.gif)

![Yosys Migration Check - Vivado-only blockers](https://getreadystack.com/img/promo/sku395161_result_card.jpg)

**Yosys migration check** reads a Verilog or SystemVerilog file and lists every line that only works inside AMD Vivado, each with a Yosys-ready fix. The sample board top in this repo (`_fixtures/dirty.v`) gives **6 findings** against **12 rules**; the ported version (`_fixtures/clean.v`) gives 0.

Web version (same engine, runs in your browser): https://getreadystack.com/tools/yosys-migration-check

## Why now

From the Vivado 2026.1 release (June 2026) AMD moved Vivado to tiered licensing: BASIC is a free annual subscription with limited simulation and debug support, CORE is $1,200 per node-locked seat per year, and ENTERPRISE stays a $4,395 perpetual licence (AMD Vivado licensing page). From 2026.1 on, only the PRO, ENTERPRISE and GOLD tiers include access to Vivado versions older than 2026.1. That is the moment teams ask whether some of their RTL can go through open-source Yosys instead — and the first Yosys run usually stops on a module that only exists inside the Vivado install.

Yardstick: one Vivado CORE seat is $1,200 per year; this check tells you, file by file, what stands between your RTL and a Yosys run.

## What it reads — the 6 findings on the sample file

| Vivado-only line | Yosys-ready fix |
|---|---|
| `clk_wiz_0 u_clk` (Vivado IP-core instance) | RTL or primitive instance |
| `xpm_cdc_single` (XPM CDC macro) | own 2-flop synchroniser module |
| `(* mark_debug *)` attribute | drop or keep as note |
| `xpm_memory_sdpram` (XPM memory macro) | inferred reg array RAM |
| `ila_0 u_ila` (ILA debug core) | wrap in `ifdef VIVADO_DEBUG |
| `` `pragma protect begin_protected `` (IEEE 1735 encrypted block) | get plain RTL or rewrite |

## The 12 rules

1. **XPM_CDC** — `xpm_cdc_single`, `xpm_cdc_gray`, `xpm_cdc_handshake` and the other XPM CDC macros ship inside the Vivado install; Yosys has no definition for them.
2. **XPM_MEMORY** — `xpm_memory_spram/sdpram/tdpram/...`: the design fails with a missing-module error.
3. **XPM_FIFO** — `xpm_fifo_sync/async/axis`.
4. **ENCRYPTED_IP** — `` `pragma protect begin_protected `` blocks: only the vendor tool holds the key.
5. **VIVADO_IP_INSTANCE** — instances such as `clk_wiz_0`, `fifo_generator_0`, `blk_mem_gen_0`, `processing_system7_0`, `axi_gpio_0`: their netlist is generated from a `.xci` inside Vivado.
6. **DEBUG_CORE** — `ila_0`, `vio_0`, `system_ila_0` instances.
7. **MARK_DEBUG** — Vivado inserts an ILA probe from it; Yosys keeps it as a plain attribute and inserts nothing.
8. **DONT_TOUCH** — a Vivado attribute; the attribute Yosys documents for keeping a cell is `(* keep *)`.
9. **GLBL_REF** — `glbl.GSR` / `glbl.GTS` references into Vivado's `glbl` simulation module.
10. **SV_CLASS** — SystemVerilog classes; Yosys `read_verilog -sv` does not parse them.
11. **SV_COVERGROUP** — testbench-only, keep the file out of the Yosys read list.
12. **VIVADO_PROJECT_PATH** — `$readmemh`/`include` paths into `<project>.srcs/`, `.gen/`, `.runs/` or `.ip_user_files/`.

Comments are ignored, so a note like `// replaced xpm_cdc_single` does not count.

## How to use

Open a `.v`, `.sv`, `.vh` or `.svh` file and run **Yosys Migration Check: scan this file** from the command palette. Findings appear in the Problems panel with the line number. Errors are lines Yosys will stop on; warnings are Vivado behaviour that silently disappears (debug probes, DONT_TOUCH).

## Free and full version

Free: scan the open file and list every Vivado-only blocker with its line and the Yosys-ready fix — no key, no account, the file never leaves your machine.

Full version: a workspace-wide scan of every .v/.sv file plus an exportable Markdown migration report per blocker, for the team before the Vivado licence renewal. One licence key per person or team seat.

## What it does not do

It does not run Yosys, place and route, or judge timing. It does not tell you which device family an open toolchain supports. It reads text only.

## License

See LICENSE.txt.
