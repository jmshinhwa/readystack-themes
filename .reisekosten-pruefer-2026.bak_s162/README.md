# Reisekostenabrechnung Prüfer 2026 (DE)

![Reisekostenabrechnung Prüfer 2026 (DE)](https://getreadystack.com/img/promo/sku165180_result_card.jpg)

Diese Erweiterung liest eine als CSV exportierte Reisekostenabrechnung im Editor und prüft jede Zeile gegen das deutsche Reisekostenrecht. Sie läuft offline; die Datei verlässt den Rechner nicht.

Hub: https://getreadystack.com/tools/reisekosten-pruefer-2026

## Was geprüft wird

15 Checks aus Paragraf 9 Absatz 4a EStG, Paragraf 9 Absatz 1 Satz 3 Nummer 4a EStG, Paragraf 41b EStG, Paragraf 41c EStG, Richtlinie 8.1 LStR und Richtlinie 9.7 LStR:

- Verpflegungspauschale 28,00 Euro ab 24 Stunden Abwesenheit, 14,00 Euro am An- und Abreisetag und über 8 Stunden, keine Pauschale bis 8 Stunden.
- Mahlzeitenkürzung: 5,60 Euro fürs Frühstück (20 Prozent der 28,00-Euro-Pauschale), 11,20 Euro je Mittag- oder Abendessen (40 Prozent).
- Dreimonatsfrist: nach 3 Monaten derselben auswärtigen Tätigkeitsstätte entfällt die Verpflegungspauschale.
- Kilometersatz 0,30 Euro für den eigenen Pkw; die Erweiterung rechnet den zu viel erstatteten Betrag aus.
- Auslandstage, die mit dem Inlandssatz gebucht wurden: dort gelten die Länderpauschalen des BMF-Schreibens.
- Reiseanlass und Reiseziel vorhanden, Übernachtungspauschale über 20,00 Euro ohne Beleg, Großbuchstabe M bei gestellter Mahlzeit, Mahlzeit über 60,00 Euro.
- Korrekturfenster: der Lohnsteuerabzug 2026 kann nach Paragraf 41c Absatz 3 EStG nur bis zum 28.02.2027 selbst geändert werden. Prüfen Sie mit einem späteren Stichtag, meldet die Erweiterung die Anzeigepflicht nach Paragraf 41c Absatz 4 EStG.

## Dateiformat

Eine Kopfzeile und eine Zeile je Reisetag, getrennt durch Semikolon, Tabulator oder Komma. Erkannt werden unter anderem die Spalten `datum`, `ziel`, `land`, `anlass`, `abwesenheit_std`, `verpflegung_eur`, `fruehstueck`, `mittag`, `abend`, `kuerzung_eur`, `km`, `km_satz_eur`, `uebernachtung_eur`, `beleg`, `tage_am_ort`, `m_kennzeichen`, `mahlzeitwert_eur`. Beträge dürfen deutsch geschrieben sein (`28,00`).

## Beispieldateien

`_fixtures/dirty.csv` enthält 6 Zeilen und ergibt 6 Feststellungen; `_fixtures/clean.csv` ergibt keine. Damit lässt sich prüfen, ob die Erweiterung im eigenen Export greift, bevor echte Daten geöffnet werden.

## Benutzung

Abrechnung öffnen, Befehlspalette, `Reisekosten: Datei prüfen`. Jede Feststellung nennt Zeilennummer, Betrag und Paragraf.

## Umfang

Kostenlos: die geöffnete Abrechnung vollständig prüfen, alle 15 Checks, jede Feststellung mit Zeilennummer, Betrag und Paragraf.

Vollversion: ganzer Ordner auf einmal plus Prüfprotokoll als Datei für die Betriebsprüfungsakte (Export, Team-Lizenz). Lizenzschlüssel und Bezug: https://buy.polar.sh/polar_cl_UqSgVzrLBeIaOMlZpRX9ZiCx6qWkGsBCsteM60CbCPh

Maßstab: eine Steuerkanzlei rechnet dieselbe Durchsicht nach StBVV-Zeitgebühr ab, 30 bis 70 Euro je angefangene halbe Stunde.

## Grenzen

Die Erweiterung kennt die Inlandssätze. Für Auslandstage meldet sie, dass der Inlandssatz gebucht wurde, nennt aber keinen Länderbetrag, weil die Länderpauschalen jährlich mit einem neuen BMF-Schreiben wechseln. Sie ersetzt keine steuerliche Beratung.

## Lizenz

MIT für den Code der kostenlosen Prüfung, siehe LICENSE.txt.
