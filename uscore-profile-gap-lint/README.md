# US Core Profile Gap Check (USCDI v3)

![US Core Profile Gap Check (USCDI v3)](https://getreadystack.com/img/promo/sku117700_result_card.jpg)

A resource that says `"profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|3.1.1"]` validates cleanly. It is a perfectly valid USCDI v1 resource. The validator has no opinion about whether USCDI v1 is still the floor.

A Patient profile pinned to 3.1.1 fails a USCDI v3 expectation, because it carries the USCDI v1 element set. Since **2026-01-01** the USCDI v1 set is not the floor. USCDI v3 (45 CFR 170.213) is the data set certified health IT has to carry; Health IT Modules seeking certification to criteria referencing that section had to be capable of exchanging it by 2025-12-31. On 2026-09-18 that line is **260 days** behind us.

This extension reads the FHIR R4 JSON in your workspace and tells you which pins are stale and which USCDI v3 Patient elements were never there.

Ask a chatbot for a US Core Patient example and you will most often get US Core 3.1.1, because that is the version most public FHIR examples on the internet were written against. That is the specific place AI-written integration code goes wrong, and it is the place this scan looks first.

## The 10 rules

| Rule | Severity | What it catches |
|---|---|---|
| `uscore_v1_pin` | error | meta.profile pinned to US Core 3.1.1 - the USCDI v1 element set |
| `uscore_v2_pin` | error | meta.profile pinned to US Core 5.0.1 - the USCDI v2 element set |
| `unpinned_profile` | warn | a US Core profile claimed with no `\|version` |
| `no_meta_profile` | error | a US Core resource type carrying no us-core profile at all |
| `pre_r4_url` | error | STU3 or DSTU2 artefacts inside an R4 resource set |
| `legacy_terminology_url` | warn | retired `hl7.org/fhir/v2` and `/v3` code system URLs |
| `missing_race_ethnicity` | error | Patient with no us-core-race and us-core-ethnicity |
| `missing_sogi` | error | Patient with no us-core-genderIdentity, an element USCDI v3 added over v2 |
| `capability_fhir_version` | error | CapabilityStatement.fhirVersion that is not 4.0.1 |
| `no_last_updated` | warn | a meta block a surveyor cannot date against the line |

It recognises **23** US Core resource types, so it works on a repository rather than on one sample file.

## What the samples measure

Two fixtures ship with the extension. Scanned at `today = 2026-09-18`:

- `_fixtures/clean.json` - a Bundle with a US Core 6.1.0 Patient carrying race, ethnicity and gender identity, plus a 6.1.0 Condition and a 4.0.1 CapabilityStatement: **0 findings**.
- `_fixtures/dirty.json` - a Bundle of 4 resources exported from an older stack: **9 findings, 6 errors and 3 warnings**, covering 9 of the 10 rules.

Only `meta.profile` counts as a conformance claim. The same StructureDefinition URL under an extension `url` is a definition reference, not a version claim, and the scan leaves it alone. That distinction is the difference between 0 findings and 3 false ones on the clean sample.

## Free

The free tier finishes the job on screen. Every gap, in every resource in the workspace, on its own line, with the USCDI version that pin actually meets. No key, no file limit, no watermark, no time limit. It runs entirely offline - no resource and no PHI is sent anywhere.

## Full version

The full version adds one thing, on a different axis: taking the result away. It exports the whole workspace as a single conformance report file - every resource, its profile pin, and the USCDI v3 element it misses - in a form you can attach to a certification package or hand to a customer's auditor.

$29 once, one licence key per person or team seat, 7-day full refund.

Yardstick: a US FHIR consultant averages **$49.72/hour**, with most between $24.28 and $62.50 (ZipRecruiter, 31 July 2026); reading a real resource set by hand is an afternoon.

[Full version](https://buy.polar.sh/polar_cl_hiGlxcgqsijQYOSCbWd96m5roAeXS4jd5pGkt0elCAc)

## More tools

https://getreadystack.com/tools/uscore-profile-gap-lint

## Licence

See `LICENSE.txt`.
