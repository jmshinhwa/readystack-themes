# GNU Linker Map + 7 Formats — Audit & Snippets

Your editor shows all eight of these as grey text, so nothing warns you. 30 checks and 25 snippets run on the file you have open, offline — the open `if true` rule, the corrupt HEX record, the float printf pulled into flash.

## What it does for free

- Audit the open file against all 30 rules, with line numbers
- Audit only the lines you selected
- Insert any of the 25 snippets at the cursor
- List all 30 rules and 25 snippets that ship inside

## With a licence

- **Audit the whole workspace** — Opens every file in the workspace and runs the same check on each.
- **Export the findings as a file** — Asks CSV / JSON / HTML, then writes that file into the workspace folder.
- **Apply the suggested fix** — Replaces the offending lines in the editor with the suggested text.

## Install

```
ext install linker-map-format-audit
```
