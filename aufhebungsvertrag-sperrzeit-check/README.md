# Arbeitslosengeld-Check für Aufhebungsverträge

![Arbeitslosengeld-Check für Aufhebungsverträge](https://getreadystack.com/img/promo/sku237598_result_card.jpg)

Prüft einen Aufhebungsvertrag (Markdown) vor der Unterschrift auf alles, was das Arbeitslosengeld (ALG) kostet: Sperrzeit nach § 159 SGB III, Kürzung der Anspruchsdauer nach § 148, Ruhen wegen Abfindung nach § 158, Kündigungsfrist nach § 622 BGB, Schriftform nach § 623 BGB und Arbeitsuchendmeldung nach § 38 SGB III. Stand: Gesetzestext September 2026.

Kostenlose Web-Version und Hintergrund: https://getreadystack.com/tools/aufhebungsvertrag-sperrzeit-check

Zum Vergleich: Eine anwaltliche Erstberatung für Verbraucher kostet ohne Gebührenvereinbarung bis zu 190 € (§ 34 Abs. 1 RVG).

## Musterfall (`_fixtures/dirty.md`)

Arbeitnehmerin, 58 Jahre, seit 01.03.2008 im Betrieb (18 Jahre), Bruttomonatsgehalt 5.200 €, Abfindung 62.400 €, Vereinbarung vom 15.09.2026, Beendigung zum 31.10.2026, „auf Wunsch des Arbeitnehmers“, Unterzeichnung per DocuSign. Der Check meldet 8 Befunde:

| Vertragszeile | Korrektur |
|---|---|
| „auf Wunsch des Arbeitnehmers“ | Sperrzeit 12 Wochen (§ 159) – Anlass: „zur Vermeidung einer betriebsbedingten Kündigung“ |
| kein Kündigungsgrund genannt | Anspruchsdauer 24 Monate = 720 Tage, minus 180 Tage (§ 148 Abs. 1 Nr. 4) |
| Beendigung zum: 31.10.2026 | Frist § 622 BGB: 6 Monate zum Monatsende, frühestens 31.03.2027 (151 Tage zu früh) |
| Abfindung: 62.400 € | ALG ruht 91 Tage (01.11.2026–30.01.2027): 25 % = 15.600 € ÷ 170,96 € Tagesentgelt |
| Abfindung: 62.400 € | 0,67 Monatsgehälter je Beschäftigungsjahr, Band 0,25–0,5 = bis 46.800 € |
| Urlaubsabgeltung | verlängert den Ruhenszeitraum (§ 158 Abs. 1 Satz 5) |
| Unterzeichnung per DocuSign | § 623 BGB: elektronische Form ausgeschlossen – Papier, eigenhändig |
| keine Meldeklausel | § 38: arbeitsuchend melden bis 18.09.2026, sonst 1 Woche Sperrzeit |

Zweiter Fall: 45 Jahre, 8 Jahre im Betrieb, 3.800 € brutto, 15.000 € Abfindung, betriebsbedingt, Beendigung einen Monat nach Vereinbarung → keine Sperrzeit, aber ALG ruht 54 Tage (45 % = 6.750 € ÷ 124,93 €). Die saubere Vorlage (`_fixtures/clean.md`) ergibt 0 Befunde.

## Die 9 Regeln

| ID | Paragraf | Was geprüft wird |
|---|---|---|
| AV-FORM-623 | § 623 BGB | DocuSign, E-Mail, eingescannte Unterschrift |
| AV-INITIATIVE | § 159 Abs. 1 Nr. 1 SGB III | „auf Wunsch/Veranlassung des Arbeitnehmers“, Eigenkündigung |
| AV-KEIN-GRUND | § 159 Abs. 3, § 148 SGB III | kein Hinweis auf drohende Arbeitgeberkündigung; rechnet die Kürzung nach § 147-Tabelle |
| AV-FRIST-622 | § 622 Abs. 2 BGB | Beendigung vor dem Ende der Arbeitgeber-Kündigungsfrist |
| AV-RUHEN-158 | § 158 Abs. 2 SGB III | Ruhenstage: 60 % minus 5 % je 5 Jahre Betrieb und je 5 Lebensjahre über 35, mindestens 25 % |
| AV-ABFINDUNG-BAND | BA-Weisungen zu § 159 | Abfindung außerhalb 0,25–0,5 Monatsgehälter je Jahr |
| AV-MELDUNG-38 | § 38 Abs. 1 SGB III | Meldedatum: 3 Monate vorher oder 3 Tage nach Kenntnis |
| AV-URLAUB-158 | § 158 Abs. 1 Satz 5 SGB III | Urlaubsabgeltung bei unterschrittener Frist |
| AV-ANGABEN | § 622 BGB, § 158 SGB III | fehlende Daten für die Rechnung |

## Eingabezeilen

Der Check liest diese Zeilen (Datum TT.MM.JJJJ, Betrag mit €): `Beschäftigt seit:`, `Geburtsdatum:`, `Datum der Vereinbarung:`, `Beendigung zum:`, `Bruttomonatsgehalt:`, `Abfindung:`. Die Anspruchsdauer wird bei durchgehender Versicherungspflicht in den letzten 5 Jahren angenommen; längere Tarif- oder Vertragsfristen gehen der gesetzlichen Frist vor. Keine Rechtsberatung.

## Nutzung

Datei öffnen – Befunde erscheinen im Problems-Panel. Befehlspalette: „Aufhebungsvertrag“.

Vollversion (Prüfprotokoll-Export mit allen Rechenschritten, Workspace-Scan aller Vertragsentwürfe): https://buy.polar.sh/polar_cl_EmLyrHp9cLvnZL1P7pFYbCGL84Sf98KnMiGBX15eqV0 – $29 einmalig, ein Lizenzschlüssel pro Person oder Team-Platz.
