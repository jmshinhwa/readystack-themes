# Förderquoten-Lint Weiterbildung (SGB III)

![Förderquoten-Lint Weiterbildung (SGB III)](https://getreadystack.com/img/promo/sku300155_result_card.jpg)

**Kursseite: Arbeitsagentur zahlt 3.200 € Weiterbildungskosten nicht** – das ist der Befund für eine Beispielseite mit 6.400 € Kursgebühr, die Betrieben mit 50 bis 499 Beschäftigten noch 100 % der Lehrgangskosten verspricht. Seit 2024-04-01 übernimmt die Agentur für Arbeit in dieser Größenklasse 50 %; der Betrieb trägt 3.200 € selbst.

Diese Erweiterung prüft Markdown-Kursseiten und Förder-Merkblätter von Bildungsträgern, Personalabteilungen und Weiterbildungsberatungen gegen § 82 SGB III in der Fassung des Aus- und Weiterbildungsgesetzes (in Kraft seit 2024-04-01). Sie arbeitet mit 16 rules und 2 inputs: dem Text der Datei und dem Prüfdatum.

## Was geprüft wird (16 rules)

| Regel | Befund |
|---|---|
| stale_tier_10 | Größenklasse „unter 10 Beschäftigte“ aus der alten Staffel |
| stale_tier_250 | Größenklassen 10 bis 249 / 250 bis 2.499 |
| stale_tier_2500 | Größenklasse „ab 2.500 Beschäftigte“ |
| stale_rate_15 | Fördersatz 15 % (alte Klasse ab 2.500) |
| hours_160 | Mindestdauer 160 Stunden statt mehr als 120 |
| hours_120_inclusive | „ab 120 Stunden“ – das Gesetz sagt mehr als 120 |
| course_too_short | Kursumfang höchstens 120 Stunden bei Förderversprechen |
| rate_lt50 | falscher Satz für weniger als 50 Beschäftigte (100 % / 75 %) |
| rate_mid | falscher Satz für 50 bis 499 Beschäftigte (50 % / 55 %) |
| rate_ge500 | falscher Satz für 500 Beschäftigte oder mehr (25 % / 30 %) |
| age45_250 | 45+ oder Schwerbehinderung mit alter Grenze 250 statt 500 |
| azav_missing | keine Angabe zur Zulassung von Maßnahme und Träger (AZAV) |
| antrag_missing | kein Hinweis, dass der Antrag vor Beginn gestellt sein muss |
| stand_before_reform | Stand der Seite vor 2024-04-01 |
| stand_stale | Stand älter als 365 Tage am Prüfdatum |
| start_passed | Kursbeginn liegt am Prüfdatum schon zurück |

Wenn die Seite eine Kursgebühr nennt, rechnet `rate_mid` bzw. `rate_ge500` den Eigenanteil des Betriebs aus: bei 6.400 € und 500 Beschäftigten oder mehr trägt der Betrieb 4.800 € (Agentur 25 %).

## Geltende Werte (§ 82 SGB III)

- Lehrgangskosten: weniger als 50 Beschäftigte 100 %, 50 bis 499 Beschäftigte 50 %, 500 Beschäftigte oder mehr 25 %.
- Mit Betriebsvereinbarung oder Tarifvertrag zur Weiterbildung: fünf Prozentpunkte mehr (55 % / 30 %).
- Arbeitsentgeltzuschuss: 75 % / 50 % / 25 %.
- Weniger als 500 Beschäftigte und Person ab dem 45. Lebensjahr oder schwerbehindert: keine Kostenbeteiligung des Arbeitgebers.
- Maßnahme mehr als 120 Stunden, Maßnahme und Träger zugelassen, Antrag vor Beginn (§ 324 SGB III).

Quelle: Gesetzestext § 82 SGB III auf gesetze-im-internet.de.

## Bedienung

Markdown-Datei öffnen und über die Befehlspalette die Befehle von „Förderquoten-Lint“ aufrufen. Jeder Befund nennt Zeilennummer, Regel-ID und geltenden Wert. Die Engine (`engine.js`, `rules.json`) läuft lokal, ohne Netzwerk.

Die Web-Version mit derselben Engine: https://getreadystack.com/de/tools/weiterbildung-foerderquote-lint

Vollversion mit Lizenzschlüssel: alle Kursseiten im Workspace in einem Lauf prüfen und den Befund als Markdown-Bericht speichern. Eine Datei zu prüfen bleibt ohne Schlüssel vollständig.

Zum Vergleich: Eine anwaltliche Erstberatung kostet Verbraucher höchstens 190 € netto (RVG); für Unternehmen gilt diese Kappung nicht.

Keine Rechtsberatung. Die Entscheidung über eine Förderung trifft die Agentur für Arbeit im Ermessen.
