# Rechnung Pflichtangaben Lint (§ 14 UStG)

![Rechnung Pflichtangaben Lint (§ 14 UStG)](https://getreadystack.com/img/promo/sku119066_result_card.jpg)

Ein Linter für die **PHP-Rechnungstemplates** in WooCommerce- und WordPress-Shops. Er liest die
Template-Datei so, wie ein Betriebsprüfer den fertigen Beleg liest: Steht jede Pflichtangabe nach
§ 14 Abs. 4 UStG wirklich drin — oder nur die Hälfte davon?

Assistenten schreiben heute den größten Teil dieser Templates. Sie geben zuverlässig
Rechnungsnummer, Datum und Gesamtbetrag aus. Was sie fast immer vergessen: den **Zeitpunkt der
Lieferung oder sonstigen Leistung** (§ 14 Abs. 4 Nr. 6 UStG). Das Rechnungsdatum ersetzt ihn nicht.
Fehlt er, ist der Beleg unvollständig und der Empfänger verliert in der Betriebsprüfung den
Vorsteuerabzug aus dieser Rechnung. Nach § 26a UStG kann eine nicht oder nicht rechtzeitig
ausgestellte Rechnung zusätzlich mit einer Geldbuße bis zu 5.000 € geahndet werden.

## Was geprüft wird — 17 Regeln

Alle zehn Nummern des § 14 Abs. 4 UStG:

| Nr. | Pflichtangabe | Regel |
|---|---|---|
| 1 | Name und Anschrift des leistenden Unternehmers | `leistender_anschrift` |
| 1 | Name und Anschrift des Leistungsempfängers | `empfaenger_anschrift` |
| 2 | Steuernummer oder USt-IdNr. | `steuernummer` |
| 3 | Ausstellungsdatum | `ausstellungsdatum` |
| 4 | Fortlaufende Rechnungsnummer | `rechnungsnummer` |
| 5 | Menge und handelsübliche Bezeichnung | `menge_und_art` |
| 6 | Zeitpunkt der Lieferung oder Leistung | `leistungszeitpunkt` |
| 7 | Nach Steuersätzen aufgeschlüsseltes Entgelt | `entgelt_aufgeschluesselt` |
| 8 | Steuersatz und Steuerbetrag | `steuersatz_steuerbetrag` |
| 9 | Hinweis auf die Aufbewahrungspflicht | `aufbewahrungshinweis` |
| 10 | Das Wort »Gutschrift« | `gutschrift_wort` |

Dazu sieben Regeln für die Fälle, in denen ein Template formal vollständig aussieht und trotzdem
falsch ist:

- `reverse_charge_wortlaut` — § 13b-Fall ohne den wörtlich vorgeschriebenen Hinweis
  »Steuerschuldnerschaft des Leistungsempfängers« (§ 14a Abs. 5 UStG).
- `kleinunternehmer_steuerausweis` — ein Beleg mit Hinweis auf § 19 UStG, der trotzdem eine
  Steuerzeile ausgibt. Die ausgewiesene Steuer wird nach § 14c Abs. 2 UStG geschuldet.
- `platzhalter_ustid` — `DE123456789` steht noch fest in der Datei.
- `rechnungsnummer_nicht_fortlaufend` — die Nummer entsteht aus `uniqid()`, `mt_rand()` oder einem
  Zeitstempel und ist damit nicht lückenlos nachprüfbar (§ 14 Abs. 4 Nr. 4 UStG, GoBD).
- `kleinbetrag_grenze` — die Grenze für Kleinbetragsrechnungen steht auf 150 Euro; sie liegt seit
  2017 bei 250 Euro brutto (§ 33 UStDV).
- `steuersatz_hart_verdrahtet` — `19 %` steht als Text im Template, statt je Position gelesen zu
  werden.

## Was dabei herauskommt

Das mitgelieferte Beispieltemplate `_fixtures/dirty.php` ergibt **6 Befunde** — 5 Fehler und
1 Warnung, jeweils mit Zeilennummer, Fundstelle im Gesetz und einem Satz dazu, was in die Datei
gehört. Das saubere Gegenstück `_fixtures/clean.php` ergibt **0 Befunde** gegen dieselben
17 Regeln.

## Kostenlos und vollständig

Der Befehl **Rechnung-Lint: Check this file** prüft die Datei, die gerade im Editor offen ist,
gegen alle 17 Regeln — ohne Schlüssel, ohne Zeitlimit, ohne Wasserzeichen. Für ein einzelnes
Template ist die Arbeit damit erledigt.

## Vollversion

**Rechnung-Lint: Sweep workspace and write report** läuft über alle PHP-Templates im Projekt und
legt einen datierten Prüfbericht als Datei ab — der Nachweis, den Sie der Steuerkanzlei oder dem
Prüfer zeigen. Das ist der bezahlte Teil: <https://buy.polar.sh/polar_cl_nMZKqKc9hEPjEMnLnQc3TlRqvBfIw1CONRJxu4LGBGp>

## Maßstab

Dieselbe Durchsicht beim Steuerberater läuft über die Zeitgebühr nach § 13 StBVV: 30 bis 75 €
je angefangene halbe Stunde.

## Online ohne Installation

Dieselbe Engine, Byte für Byte, läuft als eine Seite im Browser:
https://getreadystack.com/tools/rechnung-pflichtangaben-lint-de

## Hinweis

Die Regeln bilden den Gesetzestext ab und ersetzen keine steuerliche Beratung.

## Fundstellen der sechs Befunde im Beispieltemplate

- Leistungsdatum fehlt — § 14 Abs. 4 Nr. 6 UStG
- Nettoentgelt je Steuersatz fehlt — § 14 Abs. 4 Nr. 7 UStG
- Rechnungsnummer nicht lückenlos — § 14 Abs. 4 Nr. 4 UStG
- Platzhalter-USt-IdNr. im Template — § 14 Abs. 4 Nr. 2 UStG
- Steuersatz hart verdrahtet — § 14 Abs. 4 Nr. 8 UStG
- Wortlaut zur Steuerschuldnerschaft fehlt — § 14a Abs. 5 UStG
