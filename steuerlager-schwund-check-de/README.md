# Steuerlager-Schwund & Frist-Check (Alkohol)

Prüft die Lagerakte eines Steuerlagers im Editor: anerkannte Verlustsätze nach § 13 Abs. 2 AlkStV,
steuerpflichtige Überfehlmenge in Euro nach § 2 Abs. 1 AlkStG und die Anmeldefristen nach § 19 AlkStG.

Öffnen Sie Ihre Lagerakte (Markdown), rufen Sie `Steuerlager: Lagerakte prüfen` auf — die beanstandeten
Zeilen werden markiert und jede Meldung nennt den Paragrafen, aus dem sie kommt.

## Was der Prüfer rechnet

Fehlmengen im Steuerlager gelten nur bis zu den Verlustsätzen des § 13 Abs. 2 AlkStV als unwiederbringlich
verloren. Was darüber liegt, gilt nach § 13 Abs. 3 AlkStV als in den steuerrechtlich freien Verkehr
entnommen — und wird mit dem Regelsatz von 1303 Euro je Hektoliter reinen Alkohols versteuert
(§ 2 Abs. 1 AlkStG; ermäßigt 1022 Euro bzw. 730 Euro je hl A nach § 2 Abs. 2 AlkStG).

| Bereich | anerkannter Verlustsatz | Fundstelle |
| --- | --- | --- |
| Herstellung auf kaltem Weg | 1 % der verarbeiteten Menge | § 13 Abs. 2 Nr. 1 AlkStV |
| Auszugsverfahren, Abtrieb, Warmbehandlung | 3 % der verarbeiteten Menge | § 13 Abs. 2 Nr. 2 AlkStV |
| Abfüllung in Fertigpackungen bis 5 Liter | 0,5 % der eingesetzten Menge | § 13 Abs. 2 Nr. 3 Buchstabe a AlkStV |
| Abfüllung in andere Fertigpackungen | 0,3 % der eingesetzten Menge | § 13 Abs. 2 Nr. 3 Buchstabe b AlkStV |
| Lagerung in anderen Behältnissen | 1 % des durchschnittlichen Jahresbestandes | § 13 Abs. 2 Nr. 4 AlkStV |
| Lagerung in unbeschichteten Holzfässern | 4 % des durchschnittlichen Jahresbestandes | § 13 Abs. 2 Nr. 5 AlkStV |

Der Gesamtverlust ist die Summe dieser Sätze; höhere Verluste in einem Teilbereich dürfen durch niedrigere
in einem anderen ausgeglichen werden (§ 13 Abs. 2 Satz 2 und 3 AlkStV).

## Musterakte (`_fixtures/dirty.md`)

Bei 900,00 hl A kalter Verarbeitung, 300,00 hl A Abtrieb, 600,00 hl A Abfüllung bis 5 Liter,
200,00 hl A Abfüllung in andere Fertigpackungen, 400,00 hl A Lagerung in anderen Behältnissen und
150,00 hl A Lagerung in Holzfässern erkennt die Verordnung 31,60 hl A an. Festgestellt sind 38,00 hl A.
Die Überfehlmenge von 6,40 hl A kostet 8.339,20 Euro Alkoholsteuer bei 1303 Euro je hl A.
Sieben weitere Zeilen derselben Akte werden beanstandet, darunter die Steueranmeldung vom 21.08.2026
(Frist: 10.08.2026) und die eingetragene Fälligkeit 30.09.2026 statt 07.09.2026 — der 5. September 2026
ist ein Samstag, die Frist endet deshalb nach § 108 Abs. 3 AO am nächsten Werktag.

## Die 10 Regeln

1. `ueberfehlmenge` — Fehlmenge über dem anerkannten Gesamtverlust, in Euro (§ 13 Abs. 2 und 3 AlkStV)
2. `verlustsatz_falsch` — in der Akte angesetzter Verlustsatz weicht von § 13 Abs. 2 AlkStV ab
3. `steuersatz_falsch` — Steuersatz ist weder 1303 noch 1022 noch 730 Euro je hl A (§ 2 AlkStG)
4. `ermaessigt_ohne_nachweis` — ermäßigter Satz ohne Unabhängigkeit oder Bescheinigung (§ 2 Abs. 2 AlkStG)
5. `anmeldung_fehlt` — keine Steueranmeldung zum Steuermonat (§ 19 Abs. 1 Satz 1 AlkStG)
6. `anmeldung_verspaetet` — nach dem zehnten Tag des Folgemonats (§ 19 Abs. 1 Satz 1 AlkStG)
7. `faelligkeit_falsch` — nicht am fünften Tag des zweiten Folgemonats (§ 19 Abs. 1 Satz 2 AlkStG)
8. `bestandsanmeldung_verspaetet` — später als einen Monat nach der Bestandsaufnahme (§ 12 Abs. 1 AlkStV)
9. `anzeige_zu_spaet` — Beginn der Bestandsaufnahme weniger als drei Wochen vorher angezeigt (§ 12 Abs. 1 AlkStV)
10. `menge_ohne_einheit` — Menge ohne hl A, also ohne reinen Alkohol bei 20 Grad Celsius (§ 2 Abs. 1 AlkStG)

Samstags- und Sonntagsfristen verschiebt der Prüfer nach § 108 Abs. 3 AO auf den nächsten Werktag;
gesetzliche Feiertage der Länder sind nicht hinterlegt.

## Umfang

Ohne Schlüssel prüft die Erweiterung die geöffnete Lagerakte vollständig, mit allen 10 Regeln und dem
Eurobetrag. Die Vollversion prüft alle Lagerakten des Ordners in einem Lauf und schreibt den Prüfbericht
als Markdown oder CSV fürs Belegheft nach § 10 AlkStV heraus:
[Vollversion, $29 einmalig](https://buy.polar.sh/polar_cl_OqVgcTqJaaL6sNfNeKVVBkq2L21S7vaeNhqK01ov10k) — eine Lizenz je Person oder Team-Sitz,
7 Tage volle Rückerstattung.

Maßstab: Ein Steuerberater rechnet dieselbe Stunde nach § 13 StBVV mit einer Zeitgebühr von
16,50 bis 41 Euro je angefangene Viertelstunde ab.

Webversion und Schwesterwerkzeuge: https://getreadystack.com/tools/steuerlager-schwund-check-de

## Format der Lagerakte

Eine Zeile je Angabe, `Bezeichnung: Wert`. Erkannt werden Steuerentstehung (`2026-07`), Steueranmeldung,
Fälligkeit, Steuersatz, die sechs Mengenbereiche, `Verlustsatz <Bereich>`, `Fehlmenge festgestellt`,
`Anzeige Bestandsaufnahme`, `Bestandsaufnahme` und `Bestandsanmeldung`. Datumsangaben als `2026-08-10`
oder `10.08.2026`, Mengen mit Komma oder Punkt. Dateien ohne solche Zeilen bleiben unberührt.

## Haftungsausschluss

Rechenhilfe für die eigene Buchführung, keine Steuerberatung. Maßgeblich sind AlkStG, AlkStV, AO und
der Steuerbescheid des Hauptzollamts.
