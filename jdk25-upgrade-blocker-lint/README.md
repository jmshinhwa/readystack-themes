# JDK 25 Upgrade Blocker Lint

![JDK 25 Upgrade Blocker Lint](https://getreadystack.com/img/promo/sku87365_result_card.jpg)

Reads `.java` files and reports the calls that JDK 21 and JDK 25 removed, disabled, or refuse to run — with the JEP that removed each one and the call that replaces it.

Hub page: https://getreadystack.com/tools/jdk25-upgrade-blocker-lint

## Why a linter and not the compiler

`javac` treats "deprecated for removal" as a warning. It prints the warning and writes a working class file, so the pipeline stays green and the failure moves to run time on the new JDK:

- `System.setSecurityManager()` throws `UnsupportedOperationException` on JDK 24 and later. JEP 486 permanently disabled the Security Manager; a `.policy` file now grants nothing.
- `AccessController.doPrivileged` still compiles and still returns — it simply no longer elevates anything.
- An `import javax.persistence.Entity;` compiles fine against a Jakarta EE 10 runtime. The runtime scans `jakarta.*`, so the entity is never registered and the table is never mapped.
- The Applet API was removed in JDK 25 (JEP 504). That one does fail the build, in a file nobody has opened in nine years.
- `Thread.stop()` throws `UnsupportedOperationException` since JDK 20.

The same gap applies to code written this week. An assistant trained largely on Java 8 and Java 11 will write `javax.servlet` imports, `new Integer(3)`, and `Class.forName(...).newInstance()` into the very service you are migrating.

## What it checks

18 rules over `**/*.java`, in two severities:

**Errors** — the call fails or silently does nothing on the target JDK: `security_manager_set`, `access_controller`, `security_policy`, `unsafe_memory` (JEP 471/498), `javax_to_jakarta`, `jaxb_removed` (JEP 320), `applet_api` (JEP 504), `thread_stop`, `finalize_override` (JEP 421), `run_finalization`, `jdk_internal_import` (JEP 403).

**Warnings** — deprecated with a one-line replacement: `subject_do_as`, `native_access` (JEP 472), `set_accessible`, `url_constructor`, `wrapper_constructor`, `class_new_instance`, `locale_constructor`.

Comments are stripped before matching, so a JEP number quoted in a javadoc is not a finding.

## Measured on the bundled fixtures

`_fixtures/dirty.java` — a 64-line invoice exporter: **23 findings, 15 errors and 8 warnings**, and every one of the 18 rules fires at least once.
`_fixtures/clean.java` — the same class after each fix is applied: **0 findings**.

## Free and paid

Free, no key: all 18 rules on the file you have open, with no cap. The reading job finishes there.

Paid: the workspace sweep — it reads every .java file in the repository and writes one dated Markdown migration report with each file, blocker, JEP and replacement. The sweep is free for its first seven days; after that a key covers it, with commercial and CI-seat use. https://buy.polar.sh/polar_cl_YK2CXL7Hd4TEoxQ76oOVQpVAsrLK9zUpcK7oV2MKwJs

Yardstick: a Java migration consultant bills $120–$200 an hour, and a two-day audit of one repository runs past $2,000.

## Scope

It reads source text. It does not compile your project, resolve your dependency tree, or rewrite files — the replacement is named, the edit is yours. A finding inside a string literal is possible; the line number tells you in one glance.

Oracle premier support for Java 17 ends in September 2026.
