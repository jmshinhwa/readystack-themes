# COPPA 2026 Notice Lint

![COPPA 2026 Notice Lint](https://getreadystack.com/img/promo/sku64758_result_card.jpg)

A children's privacy notice is a legal document that lives in a repository as `PRIVACY.md`, as a
page in a docs site, or as an HTML file served next to the app. This extension reads that file the
way the FTC reads it: clause by clause, against the amended COPPA Rule that became fully
enforceable on **22 April 2026**.

![18 checks against the amended COPPA Rule](https://getreadystack.com/tools/coppa-notice-lint-2026/demo.gif)

Open a notice, run **COPPA Notice Lint: Check this file**, and every clause the Rule adds or
changes is listed with the line it belongs on and the section of 16 CFR Part 312 it comes from.

## What the 18 checks look for

| | Check | Clause |
|---|---|---|
| CN01–CN03 | Operator e-mail, postal address and telephone, all three present | 312.4(d)(1) |
| CN04 | Whether other operators also collect through the service, or that none do | 312.4(d)(1) |
| CN05 | Information collected directly from the child vs. collected passively | 312.4(d)(2) |
| CN06 | Third parties named by identity **or** by category and purpose | 312.4(d)(3) |
| CN07 | The separate-consent sentence: a parent may allow collection and use without allowing disclosure | 312.5(a)(2) |
| CN08–CN11 | A written retention policy, with a timeframe, a deletion commitment, and no indefinite retention | 312.10 |
| CN12 | All three parental rights — review, delete, refuse further collection — plus the procedure | 312.4(d)(4) |
| CN13 | Persistent identifiers, cookies or analytics tied to support for the internal operations | 312.5(c)(7) |
| CN14 | The no-conditioning statement | 312.7 |
| CN15 | The under-13 threshold, not 16 and not 18 | 312.2 |
| CN16 | Any compliance date quoted for the amended Rule matches 22 April 2026 | amended Rule |
| CN17 | School-authorisation limits wherever a classroom context is described | 312.5(c)(10) |
| CN18 | The revision date of the notice itself, against 22 April 2026 and against today | — |

CN18 is the reason the check takes a date: a notice last revised before 22 April 2026 cannot
contain the clauses the amended Rule added, and a notice more than 365 days old is flagged as
overdue for review.

## What it does on the two files shipped with it

`_fixtures/clean.md` is a notice written for the amended Rule: **0 findings**.
`_fixtures/dirty.md` is the kind of kids' policy a general-purpose chatbot still writes — it is
dated 2024, it says "under 16", it shares with "third parties", and it retains data "indefinitely":
**16 findings, 13 errors and 3 warnings**, out of the same 18 checks.

## Free and paid

Free, with no key and no account: checking the notice open in your editor against all 18 clauses,
and the same 18 clauses in the browser at
<https://getreadystack.com/tools/coppa-notice-lint-2026>. That is the whole job for one file.

Paid ($29 once, one key per person or CI seat, 7-day full refund): sweeping every `.md`, `.mdx`,
`.html` and `.txt` in the workspace — app notice, web notice, school notice, the translated
copies — and writing `coppaNotice-report.md`, a dated file you keep, hand to counsel, or commit.
The first sweep starts a 7-day trial so you see the report before the key is asked for. Licence:
<https://buy.polar.sh/polar_cl_wQKx0P8uMksFUK1UmWN0Eq0cVxQNxuPlCLzaw3eXDlW>

For scale: outside privacy counsel reviewing one children's notice bills 6–10 hours at $350–$550
an hour.

## Notes

The engine is one file, `engine.js`, with the rules in `engine.js`'s sibling `rules.json`. The
same bytes run in the browser page above, so a finding you see here is the finding you see there.
Nothing is uploaded and the extension makes no network call except licence validation.

Findings are advisory and are not legal advice.
