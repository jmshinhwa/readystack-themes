# Nexus Repository Pricing: Verdaccio Migration Map

![Nexus Repository Pricing: Verdaccio Migration Map](https://getreadystack.com/img/promo/sku638502_result_card.jpg)

Finds every Sonatype Nexus Repository URL in .npmrc, settings.xml, pom.xml, build.gradle, pip.conf and compose files and writes the Verdaccio, Reposilite or Pulp line for each. On the bundled sample: 9 Nexus URLs in 6 files.

Web version (same engine, runs in your browser): https://getreadystack.com/tools/verdaccio-migration-check-nexus-repository-pricing

## Why now

Sonatype Nexus Repository Community Edition supports up to 40,000 total components and 100,000 requests per day; above either limit it pauses the addition of new components until usage returns below both (Sonatype help, Community Edition onboarding). Source: https://help.sonatype.com/en/ce-onboarding.html

Starting Nexus Repository 3.77.0 or later moves an OSS instance to Community Edition. OSS on 3.70.x or earlier must first upgrade to 3.71.0 (H2 database, Java 17). Proxied packages count as components, so a busy npm or Maven proxy is what usually crosses 40,000.

## What it reports (12 rules)

| Rule | Finds | Replacement line |
|---|---|---|
| NXR01 | `registry=` on Nexus in .npmrc / .yarnrc.yml | `registry=http://verdaccio.<domain>:4873/` |
| NXR02 | `@scope:registry=` on Nexus | `@scope:registry=http://verdaccio.<domain>:4873/` |
| NXR03 | `_authToken` / `_auth` keyed to a Nexus host | `//verdaccio.<domain>:4873/:_authToken=${NPM_TOKEN}` |
| NXR04 | Maven `<mirror>` / `<repository>` URL | `http://reposilite.<domain>:8080/releases` |
| NXR05 | `distributionManagement`, `altDeploymentRepository` | `/releases` or `/snapshots` on Reposilite |
| NXR06 | Gradle `maven { url = uri(...) }` | same line pointing at Reposilite |
| NXR07 | pip `index-url`, `-i`, `PIP_INDEX_URL` | `https://pulp.<domain>/pypi/<base_path>/simple/` |
| NXR08 | image from a Nexus Docker connector | docker.io path or a Pulp container distribution |
| NXR09 | `sonatype/nexus3` at 3.77.0 or later | Verdaccio + Reposilite + Pulp services |
| NXR10 | `sonatype/nexus3` below 3.77.0 (OSS) | plan the move before the upgrade |
| NXR11 | scripts calling `/service/rest/` | rewrite against the new registry's API |
| NXR12 | migration map | count per format and file |

Example (`.npmrc`, line 1):

```
registry=https://nexus.acme.internal/repository/npm-group/
→ registry=http://verdaccio.acme.internal:4873/
```

## How to use

Open any of the files above; findings appear in the Problems panel. Run "Nexus Repository Pricing: Verdaccio Migration Map: Check this file" from the command palette. In the web version, paste several files at once as the output of `tail -n +1 .npmrc settings.xml pom.xml pip.conf` (the `==> file <==` headers keep file names and line numbers).

## Yardstick

Doing this inventory by hand: a network and computer systems administrator costs $47.66 an hour at the US median wage (BLS OEWS 2025, SOC 15-1244). Sonatype publishes no Pro price.

## Free and licence key

Every finding and every replacement line is free in the open file. A licence key ($29 once, one key per person or team seat) adds the whole-workspace migration plan, a dated Nexus exposure report for the company and a CI gate that fails a build adding a new Nexus URL: [full version](https://getreadystack.com/api/buy/cl/polar_cl_sBaNMKvNgbblYHQRgJs0uUxM8mokFObH7brC43grsAl).

Not affiliated with Sonatype, Verdaccio, Reposilite or Pulp. Names belong to their owners.
