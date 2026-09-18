# Impressum & Shop-Pflichtangaben Lint (DE)

Diese Erweiterung liest die Rechtstexte, die in Ihrem Repository liegen — Impressum, Footer,
Widerrufsbelehrung, Produkt- und Kassenseiten-Templates — und meldet jede Fundstelle, die auf eine
Norm zeigt, die es so nicht mehr gibt, sowie jede Pflichtangabe, die an dieser Stelle fehlt.
Sie arbeitet auf `.html`, `.htm`, `.md`, `.vue`, `.jsx`, `.tsx`, `.twig`, `.liquid` und `.php`.

## Warum es diese Erweiterung gibt

Zwischen 2020 und 2025 sind in Deutschland mehrere der Paragrafen umgezogen, die in praktisch
jedem Impressum-Template stehen:

| Im Template steht meist | Gilt tatsächlich | Seit |
| --- | --- | --- |
| § 5 TMG | § 5 DDG | 14.05.2024 |
| § 55 Abs. 2 RStV | § 18 Abs. 2 MStV | 07.11.2020 |
| § 25 TTDSG | § 25 TDDDG | 14.05.2024 |
| Link zur EU-Plattform für Online-Streitbeilegung | ersatzlos streichen | 20.07.2025 |
| § 28 BDSG | Art. 6 Abs. 1 DSGVO | 25.05.2018 |
| Mini-One-Stop-Shop (MOSS) | One-Stop-Shop, § 18j UStG | 01.07.2021 |

Dazu kommen Angaben, die seit kurzem verlangt werden und in älteren Templates schlicht fehlen:
Hersteller und verantwortliche Person nach der GPSR (EU) 2023/988 seit dem 13.12.2024, der
Hinweis nach § 14 BFSG seit dem 28.06.2025, Gesamtpreis und Versandkosten nach §§ 3, 6 PAngV,
das Muster-Widerrufsformular nach Art. 246a § 1 Abs. 2 Nr. 1 EGBGB, die USt-IdNr. nach
§ 5 Abs. 1 Nr. 6 DDG, die Erklärung nach § 36 VSBG und die LUCID-Nummer nach § 9 VerpackG.

Insgesamt prüft die Erweiterung **17 Regeln**. Jede Regel trägt ihren Stichtag: Wer ein
Archiv-Template mit einem früheren Datum prüft, bekommt nur die Regeln, die damals schon galten.

## Was Sie sehen

Jede Fundstelle erscheint als Diagnose in der Zeile, in der sie steht — mit der Norm, die heute
gilt, und dem Datum, seit dem sie gilt. Fehlende Pflichtangaben werden in der Zeile gemeldet,
die sie ausgelöst hat (zum Beispiel der Preis ohne den Zusatz „inkl. MwSt.").

Ein gemessenes Beispiel: Die Testdatei des Projekts — ein Impressum mit Widerrufsbelehrung und
einer Produktseite von 2019 — ergibt beim Prüfdatum 11.09.2026 achtzehn Fundstellen über alle
17 Regeln (zehn Fehler, sieben Warnungen, ein Hinweis). Dieselbe Datei mit dem Prüfdatum
01.01.2019 ergibt acht, weil damals erst acht der Regeln galten. Die bereinigte Fassung ergibt null.

## Kostenlos und kostenpflichtig

Kostenlos prüft die Erweiterung jede Datei und den gesamten Workspace und zeigt jede Fundstelle
mit Zeile, geltender Norm und Stichtag. Das ist die vollständige Prüfung; es ist nichts
abgeschaltet, gezählt oder mit einem Wasserzeichen versehen.

Kostenpflichtig ist das Mitnehmen: das datierte Prüfprotokoll als Markdown und JSON, das in die
Akte, in die CI-Pipeline oder in die Mandantendokumentation wandert.

## Maßstab

Anwaltliche Rechtstext-Schutzpakete für Onlineshops laufen laufend ab etwa 8,25 € bis 15 € im
Monat (onwalt ab 8,25 €, eRecht24 ab 15,00 €, Flyeralarm Digital 12,90 € netto bei 12 Monaten
Laufzeit); sie liefern Texte für die veröffentlichte Seite und lesen nicht das Repository.

## Webversion

Dieselben 17 Regeln, dieselbe Engine, ohne Installation:
https://getreadystack.com/tools/impressum-lint-de

## Hinweis

Die Erweiterung prüft Fundstellen und Pflichtangaben in Textdateien. Sie ist keine
Rechtsberatung und ersetzt keine anwaltliche Prüfung des Einzelfalls.
