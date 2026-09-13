# Email Footer Law Lint (CAN-SPAM · CASL · DDG)

![Email Footer Law Lint](https://getreadystack.com/img/promo/sku40591_result_card.jpg)

Fourteen checks on the part of an HTML email nobody re-reads: the footer.

The body of a campaign gets proofread by four people. The footer is copied from the last
template, and the last template was copied from the one before it. That is how a repealed
statute, a placeholder address and a 30-day removal promise survive for years and ship on
every send.

## What it reads

Any `.html` email template — hand-written, exported from an ESP, or built by a framework.
It parses the markup, strips tags and comments, and reads the plain footer text plus every
`<a>` and `<img>` in it. Nothing leaves the machine.

## The fourteen checks

| Check | What trips it | Authority |
|---|---|---|
| `unsub_missing` | no opt-out link anywhere | 15 U.S.C. 7704(a)(3); CASL s.11(1) |
| `unsub_dead_href` | opt-out `href` is `#`, empty or `javascript:` | 15 U.S.C. 7704(a)(3)(A) |
| `unsub_behind_login` | opt-out lands on `/login`, `/account`, `/dashboard` | 16 CFR 316.5 |
| `unsub_fee_or_data` | opt-out asks for an account number, a fee, more data | 16 CFR 316.5 |
| `unsub_deadline_too_long` | footer promises longer than 10 business days | 15 U.S.C. 7704(a)(4)(A)(ii) |
| `unsub_window_under_60d` | link declared valid for fewer than 60 days | CASL S.C. 2010 c.23 s.11(1)(b) |
| `unsub_too_small` | opt-out under 10px, `display:none` or `visibility:hidden` | 16 CFR 316.5; CASL s.11(1) |
| `postal_address_missing` | no street address or registered PO Box | 15 U.S.C. 7704(a)(5)(A)(iii) |
| `postal_address_placeholder` | `[Your Company Address]`, `123 Main St`, `Musterstraße` | 15 U.S.C. 7704(a)(5)(A)(iii) |
| `tmg_5_outdated` | provider line still cites the TMG | DDG 5 — TMG repealed 2024-05-14 |
| `de_imprint_incomplete` | German-facing, no Impressum link, no HRB or USt-IdNr | DDG 5 Abs. 1 Nr. 4 and Nr. 6 |
| `sender_identity_missing` | footer never names the legal entity | 7704(a)(5); CASL s.6(2)(a); DDG 5 Abs. 1 Nr. 1 |
| `tracking_pixel_unconsented` | 1×1 open pixel with no line on why the reader got this | ePrivacy Art. 5(3); EDPB Guidelines 2/2023 |
| `copyright_year_stale` | footer year older than the date you run it | read against `today` |

## The one that catches almost everybody

Germany repealed the Telemediengesetz on **2024-05-14**. The provider-identification duty
moved to **§ 5 DDG** (Digitale-Dienste-Gesetz). Every footer written before that date — and
every footer written since by an assistant trained before it — still says *§ 5 TMG*. The
check reports the citation, the repeal date, and the date you ran it.

## Free and paid

Free, no key, no account: **check the template open in your editor** against all fourteen
rules. Each finding carries the line, the statute and the fix, in the editor's Problems
panel and in an output channel. The same engine runs in the browser at the product page,
byte for byte, with nothing uploaded.

Paid: **sweep every template in the workspace and write one dated audit report file** —
every file, every finding, every citation, in one Markdown artefact you can hand to a client
or to counsel. That is the licensed command. Licence: https://buy.polar.sh/polar_cl_UpcPQkomm2d1N52PaYHHfPjdB89okIRPLaTa70CzAj0

Full workspace sweep and report: free for 7 days from your first sweep, then a licence key.

Yardstick: outside counsel reads one email footer against CAN-SPAM, CASL and § 5 DDG at
about $300 an hour, and reads it once.

## Commands

- `Email Footer Law Lint: Check this file` — free
- `Email Footer Law Lint: Sweep workspace and write report (licence)`
- `Email Footer Law Lint: Enter licence key`

## Notes

Results are advisory and are not legal advice. Rules are read from `rules.json`; the engine
is a single file with no dependencies and no network calls.

Product page: https://getreadystack.com/tools/email-footer-law-lint
