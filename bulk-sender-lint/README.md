# Bulk Sender Lint

Twenty-one checks over the things Gmail, Yahoo and Microsoft Outlook.com ask of bulk senders,
run against the files where those things are actually configured: your mailer code, your DNS
records, your unsubscribe route.

## What it reads

Open any file that sets up or sends mail — `mailer.js`, `dns.tf`, a zone file, a Python
`smtplib` module, a raw `.eml` — and run **Bulk Sender Lint: Check this file**. Each finding
carries the rule, the line, the specification clause it comes from, and the date the
requirement took effect, counted from the date you run it.

## The 21 checks

**Authentication (13)** — SPF missing; SPF ending in `?all` or `+all`; more than 10 DNS
lookups in the SPF record (RFC 7208 §4.6.4 PermError); two `v=spf1` records on one name;
DMARC missing; `p=none`; no `rua=`; `pct=` below 100; `sp=none`; DKIM missing; a DKIM key
short enough to be 1024-bit; DKIM `t=y` test mode; BIMI published while DMARC is unenforced.

**Unsubscribe (6)** — no `List-Unsubscribe` on a sending path; `List-Unsubscribe` without
`List-Unsubscribe-Post`; a `List-Unsubscribe-Post` value that is not exactly
`List-Unsubscribe=One-Click`; a `mailto:`-only header, which one-click cannot use; an
unsubscribe route that answers GET but not POST; an unsubscribe route behind a login.

**Transport and identity (2)** — `secure: false`, `ignoreTLS`, `rejectUnauthorized: false`
or port 25; a consumer mailbox domain (`gmail.com`, `yahoo.com`, `outlook.com`, `hotmail.com`,
`aol.com`) in `From` on a bulk path.

## Dates the checks carry

Google and Yahoo's bulk sender requirements have been in force since **2024-02-01** for
senders above 5,000 messages a day to their users, counted per From domain. Microsoft
Outlook.com began enforcing the same authentication set on **2025-05-05**; non-compliant bulk
mail is routed to Junk. The RFC clauses (7208, 6376, 7489, 8058) are cited per finding.

## Free and paid

Free: check the file you have open — all 21 checks, every finding, with the clause and the
line. That is the whole check for one file and it does not ask for anything.

Paid: **Bulk Sender Lint: Sweep workspace and write report** walks every matching file in the
workspace and writes a dated `bulkSender-report.md` you keep — the evidence artefact for a
deliverability review or a client handover. $29 once, one licence key per person or team seat,
7-day full refund. Yardstick: a deliverability consultant bills $150–$250 an hour.

Licence key: https://buy.polar.sh/polar_cl_wVUwTqi8qqkeHlhoZHE3VCSgjwBGHxsQL9rYt24DtQP

## Measured on the bundled fixtures

`_fixtures/dirty.js` is a 42,000-recipient nightly digest module: **15 findings — 10 errors and
5 warnings — out of 21 checks**. `_fixtures/clean.js` is the same file after the fixes:
**0 findings**.

## Free web check

The same engine, byte for byte, runs in the browser with nothing uploaded:
https://getreadystack.com/tools/bulk-sender-lint

Findings are advisory. They do not replace your own reading of the sender guidelines.
