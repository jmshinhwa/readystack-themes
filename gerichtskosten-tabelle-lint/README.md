# Kostentabellen-Lint: GKG & RVG 2025 für Mahn-Software

![Kostentabellen-Lint: GKG & RVG 2025 für Mahn-Software](https://getreadystack.com/img/promo/sku360399_result_card.jpg)

Findet in Quellcode und Konfiguration von Inkasso-, Mahn- und Kanzleisoftware die Gebührenwerte, die seit dem **1.6.2025** nicht mehr gelten: GKG-Tabelle (Anlage 2 zu § 34 GKG), RVG-Tabelle (Anlage 2 zu § 13 RVG), die Mahnbescheid-Mindestgebühr nach **Nr. 1100 KV GKG (38,00 € statt 36,00 €)** und einen falschen Gebührenfaktor für den Mahnbescheid.

Web-Version und Hintergrund: https://getreadystack.com/de/tools/gerichtskosten-tabelle-lint

## Was geprüft wird (5 Checks)

| Check | Schwere | Was er findet |
|---|---|---|
| `gkg-tabelle-2021` | Fehler | Eine Zeile mit Streitwertstufe und GKG-Gebühr von 2021, z. B. bis 5.000 €: 161,00 € statt 170,50 € |
| `rvg-tabelle-2021` | Fehler | Eine Zeile mit Gegenstandswert und RVG-Gebühr von 2021, z. B. bis 10.000 €: 614,00 € statt 652,00 € |
| `kv1100-mindestgebuehr-36` | Fehler | Mahnbescheid-Mindestgebühr 36 € statt 38 € (Nr. 1100 KV GKG) |
| `kv1100-faktor` | Fehler | Gerichtsgebühr für den Mahnbescheid nicht mit 0,5 gerechnet |
| `tabelle-stand-vor-2025` | Warnung | Kommentar/Config nennt einen Tabellen-Stand vor dem 1.6.2025 oder „KostRÄG 2021“ |

Alle Tabellenstufen bis 50.000 € sind hinterlegt (alt und neu), Schreibweisen wie `1.000`, `1000`, `1_000`, `161,00` und `170.5` werden erkannt. Zeilen mit „RVG“, „Anwalt“ oder „VV 3305“ gelten für die Anwaltsgebühr; dort ist der Faktor 1,0 richtig und wird nicht gemeldet.

## Gemessen an der Beispieldatei

Die Beispieldatei `_fixtures/dirty.ts` (ein Kostenmodul eines Inkasso-Backends) ergibt 7 Befunde: 6 Fehler und 1 Warnung. Die korrigierte Fassung `_fixtures/clean.ts` ergibt 0 Befunde.

Sechs Fehler: Mahnbescheid rechnet mit alten Werten — jede der sechs Fehlerzeilen steht in der Tabelle unten, dazu die Warnung zum Tabellen-Stand.

| Zeile im Code (Beispieldatei dirty.ts) | Wert seit 1.6.2025 |
|---|---|
| Stand 2021-01-01 (KostRÄG 2021) | Stand 2025-06-01 (KostRÄG 2025) |
| GKG bis 500 €: 38,00 € | 40,00 € |
| GKG bis 5.000 €: 161,00 € | 170,50 € |
| RVG bis 500 €: 49,00 € | 51,50 € |
| RVG bis 10.000 €: 614,00 € | 652,00 € |
| KV 1100 Mindestgebühr 36,00 € | 38,00 € |
| KV 1100 Faktor 1,0 | Faktor 0,5 |

## Beispielrechnung (Streitwert 5.000 €)

- Gerichtsgebühr Mahnbescheid, 0,5 nach KV 1100: **85,25 €** (mit der Tabelle von 2021: 80,50 €)
- Anwaltsgebühr Mahnantrag, 1,0 nach VV 3305 RVG: **354,50 €** (mit der Tabelle von 2021: 334,00 €)
- Streitwert 800 €: Gerichtsgebühr = Mindestgebühr **38,00 €** (vorher 36,00 €)

## Übergangsrecht

Für Verfahren, die vor dem 1.6.2025 anhängig wurden, gelten nach § 71 GKG die alten Gerichtskosten; für Anwaltsaufträge vor dem 1.6.2025 nach § 60 RVG die alte Vergütung. Deshalb hat der Check ein Stichtagsfeld: Mit einem Datum vor dem 1.6.2025 meldet er nichts.

## Benutzung

Datei öffnen — Befunde erscheinen im Problems-Fenster. Befehl: „Kostentabellen-Lint: aktuelle Datei prüfen“. Der Check läuft lokal, es wird kein Code hochgeladen.

## Grenzen

Tabellenstufen über 50.000 € und landesrechtliche Gebühren werden nicht geprüft. Der Check liest Zahlen zeilenweise; eine Tabelle, deren Stufe und Gebühr auf verschiedenen Zeilen stehen, wird nicht als Tabellenzeile erkannt.

## Maßstab

Eine anwaltliche 1,0-Gebühr nach VV 3305 RVG für einen Mahnantrag über 5.000 € beträgt 354,50 €.

## Vollversion

Vollversion ($29 einmal, ein Lizenzschlüssel pro Person oder Team-Platz): ganzer Workspace auf einmal, CSV-Bericht für das Audit, fertige 2025-Tabellen als JSON/TS/PHP. [Vollversion holen](https://buy.polar.sh/polar_cl_bDI4iUva3CinihoGSPIwtLaN7lolz9vP3HvmI2KzGRh)

Quellen: Anlage 2 GKG und Anlage 2 RVG in der Fassung BGBl. 2025 I Nr. 109 (gesetze-im-internet.de); Nr. 1100 KV GKG.
