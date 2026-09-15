# Stale Standard Citation Lint

![Stale Standard Citation Lint](https://getreadystack.com/img/promo/sku63908_result_card.jpg)

Your security page still says ISO/IEC 27001:2013. That edition stopped being certifiable on 2025-10-31, and the person reading the page is a procurement reviewer, not a friend.

This extension reads a reStructuredText, Markdown or plain text document and reports every standard edition, framework version and legal instrument in it that has been superseded, withdrawn or repealed. Each finding carries three things: what you wrote, what replaces it, and the date the old one stopped being true — counted against the day you run the check, not against the day the rule was written.

## What it finds

44 rules, grouped:

- **ISO** — 27001:2013, 27002:2013, 27005:2011/2018, 9001:2008, 14001:2004, 22301:2012, 20000-1:2011, 31000:2009, 17025:2005, and any of those cited with no edition year at all.
- **NIST** — SP 800-53 Rev. 4 (withdrawn 2021-09-23), SP 800-171 Rev. 2, SP 800-63-3, Cybersecurity Framework 1.1 (superseded by CSF 2.0 on 2024-02-26), and special publications cited without a revision.
- **Payments and crypto** — PCI DSS 3.x and 4.0, FIPS 140-2, TLS 1.0/1.1, SSL 3.0, SHA-1, MD5, 3DES, RC4, RSA below 2048 bits.
- **EU and UK law** — Directive 95/46/EC, the Article 29 Working Party, Privacy Shield, Safe Harbor, the pre-2021 Standard Contractual Clauses, the NIS Directive, Regulation 910/2014 before the eIDAS 2 amendment, the withdrawn ePrivacy Regulation proposal, the Data Protection Act 1998.
- **Frameworks and hygiene** — OWASP Top 10 2017, ASVS 4.x, the 2016 Trust Services Criteria, EN 301 549 before V3.2.1, superseded Cyber Essentials question sets, Internet Explorer in a browser support matrix, a `:Date:` field older than 18 months, and a document with no date field at all.

## Why not grep

reStructuredText is hard-wrapped. In the sample page shipped with this extension, 3 of the 30 findings are citations that the wrapper split across a line break — `Article 29 Working\nParty`, `EU Data\nProtection Directive` — and a line-oriented search walks straight past them. This extension re-scans every line boundary and reports only matches that actually span it.

The other half is that grep does not know dates. `FIPS 140-2` is a string; that every remaining FIPS 140-2 certificate moves to the CMVP Historical List on 2026-09-21 is a fact with a clock on it, and the message changes wording the day it passes.

## Free and paid

Checking the document open in your editor is free and complete. All 44 rules, every finding, every replacement date, no licence key, no cap on runs. A file you check is a file you are done with.

The licence covers a different job, not a bigger helping of the same one: sweeping every `.rst`, `.md` and `.txt` in the workspace and writing a dated `STALE-CITATIONS.md` — file by file, finding by finding — that you can attach to a security questionnaire or hand to an auditor. $29 once, one licence key per person or team seat, 7-day full refund.

For comparison: GRC consultants bill $150-$300 an hour for documentation review, and one dense compliance page rarely takes under an hour.

## Commands

- `Stale Citations: Check This File` — the open document.
- `Stale Citations: Sweep Workspace and Write Report` — every matching file, into a dated report (licence).

## Run it without installing anything

The same engine, the same 44 rules, in a browser: <https://getreadystack.com/tools/stale-standard-citation-lint>

## Limits worth knowing

It matches citations as they are written. A standard referred to only by nickname ("the old ISO standard") is invisible to it. It does not read your certificate, so it cannot tell you whether your ISO/IEC 27001:2022 audit actually happened — only that the sentence in your docs describes an edition that still exists.
