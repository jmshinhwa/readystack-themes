# Förderantrag-Prüfer: EGZ, KUG, Weiterbildung

![Förderantrag-Prüfer: EGZ, KUG, Weiterbildung](https://getreadystack.com/img/promo/sku223881_result_card.jpg)

Prüft Ihren Förderantrag-Entwurf an die Arbeitsagentur (Markdown), bevor er rausgeht: Antrag vor Beginn, Höchstsätze, Staffeln und Fristen nach SGB III. Jeder Befund steht in der Zeile, in der er entsteht, mit Paragraf und Korrektur.

**Beispiel aus der Testdatei:** Eingliederungszuschuss beantragt am 03.03.2026, Arbeitsbeginn 01.03.2026, Arbeitsentgelt €3.200, Förderhöhe 50 %, Förderdauer 12 Monate → nach § 324 Abs. 1 SGB III ausgeschlossen, verloren: **€19.200** (ohne SV-Pauschale).

## Was geprüft wird (14 Checks)

| Check | Grundlage | Was passiert |
|---|---|---|
| Antrag nach Beginn | § 324 Abs. 1 SGB III | Antragsdatum nach Arbeits-, Maßnahme- oder Gründungsbeginn → Fehler, beim EGZ mit verlorenem Betrag |
| EGZ über Höchstsatz | § 89 / § 90 | mehr als 50 % (schwerbehindert 70 %) |
| EGZ über Höchstdauer | § 89 / § 90 | mehr als 12 Monate (schwerbehindert 24, besonders betroffen 60) |
| Nachbeschäftigung fehlt | § 92 Abs. 2 | keine Nachbeschäftigungszeit im Antrag |
| Entgelt über BBG | § 91 Abs. 1 | mehr als €8.450 im Monat (BBG 2026) |
| Lehrgangskosten-Staffel | § 82 Abs. 2 | unter 50 Beschäftigte 100 %, 50–499: 50 %, ab 500: 25 % |
| Arbeitsentgeltzuschuss-Staffel | § 82 Abs. 3 | bis 75 % / 50 % / 25 % |
| Umfang bis 120 Stunden | § 82 Abs. 1 | gefördert wird erst ab mehr als 120 Stunden |
| AZAV fehlt | § 82 / § 179 | keine Maßnahmenummer oder Zulassung genannt |
| KUG-Anzeige zu spät | § 99 Abs. 2 | Anzeige erst im Monat nach Kurzarbeitsbeginn |
| KUG-Ausschlussfrist | § 325 Abs. 3 | Leistungsantrag nach Ende des dritten Folgemonats; Warnung 14 Tage vorher |
| GZ-Restanspruch | § 93 Abs. 2 Nr. 1 | weniger als 150 Tage Arbeitslosengeld |
| Tragfähigkeit fehlt | § 93 Abs. 2 | keine fachkundige Stelle genannt |
| GZ-Pauschale | § 94 | Pauschale nicht €300 im Monat |

Beispiel Frist: Für den Anspruchsmonat 06/2026 endet die Ausschlussfrist für den Leistungsantrag Kurzarbeitergeld am 30.09.2026.

## So schreiben Sie den Entwurf

Eine Überschrift je Leistung (`## Eingliederungszuschuss …`, `## Weiterbildung nach § 82 …`, `## Kurzarbeit …`, `## Gründungszuschuss …`), darunter Zeilen `Feld: Wert`, zum Beispiel `Antragsdatum: 03.03.2026`, `Beschäftigungsbeginn: 01.03.2026`, `Förderhöhe: 50 %`. Datumsformate TT.MM.JJJJ und JJJJ-MM-TT, Monate als MM/JJJJ. Schreibweisen mit ä/ö/ü und ae/oe/ue werden beide erkannt.

## Benutzung

- Datei öffnen → Befunde erscheinen im Problems-Panel.
- Befehlspalette: „Förderantrag-Prüfer: aktuelle Datei prüfen“.
- Web-Version ohne Installation: https://getreadystack.com/de/tools/foerderantrag-pruefer-sgb3

## Zum Vergleich

Steuerberater-Zeitgebühr nach § 13 StBVV (seit 1.7.2025): €16,50 bis €41 je angefangene Viertelstunde.

## Vollversion

Ganzer Workspace in einem Lauf plus Prüfbericht-Export (HTML) je Antrag: [Vollversion – $29 einmalig](https://buy.polar.sh/polar_cl_lxdT1xsxne1zlc7CxeC5nRClkdtwQH8mzgujr0IBWYk). Die Prüfung einer Datei bleibt ohne Schlüssel vollständig.

## Grenzen

Der Prüfer ersetzt keine Rechtsberatung und keine Ermessensentscheidung der Agentur für Arbeit. Er prüft nur, was im Entwurf steht; fehlende Felder erzeugen keinen Befund.
