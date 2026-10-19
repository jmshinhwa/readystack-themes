# NiceGUI Migration Check: PySimpleGUI Licence Gate

![NiceGUI Migration Check: PySimpleGUI Licence Gate — finds the line](https://getreadystack.com/img/promo/nicegui-migration-check_demo.gif)

![NiceGUI Migration Check: PySimpleGUI Licence Gate](https://getreadystack.com/img/promo/sku596874_result_card.jpg)

Open one 9-line requirements.txt and this extension reports **6 PySimpleGUI ties**: the dead `PySimpleGUI.net/install` index, the `PySimpleGUI==5.0.8.3` stub, a 4.x pin, a bare `PySimpleGUIQt`, `PySimpleGUIWeb` and `PySimpleGUIWx`. Each finding has its line number and the FreeSimpleGUI, PySimpleGUI 6 or NiceGUI line that replaces it. It ships **9 rules** and reads **2 inputs**: the file text and an as-of date.

Hub page and free web version: https://getreadystack.com/tools/nicegui-migration-check

Yardstick: PySimpleSoft sold the PySimpleGUI 5 commercial licence at $99 per developer (PySimpleGUI 5.0.8.3 PyPI page: "only 600 people paid the $99 for a commercial license"). NiceGUI is MIT, Flet is Apache-2.0, FreeSimpleGUI and PySimpleGUI 6 are LGPL3.

## What changed, with dates

- **2024-02**: PySimpleGUI 5 launched as a paid product. Hobbyists registered a free key; companies were expected to buy a commercial licence. PyPI lists 5.x as `License :: Other/Proprietary License`.
- **2025-04-02**: PySimpleGUI 5.0.8.3 went up on PyPI as a stub. Its `PySimpleGUI.py` only prints "PySimpleGUI is now located on a private PyPI server" and the `--extra-index-url https://PySimpleGUI.net/install` command. There is no `Window` class in it.
- **2025**: PySimpleSoft announced the shutdown in February 2025; support for commercial users continued through the end of 2025. Hobbyist keys run until they expire and no new Hobbyist keys are issued.
- **2026-04-14**: PySimpleGUI 6 was published on PyPI under LGPL3, with the licensing and security components removed. The latest release is 6.3.0.1 (2026-08-16).
- **2026-10-10**: `https://PySimpleGUI.net/install/` returned HTTP 404 when we checked.

So "PySimpleGUI needs a paid licence" is now half true: it depends on which version line a project actually pins. That is what this check reads.

## Rules

| Rule | Severity | Line it flags | Replacement line |
|---|---|---|---|
| psg-private-index | error | `--extra-index-url https://PySimpleGUI.net/install` | delete; `PySimpleGUI>=6,<7` |
| psg5-stub | error | `PySimpleGUI==5.0.8.3` | `FreeSimpleGUI==5.3.0.post1` |
| psg5-pin | error | `PySimpleGUI>=5,<6`, `^5.0` | `FreeSimpleGUI==5.3.0.post1` |
| psgqt-restricted | error | `PySimpleGUIQt` (installs 5.0.0, "Free To Use But Restricted") | `FreeSimpleGUIQt==2.0.0` |
| psg-unpinned | warning | `PySimpleGUI` with no ceiling | `PySimpleGUI>=6,<7` |
| psg-port-stale | warning | `PySimpleGUIWx`, `PySimpleGUIWeb` | `FreeSimpleGUIWx==1.1.0`, `FreeSimpleGUIWeb==1.1.0` |
| psg-import | warning | `import PySimpleGUI as sg` | `import FreeSimpleGUI as sg` or `from nicegui import ui` |
| psg-port-import | warning | `import PySimpleGUIQt as sg` | `import FreeSimpleGUIQt as sg` |
| psg4-pin | info | `PySimpleGUI==4.60.5` | `FreeSimpleGUI==5.3.0.post1` |

The as-of date matters: before 2026-01-01 the 5.x rules report a warning (support still ran); after it they report an error.

Files read: `requirements*.txt`, `pyproject.toml` (PEP 621 and Poetry), `setup.py`, `setup.cfg`, `Pipfile` and `*.py` imports.

## Free and paid

Free, no key: run the check command on the open file (or let it run on save). You get every tie, its line and the replacement line. Nothing in the answer is hidden.

With a licence key ($29 once, [get it here](https://getreadystack.com/api/buy/cl/polar_cl_Il7ZSZ8o2tsU1tqxjaGGd9mIlNXDDO4whVDrv0g7Cd0)): the whole workspace in one migration plan with every `sg.` element mapped to its NiceGUI or Flet counterpart, a dated licence-exposure report for the company (which projects, since when, which version line), and a CI gate that fails a build adding new PySimpleGUI 5 use.

## Limits

- It reads text. It does not resolve a lock file or the version installed in your virtualenv.
- FreeSimpleGUI is a drop-in for most 4.x code; NiceGUI and Flet are rewrites, and the line shown is the starting import.
- Licence facts are read from PyPI pages and the PySimpleGUI README on 2026-10-10. This is not legal advice.
