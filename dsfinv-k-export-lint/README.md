# CSV Kassenprüfer — DSFinV-K Export Lint

![CSV Kassenprüfer — DSFinV-K Export Lint](https://getreadystack.com/img/promo/sku176020_result_card.jpg)

Der Prüfer der Finanzverwaltung liest bei der Kassen-Nachschau nach § 146b AO nicht die Kasse, sondern den Export. Diese Erweiterung liest ihn vorher: Sie öffnen eine CSV aus dem DSFinV-K-Export im Editor, und jede Zeile, die nicht der amtlichen Beschreibung entspricht, wird mit Regel, Schwere und Zeilennummer markiert.

Der gesamte Regelbestand stammt aus der **amtlichen `index.xml` der DSFinV-K 2.4** (BZSt, Stand Januar 2024): **20 Tabellen, 219 Spalten**, dazu die Wertelisten aus Anhang B (9 Vorgangstypen), Anhang C (25 Geschäftsvorfalltypen) und Anhang D (7 Zahlarten).

## Was geprüft wird — 19 Regeln

Die Erweiterung erkennt am Spaltenkopf, welche der 20 Tabellen vorliegt (`transactions.csv`, `lines.csv`, `cashpointclosing.csv`, `tse.csv`, …), und prüft dann:

| Regel | Schwere | Worauf sie anspricht |
|---|---|---|
| `tabelle_unbekannt` | Fehler | Kopf sieht nach DSFinV-K aus, passt aber zu keiner der 20 Tabellen |
| `spalte_fehlt` | Fehler | Eine in der `index.xml` geführte Spalte fehlt |
| `spalte_unbekannt` | Fehler | Eine Spalte steht nicht in der amtlichen Beschreibung |
| `spalte_reihenfolge` | Fehler | Die Spalten stehen nicht in der Reihenfolge der `index.xml` |
| `trennzeichen` | Fehler | Kein Semikolon als `ColumnDelimiter` |
| `spaltenzahl` | Fehler | Datenzeile hat mehr oder weniger Felder als der Kopf |
| `pflichtfeld_leer` | Fehler | `Z_KASSE_ID`, `Z_ERSTELLUNG`, `Z_NR` oder `BON_ID` ist leer |
| `dezimaltrennzeichen` | Fehler | Punkt statt Komma im Betrag (`12.50` statt `12,50`) |
| `betrag_ungueltig` | Fehler | Betragsfeld ist nicht auswertbar |
| `ganzzahl_ungueltig` | Fehler | Feld mit 0 Nachkommastellen ist keine Ganzzahl |
| `zeitstempel_iso` | Fehler | `Z_ERSTELLUNG`, `BON_START`, `BON_ENDE`, TSE-Zeiten nicht nach ISO 8601 |
| `datum_iso` | Warnung | `Z_BUCHUNGSTAG`, `REF_DATUM` nicht als JJJJ-MM-TT |
| `bon_typ_wert` | Fehler | `BON_TYP` ist keiner der 9 Werte aus Anhang B |
| `gv_typ_wert` | Fehler | `GV_TYP` ist keiner der 25 Werte aus Anhang C |
| `zahlart_typ_wert` | Fehler | `ZAHLART_TYP` ist keine der 7 Zahlarten aus Anhang D |
| `taxonomie_version` | Fehler | `TAXONOMIE_VERSION` fehlt oder ist nicht im Format X.Y |
| `taxonomie_veraltet` | Warnung | Version unter 2.3 |
| `feldlaenge` | Warnung | Feld überschreitet die `MaxLength` der `index.xml` |
| `zeilenende_crlf` | Warnung | Zeilenende ist nicht CRLF |

## Ein gemessenes Beispiel

Im Prüflauf dieser Erweiterung liegen zwei Beispieldateien im Bonkopf-Format (`transactions.csv`, 23 Spalten):

- `_fixtures/clean.csv` — 3 Datenzeilen, **0 Funde**.
- `_fixtures/dirty.csv` — 4 Datenzeilen, **14 Funde**: 12 Fehler und 2 Warnungen, ausgelöst von 11 der 19 Regeln. Darunter `UMS_BRUTTO = 12.50` statt `12,50`, `BON_TYP = Rechnung` statt `Beleg`, `BON_START = 2026-09-22 09:14:02` ohne `T` und ohne Zeitzone, eine ergänzte Spalte `TIMESTAMP`, die fehlende Pflichtspalte `KUNDE_USTID` und `BON_TYP` auf Position 5, wo amtlich `BON_NR` steht.

Das sind genau die Abweichungen, die entstehen, wenn eine Exportroutine von Hand oder von einem Assistenten geschrieben wird: Der Punkt als Dezimaltrennzeichen ist in fast jedem anderen Datenformat richtig — in der DSFinV-K ist er das Tausendertrennzeichen.

## Warum das zählt

Wer ein elektronisches Aufzeichnungssystem entgegen § 146a Abs. 1 Satz 1 AO nicht oder nicht richtig verwendet, handelt nach § 379 Abs. 1 Satz 1 Nr. 4 AO ordnungswidrig; die Ordnungswidrigkeit kann nach § 379 Abs. 6 AO mit einer Geldbuße **bis zu 25.000 Euro** geahndet werden. Die Kassen-Nachschau nach § 146b AO wird nicht angekündigt.

## Maßstab

Eine Steuerberatungskanzlei rechnet die Durchsicht eines Kassenexports nach § 13 StBVV als Zeitgebühr ab: **16,50 bis 41 Euro je angefangene Viertelstunde**.

## Umfang

Ohne Lizenzschlüssel wird die im Editor geöffnete CSV vollständig gegen alle 19 Regeln geprüft — das ist die ganze Datei, nicht ein Ausschnitt. Der Lizenzschlüssel schaltet den anderen Umfang frei: den kompletten Exportordner in einem Lauf, alle 20 DSFinV-K-Tabellen zusammen samt Kreuzprüfung gegen die `index.xml`, und den Prüfbericht als Datei. → [Vollversion](https://buy.polar.sh/polar_cl_6xgUWpQ6iaKfxXsoisZTLdijmkHV4QNSr4Jh70yIPHM)

## Auch im Browser

Dieselbe Prüfmaschine, Byte für Byte, liegt als eine Seite unter <https://getreadystack.com/de/tools/dsfinv-k-export-lint>.

## Quellen

- DSFinV-K 2.4 und `index.xml`, Bundeszentralamt für Steuern, Stand Januar 2024
- Abgabenordnung §§ 146a, 146b, 379
- Steuerberatervergütungsverordnung § 13
