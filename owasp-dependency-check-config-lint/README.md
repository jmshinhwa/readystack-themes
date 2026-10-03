# OWASP Dependency Check Config Lint

![OWASP Dependency Check Config Lint](https://getreadystack.com/img/promo/sku460852_result_card.jpg)

Lints the files that run **OWASP dependency check** — `pom.xml`, `build.gradle` / `build.gradle.kts`, `dependency-check-suppression.xml` and CI workflow YAML — and puts every setup break on its file and line, with the exact replacement line next to it.

Tool page: https://getreadystack.com/tools/owasp-dependency-check-config-lint

Yardstick: Snyk Team starts at $25 a month (snyk.io/plans, checked 2026-10-01). This lint does not scan for CVEs itself; it makes sure the Dependency-Check scan you already run can still update and can still fail the build.

## Why the setup itself breaks

Dependency-Check is the scanner. Its own configuration has dated breaking points:

- **2023-11-22 — 9.0.0** moved from the NVD data feed to the NVD API. Old `cveUrlModified` / `cveUrlBase` settings point at the retired feed.
- **2024-10-21 — 11.0.0** requires Java 11 and changed the H2 database (one-time purge after upgrading).
- **2025-02-24 — issue #7463, "Mandatory Upgrade to 12.1.0 or later"**: due to NVD API compatibility changes, all users must upgrade to 12.1.0 or later.
- **September 2025** — Sonatype OSS Index enforces API tokens; without credentials Dependency-Check disables the OSS Index analyzer automatically.
- **April 2026** — the migration to Sonatype Guide began; legacy OSS Index tokens are planned to be replaced before the end of 2026.
- **2026-08-03 — 13.0.0** (current release) marks Nexus v2 support for removal.

## The 10 rules

| Rule | Severity | What it finds | Fix line |
|---|---|---|---|
| ODC001 | error | plugin, Docker image or CLI zip below 12.1.0 | `13.0.0` |
| ODC002 | error | `cveUrlModified`, `cveUrlBase` and other legacy feed settings | delete; use `nvdApiKey` |
| ODC003 | error | literal `nvdApiKey`, `apiKey = "…"`, `--nvdApiKey abc`, literal `ossIndexPassword` | `${env.NVD_API_KEY}` or `nvdApiServerId` |
| ODC004 | warn | plugin present, no NVD API key anywhere | `<nvdApiKey>${env.NVD_API_KEY}</nvdApiKey>` |
| ODC005 | warn | `failBuildOnCVSS` / `--failOnCVSS` above 10 (the default 11 never fails) | `<failBuildOnCVSS>7</failBuildOnCVSS>` |
| ODC006 | error / warn | `<suppress until="…">` already past, or within 30 days | re-review, then move or delete |
| ODC007 | warn | OSS Index analyzer on with no token | `ossIndexServerId` + token in settings.xml |
| ODC008 | warn → error after 2026-12-31 | legacy OSS Index username / server id | Sonatype Guide token |
| ODC009 | error | `java-version: 8` or a `:8` JDK image in a file that runs Dependency-Check | `java-version: '21'` |
| ODC010 | warn | `nexusAnalyzerEnabled` true or `nexusUrl` set | turn off, use the Central analyzer |

## Worked example (the sample pom.xml)

The sample `pom.xml` of a billing API pins `dependency-check-maven` through a `${dependency-check.version}` property set to 8.4.3. The lint returns 6 findings: 3 errors, 3 warnings.

| Broken line | Fix |
|---|---|
| dependency-check 8.4.3 | 13.0.0 (12.1.0+ mandatory) |
| nvdApiKey 3f9c2a71-… (literal) | `${env.NVD_API_KEY}` |
| cveUrlModified …/1.1/ feed | delete; NVD API since 9.0.0 |
| failBuildOnCVSS 11 | failBuildOnCVSS 7 |
| ossindexAnalyzerEnabled true, no token | ossIndexServerId + token |
| nexusAnalyzerEnabled true | false (removal in 13.0.0) |

## Suppression dates

`<suppress until="2026-09-15Z">` stops applying on that date and the CVE it hid comes back in the next report. The lint compares every `until` with today and flags the ones already past (error) and the ones due within 30 days (warning).

## Free and full version

- **Free:** lint the open file — every finding, every fix line, no key.
- **Full version:** scan every build, suppression and CI file in the workspace at once, export a dated audit report and run the same check in CI with a team key — https://getreadystack.com/api/buy/cl/polar_cl_6liWxcI6PNdyoqgysrEXvljUzG7WGgtxWIE4n3MF7eK

Sources: dependency-check/DependencyCheck README and releases on GitHub; Dependency-Check suppression documentation; dependency-check-maven configuration page.
