# Aufbewahrungsfristen-Lint für Löschkonzepte (BEG IV)

![Aufbewahrungsfristen-Lint für Löschkonzepte](https://getreadystack.com/img/promo/sku330609_result_card.jpg)

![Aufbewahrungsfristen-Lint für Löschkonzepte — finds the line](https://getreadystack.com/img/promo/loeschkonzept-fristen-lint_demo.gif)

**Findet falsche Aufbewahrungsfristen in Ihrem Löschkonzept — Zeile für Zeile, offline, in VS Code.**
Beispiel-Löschkonzept mit 8 Zeilen: **6 falsche Aufbewahrungsfristen gefunden**, mit 10 rules geprüft.

Seit 2025-01-01 gilt für Buchungsbelege (Rechnungen, Kontoauszüge, Quittungen) eine Aufbewahrungsfrist von **8 statt 10 Jahren** (§ 147 Abs. 3 AO, § 257 Abs. 4 HGB in der Fassung des Vierten Bürokratieentlastungsgesetzes, BEG IV). Für Kreditinstitute, Versicherungen und Wertpapierinstitute gilt die Verkürzung ein Jahr später, ab 2026-01-01. Jahresabschlüsse, Bücher und Inventare bleiben bei 10 Jahren, Handels- und Geschäftsbriefe bei 6 Jahren.

Wer die alte 10-Jahres-Frist im Löschkonzept stehen lässt, speichert personenbezogene Daten länger als erlaubt. Das verletzt den Grundsatz der Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO); Art. 83 Abs. 5 DSGVO sieht dafür Geldbußen bis 20 Mio. Euro oder 4 % des weltweiten Jahresumsatzes vor.

## Was geprüft wird (10 rules)

| Regel | Was sie findet | Grundlage |
|---|---|---|
| beleg_zu_lang | Buchungsbelege länger als 8 Jahre | § 147 Abs. 3 AO, § 257 Abs. 4 HGB (BEG IV) |
| beleg_zu_kurz | Buchungsbelege kürzer als 8 Jahre | § 147 AO, § 257 HGB |
| abschluss_zu_kurz | Jahresabschlüsse, Bilanzen, Bücher kürzer als 10 Jahre | § 147 Abs. 1 Nr. 1 AO, § 257 Abs. 1 Nr. 1 HGB |
| brief_zu_lang | Handels-/Geschäftsbriefe länger als 6 Jahre | § 257 Abs. 4 HGB |
| brief_zu_kurz | Handels-/Geschäftsbriefe kürzer als 6 Jahre | § 257 Abs. 4 HGB |
| lohnkonto_zu_kurz | Lohnkonto kürzer als 6 Jahre | § 41 Abs. 1 Satz 9 EStG |
| bewerber_zu_lang | Bewerberdaten länger als 6 Monate | § 15 Abs. 4 AGG, § 61b ArbGG |
| unbegrenzt | „unbegrenzt“, „dauerhaft“, „unbefristet“ | Art. 5 Abs. 1 lit. e DSGVO |
| fristbeginn_falsch | Frist „ab Belegdatum“ statt ab Ende des Kalenderjahres | § 147 Abs. 4 AO, § 257 Abs. 5 HGB |
| frist_fehlt | Datenkategorie ohne Löschfrist | Art. 30 Abs. 1 lit. f DSGVO |

## Beispiel (_fixtures/dirty.md, Stichtag 2026-09-28)

| Zeile im Löschkonzept | Korrekt |
|---|---|
| Eingangsrechnungen: 10 Jahre | 8 Jahre (BEG IV) — Jahrgänge 2016–2017 liegen 2 Jahrgänge zu lange |
| Kontoauszüge: ab Belegdatum | ab Ende des Kalenderjahres |
| Jahresabschlüsse: 6 Jahre | 10 Jahre |
| Geschäftsbriefe: 10 Jahre | 6 Jahre |
| Bewerbungsunterlagen: 24 Monate | 6 Monate nach Absage |
| Newsletter-Abonnenten: unbegrenzt | Löschfrist festlegen |

Mit dem Stichtag rechnet der Lint aus, welche Belegjahrgänge heute schon löschreif sind: am 2026-09-28 alle Jahrgänge bis 2017. Ändern Sie den Stichtag auf 2027-03-01, sind es die Jahrgänge bis 2018.

## So funktioniert es

1. Löschkonzept als Markdown-Tabelle öffnen (Spalten wie „Datenkategorie | Aufbewahrungsfrist | Fristbeginn | Rechtsgrundlage“).
2. Den Lint über die Befehlspalette (Strg+Shift+P) starten — Fundstellen erscheinen im Problems-Panel mit Zeile, korrekter Frist und Rechtsgrundlage.
3. Fließtext wird ignoriert; geprüft werden nur Tabellenzeilen, die Spalten werden über die Kopfzeile erkannt.

Alles läuft lokal. Es werden keine Daten übertragen.

## Kostenlos und Vollversion

Kostenlos: das offene Löschkonzept gegen alle 10 rules prüfen, jede Fundstelle mit Zeile und Rechtsgrundlage — ohne Schlüssel.
Vollversion (Lizenzschlüssel, einmalig): Löschkalender-Export als CSV (Löschdatum je Datenkategorie und Jahrgang) und Scan aller Löschkonzepte im Workspace.

## Zum Vergleich

Das Tagesseminar „DSGVO-konforme Löschkonzepte nach DIN 66398 in der Praxis“ der TÜV Rheinland Akademie kostet ab 760 Euro netto.

## Hinweis

Kein Rechtsrat. Branchenspezifische Fristen (z. B. Geldwäschegesetz, Patientenakten, Sozialversicherung) prüft der Lint nicht.

Web-Version und Updates: https://getreadystack.com/tools/loeschkonzept-fristen-lint
