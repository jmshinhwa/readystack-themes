# PySide6 Migration Lint: PyQt5/PyQt6 Licence Gate

![PySide6 Migration Lint: PyQt5/PyQt6 Licence Gate](https://getreadystack.com/img/promo/sku388654_result_card.jpg)

Open one PyQt5 invoice window and this extension reports **6 findings**: the PyQt5 import, `pyqtSignal`, `uic.loadUi`, `QRegExp`, `pyqtSlot` and `exec_()`, each with the PySide6 line that replaces it. It ships **14 rules** and reads **2 inputs**: the `.py` source text and today's date.

Hub page and free web version: https://getreadystack.com/tools/pyside6-migration-lint

Yardstick: a commercial PyQt licence from Riverbank Computing is 670 USD per developer (Riverbank price page, read 2026-09-29). PySide6 is LGPL v3 from The Qt Company.

## Why teams move from PyQt to PySide6

PyQt5 and PyQt6 are dual-licensed: GPL v3 or the Riverbank commercial licence. If your desktop app is closed source and you ship PyQt inside it under the GPL, the GPL asks you to publish your source. PySide6 (Qt for Python) is LGPL v3, which lets a closed-source application link to it dynamically.

PyQt5 also sits on Qt 5.15. Qt 5.15 standard support ended on 2025-05-26 and 5.15.19 was the last Qt 5.15 release; after that date fixes come only through paid extended maintenance. On 2026-09-29 that is 491 days without Qt 5.15 standard support, and the lint prints this day count next to every PyQt5 import for the date you enter.

## Why a find-and-replace is not enough

Replacing `PyQt5` with `PySide6` in the imports leaves names that do not exist in PySide6. The file then fails at import time or at the first signal connection, often on a code path your tests never touch.

## The 14 rules

| Rule id | What breaks | PySide6 fix |
|---|---|---|
| pyqt5-import | `from PyQt5 ...` (GPL v3 or commercial, Qt 5.15) | `from PySide6 ...` |
| pyqt6-import | `from PyQt6 ...` (GPL v3 or commercial) | `from PySide6 ...` |
| pyqt-signal | `pyqtSignal` | `Signal` |
| pyqt-slot | `pyqtSlot` | `Slot` |
| pyqt-property | `pyqtProperty` | `Property` |
| uic-loadui | `uic.loadUi` / `uic.loadUiType` | `QUiLoader().load()` or `pyside6-uic` |
| sip-module | `import sip`, `sip.isdeleted` ... | `shiboken6` |
| pyqt-version-const | `PYQT_VERSION_STR` | `PySide6.__version__`, `qVersion()` |
| qvariant | `QVariant` | plain Python values |
| qregexp | `QRegExp` (removed in Qt 6) | `QRegularExpression` |
| qdesktopwidget | `QDesktopWidget`, `app.desktop()` | `primaryScreen()` |
| fontmetrics-width | `fontMetrics().width(text)` | `horizontalAdvance(text)` |
| qaction-qtwidgets | `QAction` from QtWidgets | `QAction` from QtGui |
| exec-underscore | `exec_()` | `exec()` |

Comments are ignored, so a `# was: from PyQt5 import ...` note does not raise a finding.

## Free and full version

Free, with no key: open any `.py` file and run **PySide6 Migration Lint: Check this file**. Every finding appears in the Problems panel with its line number and fix. The same engine runs in the free web version on the hub page, where you paste the file text and pick a date.

Full version (licence key): the whole workspace in one pass plus an exportable migration report per file for release or licence sign-off.

## What this does not do

It does not rewrite your code and it is not legal advice. It tells you which lines still depend on PyQt, so you can decide whether to port them or keep a commercial PyQt licence.
