# SBOM Field Check for CRA 2026

![SBOM Field Check for CRA 2026](https://getreadystack.com/img/promo/sku16090_result_card.jpg)

Names every missing field in your CycloneDX or SPDX SBOM against BSI TR-03183-2 and the CISA 2026 minimum elements. 34 rules. Runs offline.

## What it does for free

- Checks the open bom.json or sbom.spdx.json against all 34 rules and names every gap
- Fails CycloneDX under 1.6 and SPDX under 3.0.1 - the only versions BSI TR-03183-2 accepts
- Counts how many components are missing producer, version, identifier, hash or licence, with examples
- Lists every rule that ships inside, so you can see exactly what was checked

## With a licence

- **Every SBOM in the repo, not just the open file** — Walks the workspace and checks each SBOM it finds, so a monorepo answers in one pass.
- **An evidence file you keep (CSV, JSON or HTML)** — Writes the findings into the workspace as an artefact you can file with your technical documentation.
- **Machine-readable output for CI** — Writes a JSON report so a pipeline can fail the build before the release leaves.
- **Re-checks every time the SBOM is regenerated** — Your generator rewrites the SBOM on each build; this re-checks it the moment it lands.

## Install

```
ext install sbom-field-check-cra-2026
```
