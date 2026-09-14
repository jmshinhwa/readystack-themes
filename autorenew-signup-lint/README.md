# Auto-Renewal Signup Lint (California ARL)

![Auto-Renewal Signup Lint (California ARL)](https://getreadystack.com/img/promo/sku48727_result_card.jpg)

Your subscription signup page is a legal document that happens to be written in HTML. Since
**1 January 2026**, California's Automatic Renewal Law — Cal. Bus. & Prof. Code 17600–17606, as
amended by **AB 2863** — sets out what that page has to say, where it has to say it, and how the
customer has to agree to it. This extension reads the page the way the statute does: **16 checks**
over the markup you actually ship.

Point it at `signup.html`, `pricing.jsx`, `Plans.vue`, `billing.svelte` — any file that offers a plan
that renews — and it answers in the Problems panel, line by line.

## What it looks for

- The renewal term itself: does the page ever say the plan keeps renewing **until the customer cancels**?
- A recurring amount **with its frequency** ($29 per month), not a bare number.
- **Affirmative** consent: a box that arrives pre-ticked is not consent, and `defaultChecked` counts.
- **Separate** consent: one control that swallows the terms of service, the privacy policy and the
  auto-renewal offer in a single tick is the single most common finding in real code.
- A cancellation path that exists, is online, and does not route the customer to a phone number.
- Free trials: the price that lands **after** the trial, and the notice before it converts.
- Introductory rates that never name the regular rate that follows.
- Annual terms with no yearly reminder (AB 2863 asks for one, 15–45 days before the renewal date).
- Proof of consent: does anything on the page record **what was shown and when** it was accepted?
- Retention mazes in front of the cancel control.
- Distance: the submit control sitting a dozen lines away from any statement of the terms — the law
  wants them in visual proximity to the request for consent.
- Pages still leaning on the FTC "click-to-cancel" Negative Option Rule, which the Eighth Circuit
  **vacated on 8 July 2025**. This is the one an AI assistant gets wrong most often: it will happily
  cite a rule that binds nobody while missing the California statute that binds you.

## Two commands

| Command | What happens |
| --- | --- |
| `Auto-Renewal Lint: Check this file` | The open file, all 16 checks, findings in Problems and in the output channel. Free, always, no key. |
| `Auto-Renewal Lint: Sweep workspace and write report (licence)` | Every matching page in the workspace, one dated `autoRenewLint-report.md` written into the folder, yours to keep and attach to a review. |

The free check is the whole job for one page. The sweep is a different job — every page, and a file
you own afterwards.

## Reading a finding

Run it on the two fixtures shipped with the source. The clean page returns one informational line
(the statute is in force, here is the date). The deliberately broken one returns **15 findings —
8 errors, 5 warnings, 2 notes** — on a 29-line page: a pre-ticked bundled consent box, a trial with
no post-trial price, "to cancel, contact support", an annual term with no reminder, and a comment
claiming the page is compliant with the vacated federal rule.

## What this is not

It is a linter, not a lawyer. It reads markup and reports the shape of the disclosure; it cannot know
your billing timeline, which state your customer is in, or what your terms page says. For scale: an
hour of US outside counsel on a signup flow is commonly quoted at $300–$500, and that hour is still
worth buying — this runs before you spend it, so the hour is spent on the hard questions rather than
on a pre-ticked box.

Remedy that makes it worth the ten minutes: goods or services billed under a non-conforming automatic
renewal offer are an **unconditional gift** to the customer under Cal. Bus. & Prof. Code 17603.

## Same engine in the browser

The free web version at <https://getreadystack.com/tools/autorenew-signup-lint> runs `engine.js` and
`rules.json` byte for byte — paste a page, get the same findings, nothing is uploaded.

Rules live in `rules.json`; the engine is 60 lines of plain JavaScript in `engine.js`. Read them,
disagree with them, tell us which line of statute we read wrong.
