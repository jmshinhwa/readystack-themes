# VVT-Prüfer — Art. 30 DSGVO

Führen Sie Ihr Verzeichnis von Verarbeitungstätigkeiten als Markdown im Repository? Dann prüft diese Erweiterung es beim Speichern — Zeile für Zeile, gegen die Pflichtangaben aus Art. 30 Abs. 1 lit. a bis g DSGVO.

„Schreibt die KI Verzeichnisse, die die Aufsichtsbehörde akzeptiert?" ist 2026 die Frage, die vor jedem generierten Compliance-Dokument steht. Ein Sprachmodell formuliert einen schönen Absatz über „angemessene Löschfristen"; es zählt nicht nach, ob in Tätigkeit 7 die Empfängerkategorien fehlen. Das ist die Arbeit hier.

## Was geprüft wird — 12 Regeln

| Regel | Fundstelle |
| --- | --- |
| `vvt_verantwortlicher` | Art. 30 Abs. 1 lit. a — Name und Kontaktdaten des Verantwortlichen |
| `vvt_dsb_kontakt` | Art. 30 Abs. 1 lit. a — Kontaktdaten der oder des Datenschutzbeauftragten |
| `vvt_stand_veraltet` | Art. 30 Abs. 1 — Stand-Datum fehlt oder liegt mehr als 365 Tage zurück |
| `vvt_zweck` | Art. 30 Abs. 1 lit. b — Zwecke der Verarbeitung |
| `vvt_betroffene_kategorien` | Art. 30 Abs. 1 lit. c — Kategorien betroffener Personen |
| `vvt_datenkategorien` | Art. 30 Abs. 1 lit. c — Kategorien personenbezogener Daten |
| `vvt_empfaenger` | Art. 30 Abs. 1 lit. d — Kategorien von Empfängern |
| `vvt_drittland_garantie` | Art. 30 Abs. 1 lit. e — Drittland ohne Garantie nach Art. 46 |
| `vvt_loeschfrist` | Art. 30 Abs. 1 lit. f — vorgesehene Löschfrist |
| `vvt_loeschfrist_vage` | Art. 30 Abs. 1 lit. f — „nach Bedarf" ist keine Frist |
| `vvt_tom` | Art. 30 Abs. 1 lit. g — Maßnahmen nach Art. 32 Abs. 1 |
| `vvt_platzhalter` | TODO, TBD, XXX oder k. A. in einer Pflichtangabe |

## Das Dateiformat

Ein Kopf mit `Verantwortlicher:`, `Datenschutzbeauftragte:` und `Stand: JJJJ-MM-TT`, danach je Verarbeitungstätigkeit eine `##`-Überschrift mit Aufzählungszeilen (`- Zwecke der Verarbeitung:`, `- Löschfrist:`, `- Technische und organisatorische Maßnahmen:` …). Deutsche Schreibweisen und Kurzformen werden erkannt: `TOM`, `Datenkategorien`, `Speicherdauer`, `Empfängerkategorien`.

## Gemessen an den mitgelieferten Testdateien

`_fixtures/clean.md` — drei Verarbeitungstätigkeiten, vollständig: **0 Funde**.
`_fixtures/dirty.md` — dieselben drei Tätigkeiten, unvollständig: **11 Funde** (9 Fehler, 2 Warnungen) aus 10 der 12 Regeln. Das Stand-Datum dieser Datei ist 1346 Tage alt; jede Meldung trägt dieses Alter mit, weil es die Frist ist, die alle übrigen Mängel teuer macht.

## Kostenlos und lokal

Die geöffnete Datei wird vollständig geprüft, mit allen 12 Regeln und Zeilennummern, ohne Schlüssel und ohne Netzverbindung. Die Datei verlässt Ihren Rechner nicht.

## Der bezahlte Teil

Der Durchlauf über **alle** VVT-Dateien des Projekts und der datierte Prüfbericht als Nachweis-Markdown für Aufsichtsbehörde und internes Audit, mit Team-Lizenz. Ein Schlüssel je Person oder CI-Platz, 7 Tage volle Erstattung.

## Maßstab

Externe Datenschutzberatung rechnet die Durchsicht eines Verzeichnisses in Deutschland üblicherweise mit 100 bis 150 Euro je Stunde ab. Art. 83 Abs. 4 lit. a DSGVO stellt Verstöße gegen Art. 30 mit bis zu 10.000.000 Euro oder 2 % des weltweiten Jahresumsatzes in Aussicht.

## Grenzen

Die Erweiterung liest Markdown. Sie ersetzt keine Rechtsberatung und beurteilt nicht, ob eine Verarbeitung zulässig ist — sie prüft, ob die nach Art. 30 Abs. 1 DSGVO geforderten Angaben vorhanden, datiert und ausgefüllt sind. Art. 30 Abs. 5 DSGVO nimmt Unternehmen mit weniger als 250 Beschäftigten nur unter engen Bedingungen aus; im Zweifel gilt die Pflicht.

Weitere Werkzeuge: https://getreadystack.com/de/tools/vvt-pruefer-art-30-dsgvo
