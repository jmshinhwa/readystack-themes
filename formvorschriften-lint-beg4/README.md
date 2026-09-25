# Formular-Check: Schriftform & Textform (BEG IV)

![Formular-Check: Schriftform & Textform (BEG IV)](https://getreadystack.com/img/promo/sku212591_result_card.jpg)

Findet in deutschen Formular- und Vertragsvorlagen (Markdown, HTML, Text) die Form- und Fristangaben, die seit dem Vierten Bürokratieentlastungsgesetz (BEG IV, in Kraft 2025-01-01, BGBl. 2024 I Nr. 323) oder nach geltendem Recht nicht stimmen — mit Zeile, Paragraf und korrigierter Formulierung.

Web-Version mit demselben Prüfkern: https://getreadystack.com/de/tools/formvorschriften-lint-beg4

## Beispiel: Muster-Vorlagenpaket (Stand 01.11.2024)

Sechs Befunde: 3 Fehler, 3 Warnungen. Die bereinigte Fassung desselben Pakets ergibt 0 Befunde.

| Zeile im Muster-Vorlagenpaket (falsch) | Korrektur |
|---|---|
| Stand: 01.11.2024 | vor BEG IV: Stand prüfen |
| Kündigung per E-Mail | Schriftform, eigenhändig (623 BGB) |
| Nachweis als PDF per E-Mail | Textform + Empfangsnachweis |
| Arbeitszeugnis als PDF per E-Mail | qualifiziert elektronisch signiert |
| Belege 10 Jahre | Belege 8 Jahre |
| Widerspruch: vier Wochen | Widerspruch: zwei Wochen |

## Die 8 Checks

| Check | Stufe | Grundlage |
|---|---|---|
| Kündigung eines Arbeitsverhältnisses per E-Mail/Textform | Fehler | § 623 BGB |
| Nachweis der Arbeitsbedingungen per E-Mail ohne Empfangsnachweis | Fehler | § 2 Abs. 1, § 4 NachwG (Bußgeld bis €2.000) |
| Nachweis nur schriftlich verlangt (Textform genügt seit 2025-01-01) | Hinweis | § 2 Abs. 1 NachwG |
| Widerspruchsfrist gegen Mahnbescheid ≠ zwei Wochen | Fehler | § 692 Abs. 1 Nr. 3 ZPO |
| Buchungsbelege/Rechnungen 10 statt 8 Jahre | Warnung | § 147 Abs. 3 AO, § 257 Abs. 4 HGB |
| Arbeitszeugnis als PDF per E-Mail | Warnung | § 109 Abs. 3 GewO |
| Vorlagenstand vor 2025-01-01 oder älter als 18 Monate | Warnung / Hinweis | BEG IV |
| Gewerbemietvertrag verlangt Schriftform | Hinweis | § 578 BGB (BEG IV) |

Sätze, die eine Regel ausdrücklich verneinen („eine E-Mail ist ausgeschlossen“), lösen keinen Befund aus. HTML-Tags und Entities wie `&uuml;` werden vor der Prüfung entfernt, die Zeilennummern bleiben erhalten.

## So benutzt du es

1. Eine `.md`-, `.html`- oder `.txt`-Vorlage öffnen.
2. Befunde erscheinen im Problems-Panel mit Zeile, Paragraf und Korrektur.
3. Der Vorlagenstand wird gegen das heutige Datum geprüft (älter als 18 Monate = Hinweis).

## Kostenlos und Vollversion

Kostenlos und ohne Grenze: die Web-Version und die Prüfung jeder geöffneten Datei mit allen 8 Checks.
Vollversion: ganzer Workspace in einem Lauf plus Prüfbericht (Markdown/CSV) je Vorlage — [Vollversion holen](https://buy.polar.sh/polar_cl_FXmv3VM8XW9kwV6RvlcMa2gCrM01uP50XDWdJ0s6MvQ), $29 einmalig je Person oder Team-Platz.

## Maßstab

Anwaltliche Erstberatung für Verbraucher: bis €190 zzgl. USt (§ 34 RVG); für Unternehmen gilt dieser Deckel nicht. Dieser Check ersetzt keine Rechtsberatung; er findet die bekannten Formfehler vorab.

## Grenzen

Der Check erkennt Formulierungen, nicht die rechtliche Gesamtlage eines Einzelfalls. Branchen nach § 2a SchwarzArbG brauchen für den Nachweis weiterhin die Schriftform. Für Banken und Versicherungen galten bei der 8-Jahres-Frist abweichende Übergangsregeln.
