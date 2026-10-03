# Flit Migration Check: setup.py to flit_core 4

![Flit Migration Check: setup.py to flit_core 4](https://getreadystack.com/img/promo/sku428290_result_card.jpg)

Open a `setup.py`, `setup.cfg` or `pyproject.toml` and this extension lists every line that still belongs to setuptools, Hatch, Poetry or the old Flit 3 layout, with its line number and the exact flit_core 4 line that replaces it. It runs offline, inside the editor, on your own file.

Free web version (same engine): https://getreadystack.com/tools/flit-migration-check

## Why now

- flit_core 4.0 (on PyPI 2026-08-04) no longer reads [tool.flit.metadata]. A package whose `[build-system]` asks for `flit_core >=3.2` with no `<4` pin and still keeps `[tool.flit.metadata]` now gets flit_core 4 from pip, and its sdist no longer builds.
- flit_core 4.1 (on PyPI 2026-09-16) accepts license expressions with WITH. A `license = "Apache-2.0 WITH LLVM-exception"` line needs `flit_core >=4.1,<5` in `requires`.
- `license = "MIT"` (an SPDX expression) needs `flit_core >=3.11`; `import-names` needs `flit_core >=4`.
- Flit builds pure Python only: "If your package needs a build step, you won't be able to use Flit". Compiled extensions (`ext_modules`, `Extension(`, `cythonize(`) and custom `cmdclass` are reported as BLOCKER lines: keep setuptools for those packages.
- Before you upload: PyPI rejects an upload file over 100.0 MiB by default, and it refuses invalid Trove classifiers and a name too close to an existing project.

## What you see

Each finding is one line of your file and one line of the target:

| Your line | flit_core 4 line |
|---|---|
| `install_requires=[...]` | `[project] dependencies = [...]` |
| `extras_require={...}` | `[project.optional-dependencies]` |
| `"console_scripts": [...]` | `[project.scripts] name = "pkg.cli:main"` |
| `data_files=[...]` | `[tool.flit.external-data] directory = "data"` |
| `python_requires=">=3.8"` | `requires-python = ">=3.8"` |
| `[tool.flit.metadata]` | `[project]`, or pin `flit_core >=2,<4` |
| `[project.entry-points.console_scripts]` | `[project.scripts]` |
| `dynamic = ["dependencies"]` | write the field out: Flit fills only version, description, import-names, import-namespaces |

On the bundled sample, the bundled sample setup.py gives 22 findings on 22 lines (10 warnings, 12 notes, 0 blockers). A finished flit_core 4 `pyproject.toml` gives 0 findings.

## Rules

38 rules across `setup.py`, `setup.cfg` and `pyproject.toml`. Every rule names its source page on flit.pypa.io (pyproject.toml config, Why use Flit?, Release history), read on 2026-09-30.

Yardstick: every replacement line is copied from the Flit 4.1.0 documentation, not guessed.

## Free and paid

- Free: the map for the open file, every finding, no limit.
- Workspace and team: every `setup.py`, `setup.cfg` and `pyproject.toml` in the workspace as one dated migration plan, plus a CI gate that fails a build adding new setuptools-only use. This part asks for a licence key: https://getreadystack.com/api/buy/cl/polar_cl_VI4ER6LWKbRiLZHzzqUpAK77hPReaZmifZSkj19xgaN

## Also searched as

flit, flit_core, hatch, hatchling, setuptools to flit, setup.py to pyproject.toml, twine upload checks.

## Limits

The checker reads text; it does not run `setup.py`. Values computed at run time (a version read from a file, a list built in a loop) are shown as the line that sets them, with the flit replacement to write by hand.
