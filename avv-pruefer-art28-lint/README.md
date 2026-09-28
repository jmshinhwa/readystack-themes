# AVV-Prüfer – Auftragsverarbeitungsvertrag Lint

![AVV-Prüfer – Auftragsverarbeitungsvertrag Lint](https://getreadystack.com/img/promo/sku329109_result_card.jpg)

Prüft Auftragsverarbeitungsverträge (AVV/DPA in Markdown) gegen Art. 28 DSGVO — zeilengenau im Editor. Webseite mit derselben Prüfung: https://getreadystack.com/de/tools/avv-pruefer-art28-lint

Für Webagenturen, Hoster, SaaS-Anbieter und IT-Dienstleister in Deutschland, die als Auftragsverarbeiter ihren Kunden einen AVV schicken, und für Datenschutzbeauftragte, die eingehende Verträge lesen.

## Was geprüft wird (20 Regeln)

**Pflichtinhalte nach Art. 28 Abs. 3 DSGVO**
- Gegenstand und Dauer, Art und Zweck, Art der personenbezogenen Daten, Kategorien betroffener Personen (S. 1)
- lit. a dokumentierte Weisung · lit. b Vertraulichkeit · lit. c Maßnahmen nach Art. 32 · lit. d Unterauftragsverarbeiter
- lit. e Unterstützung bei Betroffenenrechten (Kapitel III) · lit. f Pflichten aus Art. 32 bis 36 · lit. g Löschung oder Rückgabe · lit. h Überprüfungen einschließlich Inspektionen

**Zeilen, die im Vertrag falsch sind**
- Allgemeine Genehmigung für Unterauftragsverarbeiter ohne Einspruchsrecht (Art. 28 Abs. 2 S. 2 DSGVO)
- Subunternehmer „ohne vorherige Zustimmung“ (Art. 28 Abs. 2 S. 1 DSGVO)
- Mündliche Weisungen ohne Dokumentation (lit. a)
- Meldung an den Kunden „innerhalb von 72 Stunden“. Der Auftragsverarbeiter meldet Verletzungen unverzüglich (Art. 33 Abs. 2 DSGVO); die 72 Stunden sind die Frist des Verantwortlichen (Art. 33 Abs. 1 DSGVO).
- Privacy Shield ist seit EuGH C-311/18 vom 16.07.2020 ungültig.
- Standardvertragsklauseln 2010/87/EU: aufgehoben mit Wirkung zum 27.09.2021, Altverträge galten nur bis 27.12.2022. Ersatz: Durchführungsbeschluss (EU) 2021/914.
- § 11 BDSG (alte Fassung) gilt seit dem 25.05.2018 nicht mehr.
- TTDSG und TMG heißen seit dem 14.05.2024 TDDDG bzw. DDG.

## Beispiel

Der mitgelieferte Beispiel-AVV (`_fixtures/dirty.md`) liefert 11 Befunde, die korrigierte Fassung 0. Eine Zeile wie

```
Der Auftragnehmer informiert den Auftraggeber innerhalb von 72 Stunden über Verletzungen nach Art. 33 DSGVO.
```

wird markiert mit Verweis auf Art. 33 Abs. 2 DSGVO; die Korrektur lautet z. B. „unverzüglich, spätestens innerhalb von 24 Stunden“.

## Warum das zählt

Verstöße gegen die Pflichten aus Art. 28 DSGVO: bis zu €10.000.000 Bußgeld oder 2 % des weltweiten Jahresumsatzes (Art. 83 Abs. 4 lit. a DSGVO). Kunden mit eigenem Datenschutzbeauftragten fragen den AVV im Audit ab; ein Vertrag mit Privacy Shield fällt dort sofort auf.

## Benutzung

- Einen AVV als `.md` öffnen: Befunde erscheinen im Problems-Panel.
- Befehl „AVV-Prüfer“ in der Befehlspalette für die aktuelle Datei.
- Ohne Installation: dieselbe Prüfung im Browser unter https://getreadystack.com/de/tools/avv-pruefer-art28-lint

## Kostenlos und Vollversion

Jede offene Datei mit allen 20 Regeln prüfen ist kostenlos, ohne Key. Vollversion ($29 einmalig, ein Lizenzschlüssel pro Person oder Team-Platz): Ordner-Prüfbericht über alle AVVs eines Workspace als Datei — [Vollversion holen](https://buy.polar.sh/polar_cl_cYpVpS6jjZp31zTqRM7YVPVThY6GL8OSLFVpR2WVrzA)

## Maßstab

Anwalt nach RVG: 1,3 Geschäftsgebühr (Nr. 2300 VV) bei €5.000 Gegenstandswert = €480,85 netto (Tabelle § 13 RVG).

Der AVV-Prüfer ersetzt keine Rechtsberatung. Er prüft, ob die gesetzlichen Pflichtinhalte und aktuelle Verweise im Text stehen.
