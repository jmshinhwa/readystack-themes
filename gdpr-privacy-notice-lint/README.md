# GDPR Privacy Notice Lint

Your repository has a `privacy.md`. An assistant wrote most of it, it reads well, and it is the
first document a supervisory authority asks for. This extension reads that file the way Articles 13
and 14 read it: as a list of disclosures that are either present or absent.

Open the notice, run **Privacy Notice Lint: Check this file**, and every missing disclosure appears
in the Problems panel on the line where it belongs.

## What it checks — 16 rules

| # | Rule | Article |
| --- | --- | --- |
| 1 | The controller is named as a legal entity | Art. 13(1)(a) |
| 2 | Contact details a person can write to | Art. 13(1)(a) |
| 3 | Data protection officer contact | Art. 13(1)(b) |
| 4 | Purposes of the processing | Art. 13(1)(c) |
| 5 | Legal basis for each purpose | Art. 13(1)(c) |
| 6 | Recipients or categories of recipients | Art. 13(1)(e) |
| 7 | Transfers to a third country | Art. 13(1)(f) |
| 8 | The Art. 46 safeguard for that transfer | Art. 46 |
| 9 | A retention period in real units | Art. 13(2)(a) |
| 10 | All six rights: access, rectification, erasure, restriction, portability, objection | Art. 13(2)(b), 15–21 |
| 11 | Right to withdraw consent | Art. 13(2)(c), 7(3) |
| 12 | Right to lodge a complaint with a supervisory authority | Art. 13(2)(d), 77 |
| 13 | Whether providing the data is a statutory or contractual requirement | Art. 13(2)(e) |
| 14 | Automated decision-making and profiling | Art. 13(2)(f), 22 |
| 15 | The notice carries a readable date, and is not older than 730 days | Art. 12(1) |
| 16 | No template placeholder survives in the published text | Art. 12(1) |

## What it finds in a real generated notice

The dirty fixture shipped in this repo (`_fixtures/dirty.md`) is an ordinary assistant-written
policy: fluent, complete-looking, 30 lines. The engine returns **17 findings — 11 errors and 6
warnings**. Five of the six data subject rights are never named. The retention section says "as long
as necessary" and gives no period. The notice was last updated on 3 March 2021, which the date rule
reports as 2020 days old. `[Your Company]` is still in the third paragraph.

The clean fixture (`_fixtures/clean.md`) returns 0 findings, so a green result means something.

## Why the assistant that wrote it cannot check it

Ask a chatbot to review the same file and it will rewrite the prose. It does not count the six
rights, it does not know today's date against the date in your header, and it will not tell you the
policy is missing an Art. 46 safeguard for the US mailbox provider you added last spring. This
engine is 16 deterministic rules with article numbers attached — the same answer twice, and a line
number you can click.

## Why it matters on a date

Transparency is not a soft obligation. Infringements of Articles 12 to 14 sit in the higher tier of
Art. 83(5): up to €20 million, or 4% of total worldwide annual turnover, whichever is higher. And
the clock is not yours: once a person asks about their data, Art. 12(3) gives you **one month** to
answer, counted from the day the mail arrives.

## Free and paid

Checking the notice open in your editor is free and always will be — all 16 rules, every finding,
no key, no limit on how many times you run it. The licensed command sweeps every notice in the
workspace in one pass and writes a dated evidence report you keep:
<https://buy.polar.sh/polar_cl_sHFWy5cMZEnka87rCDg3F8t1bTkKSKQZcbXaQ1qRwVS> — $29 once, one licence key per person or CI seat, 7-day full
refund. A law firm reviewing one notice bills at counsel's hourly rate, about €250 an hour.

## Also free in the browser

The same engine, the same 16 rules, one page, nothing uploaded:
<https://getreadystack.com/tools/gdpr-privacy-notice-lint>

## Yardstick

One notice, read by hand against Articles 13 and 14: roughly an hour of counsel's time at about
€250 an hour. This runs in about a second.

## Not legal advice

The rules encode what Articles 13, 14, 22, 46 and 77 require you to disclose. They cannot tell you
whether your legal basis is the right one. Use it as the checklist before the lawyer, not instead of.
