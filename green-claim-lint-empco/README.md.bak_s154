# Green Claim Lint - EU EmpCo 2026

![Green Claim Lint - EU EmpCo 2026](https://getreadystack.com/img/promo/sku77945_result_card.jpg)

On 27 September 2026 the national measures transposing **Directive (EU) 2024/825** - the "empowering consumers for the green transition" directive, EmpCo - start to apply across the EU. It amends the Unfair Commercial Practices Directive 2005/29/EC and the Consumer Rights Directive 2011/83/EU, and it moves a set of familiar marketing phrases onto the Annex I blacklist, where no case-by-case assessment and no amount of evidence can save them.

Most product copy written in 2025 and 2026 was drafted, or at least polished, by a generative model. Models are fluent in exactly the vocabulary the directive now lists: "eco-friendly", "climate neutral", "our own sustainability score", "we will be net zero by 2030". This extension reads the files you already have and tells you which of those phrases are now a problem, which clause makes them one, and what to write instead.

## What it checks

Green Claim Lint scans `.html`, `.htm`, `.md` and `.mdx` and applies **13 rules**. Six report as errors and seven as warnings:

**Errors** - `generic-env-claim` (UCPD Annex I, point 4(a)), `offset-neutrality` (Annex I, point 4(c)), `uncertified-label` (Annex I, point 2(a)), `future-pledge` (Art. 6(2)(d)), `whole-vs-part` (Annex I, point 4(b)), `durability-unproven` (Annex I, point 23(d)).

**Warnings** - `legal-as-feature` (Annex I, point 10), `repairability-claim` (Annex I, point 23(e)), `premature-replacement` (Annex I, point 23(f)), `update-necessity` (Annex I, points 23(g) and 23(h)), `irrelevant-benefit` (Art. 6(2)(c)), `unquantified-recycled` (Art. 6(1)(b)), `vague-maximum` (Art. 6(1)(b)).

Each finding carries the exact phrase, the line number, the clause, and a rewrite that names the measured aspect instead of the generic claim.

The one rule worth reading twice is `offset-neutrality`. A claim that a product has a neutral, reduced or positive environmental impact **on the basis of emissions offsetting** is listed in Annex I. It is not a claim that needs better substantiation; it is a claim you delete.

## What the sample pages score

The extension ships two fixtures. `_fixtures/dirty.html`, a plausible AI-written jacket listing, returns **18 findings - 11 errors and 7 warnings**. `_fixtures/clean.html`, the same page rewritten with certificate IDs, test standards and stated percentages, returns **0**.

## Running it

- `Green Claim Lint: Check this file` - the page you have open.
- `Green Claim Lint: Scan workspace` - every matching file, plus a dated CSV and Markdown evidence report.

## False positives

Rules are deliberately literal. A line naming a real scheme (EU Ecolabel, Nordic Swan, Blue Angel, EMAS, ISO 14024, EN 13432, FSC, GRS, GOTS) is exempt from the label rules; a durability claim next to a test standard is exempt; a repairability claim on a page that also carries spare-parts or repair-manual information is exempt. Tune `ext/rules.json` if your house style needs it.

## Yardstick

UCPD Article 13(3) requires Member States to provide, for widespread infringements, fines of at least 4% of the trader's annual turnover in the Member States concerned, or at least EUR 2,000,000 where turnover information is unavailable.

## Scope

This extension reads text and reports pattern matches against the directive's listed practices. It is not legal advice and it does not read your substantiation files; a hit means the phrasing is in scope, not that you are liable, and a clean result means these 13 patterns did not fire.

Hub: https://getreadystack.com/tools/green-claim-lint-empco
