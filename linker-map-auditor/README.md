# Linker Map Auditor - FLASH & RAM budget for GNU ld

![Linker Map Auditor - FLASH & RAM budget for GNU ld map files](https://getreadystack.com/img/promo/sku20171_result_card.jpg)

**`region 'RAM' overflowed by 680 bytes`.** The linker tells you that you lost. It never tells you who took it.

Open the `.map` file your build already wrote and get the answer in one command:

```
REGION              USED        SIZE        FREE     USED%  STATUS
FLASH             15,088      65,536      50,448     23.0%  ok
RAM                8,872       8,192        -680    108.3%  OVER by 680 B

RAM - top spenders (8.66 KiB used)
       4,096  uart.o                              .bss.uart_rx_buf
       2,048  log.o                               .bss.log_pool
         640  app.o                               .data.cfg, COMMON
         448  libhal.a(stm32f4xx_hal.o)           .bss.hal_state
         100  main.o                              .data.tick
       1,540  (not attributed to an input section) (padding, heap/stack reservations)
```

That is the whole free feature. No key, no watermark, no file limit.

## Install and run

1. Build with a map file: `arm-none-eabi-gcc ... -Wl,-Map=build/app.map`
2. Open `build/app.map` in VS Code.
3. Command Palette -> **Linker Map: Analyze this linker map**

The status bar then shows `FLASH 23%  RAM 108%`. Click it to reopen the report.

## What it reads

Any GNU ld map file: `arm-none-eabi-ld`, `riscv64-unknown-elf-ld`, `avr-ld`, `msp430-ld`, and the maps written by
STM32CubeIDE, MCUXpresso, Zephyr and PlatformIO. It parses the `Memory Configuration` block for real region
origins and lengths, follows section names that ld wraps onto two lines, resolves archive members like
`libhal.a(stm32f4xx_hal.o)`, and counts `*fill*` padding.

Two details most hand-written scripts get wrong, and this does not:

- **`.data` is charged twice.** Its variables live in RAM, its initialiser sits in FLASH. Both are real.
- **Debug sections are charged to nothing.** `.debug_info`, `.comment` and `.ARM.attributes` sit at address 0
  in no region and never reach the device, so they are never counted as growth.

Whatever no input section claims - alignment padding, `_Min_Heap_Size`, `_Min_Stack_Size` - is reported
on its own line rather than silently dropped, so the columns add up to the region total exactly.

## Free vs licensed

| | Free | Licensed |
|---|---|---|
| Region table: used, free, overflow | yes | yes |
| Ranking by object, archive, input section | yes | yes |
| Any number of map files | yes | yes |
| Save a build as a baseline | | yes |
| Diff a build against the baseline | | yes |
| Per-region budgets that pass or fail | | yes |
| Export `linker-map-report.json` + `.md` | | yes |

The free side answers **"what is in this build"** and it answers it completely. The licence answers the
different question **"what changed since the build that fit"**:

```
FLASH: 14,064 -> 15,088  (+1,024 B)
RAM:    6,824 ->  8,872  (+2,048 B)  OVER by 680 B
  ^ this build is the one that stopped fitting.

What moved:
  +2,048 B  RAM  uart.o  (changed)
  +1,024 B  FLASH  libc_nano.a(lib_a-printf.o)  (changed)
```

**$29 once - one licence key per person or team seat - 7-day full refund.**
A freelance embedded engineer averages $103/hr (contractrates.fyi, 2026); this is about 17 minutes of one.

[Get the full version - $29](https://buy.polar.sh/polar_cl_2x41azB4vGEeUd5HdFkPGOiAorn6HYGk0WDro17qEb0)

## Settings

| Setting | Meaning |
|---|---|
| `linkerMapAuditor.budgets` | Per-region ceiling, e.g. `{ "FLASH": "90%", "RAM": "7K" }`. Accepts bytes, `512K`, `0x8000` or a percentage. |
| `linkerMapAuditor.top` | How many top spenders to list per region. Default 12. |

## Commands

| Command | Tier |
|---|---|
| Linker Map: Analyze this linker map | free |
| Linker Map: Show last report | free |
| Linker Map: Save this build as baseline | licence |
| Linker Map: Compare this build with baseline | licence |
| Linker Map: Check region budgets | licence |
| Linker Map: Export report (JSON + Markdown) | licence |

Your map file is parsed locally. Nothing is uploaded. The only network call the extension ever makes is the
licence check to `api.polar.sh`, and only when you use a licensed command.
