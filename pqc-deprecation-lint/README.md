# PQC Deprecation Lint — RSA/ECC after 2030

![PQC Deprecation Lint — RSA/ECC after 2030](https://getreadystack.com/img/promo/sku51073_result_card.jpg)

Your AI assistant writes `rsa.generate_private_key(key_size=2048)` and it passes review, because
it *is* correct code. It is also on a clock. NIST IR 8547 puts RSA-2048, ECDSA, EdDSA and
finite-field Diffie-Hellman in the **deprecated after 2030-12-31, disallowed after 2035-12-31**
bucket, and FIPS 203 / 204 / 205 (ML-KEM, ML-DSA, SLH-DSA) were published on 2024-08-13 — the
replacements already exist. This extension reads the file you have open and tells you, per line,
which clock each algorithm is on and where that clock stands on a date you choose.

It also catches the part that is not a 2030 problem at all. In the 51-line sample file shipped
with this extension, **23 findings** come back on 2026-09-13, and **7 of them are errors on 6
lines** — RSA-1024, SHA-1 in a signature, PKCS#1 v1.5 padding, MD5, `ssh-rsa`, and 3DES are
disallowed *today*, before anyone mentions a quantum computer.

## What it checks — 17 rules

| Area | Checks |
| --- | --- |
| Public key | RSA key generation, RSA under 2048 bits, ECDSA / P-256 / P-384, classical ECDH and X25519, finite-field DH, DSA, EdDSA |
| Transport | TLS group lists with no hybrid, SSH `KexAlgorithms` with no PQ method, `ssh-rsa` host keys |
| Legacy | SHA-1 in signatures, 3DES, MD5, AES-128 for long-lived data, RSA PKCS#1 v1.5 |
| Agility | A file that uses quantum-vulnerable crypto and names no post-quantum replacement anywhere |

Each finding carries the line number, the standard it comes from (NIST IR 8547, SP 800-131A
Rev. 2, FIPS 186-5, FIPS 203/204/205, NSA CNSA 2.0), and the concrete replacement — not "consider
migrating", but `X25519MLKEM768`, `mlkem768x25519-sha256`, ML-DSA-65.

## The date is an input, not a decoration

Set the date and the answer changes, because the standard changes. On the sample file:

- **2026-09-13** — 23 findings, 7 errors. RSA key generation reads *"deprecated after 2030-12-31 — 1570 days from 2026-09-13"*.
- **2031-03-01** — 23 findings, 20 errors. The same line now reads *"deprecated since 2030-12-31, disallowed after 2035-12-31"*.
- **2036-01-15** — *"disallowed since 2035-12-31 — not a plan any more, a finding"*.

That is the number you actually need in a migration plan: not "RSA is bad", but how many working
days are left before the algorithm in front of you stops being acceptable.

## Commands

- **PQC Lint: Check this file** — free, unlimited, any use.
- **PQC Lint: Sweep workspace and write report (licence)** — walks every matching file and writes `pqcLint-report.md` next to your project.
- **PQC Lint: Enter licence key**

## Free and paid

Free finishes a job on its own: open a file, run the check, see every quantum-vulnerable
algorithm in it with line numbers and dates. There is no watermark, no trial counter and no
withheld answer.

The paid part is a different axis — **scope and ownership**. The workspace sweep crosses every
file at once and writes a dated report *file* you keep: the artifact you paste into a customer
security questionnaire, attach to a migration ticket, or diff next quarter. $29 once, one licence
key per person or CI seat, 7-day full refund.
[Get the full version](https://buy.polar.sh/polar_cl_Q0a5F9WB3Ub2fTRsFv8TePDwMQjmT1GtVgVGl3H6oee)

**Yardstick:** a security consultant doing the same cryptographic inventory by hand bills
$150–$250 an hour, and the first pass over one repository is a day.

## Free web version

The same engine, byte for byte, runs in your browser with nothing uploaded:
<https://getreadystack.com/tools/pqc-deprecation-lint>

## Notes

Results are advisory and are not legal or certification advice. The rule set is regex-based and
deliberately noisy on the side of showing you the line: a linter that silently skips your
`hashlib.md5` cache key is worse than one that asks you to label it.
