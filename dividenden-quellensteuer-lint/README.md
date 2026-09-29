# Dividenden CSV Lint: Quellensteuer über DBA-Satz

![Dividenden CSV Lint: Quellensteuer über DBA-Satz — finds the line](https://getreadystack.com/img/promo/dividenden-quellensteuer-lint_demo.gif)

![Dividenden CSV Lint: Quellensteuer über DBA-Satz](https://getreadystack.com/img/promo/sku337281_result_card.jpg)

Ausländische Dividenden versteuern: Der Lint liest die Dividenden-CSV deines Brokers und zeigt pro Zeile, wie viel ausländische Quellensteuer über dem DBA-Satz liegt. Dieser Überhang wird auf die deutsche Abgeltungsteuer **nicht angerechnet** (§32d Abs. 5 EStG) — er ist nur im Quellenstaat erstattbar, und in der Schweiz nur bis zum 31.12. des dritten Jahres nach Fälligkeit (Art. 32 Abs. 1 VStG).

**Beispiel CSV mit 10 Dividenden (Stichtag 2026-09-27):** 8 Findings, **495,00 €** Quellensteuer über dem DBA-Satz, davon **120,00 € verfallen**.

| Zeile in der CSV | Befund |
|---|---|
| Roche · CH · 2022 · 35 % | 120,00 € verfallen · Frist endete 2025-12-31 |
| Nestlé · CH · 2023 · 35 % | 200,00 € · Formular 86 bis 2026-12-31 |
| Apple · US · 30 % | 60,00 € · W-8BEN fehlt |
| Novo Nordisk · DK · 27 % | 60,00 € über 15 % |
| Enbridge · CA · 25 % | 30,00 € über 15 % |
| Verbund · AT · 27,5 % | 25,00 € über 15 % |

Zwei weitere Warnungen in derselben Datei: Petrobras (BR, kein DBA-Satz in der Tabelle — Brasilien hat das DBA 2006 gekündigt) und eine Shell-Zeile ohne Quellensteuerbetrag.

## Was geprüft wird — 7 Regeln

| Regel | Stufe | Was sie meldet |
|---|---|---|
| `qst_ueber_dba` | Fehler | Quellensteuer über dem DBA-Satz (15 % für US, CH, AT, DK, FR, NL, BE, CA, IE, ES, IT, NO, FI, SE, GB, JP, AU, LU) mit Euro-Überhang |
| `us_ohne_w8ben` | Fehler | US-Dividende mit 30 % Einbehalt — W-8BEN fehlt oder ist abgelaufen |
| `ch_frist_verfallen` | Fehler | Schweizer Verrechnungssteuer: Erstattungsfrist (drei Jahre nach Jahresende) ist vorbei, der Überhang ist verloren |
| `ch_frist_bald` | Warnung | Schweizer Frist endet in höchstens 180 Tagen — Datum im Befund |
| `land_unbekannt` | Warnung | Land ohne DBA-Satz in der Tabelle, Quote nicht geprüft |
| `zeile_unlesbar` | Warnung | Brutto- oder Quellensteuerbetrag fehlt |
| `kopfzeile_fehlt` | Fehler | Keine Kopfzeile mit Land, Brutto und Quellensteuer |

Die Frist hängt vom Stichtag ab: Mit Stichtag 2027-01-02 wird aus der Nestlé-Warnung ein Fehler, und der verfallene Betrag steigt in derselben Datei von 120,00 € auf 320,00 €.

## CSV-Format

Eine Kopfzeile mit den Spalten **Land**, **Brutto** und **Quellensteuer** (deutsch oder englisch: country, gross, withholding), dazu optional **Datum** und **Wertpapier**. Trennzeichen `;` oder `,`, Beträge deutsch (`1.000,00`) oder englisch (`1,000.00`), Land als ISO-Code (`US`, `CH`) oder deutscher Name (`Schweiz`, `Dänemark`).

```
Datum;Wertpapier;Land;Brutto EUR;Quellensteuer EUR
2023-04-28;Nestlé;CH;1.000,00;350,00
2026-03-12;Apple;US;400,00;120,00
```

## Benutzung

Öffne eine `.csv`-Datei — die Befunde erscheinen im Problems-Fenster mit Zeilennummer. Die Datei verlässt deinen Rechner nicht.

Dasselbe Prüfwerk läuft kostenlos im Browser: https://getreadystack.com/de/tools/dividenden-quellensteuer-lint

## Vollversion

Vollversion: alle Dividenden-CSVs im Workspace über mehrere Steuerjahre in einem Lauf, plus Report-Export für Steuerberater oder Erstattungsantrag — einmalig $29, ein Lizenzschlüssel pro Person: https://getreadystack.com/api/buy/cl/polar_cl_7GkKs3zJ9Oz0rQXJbBeEXpfhu3g0WASHNagMQ1kGrvz

## Maßstab

Steuerberater: Zeitgebühr 16,50–41,00 € je angefangene Viertelstunde (§ 13 StBVV, seit 1. Juli 2025) — eine Stunde Belegabgleich kostet bis zu 164,00 €.

## Grenzen

Der Lint rechnet mit dem DBA-Satz für Streubesitz-Dividenden (15 %). Er ersetzt keine Steuerberatung und prüft nicht, ob dein Broker die Anrechnung schon selbst vorgenommen hat. Fristen anderer Quellenstaaten als der Schweiz nennt er nicht als Datum.
