# Accessibility Statement Lint (EU model)

![Accessibility Statement Lint (EU model)](https://getreadystack.com/img/promo/sku85572_result_card.jpg)

An accessibility statement is a public legal document. Under Directive (EU) 2016/2102 every
public sector website in the EU must publish one, and the Commission's model statement fixes
what has to be in it: a commitment sentence, the legal basis, a scope, exactly one compliance
status, a list of non-accessible content sorted into three reason categories, a date of
preparation with the method used, a date of last review, a feedback channel and an
enforcement procedure. Directive (EU) 2019/882, the European Accessibility Act, pushed the
same habit onto private-sector services.

Monitoring bodies sample published statements. They do not read your code first — they read
this page, and the fastest thing to check on it is a date.

This extension reads the statement file you already published and reports what the model
statement asks for and your file does not have.

## What it checks

19 checks run over the open file:

- the commitment sentence, the legal basis, and the scope of the statement
- the compliance status wording, and whether two different statuses appear in one file
- whether EN 301 549 is named, and whether the cited version is older than V3.2.1, the
  version listed in the Official Journal for the Web Accessibility Directive
- whether a partially or not compliant status is backed by a Non-accessible content section,
  and whether that section sorts its items into the three reason categories the model uses
- whether a disproportionate burden claim carries an assessment behind it and offers an
  accessible alternative, as Article 5 requires
- the date of preparation, the method used, and whether the date is in the future
- the date of last review, and whether it is more than 12 months old
- the feedback channel and the enforcement procedure
- template placeholders that were never filled in

## Measured on the two files in this repository

`_fixtures/clean.md` is a complete statement for a fictional municipality: 0 findings.
`_fixtures/dirty.md` is the kind of statement a chat assistant produces when asked for one:
8 findings, 7 of them high severity. Among them, two compliance statuses in one file, an
unfilled `[insert your organisation name]` placeholder, a disproportionate burden claim with
neither an assessment nor an alternative, and a last review date 30 months old.

## How to run it

Open a statement file and run **Accessibility Statement: Check This File** from the command
palette. Findings appear in the Problems panel on the line they belong to.

## Free and paid

Checking the file open in the editor is free and finishes the job for a single statement.
The licensed version sweeps every locale and sub-site statement in the workspace at once and
writes a dated report with a per-file verdict.

## Yardstick

A consultant charges $150-$250 an hour to review one statement; a full agency accessibility
audit starts around $2,500.

## More

Reference and the free browser version: https://getreadystack.com/tools/accessibility-statement-lint
