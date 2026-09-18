# ERB Snippets + View Audit for Rails — 26 rules + 36 snippets

![ERB Snippets + View Audit for Rails](https://getreadystack.com/img/promo/sku11114_result_card.jpg)

Open a `.html.erb` view, run **ERB: Audit this view**, and the Output panel lists the
`raw`, `html_safe`, `params`, CSRF and Turbo problems a Rails security review sends back —
with the line number and the Rails-specific reason, not a generic "sanitise your input".

Offline. Nothing leaves the editor. No account.

**Try it before installing:** the same 26 rules run in the browser at the free web audit —
paste one view, get the findings.

---

## Free — no key, no limit

| Command | What it does |
| --- | --- |
| **ERB: Audit this view** | Audits the whole open view. Every finding, every time. |
| **ERB: Audit the selected lines** | Same check, scoped to the lines you highlighted. |
| **ERB: Insert a snippet** | Pick from 36 ERB snippets and drop it at the cursor. |
| **ERB: Show all rules and snippets** | Prints all 26 rules and all 36 snippet names. |

The free tier is not a demo. One view is audited **to the end**, with the same rules the paid
commands use — there is no watermark, no trial count and no locked answer.

## What the 26 rules catch

- **Escaping** — `raw`, `.html_safe`, `<%==`, `<%= params[...] %>`, `session`/`cookies` in markup,
  `ENV[...]`, `Rails.application.credentials`, `debug(...)`, `<%= @model %>`, `_html` translation keys
- **CSRF and forms** — a hand-written `<form>` with no authenticity token, `form_for`/`form_tag`,
  `local: true` under Turbo
- **Content-Security-Policy** — inline `onclick=`/`onchange=` built from ERB, ERB inside `style=`,
  `href="javascript:"`, third-party `javascript_include_tag` with no integrity hash
- **Rails correctness** — `Time.now` instead of `Time.current`, a query (`.where`, `.all`, `.find_by`)
  running inside the view, `to_json` escaped into `&quot;`, `url_for(params)` open redirect,
  `target: "_blank"` with no `rel: noopener`, `image_tag` with no `alt:`

Add your own with the `extraRules` setting; they run alongside the 26 that ship inside.

## With a licence — $29

The cut is **scale**, not features held back:

- **Every view in `app/views`, not only the one on screen** — `ERB: Audit every view in the workspace`
  walks the repo (honours `max_files` and `exclude_glob`) and reports every file in one list.
- **Rewrite the flagged line in place** — `ERB: Fix this line` replaces the matched text where the rule
  carries a safe replacement. Four of the 26 do: `<%= raw` → `<%= sanitize`, `<%==` → `<%=`,
  `Time.now` → `Time.current`, `<%-` → `<%`. Everything else is reported for a human edit, because a
  rewrite that guesses is worse than a rewrite that does not happen.
- **A findings file to attach to the pull request** — `ERB: Export the findings` writes CSV, JSON or
  HTML into the workspace folder (set `report_format` to skip the prompt).

One payment, one machine, no subscription. **7-day refund, no questions asked.**

**[Get a licence — $29](https://buy.polar.sh/polar_cl_HaD7JBRbjXRom3teYfngHxChxktOPKNtnKb6H0Vp7Cp)** · paste the key when the editor asks for it.

### What it replaces

A senior Rails contractor bills **$80–$140 an hour** in 2026; a scoped web-application penetration test
starts around **$5,000**. Neither runs on the view you are editing right now.

## Install

```
ext install erb-rails-view-snippets-audit
```

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `report_format` | `html` | Format for the exported report. Set it and the export stops asking. |
| `max_files` | `400` | Most files a workspace audit will open. |
| `exclude_glob` | `{node_modules,tmp,vendor,public,coverage}/**` | Paths the workspace audit skips. |
| `extraRules` | `[]` | Your own rules — `{ "pattern": "...", "flags": "i", "message": "..." }`. |
