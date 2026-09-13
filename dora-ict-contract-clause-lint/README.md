# DORA Art. 30 ICT Contract Clause Lint

![DORA Art. 30 ICT Contract Clause Lint](https://getreadystack.com/img/promo/sku47005_result_card.jpg)

Your ICT vendor contracts are text files in a repository. This extension reads them like code and tells you which clauses Regulation (EU) 2022/2554 (DORA) requires and your contract does not have.

DORA has applied since **17 January 2025** — 603 days as of 12 September 2026 — and supervisory reviews of ICT third-party arrangements are running through Q4 2026. Article 30 is the article that gets quoted back at you: it lists **15 mandatory contractual provisions** — 9 in Article 30(2) for every ICT contract, and 6 more in Article 30(3) for services supporting a critical or important function.

## What it checks

**22 rules**, each mapped to its article:

| Article | Clause |
|---|---|
| 30(2)(a) | Clear and complete description of functions and ICT services; conditions for subcontracting |
| 30(2)(b) | Regions and countries where services are performed and data is processed and stored, plus notice of change |
| 30(2)(c) | Availability, authenticity, integrity and confidentiality of data |
| 30(2)(d) | Access, recovery and return of data on insolvency, resolution or discontinuation |
| 30(2)(e) | Service level descriptions, including updates and revisions |
| 30(2)(f) | Incident assistance at no additional cost, or at a cost determined ex-ante |
| 30(2)(g) | Full cooperation with competent and resolution authorities |
| 30(2)(h) | Termination rights and minimum notice periods |
| 30(2)(i) | Participation in ICT security awareness programmes and resilience training |
| 30(3)(a) | Quantitative and qualitative performance targets |
| 30(3)(b) | Notice periods and reporting of developments with a material impact |
| 30(3)(c) | Business contingency plans, ICT security measures, tools and policies |
| 30(3)(d) | Participation in threat-led penetration testing (TLPT) |
| 30(3)(e) | Unrestricted rights of access, inspection and audit |
| 30(3)(f) | Exit strategy with a mandatory adequate transition period |
| 30(1) | Written form, one single written document |
| 28(7) | Grounds for termination |
| 29 | Conditions for subcontracting of a critical or important function |

Four more rules catch the wording that reads compliant and is not: an audit right capped at one inspection per calendar year, incident support billed at time and materials or then-current rates, data hosted "at any location worldwide", and changes of location or subcontractor made without notice.

The sample master services agreement shipped in `_fixtures/dirty.md` fails **7** of the 22. `_fixtures/clean.md` returns none.

## Why a rule file and not a chatbot

A general assistant paraphrases Article 30 differently on every prompt, and it cannot run over every contract in a repository on each commit. Here the rules live in `ext/rules.json`, in plain view — a reviewer can read them, a supervisor can be shown them, and the same contract always produces the same findings.

## Yardstick

Outside counsel reading one ICT contract against Article 30 takes two to four hours at roughly €300 an hour for EU financial-regulatory work; a portfolio of thirty vendor contracts becomes a multi-week engagement.

## Free and full

Free, with no key: open one contract, run **DORA: Lint ICT contract**, and every missing clause is named with its article and the wording to add. That job finishes.

Full version — the next job, a different axis: one pass over **every** contract in the repository, and an exported per-vendor, per-clause evidence table you keep for the register of information and the Q4 file. $29 once, one licence key per person or team seat, seven-day full refund.

[Full version](https://buy.polar.sh/polar_cl_PyS5jRrYO7Qg2eYCctURo3heBw7Z5sPLx4UrE49Ms6L) · Hub: https://getreadystack.com/tools/dora-ict-contract-clause-lint

## Not legal advice

The rules follow the text of Regulation (EU) 2022/2554. A finding is a drafting gap to review with your counsel, not an opinion on your arrangement.
