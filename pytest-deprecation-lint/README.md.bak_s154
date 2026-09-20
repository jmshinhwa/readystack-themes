# Pytest Deprecation Lint (pytest 8 removals)

![Pytest Deprecation Lint (pytest 8 removals)](https://getreadystack.com/img/promo/sku72262_result_card.jpg)

Your CI installs `pytest` unpinned. One morning the runner picks up pytest 8, and the suite either
stops with `TypeError`, or — worse — goes green while whole test bodies never execute.

This extension reads the test files, `conftest.py` and config files you already have and marks the
lines that current pytest no longer runs the way they were written. Every finding carries the version
that removed the API and the replacement line.

## What it checks (19 rules)

**Removed outright — the run stops or the collection fails**

- `pytest.warns(None)` — removed in pytest 8.0
- nose-style `setup(self)` / `teardown(self)` methods — no longer called as of pytest 8.0
- `@pytest.yield_fixture` — removed in pytest 6.2
- `pytest.raises(..., message=...)` — removed in pytest 5.0
- the global `pytest.config` object — removed in pytest 5.0
- `Node.get_marker()`, the `pytest_funcarg__` prefix, the `pytest_namespace` hook — removed in pytest 4.0
- `--result-log` — removed in pytest 6.0

**Still runs, but not the way it reads — this is the quiet half**

- `[tool.pytest]` in `pyproject.toml`: pytest only reads `[tool.pytest.ini_options]`, so `addopts`,
  `markers`, `filterwarnings` and `testpaths` under the shorter table are ignored without a message.
- `[pytest]` in `setup.cfg` (the correct header is `[tool:pytest]`)
- `@pytest.mark.parametrize` on a `unittest.TestCase` subclass — pytest will not inject the arguments
- an `async def test_…` with no `asyncio` marker and no `asyncio_mode = "auto"` — skipped with a warning
- a redefined `event_loop` fixture — removed in pytest-asyncio 1.0, the override is ignored
- a mark stacked above `@pytest.fixture` — marks on fixtures have no effect
- `tmpdir`, `--strict`, `pytest.skip(msg=...)` — the deprecated spellings, with their replacements

## How it runs

Open a test file, `conftest.py`, `pytest.ini`, `pyproject.toml`, `setup.cfg` or `tox.ini` and run
**Pytest Deprecation Lint: Check this file** from the Command Palette. Findings appear in the
Problems panel on the exact line, with the fix in the message. No network call, no telemetry, no
account: the rule table ships inside the extension as `rules.json` and is the same file the web
version loads.

The same 19 rules run for free in the browser at
<https://getreadystack.com/tools/pytest-deprecation-lint> — paste a test file, get the same lines back.

## Free and paid

Free: linting the file you have open, end to end — every finding, every fix, no key.

Paid ($29 once): sweeping every test file, `conftest.py` and config file in the workspace in one
pass, and exporting the dated findings as Markdown or JSON you keep — the artefact you paste into a
CI job or a migration ticket. Get a key: https://buy.polar.sh/polar_cl_OR0dShZDbbiVxsy2XNVTaEV9nNVJY9nD92Tgf3TsG1F

Yardstick: a contract Python engineer reading the same suite by hand bills roughly $80–$120 an hour
in the US market, and the migration notes they would produce are what the export writes for you.

## Measured

On the 75-line example suite shipped in `_fixtures/dirty.py`, the rule table reports **12 findings on
11 lines — 7 of them errors** that pytest 8 refuses to run, and **0 findings** on the migrated copy in
`_fixtures/clean.py`.

## Licence

Commercial licence, see `LICENSE.txt`. 7-day full refund.
