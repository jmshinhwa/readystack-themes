# Oracle JDK License Gate

**On 20 October 2026, new Oracle JDK 21 updates stop being free for production.** From that day's Critical Patch Update,
new Oracle JDK 21 updates are under the Java SE OTN license, and Oracle bills Java SE on the company's whole
headcount. Any CI job, Dockerfile or script that pulls "the latest" Oracle JDK 21 switches licence that day
without anyone editing it. This extension finds those lines, gives the free OpenJDK line for each, and writes
the dated record your company can keep. (Sources: Oracle JDK licence FAQ; Oracle Java blog "JDK 21 approaches
end-of-permissive license", 2026-08-14; Oracle Critical Patch Update calendar.)

**Moving to Temurin, Corretto or another free OpenJDK build?** Run `Oracle JDK License Gate: Show the Java map`.
It reads your workspace and shows on one page: every place that chooses a Java build (GitHub Actions, Docker base
images, Gradle and Maven toolchains, SDKMAN, asdf, dev containers), which of those pull an Oracle-licensed build
on today's date, which JDK this machine runs (quoted from the JDK's own `release` file), and the free line for
each place. The map is free and nothing leaves your machine.

![Oracle JDK License Gate — finds the line](https://getreadystack.com/img/promo/oracle-jdk-license-gate_demo.gif)

![Oracle JDK License Gate](https://getreadystack.com/img/promo/sku156180_result_card.jpg)

Oracle JDK 21 builds released through September 2026 are under Oracle's No-Fee Terms. From the
Critical Patch Update of **2026-10-20**, new Oracle JDK 21 updates are under the Java SE OTN license,
which is not free for production. If a Dockerfile, a CI workflow or a provisioning script in your
repository pulls the latest Oracle build of Java 21, it pulls a paid-licence build from that day, and
nothing in your build will say so. The job still goes green. A pinned older build stays under the
No-Fee Terms, but it gets no free security fixes after that date.

This extension reads the file you have open and names every Oracle-licensed Java runtime in it,
with the line number, the license basis, the free-window status **on today's date**, and the
OpenJDK line that replaces it.

## Why the date matters more than the version

Oracle keeps a Java LTS release under the No-Fee Terms for one year after the next LTS ships.
JDK 25 shipped in September 2025, so Oracle JDK 21 releases through September 2026 are No-Fee, and
updates from the October 2026 Critical Patch Update (2026-10-20) are under the OTN license. JDK 17 made
the same switch in October 2024 (17.0.13 and later are OTN). Java 8 and Java 11 never had a No-Fee
window at all: those are Oracle Technology Network builds, free for development and test only.

Oracle JDK 17 leaves Premier Support at the end of September 2026. For subscribers Oracle waives the
Extended Support fee from October 2026 to September 2029 (Oracle Java SE Support Roadmap), so the
date that costs money is not the end of September: it is the day an Oracle build runs in production
without a subscription behind it.

That is why a text search does not answer the question. `grep oracle` finds the word. It cannot
tell you that the same line is free this week and pulls a paid-licence build after 20 October, and a
chatbot whose training stopped before August 2026 will still tell you Oracle JDK 21 is free to use in production.

## What it costs to be wrong

Oracle Java SE Universal Subscription is list-priced at $15 per employee per month, counting every
employee in the company, not every Java install. 250 employees x $15 per employee per month x
12 months = $45,000 a year. The unit is the payroll, not the container.

## The 18 rules

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
| `oracle_setup_java_action` | `oracle-actions/setup-java` without `website: jdk.java.net` (it downloads from oracle.com by default) |
| `sdkmanrc_oracle_vendor` | a `.sdkmanrc` that pins `java=...-oracle` or `-graal` |
| `asdf_oracle_vendor` | a `.tool-versions` line `java oracle-...` (asdf / mise) |
| `gradle_toolchain_oracle` | `JvmVendorSpec.ORACLE` in a Gradle toolchain |
| `maven_toolchain_oracle` | `<vendor>oracle</vendor>` in a Maven toolchain requirement |
| `devcontainer_oracle_distro` | `"jdkDistro": "oracle"` in a dev container Java feature |
| `brew_oracle_jdk` | `brew install oracle-jdk` or a Brewfile `cask "oracle-jdk"` |
| `winget_oracle_jdk` | `winget install Oracle.JDK.NN` |
| `choco_oracle_jdk` | `choco install oraclejdk` / `oracleNNjdk` |

Each finding carries the drop-in swap: `temurin`, `graalvm-community`, `eclipse-temurin:21-jdk`,
an Adoptium API URL, or an OpenJDK rpm.

## The Java map (free)

The map lists, for the whole workspace: the Oracle-licensed pulls with file and line, every place a Java vendor is
named (so you can see `temurin` in CI next to `oracle` in the dev container), lines that are not a license matter
but are worth changing (the deprecated `openjdk` Docker image, the `adopt` distribution that setup-java removed),
and the JDK behind `JAVA_HOME` and the Java runtimes configured in VS Code. For a JDK it only quotes the
`IMPLEMENTOR` and `JAVA_VERSION` lines of that JDK's `release` file. It reads files on your machine and sends
nothing.

## Measured on the bundled sample

`_fixtures/dirty.yml` is a five-job release workflow. The gate reports 6 Oracle-licensed Java
pulls in it, at lines 14, 25, 34, 38, 44 and 54. `_fixtures/clean.yml` is the same workflow with
OpenJDK lines and reports 0. Before 2026-10-20 the JDK 21 findings are a countdown in days; from
that date they are errors: the answer follows the calendar, not the file name.

## Yardstick

Reading the Java provisioning lines of a repository by hand and checking each one against Oracle's
current terms is the same work a license-compliance reviewer does at an hourly rate; the difference
is that this gate re-runs it on every file, on every day, for free.

## Free and full

Free: the file you have open, all 18 rules, every finding with its swap - and a Quick Fix (the light bulb)
that rewrites the line under the cursor where the swap is mechanical: `distribution: temurin`,
`JvmVendorSpec.ADOPTIUM`, `"jdkDistro": "tem"`, `eclipse-temurin:<major>-jdk`, `temurin@<major>`,
`EclipseAdoptium.Temurin.<major>.JDK`. That job finishes.

Full version: **Fix all** - every mechanical swap in every file of the workspace in one click, with a preview
first and a dated record of each change (file, line, before, after, SHA-256 of the file after). Lines that need
a human choice (SDKMAN / asdf version ids, Maven toolchains, download scripts, an Oracle Linux image that the
same Dockerfile then builds on with yum / dnf) are left untouched and listed with the how-to. Plus the
workspace sweep and the dated evidence pack you can hand to procurement or to an Oracle audit. $29 once.
https://getreadystack.com/api/buy/cl/polar_cl_0qxUalAkf4ad9kwGZmCwgbKANSqawgoJq6rVf2ZeWRh

## For a team: every repository, every pull request

Oracle prices Java SE by every employee, not by every install, so one repository nobody opened is
enough to put the whole payroll in scope. A clean folder on one laptop does not answer that. The team
key runs this same gate in CI on each repository and pull request, and fails the job when an
Oracle-licensed Java line appears:

```yaml
- uses: jmshinhwa/readystack-action@v1
  with:
    tool: oracle-jdk-license-gate
    license: ${{ secrets.READYSTACK_LICENSE }}
    comment: 'true'   # one pull-request comment with the findings (needs pull-requests: write)
```

Team key: $149 once, 5 seats, every ReadyStack linter.
https://getreadystack.com/api/buy/cl/polar_cl_l6iN1uWt0FwWu7tBsczD0jWpP2vxFM54Wdwqb3KPi1G

Hub: https://getreadystack.com/tools/oracle-jdk-license-gate

Not legal advice. The dates above are Oracle's published license terms; your own agreement with
Oracle, if you have one, is what governs.
