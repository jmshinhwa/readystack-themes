# Steuer-Lint: Hinzurechnungsbesteuerung AStG 2026

![Steuer-Lint: Hinzurechnungsbesteuerung AStG 2026](https://getreadystack.com/img/promo/sku245388_result_card.jpg)

**KI-Entwurf: 25 % statt 15 % Niedrigsteuergrenze.** Diese Erweiterung prüft Mandanten-Memos, Gutachtenentwürfe und KI-Entwürfe zur Hinzurechnungsbesteuerung (Markdown und Text) gegen 10 Regeln aus AStG, GewStG und AO und meldet jede veraltete Aussage mit Zeile, Paragraf und dem Tag, seit dem die geltende Fassung gilt.

Gemessen an den mitgelieferten Memos: 10 Regeln, 0 Funde in `_fixtures/clean.md`, 10 Funde in `_fixtures/dirty.md` — 4 Fehler und 6 Warnungen aus 10 verschiedenen Regeln. Die Grenze von 15 % gilt am 2026-09-24 seit 997 Tagen.

## Das Problem

Sprachmodelle haben die Hinzurechnungsbesteuerung überwiegend aus Texten vor dem ATADUmsG (2021) und vor dem Mindeststeuergesetz (2023) gelernt. Ein KI-Entwurf schreibt deshalb oft noch „niedrige Besteuerung unter 25 % (§ 8 Abs. 3 AStG)“, prüft die Inländerbeherrschung oder behauptet, der Hinzurechnungsbetrag sei gewerbesteuerfrei. Jede dieser Aussagen ist heute falsch — und landet ungeprüft in der Mandantenakte.

## Die 10 Regeln

| Regel | Was gemeldet wird | Fundstelle |
|---|---|---|
| niedrigsteuer_25_prozent | Niedrigsteuergrenze 25 % statt 15 % | § 8 Abs. 5 AStG (seit 2024-01-01) |
| grenze_15_fehlt | Niedrigbesteuerung ohne die Grenze von 15 % | § 8 Abs. 5 AStG |
| paragraf_8_abs_3_alt | Niedrigbesteuerung in § 8 Abs. 3 verortet | § 8 Abs. 5 AStG |
| inlaenderbeherrschung | Inländerbeherrschung statt Beherrschung je Steuerpflichtigem | § 7 Abs. 2 AStG |
| gewerbesteuer_hinzurechnung | Hinzurechnungsbetrag „nicht der Gewerbesteuer“ unterworfen | § 7 Satz 7 GewStG |
| abgeltung_teileinkuenfte | Abgeltungsteuer, Teileinkünfteverfahren oder § 8b KStG auf den Hinzurechnungsbetrag | § 10 Abs. 2 AStG |
| gegenbeweis_drittstaat | Substanz-Gegenbeweis für Schweiz, Singapur, USA oder andere Drittstaaten | § 8 Abs. 2 AStG |
| mitteilung_mittelbar_25 | Mitteilungsschwelle „mittelbar 25 %“ | § 138 Abs. 2 AO |
| bussgeld_5000 | Bußgeld bis 5.000 Euro statt bis 25.000 Euro | § 379 AO |
| feststellung_18_fehlt | Kein Hinweis auf die gesonderte Feststellung | § 18 AStG |

Eine Zeile, die die alte Rechtslage ausdrücklich als „a. F.“, „früher“ oder „bis 2023“ kennzeichnet, wird nicht gemeldet. Texte, die weder AStG noch Hinzurechnung noch Zwischengesellschaft erwähnen, werden übersprungen.

## So benutzen Sie es

1. Memo öffnen (`.md` oder `.txt`).
2. Befehlspalette öffnen (Strg+Umschalt+P), „Steuer-Lint“ eingeben und die Prüfung der Datei oder des Ordners wählen.
3. Jeder Fund erscheint mit Zeile, Paragraf und Tageszahl.

Alles läuft offline in VS Code; kein Text verlässt den Rechner. Dieselbe Engine läuft auch als Webseite ohne Installation: https://getreadystack.com/de/tools/steuer-lint-astg-hinzurechnung

## Kostenlos und Vollversion

Kostenlos: die geöffnete Datei und der ganze Ordner, jeder Fund mit Zeile, Paragraf und Tageszahl — das reicht, um ein Memo zu korrigieren.
Vollversion: das datierte Prüfprotokoll je Mandantenakte mit Fundstelle und Paragraf je Fund exportieren, für Vier-Augen-Prüfung, Kanzleiakte und Nutzung im Team.

## Zum Vergleich

Eine Durchsicht durch eine Steuerberaterin für internationales Steuerrecht wird nach Zeit abgerechnet; 150 bis 300 Euro je Stunde sind in Deutschland üblich. Die Erweiterung ersetzt diese Beratung nicht, sondern die Suche nach veralteten Sätzen davor.

## Hinweis

Keine Steuerberatung. Die Regeln bilden den Stand 2026-09-24 ab (AStG i. d. F. ATADUmsG und MinBestRL-UmsG).
