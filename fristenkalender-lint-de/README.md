# Fristenkalender Lint: Fristen berechnen nach Bundesland

![Fristenkalender Lint: Fristen berechnen](https://getreadystack.com/img/promo/sku250631_result_card.jpg)

**Eine Fristenkalender-CSV, 7 Zeilen, 6 falsch berechnete Fristenden** — das ist unser Test-Fixture `dirty.csv`. Diese Erweiterung rechnet jedes notierte Fristende nach §§ 187–193 BGB und § 222 Abs. 2 ZPO neu und zeigt pro Zeile das richtige Datum, den Wochentag und den Grund.

Web-Version und Hintergrund: https://getreadystack.com/de/tools/fristenkalender-lint-de

## Was geprüft wird (12 rules)

| Regel | Norm | Fund |
|---|---|---|
| FR01 | CSV | Zeile hat weniger als 5 Spalten |
| FR02 | § 187 BGB | Datum ungültig (YYYY-MM-DD oder TT.MM.JJJJ) |
| FR03 | § 188 BGB | Fristdauer unlesbar (14 Tage, 2 Wochen, 1 Monat, 1 Jahr) |
| FR04 | § 193 BGB | Bundesland fehlt — Landesfeiertage nicht prüfbar |
| FR05 | § 188 BGB | Fristende nicht eingetragen |
| FR06 | § 193 BGB / § 222 Abs. 2 ZPO | Fristende fällt auf Samstag, Sonntag oder Feiertag im Land |
| FR07 | § 187 Abs. 1 BGB | Zustelltag mitgezählt — Fristende einen Tag zu früh |
| FR08 | § 188 Abs. 3 BGB | Monatsfrist über das Monatsende hinaus gerechnet |
| FR09 | § 193 BGB | Verschoben wegen eines Feiertags, der im Land nicht gilt |
| FR10 | § 193 BGB | 24.12. oder 31.12. als Feiertag behandelt |
| FR11 | §§ 187–193 BGB | Fristende zu spät notiert |
| FR12 | §§ 187–193 BGB | Fristende zu früh notiert |

Die Feiertage werden für alle 16 Länder selbst berechnet (Ostern nach der Gauß-Formel, Buß- und Bettag als Mittwoch vor dem 23. November, Reformationstag, Allerheiligen, Fronleichnam, Heilige Drei Könige, Frauentag, Weltkindertag). Kommunale Sonderfälle wie Mariä Himmelfahrt in Teilen Bayerns sind nicht enthalten.

## Dateiformat

```
akte;ereignis;zugang;frist;fristende;land
2026/0201;Zustellung Urteil (Berufung);2026-10-31;1 Monat;2026-12-01;NW
```

Trennzeichen `;`, `,` oder Tab. Land als Kürzel (BW, BY, BE, BB, HB, HH, HE, MV, NI, NW, RP, SL, SN, ST, SH, TH).

## Gemessen an unseren Fixtures

`dirty.csv` (7 Zeilen, Stichtag 2026-09-24) ergibt 6 Funde:

- NW, 1 Monat ab 2026-10-31: notiert 2026-12-01, richtig 2026-11-30 (§ 188 Abs. 3 BGB)
- BY, 2 Wochen ab 2026-11-04: notiert 2026-11-19, richtig 2026-11-18 (Buß- und Bettag gilt nur in Sachsen)
- HE, 1 Monat ab 2026-11-24: notiert 2026-12-28, richtig 2026-12-24 (Heiligabend ist Werktag)
- NW, 1 Monat ab 2026-09-03: notiert 2026-10-03, richtig 2026-10-05 (Tag der Deutschen Einheit, Samstag)
- BE, 2 Wochen ab 2026-10-07: notiert 2026-10-20, richtig 2026-10-21 (Zustelltag mitgezählt)
- HH, 1 Monat ab 2026-11-02: notiert 2026-12-03, richtig 2026-12-02 (1 Tag zu spät)

`clean.csv` (10 Zeilen) ergibt 0 Funde.

## Warum das zählt

Die Berufungsfrist beträgt 1 Monat (§ 517 ZPO), die Begründungsfrist 2 Monate (§ 520 Abs. 2 ZPO), die Kündigungsschutzklage 3 Wochen (§ 4 KSchG). Ein Fristende, das einen Tag zu spät im Kalender steht, wird erst bemerkt, wenn die Frist schon abgelaufen ist.

**Maßstab:** Eine 1,3-Verfahrensgebühr bei 5.000 € Streitwert beträgt nach RVG 2025 460,85 € netto — das ist die Gebühr, die mit einer versäumten Frist auf dem Spiel steht.

## Benutzung

- Eine `.csv` öffnen — die Funde erscheinen im Problems-Fenster.
- Alles läuft offline, keine Daten verlassen den Rechner.

## Grenzen

Das Werkzeug prüft Rechenregeln, keine Einzelfallfragen (Wiedereinsetzung, richterliche Fristverlängerung, Zustellungsmängel). Es ersetzt nicht die Fristenkontrolle durch den Anwalt.

## Umfang

Frei: eine Datei prüfen, alle 12 rules, alle 16 Länder. Vollversion: alle CSV-Exporte eines Ordners in einem Lauf und eine Fristenliste für die Kanzleiakte.
