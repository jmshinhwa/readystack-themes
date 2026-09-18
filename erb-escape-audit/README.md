# ERB Escape Audit — Rails XSS lint

ERB escapes `<%= %>` by default. Every cross-site-scripting hole in a Rails view is therefore
a line where someone *turned the escaping off* — `raw`, `.html_safe`, `<%==` — or a line where
HTML escaping was never the right escaping: inside `<script>`, inside an `onclick=`, inside an
unquoted attribute, inside a `href` that the database supplies.

This extension reads `.erb` files and reports those lines. **15 rules**, each one naming the
helper that makes the line safe again.

## What it looks at

| Context | What is wrong | What it asks for |
|---|---|---|
| `<%= raw x %>` / `x.html_safe` / `<%== x %>` | escaping switched off | `<%= x %>`, or `sanitize(x, tags: …)` |
| `render inline:` | template injection, not just XSS | a real partial with locals |
| inside `<script>` | HTML escaping is the wrong escaping | `j(x)` / `json_escape(x.to_json)` |
| `href="<%= x %>"` | `javascript:` and `data:` survive HTML escaping | route helper, or a scheme allowlist |
| `onclick="<%= x %>"` | attribute is a JS context | data attribute + `addEventListener` |
| `src=<%= x %>` unquoted | value with a space can add `onerror=` | quote the attribute |
| `content_tag(…, false)` | the fourth argument is `escape` | leave it `true` |
| `sanitize(x)` with no `tags:` | allowlist is whatever the Rails release ships | state the allowlist |
| `simple_format(…, sanitize: false)` | keeps every tag in the text | drop the option |
| `<style>` interpolation | CSS context | inline style or a custom property |
| `unsafe-inline` in a CSP meta tag | removes the last line of defence | a nonce |

## Why it matters on a date, not "eventually"

Since **11 September 2026** the EU Cyber Resilience Act (Regulation (EU) 2024/2847) makes an
*actively exploited* vulnerability in a product with digital elements a reporting event:
an early warning within **24 hours**, a full notification within **72 hours**, and a final
report within **14 days**. A stored XSS in a customer-facing view is exactly that kind of
finding, and the clock starts when someone else notices it, not when you do.

## Free and paid

* **Free — one file, finished.** Open a `.erb` file, run *Check this file* from the command palette.
  Every finding, with its line number, severity and the helper that fixes it. No key, no
  watermark, no capped count, no "3 checks left".
* **Paid ($29 once) — the whole workspace, and a report you keep.** *Sweep workspace* walks
  every `.erb` file in the project and writes a dated Markdown/CSV report — the artefact you
  attach to a release note, a pull request, or a vulnerability-handling record. One licence
  key per person or CI seat. 7-day full refund.

The axis is scope and ownership. The free tier finishes the job it starts.

## Measured on the fixtures shipped with this extension

`_fixtures/dirty.erb` is 32 lines of a plausible product page: **15 findings** —
4 critical, 7 high, 4 medium. `_fixtures/clean.erb` is the same page written with
`sanitize(tags:)`, route helpers, `j()`, `json_escape` and a CSP nonce: **0 findings**.

## Yardstick

A freelance Rails developer doing the same template review by hand bills **$75–$150 an hour**
on the open market.

## Also available as a web page

The same engine, same 15 rules, runs in the browser with nothing to install:
<https://getreadystack.com/tools/erb-escape-audit>

## Commands

* **ERB Escape Audit - Rails XSS lint: Check this file** — free.
* **ERB Escape Audit - Rails XSS lint: Sweep workspace and write report (licence)** — licensed.
* **ERB Escape Audit - Rails XSS lint: Enter licence key**

## Licence

See `LICENSE.txt`.
