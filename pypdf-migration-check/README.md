# pypdf Migration Check - PyMuPDF AGPL Licence Gate

![pypdf Migration Check - PyMuPDF AGPL Licence Gate — finds the line](https://getreadystack.com/img/promo/pypdf-migration-check_demo.gif)

![pypdf Migration Check - PyMuPDF AGPL Licence Gate](https://getreadystack.com/img/promo/sku431021_result_card.jpg)

Find every place your Python project still pulls in **PyMuPDF** (`import fitz`, `import pymupdf`, `PyMuPDF==…` in requirements, pyproject or environment.yml, LangChain `PyMuPDFLoader`, LlamaIndex `PyMuPDFReader`) and get the **exact pypdf, pdfplumber or pypdfium2 line** that replaces each one.

Web version and docs: https://getreadystack.com/tools/pypdf-migration-check

## Why it matters

Artifex publishes PyMuPDF under the GNU AGPLv3 or a commercial licence (https://artifex.com/licensing). Its licensing page says you cannot deploy the open-source edition as part of a server-based application or service without disclosing your own application's full source code under AGPL to any users interacting with it. If you cannot meet that, a commercial licence is required. The page lists no public price; commercial terms go through Artifex sales.

Yardstick: a comparable commercial PDF library, Aspose.PDF for Python via .NET, lists Developer Small Business at US$1199 for 1 developer and 1 deployment location (purchase.aspose.com, read 2026-09-30).

## What you get in the open file

Measured on the bundled sample `invoice worker` (13 lines): **6 findings**, one per PyMuPDF line.

| PyMuPDF line | Replacement |
|---|---|
| `import fitz` | `from pypdf import PdfReader, PdfWriter` |
| `fitz.open(path)` | `reader = PdfReader(path)` |
| `page.get_text()` | `page.extract_text()` |
| `page.get_pixmap(dpi=110)` | `pypdfium2.PdfDocument(path)[i].render(scale=dpi/72).to_pil()` |
| `page.search_for("Total due")` | `pdfplumber.open(path).pages[i].search("text")` |
| `page.find_tables()` | `pdfplumber.open(path).pages[i].extract_tables()` |

## The 25 rules

- 5 dependency rules: `pymupdf`, `PyMuPDFb`, `pymupdf4llm`, `pymupdfpro`, and the PyPI package `fitz` (an unrelated 0.0.0 project, not PyMuPDF).
- 6 import rules: `import fitz`, `import pymupdf`, `from fitz import`, `pymupdf4llm`, LangChain `PyMuPDFLoader`, LlamaIndex `PyMuPDFReader`.
- 14 call rules: `fitz.open`, `fitz.Matrix/Rect`, `get_text`, `get_pixmap`, `search_for`, `find_tables`, `insert_pdf`, `page_count`, `get_toc`, `set_metadata`, `set_rotation`, `get_images`, `insert_text`, `authenticate`. Call rules only fire in files that import fitz or pymupdf, so `get_text()` in a Tkinter file stays quiet.

Replacement versions were read on PyPI on 2026-09-30: pypdf 6.19.0 (BSD-3-Clause), pypdfium2 5.13.0 (BSD-3-Clause / Apache-2.0), pdfplumber 0.11.10 (MIT).

## Use

Open a `.py`, `requirements*.txt`, `pyproject.toml` or `environment.yml` file. Findings appear in the Problems panel with the replacement line in the message. Run **pypdf Migration: Check this file** from the command palette at any time. Comment lines are skipped.

## Free and team tiers

Free, no key: the full map for the open file, every finding with its replacement - and a Quick Fix (the light bulb)
that migrates the open file to pypdf when every PyMuPDF call in it has an exact pypdf equivalent
(`fitz.open` / `with fitz.open(...) as doc` -> `PdfReader`, pages, `len`, `load_page`, `get_text()` -> `extract_text()`).

Licence key, $29 once: **Fix all** - every migratable file in the workspace in one click, with a preview first,
the PyMuPDF dependency swapped to `pypdf>=6.19` only when every file that imports PyMuPDF was migrated, and a
dated record of each change. A file that uses PyMuPDF features without a one-to-one pypdf call (rendering,
search, tables, drawing) is left untouched and listed with what to use instead.
Licence key: whole-workspace migration plan (each use mapped to its replacement), a dated AGPL exposure report for the company and a CI gate that fails builds adding new PyMuPDF use.

This extension reads files locally and sends nothing anywhere. It is not legal advice; read your own licence terms with counsel.
