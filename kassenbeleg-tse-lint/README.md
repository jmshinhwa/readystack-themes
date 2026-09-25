# Kassenbeleg-Lint — KassenSichV TSE-Pflichtangaben

![Kassenbeleg-Lint — KassenSichV TSE-Pflichtangaben](https://getreadystack.com/img/promo/sku138032_result_card.jpg)

Ein Bon ist eine Textdatei mit Rechtspflichten. Diese Erweiterung liest eine Belegvorlage
(HTML, Handlebars, JSON, TXT) und prüft sie gegen **15 Regeln** aus § 6 KassenSichV,
§ 146a AO, dem AEAO zu § 146a AO und der DSFinV-K.

In der mitgelieferten Beispielvorlage `_fixtures/dirty.html` meldet der Lint **8 Verstöße**
(7 Fehler, 1 Warnung). Die daneben liegende geprüfte Vorlage `_fixtures/clean.html` ergibt **0**.

## Was gemeldet wird

Jeder Fund besteht aus drei Angaben: Zeilennummer, Regel-Kennung, Paragraf.

| Regel | Grundlage |
|---|---|
| `unternehmer_anschrift` — Name und vollständige Anschrift des leistenden Unternehmers | § 6 KassenSichV |
| `belegdatum` — Datum der Belegausstellung | § 6 KassenSichV |
| `vorgang_beginn` — Zeitpunkt des Vorgangsbeginns | § 6 KassenSichV |
| `vorgang_ende` — Zeitpunkt der Vorgangsbeendigung | § 6 KassenSichV |
| `positionen` — Menge und Art der gelieferten Gegenstände | § 6 KassenSichV |
| `transaktionsnummer` — Transaktionsnummer der TSE | § 6 KassenSichV |
| `entgelt_steuer` — Steuerbetrag und Steuersatz oder Hinweis auf Steuerbefreiung | § 6 KassenSichV |
| `seriennummer` — Seriennummer des Aufzeichnungssystems oder des Sicherheitsmoduls | § 6 KassenSichV |
| `signaturzaehler` — Signaturzähler | § 6 Satz 2 KassenSichV |
| `pruefwert` — Prüfwert (Signaturwert) | § 6 Satz 2 KassenSichV |
| `tse_ausfall` — Zweig, der einen Ausfall der TSE auf dem Beleg sichtbar macht | AEAO zu § 146a AO |
| `zeitformat_iso` — ISO-8601-Zeitformat | DSFinV-K |
| `belegausgabe_wunsch` — Beleg nicht nur „auf Wunsch" | § 146a Abs. 2 AO |
| `platzhalter_tse` — kein fester Platzhalterwert (`0000`, `XXXX`, `TODO`) an einem TSE-Feld | § 6 KassenSichV |
| `jahr_hartcodiert` — keine hartcodierte, bereits vergangene Jahreszahl | § 146a AO |

Die Regel `platzhalter_tse` existiert, weil maschinell erzeugte Vorlagen an den TSE-Feldern
gern eine Konstante stehen lassen. Eine Vorlage mit `Transaktionsnummer: 0000` sieht auf dem
Papier vollständig aus und trägt auf jedem Bon denselben Wert.

## Rechtlicher Rahmen

Die Belegausgabepflicht nach § 146a Abs. 2 AO gilt seit dem 1. Januar 2020. Die Meldung
elektronischer Aufzeichnungssysteme nach § 146a Abs. 4 AO läuft über ELSTER. § 379 Abs. 4 AO
(Steuergefährdung) sieht für Verstöße gegen § 146a AO eine Geldbuße von bis zu 25.000 Euro vor.
Geprüft wird bei einer Kassen-Nachschau nach § 146b AO, die unangekündigt stattfindet.

Diese Erweiterung prüft Text. Sie ist keine Rechtsberatung und ersetzt keine Zertifizierung
einer technischen Sicherheitseinrichtung.

## Maßstab

Die Steuerberatervergütungsverordnung nennt in § 13 eine Zeitgebühr von 30 bis 70 Euro je
angefangene halbe Stunde, also 60 bis 140 Euro je Stunde für dieselbe Durchsicht von Hand.

## Kostenlos und Vollversion

Kostenlos: die geöffnete Vorlage wird gegen alle 15 Regeln geprüft, ohne Lizenzschlüssel,
ohne Begrenzung der Anzahl. Damit ist die Prüfung dieser Vorlage abgeschlossen.

Vollversion: der gesamte Ordner wird in einem Lauf geprüft — alle Mandanten, Sprachen und
Bon-Breiten — und das Ergebnis als datierter Prüfbericht in eine Datei geschrieben, die in die
Verfahrensdokumentation abgelegt werden kann. 7 Tage volle Rückerstattung.
Bezug: https://buy.polar.sh/polar_cl_Zgg6KjspBqWL6jk6fxKrOY8xIlybVUGE45Q2R0VVmOU

## Im Browser

Dieselbe Prüflogik liegt in `ext/engine.js` und läuft ohne Installation als eine HTML-Seite.

Weitere Werkzeuge: https://getreadystack.com/de/tools/kassenbeleg-tse-lint
