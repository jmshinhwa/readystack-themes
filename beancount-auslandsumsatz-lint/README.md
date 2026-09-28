# Beancount/hledger Auslandsumsatz-Check (UStG)

![Beancount/hledger Auslandsumsatz-Check (UStG) — finds the line](https://getreadystack.com/img/promo/beancount-auslandsumsatz-lint_demo.gif)

![Beancount/hledger Auslandsumsatz-Check (UStG)](https://getreadystack.com/img/promo/sku320201_result_card.jpg)

**Stand 2026-09-23, Beispieljournal: 10 Befunde, ZM für Q2 2026 seit 58 Tagen überfällig (Frist 2026-07-27).** Nach der Korrektur: 0 Befunde.

Diese VS-Code-Erweiterung prüft Beancount- und hledger-Journale von Freiberuflern und kleinen Firmen in Deutschland, die Kunden im EU-Ausland und in Drittländern haben. Sie liest jede Transaktion, die ein Einnahmen-Konto berührt (Income, Einnahmen, Erlöse, Erträge, Revenue), und prüft sie gegen 10 Regeln aus dem Umsatzsteuergesetz. Jeder Befund steht mit Zeilennummer, Paragraf und Korrektur im Problems-Fenster.

Hub-Seite: https://getreadystack.com/de/tools/beancount-auslandsumsatz-lint

## Die 10 Regeln

| Regel | Was sie findet | Grundlage |
|---|---|---|
| fx_ohne_eur | Einnahme in USD, GBP, CHF … ohne `@`/`@@`-Kurs in Euro | § 16 Abs. 6 UStG |
| rc_ohne_ustid | Reverse-Charge-Umsatz ohne `ust_id` des Kunden | § 14a Abs. 1 UStG |
| ustid_format | USt-IdNr. passt nicht zum Länderformat (z. B. PL mit 9 statt 10 Ziffern) | § 18a Abs. 7 UStG |
| gr_statt_el | Griechische USt-IdNr. mit GR statt EL | § 18a Abs. 7 UStG |
| drittland_ustid | Kunde aus GB (seit 2021-01-01 Drittland), CH oder NO auf einem EU-Reverse-Charge-Konto | § 18a UStG |
| de_ustid_rc | Kunde mit deutscher USt-IdNr. als Reverse Charge gebucht | § 3a Abs. 2 UStG |
| rc_mit_ust | Reverse-Charge-Umsatz mit gebuchter deutscher USt (im Beispiel 1.178,00 €) | § 14c Abs. 1 UStG |
| zm_frist | Reverse-Charge-Umsätze eines Quartals ohne `zm`-Vermerk nach dem 25. Tag nach Quartalsende | § 18a UStG, Bußgeld bis zu 5.000 € nach § 26a Abs. 2 Nr. 5 UStG |
| zm_quartal | `zm`-Vermerk nennt ein anderes Quartal als das Buchungsdatum | § 18a UStG |
| rechnungsnr_fehlt | Auslandsumsatz ohne `rechnung`-Vermerk | § 14 Abs. 4 Nr. 4 UStG |

Die ZM-Frist fällt auf den 25. Tag nach Quartalsende; fällt er auf Samstag oder Sonntag, rechnet die Erweiterung mit dem folgenden Montag (§ 108 Abs. 3 AO). Regionale Feiertage werden nicht verschoben. Eine Dauerfristverlängerung gilt für die ZM nicht.

## So markierst du Transaktionen

Beancount (Metadaten):

```beancount
2026-05-28 * "Kowalski Sp. z o.o." "Code-Review"
  ust_id: "PL1234567890"
  rechnung: "2026-018"
  zm: "2026-Q2"
  Assets:Bank:Girokonto                   3400.00 EUR
  Income:Freiberuflich:EU-ReverseCharge  -3400.00 EUR
```

hledger (Tags im Kommentar):

```hledger
2026-03-12 * Hartmann & Poulsen ApS | Beratung  ; ust_id: DK12345678, rechnung: 2026-006, zm: 2026-Q1
    assets:bank                  3900.00 EUR
    income:reverse-charge       -3900.00 EUR
```

Reverse Charge erkennt die Erweiterung am Kontonamen (`ReverseCharge`, `Reverse-Charge`, `13b`, `EU-Leistung`) oder am Vermerk `rc: true`.

## Befehle

- **Journal prüfen** – prüft die geöffnete Datei; Befunde erscheinen sofort im Problems-Fenster.
- **Workspace-Bericht** – prüft alle Journale im Workspace (Vollversion).

## Kostenlos / Vollversion

- Kostenlos: das geöffnete Journal mit allen 10 Regeln prüfen, mit Zeilennummer, Paragraf und überfälligen Tagen. Kein Schlüssel nötig.
- Vollversion: alle Journale im Workspace in einem Lauf prüfen und einen Befundbericht (Datei, Zeile, Paragraf, überfällige Tage) für den Steuerberater schreiben (https://buy.polar.sh/polar_cl_YswKr0r7u9zGAqmyq2VW52TN2Jl3sfsI5t9ZY0HdCGp).

## Maßstab

Die Prüfung richtet sich nach dem Umsatzsteuergesetz in der Fassung für 2026 (§§ 3a, 14, 14a, 14c, 16, 18a, 26a UStG) und § 108 AO. Die Erweiterung prüft Buchungen mechanisch; sie ersetzt keine Steuerberatung und keine Bestätigung der USt-IdNr. beim BZSt.

## Lizenz

Siehe LICENSE.txt.
