# Datenpanne Meldung Check – 72 h, Art. 33/34 DSGVO

![Datenpanne Meldung Check – 72 h, Art. 33/34 DSGVO](https://getreadystack.com/img/promo/sku367591_result_card.jpg)

**Ihr Datenpannen-Protokoll in einer Sekunde gegen die 72-Stunden-Frist und die Pflichtangaben der DSGVO geprüft – lokal, ohne Upload.**

Web-Version und Hintergrund: https://getreadystack.com/de/tools/datenpanne-meldung-check

Nach Art. 33 Abs. 1 DSGVO muss der Verantwortliche eine Verletzung des Schutzes personenbezogener Daten unverzüglich und möglichst binnen **72 Stunden nach Kenntnis** der zuständigen Aufsichtsbehörde melden. Kommt die Meldung später, muss eine Begründung der Verzögerung beiliegen. Art. 33 Abs. 3 legt fest, was die Meldung mindestens enthält, Art. 33 Abs. 5 verlangt, dass jede Panne dokumentiert wird – auch die, die nicht gemeldet wird. Art. 34 verlangt bei hohem Risiko die Benachrichtigung der betroffenen Personen.

Ein Verstoß gegen Art. 33 und 34 fällt unter Art. 83 Abs. 4 DSGVO: Geldbuße bis zu 10.000.000 EUR oder bis zu 2 % des weltweiten Jahresumsatzes, je nachdem, welcher Betrag höher ist.

## Was geprüft wird – 13 rules

| Regel | Prüfung | Norm |
|---|---|---|
| DP01 | Zeitpunkt der Kenntnis fehlt | Art. 33 Abs. 1 |
| DP02 | Meldung nach mehr als 72 h ohne Begründung der Verzögerung | Art. 33 Abs. 1 S. 2 |
| DP03 | Meldung an die Aufsichtsbehörde fehlt – mit Fristende und Tagen bis/nach Fristende | Art. 33 Abs. 1 |
| DP04 | „kein Risiko“ ohne Begründung | Art. 33 Abs. 1, Abs. 5 |
| DP05 | Art der Verletzung fehlt | Art. 33 Abs. 3 lit. a |
| DP06 | ungefähre Zahl der betroffenen Personen fehlt | Art. 33 Abs. 3 lit. a |
| DP07 | ungefähre Zahl der Datensätze fehlt | Art. 33 Abs. 3 lit. a |
| DP08 | Kategorien der Personen oder Daten fehlen | Art. 33 Abs. 3 lit. a |
| DP09 | Datenschutzbeauftragter ohne Kontaktdaten | Art. 33 Abs. 3 lit. b |
| DP10 | wahrscheinliche Folgen fehlen | Art. 33 Abs. 3 lit. c |
| DP11 | Maßnahmen fehlen | Art. 33 Abs. 3 lit. d |
| DP12 | hohes Risiko ohne Benachrichtigung Betroffener oder Ausnahme | Art. 34 Abs. 1 und 3 |
| DP13 | zuständige Aufsichtsbehörde nicht benannt | Art. 33 Abs. 1, Art. 55 |

Der Stichtag für die Fristrechnung ist das heutige Datum; im Web-Tool lässt er sich frei setzen.

## Protokoll-Format

Eine Markdown-Datei pro Panne, eine Angabe pro Zeile (`Schlüssel: Wert`, `- **Schlüssel:** Wert` oder Tabellenzeile `| Schlüssel | Wert |`). Datumsangaben als `2026-09-21 09:30` oder `21.09.2026, 09:30`. Werte wie `offen`, `TBD`, `unbekannt` oder `–` zählen als leer.

```
- **Kenntnis:** 2026-09-21 09:30
- **Meldung Aufsichtsbehörde:** offen
- **Anzahl betroffene Personen:** unbekannt
- **Datenschutzbeauftragter:** externer DSB
- **Risiko:** hoch
```

Ergebnis für dieses Beispiel-Protokoll (vollständige Datei im Repository, geprüft am 2026-09-28): **6 findings** – Meldung 4 Tage nach Fristende 2026-09-24 09:30 noch offen, Personenzahl und Datensatzzahl fehlen, DSB ohne Kontakt, Maßnahmen leer, hohes Risiko ohne Benachrichtigung.

## Warum nicht einfach eine Vorlage?

Muster-Vorlagen der Landesbehörden zeigen, welche Felder es gibt. Sie rechnen aber keine Frist aus Ihrer Kenntnis-Uhrzeit und melden keine leere Pflichtzeile. Ein Chatbot kennt Ihr Protokoll nicht und wird es auch nicht bekommen – die Datei enthält personenbezogene Angaben. Dieser Check läuft vollständig lokal in VS Code oder im Browser.

## Kostenlos und Vollversion

Kostenlos: ein Protokoll prüfen, alle 13 rules, jeder Fund mit Zeile, Norm und Fix – ohne Limit.
Vollversion (Lizenzschlüssel): ganzer Ordner auf einmal und Fristen-Übersicht als CSV für die Dokumentation nach Art. 33 Abs. 5.

## Grenzen

Der Check prüft Form und Fristen eines Protokolls. Ob eine Panne meldepflichtig ist, bleibt eine rechtliche Bewertung des Verantwortlichen und seines Datenschutzbeauftragten. Keine Rechtsberatung.
