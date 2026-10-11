# Flyway Migration Check — Liquibase 5 FSL ties

![Flyway Migration Check — Liquibase 5 FSL ties](https://getreadystack.com/img/promo/sku588693_result_card.jpg)

**Six Liquibase FSL ties in a 38-line pom.xml, each with its Flyway line: 3 errors, 3 warnings, found in one pass.**

Liquibase Community 5.0.0 (released 2025-09-30 on Maven Central) ships under **FSL-1.1-ALv2**, the Functional Source License, instead of Apache-2.0. The 5.0 release notes say so: "Liquibase Community is now licensed under the Functional Source License (FSL)". 4.33.0 (2025-07-09) is the last Apache-2.0 release. If your open-source policy accepts Apache-2.0 and MIT but not FSL, every service that pulls Liquibase 5 needs a plan. Flyway Community (Apache-2.0, 13.10.0 on Maven Central) and dbmate (MIT) do the same migration job.

This extension reads `pom.xml`, `build.gradle`, `build.gradle.kts`, `liquibase.properties`, Spring Boot `application.*` files, Dockerfiles and Liquibase changelogs line by line. It shows **where the project still pulls Liquibase** and **the Flyway line that replaces it**.

## Before → after on the bundled pom.xml

| Line | Liquibase line | Flyway fix |
|---|---|---|
| 10 | `<liquibase.version>5.0.1</liquibase.version>` | `<flyway.version>13.10.0</flyway.version>` |
| 15 | `<artifactId>liquibase-core</artifactId>` | `<artifactId>flyway-core</artifactId>` |
| 28 | `<artifactId>liquibase-maven-plugin</artifactId>` | `<artifactId>flyway-maven-plugin</artifactId>` |
| 31 | `<changeLogFile>db/changelog/db.changelog-master.yaml</changeLogFile>` | `<location>filesystem:src/main/resources/db/migration</location>` |
| 32 | `<contexts>prod</contexts>` | `one location per environment (db/prod)` |
| 33 | `<rollbackCount>1</rollbackCount>` | `forward fix migration V<n+1>__revert.sql` |

The three errors are the FSL version and the two artifacts that pull it in. The three warnings are Liquibase-only settings that Flyway does differently: no master changelog, no contexts, and undo migrations only in Flyway Teams and Enterprise, not Community.

## What it checks: 12 rules

1. Liquibase version 5.x (FSL-1.1-ALv2) or 4.x (Apache-2.0, one Dependabot bump away from 5.x), in Maven properties, `<version>`, Gradle coordinates, gradle.properties and the `liquibase/liquibase` Docker image
2. `liquibase-core` dependency → `flyway-core` plus the database module (e.g. `flyway-database-postgresql`)
3. `liquibase-maven-plugin` → `flyway-maven-plugin`
4. Liquibase Gradle plugin → `org.flywaydb.flyway`
5. `changeLogFile` / `changelog-file` / `spring.liquibase.change-log` → Flyway `locations`
6. contexts and labels → one location per environment
7. rollback settings and `--rollback` lines → forward fix migration
8. Liquibase Secure licence key settings (info)
9. `databaseChangeLog` root → `V1__baseline.sql` with baselineOnMigrate
10. `--liquibase formatted sql` headers → `V<n>__<description>.sql`
11. `spring.liquibase.*` keys → `spring.flyway.*`
12. LPM calls and `org.liquibase.ext` extensions → Flyway database modules

Each rule links its source document.

## The as-of date matters

Under FSL each version turns Apache-2.0 two years after its release. The check knows the Maven Central dates of 5.0.0 (2025-09-30), 5.0.1 (2025-10-03), 5.0.2 (2026-03-05), 5.0.3 (2026-05-15) and 5.0.4 (2026-08-20). Set the as-of date past a version's second anniversary and that line drops to info. Newer 5.x releases stay FSL.

## Free and full version

Free, no key: all 12 rules on the open file, with the Flyway line on every finding. Run **Flyway Migration Check: Check this file** from the command palette, or paste a file into the web page at https://getreadystack.com/tools/flyway-migration-check.

[Full version](https://getreadystack.com/api/buy/cl/polar_cl_0Kv55ZFzhN92MA1VzdjIHNeqXLBNUW0gtNzfk1niwXt): one key scans the whole workspace into a single Liquibase-to-Flyway migration plan. A team key adds a dated licence exposure report across projects and a CI gate that fails a build that adds new Liquibase 5 use.

Yardstick: Liquibase Secure, the paid Liquibase line, is sold on quote-only plans on liquibase.com/pricing.

## Sources

- Liquibase Community 5.0 release notes: https://docs.liquibase.com/community/release-notes/5-0
- liquibase-core 5.0.1 POM licence `FSL-1.1-ALv2`: https://repo1.maven.org/maven2/org/liquibase/liquibase-core/5.0.1/liquibase-core-5.0.1.pom
- FSL two-year conversion: https://fsl.software/
- Flyway undo (Teams/Enterprise): https://documentation.red-gate.com/fd/undo-184127535.html
