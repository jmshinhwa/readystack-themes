# CMS-0057 API Gate

![CMS-0057 API Gate](https://getreadystack.com/img/promo/sku77334_result_card.jpg)

**Does the CapabilityStatement your payer FHIR server publishes stand up as evidence for CMS-0057-F?** Open it, and 14 rules answer that question in the editor, line by line, with the days left to 1 January 2027 on the last line.

The CMS Interoperability and Prior Authorization final rule (CMS-0057-F) requires impacted payers - Medicare Advantage organizations, state Medicaid and CHIP fee-for-service programs and managed care plans, and QHP issuers on the federal exchanges - to run four HL7 FHIR R4 APIs by **1 January 2027**:

- **Patient Access API**, expanded to include prior authorization requests and decisions (drugs excluded)
- **Provider Access API**, sharing member data with in-network providers
- **Payer-to-Payer API**, handing a member's history to their new plan
- **Prior Authorization API**, accepting a request and returning approval, denial with a specific reason, or a request for more information

From **1 January 2026** the same rule requires prior authorization decisions within **72 hours** for expedited requests and **7 calendar days** for standard requests.

Your `/metadata` CapabilityStatement is the machine-readable claim that those APIs exist. This extension reads it the way the rule does.

## What the 14 rules look for

`fhirVersion` 4.0.1 - US Core R4 profiles - SMART App Launch / OAuth 2.0 security - TLS-only endpoints - `ExplanationOfBenefit` for adjudicated claims - `ClaimResponse` for prior authorization in Patient Access - `Claim $submit` and `$inquire` for the Prior Authorization API - `$questionnaire-package` for documentation requirements - `Group $export` for Provider Access - `$member-match` for Payer-to-Payer - a REST server mode - a statement date that is not stale - and a deadline clock that only speaks when blocking gaps remain.

## Measured on the sample files

The extension ships two fixtures. The conformant statement returns **0 findings**. The 2021-era Patient Access statement - a real shape, built for the 2021 interoperability rule and never revisited - returns **10 findings, 6 of them blocking gaps**: no `ClaimResponse`, no `Claim $submit`, no `Group $export`, no `$member-match`, no US Core profile, and an `http://` OAuth endpoint. Checked on 16 September 2026 the clock line reads **107 days** left until 1 January 2027. Three findings are warnings and one is that clock.

## Why a generic FHIR validator does not catch this

A generic FHIR validator calls this file valid, because it reads the FHIR R4 schema, not a federal rule. Schema-valid is the normal state of a payer server that is still missing `Claim $submit`, `Group $export` and `$member-match`. Nothing in the schema knows what 1 January 2027 is.

## Free, and what the full version adds

Every check is free and needs no licence key: all 14 rules, every finding, every file, no limit. The full version changes who holds the result, not how much you can see - it exports the same audit as a dated Markdown and CSV gap report, one row per gap with its CMS-0057-F citation, for the compliance file your auditor asks for.

Full version - $29 once, one licence key per person or team seat, 7-day full refund: https://buy.polar.sh/polar_cl_RqXjvqSVkQXgBWNS56pWMaOQRkjbpSGQuPGL50WDgb6

## Yardstick

A payer interoperability readiness review from an interop consultancy is commonly quoted as a five-figure engagement. This extension does not replace that review. It clears the mechanical gaps first, so the expensive hours go to the hard questions.

## Free web version

The same engine, same 14 rules, runs in the browser: https://getreadystack.com/tools/cms-0057-api-gate

## Scope

CMS-0057 API Gate reads the CapabilityStatement only. It does not test a live endpoint, and it is not legal advice.
