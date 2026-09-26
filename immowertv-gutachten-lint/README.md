# Gutachten-Lint: ImmoWertV 2021 und BewG

![Gutachten-Lint: ImmoWertV 2021 und BewG](https://getreadystack.com/img/promo/sku273315_result_card.jpg)

**Für Immobiliensachverständige, Gutachterbüros und Steuerberater in Deutschland:** Die Erweiterung liest Ihren Verkehrswertgutachten-Entwurf (Markdown) und markiert jede Zeile, die noch mit abgelösten Normen oder alten Modellwerten arbeitet. Zu jedem Befund steht die Korrektur und die Fundstelle.

Im mitgelieferten Musterentwurf (Einfamilienhaus, Wertermittlungsstichtag 01.09.2026) findet sie **6 veraltete Angaben**; der bereinigte Entwurf ergibt **0 Befunde**.

## Was geprüft wird (13 Regeln)

| Regel | Befund | Korrektur |
|---|---|---|
| WERTV_1988 | WertV (1988) zitiert | ImmoWertV 2021 |
| IMMOWERTV_2010 | ImmoWertV 2010 zitiert | seit 1.1.2022 gilt die ImmoWertV 2021 |
| SW_RL | Sachwertrichtlinie (SW-RL) | ImmoWertV 2021 und ImmoWertA |
| EW_RL | Ertragswertrichtlinie (EW-RL) | ImmoWertV 2021 und ImmoWertA |
| VW_RL | Vergleichswertrichtlinie (VW-RL) | ImmoWertV 2021 und ImmoWertA |
| WERTR | WertR zitiert | ImmoWertV 2021 und ImmoWertA |
| NHK_2000 | NHK 2000 verwendet | NHK 2010 nach Anlage 4 ImmoWertV |
| GND_70 | Gesamtnutzungsdauer 70 Jahre für Wohngebäude | 80 Jahre (Anlage 1 ImmoWertV; Anlage 22 BewG für Stichtage nach 31.12.2022) |
| RND_MIN_30 | Restnutzungsdauer unter 30 % der Gesamtnutzungsdauer | im BewG-Verfahren regelmäßig mindestens 30 % (§ 185 Abs. 3 BewG) |
| LZS_188_ALT | Liegenschaftszins 5,0 % für Mietwohngrundstück | hilfsweise 3,5 % für Stichtage nach 31.12.2022 (§ 188 Abs. 2 BewG) |
| BRW_ALT | Bodenrichtwert-Stichtag mehr als 730 Tage vor dem Wertermittlungsstichtag | aktuellen Bodenrichtwert einsetzen (§ 196 BauGB) |
| REGIONALFAKTOR_FEHLT | Sachwertverfahren ohne Regionalfaktor | Regionalfaktor des Gutachterausschusses angeben (§ 36 Abs. 3 ImmoWertV) |
| BAUPREISINDEX_FEHLT | Sachwertverfahren ohne Baupreisindex | NHK 2010 mit Baupreisindex anpassen (§ 36 Abs. 2 ImmoWertV) |

Hart umbrochene Absätze werden vor der Prüfung zusammengezogen, damit ein Zeilenumbruch mitten in „Gesamtnutzungsdauer 70 Jahre“ keinen Befund verschluckt.

## Warum das wichtig ist

Das Jahressteuergesetz 2022 hat die Grundbesitzbewertung im Bewertungsgesetz an die ImmoWertV 2021 angepasst: Für Bewertungsstichtage nach dem 31.12.2022 gelten für Ein- und Zweifamilienhäuser, Mietwohngrundstücke und Wohnungseigentum 80 statt 70 Jahre Gesamtnutzungsdauer, und der hilfsweise Liegenschaftszins für Mietwohngrundstücke sank von 5,0 % auf 3,5 %. Textbausteine aus der Zeit davor wandern trotzdem weiter von Gutachten zu Gutachten. Ein Nachweis des niedrigeren gemeinen Werts, der mit alten Modellwerten rechnet, ist angreifbar.

## Benutzung

1. Gutachten-Entwurf als `.md` öffnen.
2. Befehlspalette: **Gutachten-Lint: Datei prüfen**. Befunde erscheinen im Problems-Fenster mit Zeilennummer.
3. Jede Zeile nach der Korrektur-Spalte oben anpassen und erneut prüfen, bis 0 Befunde bleiben.

Dieselbe Prüfung läuft ohne Installation im Browser: https://getreadystack.com/tools/immowertv-gutachten-lint

## Umfang

- Frei: die offene Datei, alle 13 Regeln, jeder Befund mit Korrektur und Fundstelle.
- Vollversion: alle Gutachten eines Ordners in einem Lauf und das Prüfprotokoll als Datei für die Akte.

## Zum Vergleich

Sachverständige rechnen 2026 meist 120–180 € pro Stunde ab; ein Verkehrswertgutachten für ein Einfamilienhaus kostet rund 1.800–2.800 €.

## Grenzen

Die Erweiterung ersetzt keine Wertermittlung und keine Rechtsberatung. Sie prüft Text auf bekannte veraltete Zitate und Modellwerte; ob ein örtlicher Gutachterausschuss abweichende Modellparameter veröffentlicht, müssen Sie selbst prüfen. Alles läuft lokal, der Text verlässt Ihren Rechner nicht.
