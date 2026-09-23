# Biometric Consent Audit

![Biometric Consent Audit (BIPA / CUBI / CO)](https://getreadystack.com/img/promo/sku175316_result_card.jpg)

Static audit for code that captures a face, a fingerprint, an iris or a voiceprint. It reads one
file at a time and reports the lines that a biometric-privacy statute reaches: the missing written
release, the missing destruction schedule, retention past the three-year cap, the template that
leaves the process, and the three biometric uses the EU AI Act prohibits outright.

The 2026 question a reviewer actually asks about generated code is "does this obey the statute",
not "does this lint". A formatter cannot answer it, because none of this is a style question.

## What it checks (14 rules)

| Area | Rule | Authority |
|---|---|---|
| Consent | capture_without_consent, consent_after_capture | 740 ILCS 14/15(b) |
| Schedule | missing_destruction_schedule, missing_public_policy_link | 740 ILCS 14/15(a) |
| Retention | retention_over_bipa_cap (1095 days), retention_over_cubi_year (365 days), destruction_window_elapsed | 740 ILCS 14/15(a), Tex. Bus. & Com. Code 503.001(c-2) |
| Storage | template_stored_unencrypted | 740 ILCS 14/15(e) |
| Disclosure | template_sent_third_party, profit_from_biometrics | 740 ILCS 14/15(d), (c) |
| Prohibited uses | emotion_inference, sensitive_categorisation, untargeted_face_scraping | EU AI Act Art. 5(1)(f), (g), (e) |
| Employment | employee_biometric_no_notice | Colorado HB24-1130, in force 1 July 2025 |

Each finding prints the line number, the rule name and the subsection, so the output can be pasted
straight into a review thread.

## Measured on the shipped fixtures

`_fixtures/dirty.py` is 45 lines of a face-login enrolment service that already has a consent gate.
The audit returns 6 findings on it: one retention overrun (1460 declared, 365 days over the 1095-day
limit), one unencrypted template write, one template sent to a vendor endpoint, and the three
prohibited uses. `_fixtures/clean.py` is the same service after the fixes and returns 0 findings.

The retention rules are arithmetic, not pattern matching: `RETENTION_DAYS = 1460` reports how many
days it is over each limit, and `destruction_window_elapsed` compares a hardcoded enrolment date
with the audit date, so the same file can pass this year and fail next year.

## Scale

The audit date is a setting, so a file can be re-audited as of any date.
A commercial audit that reaches the same subsections is billed by the hour: US privacy counsel
charges roughly $400-$600 an hour for a pre-launch review of biometric code.

## Free and full

Free, no key: audit the file you have open, with every finding and subsection.
Full version: scan the whole workspace and export a dated evidence report (Markdown + CSV) per file
and per statute subsection - <https://buy.polar.sh/polar_cl_ymzWuO9GRzRMb8YULAoIhzs4TnxmfVlQxtxEI0ax9oq>

Hub page: <https://getreadystack.com/tools/biometric-consent-audit>

## Not legal advice

The rules cite the statutory text they implement. Whether a given system is in scope, and what a
given deployment owes, is a question for counsel.
