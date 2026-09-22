# Oracle JDK License Gate

![Oracle JDK License Gate](https://getreadystack.com/img/promo/sku156180_result_card.jpg)

Oracle's free window for Java 21 closed on **2026-09-16**. If a Dockerfile, a CI workflow or a
provisioning script in your repository still pulls the Oracle build of Java, that line is now a
paid line, and nothing in your build will say so. The job still goes green.

This extension reads the file you have open and names every Oracle-licensed Java runtime in it,
with the line number, the license basis, the free-window status **on today's date**, and the
OpenJDK line that replaces it.

## Why the date matters more than the version

Oracle's No-Fee Terms and Conditions cover a Java LTS release until one year after the next LTS
ships. JDK 25 shipped on 2025-09-16, so the JDK 21 free window closed on 2026-09-16. JDK 17 left
that window on 2024-09-19. Java 8 and Java 11 never had a No-Fee window at all: those are Oracle
Technology Network builds, free for development and test only.

That is why a text search does not answer the question. `grep oracle` finds the word. It cannot
tell you that the same line was free last week and is not free today, and a chatbot whose training
stopped before September 2026 will still tell you Oracle JDK 21 is free to use in production.

## What it costs to be wrong

Oracle Java SE Universal Subscription is list-priced at $15 per employee per month, counting every
employee in the company, not every Java install. 250 employees x $15 per employee per month x
12 months = $45,000 a year. The unit is the payroll, not the container.

## The 9 rules

| Rule | What it catches |
| --- | --- |
| `setup_java_oracle` | `distribution: oracle` in a setup-java step |
| `setup_java_graalvm` | `distribution: graalvm`, which is Oracle GraalVM, not the community build |
| `oracle_download_url` | a binary fetched from `download.oracle.com` |
| `otn_license_cookie` | a script that sends `oraclelicense=accept` to get past the download gate |
| `sdkman_oracle_vendor` | an SDKMAN vendor suffix `-oracle` or `-graal` |
| `oracle_registry_image` | an image from Oracle's own Java container registry |
| `oracle_linux_jdk_pkg` | `yum` / `dnf` / `microdnf` installing an Oracle `jdk-NN` rpm |
| `oracle_java_installer_ppa` | a third-party installer package that downloads the Oracle JDK for you |
| `oracle_license_env_accept` | a build variable that accepts the Oracle license on your behalf |

Each finding carries the drop-in swap: `temurin`, `graalvm-community`, `eclipse-temurin:21-jdk`,
an Adoptium API URL, or an OpenJDK rpm.

## Measured on the bundled sample

`_fixtures/dirty.yml` is a five-job release workflow. The gate reports 6 Oracle-licensed Java
pulls in it, at lines 14, 25, 34, 38, 44 and 54. `_fixtures/clean.yml` is the same workflow with
OpenJDK lines and reports 0. Move the date backwards and the JDK 21 findings turn from a closed
window into a countdown: the answer follows the calendar, not the file name.

## Yardstick

Reading the Java provisioning lines of a repository by hand and checking each one against Oracle's
current terms is the same work a license-compliance reviewer does at an hourly rate; the difference
is that this gate re-runs it on every file, on every day, for free.

## Free and full

Free: the file you have open, all 9 rules, every finding with its swap. That job finishes.

Full version: the same 9 rules swept over every file in the workspace, plus a dated evidence pack -
file, line, distribution, license basis, free-window date and swap - that you can hand to
procurement or to an Oracle audit, plus team and commercial use. $29 once, 7-day full refund.
https://buy.polar.sh/polar_cl_0qxUalAkf4ad9kwGZmCwgbKANSqawgoJq6rVf2ZeWRh

Hub: https://getreadystack.com/tools/oracle-jdk-license-gate

Not legal advice. The dates above are Oracle's published license terms; your own agreement with
Oracle, if you have one, is what governs.
