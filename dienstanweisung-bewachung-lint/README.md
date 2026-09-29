# Dienstanweisung Bewachung: BewachV-Check

![Dienstanweisung Bewachung: BewachV-Check — finds the line](https://getreadystack.com/img/promo/dienstanweisung-bewachung-lint_demo.gif)

![Dienstanweisung Bewachung: BewachV-Check](https://getreadystack.com/img/promo/sku330906_result_card.jpg)

Zeigt, welche Pflichtinhalte in der Dienstanweisung eines Bewachungsunternehmens fehlen: § 17, 18, 20 BewachV und § 34a Abs. 1a GewO. 12 rules, Zeile und Fix je Befund.

**Gemessen an der Beispiel-Dienstanweisung (Einlassdienst Diskothek): Dienstanweisung Bewachung: 6 Pflichtinhalte fehlen · 12 rules · 1 file.** Keine Zustimmung des Gewerbetreibenden für Waffen (Zeile 19), Anzeige nach Waffengebrauch ohne Polizeidienststelle (Zeile 21), keine Empfangsbescheinigung (Zeile 26), kein Namensschild beim Einlass (Zeile 1), keine Bewacherregister-ID im Dienstausweis (Zeile 15), keine Verschwiegenheitsverpflichtung (Zeile 1). Bereinigte Fassung: 0 Befunde.

Web-Version und Anleitung: https://getreadystack.com/de/tools/dienstanweisung-bewachung-lint

## Für wen
Bewachungsunternehmer mit Erlaubnis nach § 34a GewO, Objektleiter und Qualitätsbeauftragte von Sicherheitsdiensten, die ihre Dienstanweisungen als Markdown- oder Textdatei pflegen: Objektschutz, Einlassdienst, Citystreife, Werttransport, Veranstaltungen.

## Maßstab
Wer den Wachdienst nicht, nicht richtig oder nicht vollständig durch eine Dienstanweisung regelt, handelt nach § 22 Abs. 1 Nr. 2 BewachV ordnungswidrig; § 144 Abs. 4 GewO sieht dafür eine Geldbuße bis zu 3.000 Euro vor. Jede Wachperson muss vor der ersten Aufnahme der Bewachungstätigkeit einen Abdruck gegen Empfangsbescheinigung erhalten (§ 17 Abs. 2 BewachV).

## Die 12 Regeln
| ID | Prüft | Grundlage |
|---|---|---|
| BW01 | Hinweis auf fehlende Polizeibefugnisse fehlt | § 17 Abs. 1 Satz 2 BewachV |
| BW02 | Formel mit "Hilfspolizeibeamter" aus älterer Vorlage | § 17 Abs. 1 Satz 2 BewachV |
| BW03 | Waffen ohne Zustimmung des Gewerbetreibenden geregelt | § 17 Abs. 1 Satz 3 BewachV |
| BW04 | Anzeigepflicht nach Waffengebrauch unvollständig | § 17 Abs. 1 Satz 3 BewachV |
| BW05 | Aushändigung gegen Empfangsbescheinigung fehlt | § 17 Abs. 2 BewachV |
| BW06 | Verschwiegenheitsverpflichtung fehlt | § 17 Abs. 3 BewachV |
| BW07 | Pflicht zum Mitführen und Vorzeigen des Ausweises fehlt | § 18 Abs. 2 BewachV |
| BW08 | Bewacherregister-ID fehlt in der Ausweisbeschreibung | § 18 Abs. 1 Satz 2 Nr. 5 BewachV |
| BW09 | Namensschild oder Kennnummer fehlt | § 18 Abs. 3 BewachV |
| BW10 | Sachkundeprüfung für diese Tätigkeit nicht verlangt | § 34a Abs. 1a Satz 2 GewO |
| BW11 | Rückgabe von Waffen und Munition nicht geregelt | § 20 Abs. 1 BewachV |
| BW12 | Stand der Dienstanweisung liegt vor der geltenden BewachV | BewachV vom 3. Mai 2019, gilt ab 2019-06-01 |

## So arbeitet der Check
Öffnen Sie eine Dienstanweisung (.md) in VS Code. Jeder Befund steht im Problems-Fenster mit Regel-ID, Paragraf, Zeile und einem Formulierungsvorschlag. Die Tätigkeit wird an Schlüsselwörtern erkannt: Diskothek oder Türsteher, öffentlicher Verkehrsraum oder Citystreife, Ladendetektiv, Flüchtlingsunterkunft, Großveranstaltung oder Stadion. Für diese Tätigkeiten nach § 34a Abs. 1a Satz 2 GewO verlangt der Check zusätzlich Namensschild (§ 18 Abs. 3 BewachV) und Sachkundeprüfung. Umlaute und ß werden gleichgesetzt („Stosswaffen“ = „Stoßwaffen“), Zeilenumbrüche mitten im Satz stören nicht. Alles läuft lokal; es wird nichts hochgeladen.

## Warum ein Muster nicht reicht
Ein Muster aus dem Netz oder ein Chatbot-Entwurf liefert einen neuen Text, prüft aber nicht Ihre vorhandene, über Jahre gewachsene Datei. Der geltende Wortlaut von § 17 Abs. 1 Satz 2 BewachV nennt Polizeivollzugsbeamte und sonstige Bedienstete einer Behörde; steht in Ihrer Vorlage „Hilfspolizeibeamter“, meldet BW02 das als Hinweis. Liegt der Stand vor 2019-06-01, meldet BW12 das mit dem Alter in Tagen.

## Grenzen
Keine Rechtsberatung. Der Check erkennt Pflichtsätze an Schlüsselwörtern, nicht ihre juristische Qualität. Auflagen aus Ihrer Erlaubnis und Vorgaben des Auftraggebers prüft er nicht.

## Kostenlos und Vollversion
Kostenlos: Eine Dienstanweisung prüfen: jeder fehlende Pflichtsatz nach BewachV mit Zeile, Paragraf und Formulierungsvorschlag.

Vollversion ($29 einmalig, ein Lizenzschlüssel pro Person oder Team-Platz): Alle Dienstanweisungen eines Ordners (ein Objekt je Datei) auf einmal prüfen und ein datiertes Prüfprotokoll als Markdown und CSV für die Belegsammlung nach § 21 BewachV exportieren.
