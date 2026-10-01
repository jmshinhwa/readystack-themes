# OpenPDF Migration Check: iText AGPL Gate

![OpenPDF Migration Check: iText AGPL Gate — finds the line](https://getreadystack.com/img/promo/openpdf-migration-check_demo.gif)

![OpenPDF Migration Check: iText AGPL Gate](https://getreadystack.com/img/promo/sku427973_result_card.jpg)

**openpdf: 6 findings in one pom.xml.** Open a `pom.xml`, `build.gradle` or `build.gradle.kts` and every iText dependency is listed with its line and the exact OpenPDF 3.0.5 or Apache PDFBox 3.0.8 line that replaces it. 15 rules, offline, nothing leaves your machine.

Web version (same engine, paste a file): https://getreadystack.com/tools/openpdf-migration-check

## Why this exists

iText's own licensing page says: "iText 5 and all subsequent versions of iText are dual-licensed, and available under open source (AGPLv3) or commercial license agreements." Under the AGPLv3 option it adds: "You may not deploy it on a network without disclosing the full source code of your own applications under the AGPL license." A closed-source product or a SaaS backend that renders invoices with iText 7, 8 or 9 therefore either publishes its source or holds a commercial iText licence.

Two open libraries cover most of what those projects use iText for:

| Library | Maven coordinate (Maven Central, checked 2026-09-30) | Licence |
|---|---|---|
| OpenPDF | `com.github.librepdf:openpdf:3.0.5` | LGPL 2.1 / MPL 2.0 |
| OpenPDF HTML | `com.github.librepdf:openpdf-html:3.0.5` | LGPL 2.1 / MPL 2.0 |
| Apache PDFBox | `org.apache.pdfbox:pdfbox:3.0.8` | Apache 2.0 |
| PDFBox Preflight | `org.apache.pdfbox:preflight:3.0.8` | Apache 2.0 |

OpenPDF 3 moved its classes from `com.lowagie.text` to `org.openpdf.text`, so older migration snippets that import `com.lowagie` no longer compile against 3.0.5.

## What the sample pom.xml shows

The bundled sample is an invoice service on iText 9.2.0 plus one legacy iText 5.5.13 module. The check reports 6 findings:

| iText line in pom.xml | Replacement |
|---|---|
| `itext.version` 9.2.0 | delete the property after the last iText line |
| `kernel` 9.2.0 | `openpdf` 3.0.5 (write) or `pdfbox` 3.0.8 (read/edit) |
| `layout` 9.2.0 | `openpdf` 3.0.5 |
| `forms` 9.2.0 | `pdfbox` 3.0.8 (PDAcroForm) |
| `html2pdf` 6.2.0 | `openpdf-html` 3.0.5 |
| `itextpdf` 5.5.13 | `openpdf` 3.0.5 |

A version held in a Maven property (`${itext.version}`) is resolved, so the finding shows the real version.

## The 15 rules

- ITX001 iText 5 `itextpdf` → OpenPDF
- ITX002 `itext7-core` / `itext-core` bundle → split by job
- ITX003 `kernel`, ITX004 `layout`, ITX005 `io` → OpenPDF
- ITX006 `forms`, ITX007 `sign` → PDFBox
- ITX008 `pdfa` → PDFBox + Preflight
- ITX009 `html2pdf` (pdfHTML) → openpdf-html
- ITX010 `barcodes` → OpenPDF Barcode128 / BarcodePDF417
- ITX011 support modules (svg, styled-xml-parser, hyph, font-asian, pdfua, commons) → remove
- ITX012 Bouncy Castle adapter → remove with sign
- ITX013 any other `com.itextpdf` add-on → no one-line replacement, decide per feature
- ITX014 `import com.itextpdf.…` in Java or Kotlin source
- ITX015 iText version property (`itext.version`, `itextVersion`)

Maven `<dependency>` blocks, Gradle Groovy (`'com.itextpdf:kernel:9.8.0'`, `group: 'com.itextpdf', name: …`) and Kotlin DSL (`implementation("…")`) are read. Comments are ignored.

## Without and with a key

Free, without a key: the open file, every finding, every replacement line.

With a licence key: the whole workspace at once as one migration plan (every module, every iText artifact mapped to its replacement) in a dated report, and a CI gate that fails a build that adds new `com.itextpdf` use.

## Yardstick

A commercial Java PDF library is the other way out: Aspose.PDF for Java lists its Developer Small Business licence at US$1,199 per developer. iText publishes no price on its AGPLv3 page.

## Limits

This is a dependency map, not legal advice. It does not read transitive dependencies from a resolved tree; run `mvn dependency:tree` or `gradle dependencies` to catch iText pulled in by another library.
