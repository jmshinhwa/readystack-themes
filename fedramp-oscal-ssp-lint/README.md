# FedRAMP OSCAL SSP Lint

![FedRAMP OSCAL SSP Lint](https://getreadystack.com/img/promo/sku93333_result_card.jpg)

An OSCAL system security plan is machine-read before a human ever opens it. If the JSON breaks the
OSCAL datatypes or drops a required assembly, the package comes back to you instead of going
forward — and the note you get back is a schema path, not a sentence.

This extension reads a `system-security-plan` JSON file in your editor and tells you, line by line,
what a validator will object to and what to write instead. It runs entirely on your machine: the
document never leaves the workspace.

## What it checks — 16 rules

**Shape of the document**
- the root key is `system-security-plan`
- the five required assemblies are present: `metadata`, `import-profile`, `system-characteristics`,
  `system-implementation`, `control-implementation`
- `metadata` carries `title`, `last-modified`, `version` and `oscal-version`
- the file parses as JSON at all

**Datatypes an SSP generator gets wrong**
- `last-modified` and `published` must be dateTime **with a timezone offset** — `2026-09-17T09:00:00`
  is rejected, `2026-09-17T09:00:00-04:00` is accepted
- every `uuid` must be an RFC 4122 **version 4 or 5** UUID; hand-written ids such as `ssp-0001` or
  `info-type-1` are not UUIDs, and a sequential id with a `1` in the version nibble is not one either
- every `component-uuid` and every entry in `party-uuids` must resolve to a `uuid` defined somewhere
  in the same document — dangling references are the quietest defect in a package
- `control-id` is OSCAL lower-dotted: `ac-2.1`, never `AC-2(1)` copied out of the control catalogue

**FIPS 199 and the control narratives**
- `security-sensitivity-level` is one of `fips-199-low` / `fips-199-moderate` / `fips-199-high`
- `security-impact-level` carries all three objectives — confidentiality, integrity, availability —
  each from the same vocabulary
- each `implemented-requirement` carries an `implementation-status` prop with one of the five
  permitted values
- a control marked `planned` carries a `planned-completion-date`, and that date has not already passed
- `TBD`, `TODO`, `Lorem ipsum`, `XXX` and `<insert` do not survive in a `description` or `remarks`
  a reviewer reads

**The clock**
- `metadata.last-modified` more than 365 days before the date you are checking as. Continuous
  monitoring expects the plan to be re-stamped every year, and the file tells you how many days late
  it already is.

## Measured on the bundled fixtures

`_fixtures/clean.json` is a clean FedRAMP Moderate SSP skeleton: **0 findings**.
`_fixtures/dirty.json` is the same plan after a generator touched it: **19 findings across 14 of the
16 checks** — 12 high, 6 medium, 1 low. Among them: `last-modified` 503 days stale as of
2026-09-17, and `cp-9` still marked `planned` with a completion date that passed 79 days earlier.
Change the "as of" date and those two numbers change with it.

## Free and paid

Free, no key: **one OSCAL system security plan JSON, all 16 checks, every defect with its JSON path
and the fix.** That job finishes — you can ship the file.

The licensed part is a different axis, scope and hand-off: it sweeps **every** OSCAL file in the
workspace (SSP, component definitions, profiles), resolves uuid references *across* files instead of
within one, and writes a dated report you can hand to your 3PAO.
Full version: <https://buy.polar.sh/polar_cl_SxOM1H5OfW5QyRWyTfWSQebO53c3qNWtk5YfG04i69q> — $29 once, one licence key per person or CI seat,
7-day full refund. Hand-review by a FedRAMP advisory consultant runs $150 to $300 an hour.

## Also in the browser

The same engine, same rule file, runs as a single page with nothing to install:
<https://getreadystack.com/tools/fedramp-oscal-ssp-lint>

## Commands

- **FedRAMP OSCAL SSP: Check this file** — lints the active editor
- **FedRAMP OSCAL SSP: Check the workspace** — the licensed sweep

Not affiliated with FedRAMP, GSA or NIST. OSCAL is a NIST project; this tool reads the format, it
does not speak for the programme.
