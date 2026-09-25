# Verrechnungspreis Doku Check: Local File & Transaktionsmatrix

Prüft eine Verrechnungspreis-Dokumentation (Local File als Markdown) gegen **16 rules** aus §90 Abs. 3/4 AO und §4 Abs. 1 GAufzV und rechnet die 30-Tage-Vorlagefrist ab Bekanntgabe der Prüfungsanordnung. Zwei Eingaben (2 inputs): der Text der Local File und das heutige Datum.

Beispiel aus der mitgelieferten Muster-Datei (`_fixtures/dirty.md`, Prüfungsanordnung bekanntgegeben 2026-07-01, heute 2026-09-24): **8 findings** — Transaktionsmatrix fehlt, Frist endete am 2026-07-31, seit 55 Tagen überschritten, bei Vorlage heute Zuschlag mindestens 5.500 € (100 € je vollem Tag, bis 1.000.000 €, §162 Abs. 4 AO). Umsatz 142 Mio. Euro ohne Stammdokumentation. Vorlagefrist noch mit 60 Tagen statt 30 Tagen angegeben.

Mehr dazu: https://getreadystack.com/de/tools/verrechnungspreis-doku-check

## Für wen

Steuerabteilungen und Controller deutscher Konzerngesellschaften mit Auslandsbeziehungen (nahestehende Personen im Sinne von §1 AStG), die eine Local File vor der Betriebsprüfung fertig machen — und Steuerberater, die Entwürfe ihrer Mandanten gegenlesen.

## Was geprüft wird (16 rules)

| ID | Prüfung | Grundlage |
|---|---|---|
| TM-01 | Transaktionsmatrix (Übersicht über die Geschäftsvorfälle) vorhanden | §90 Abs. 3 AO |
| SV-01 | Sachverhaltsdokumentation (Darstellung der Geschäftsvorfälle) | §90 Abs. 3 AO |
| LF-01 | Beteiligungsverhältnisse | §4 Abs. 1 Nr. 1 GAufzV |
| LF-02 | Organisations- und Betriebsaufbau | §4 Abs. 1 Nr. 1 GAufzV |
| LF-03 | Geschäftstätigkeit und Geschäftsstrategie | §4 Abs. 1 Nr. 1 GAufzV |
| LF-04 | Verträge zu den Geschäftsbeziehungen | §4 Abs. 1 Nr. 2 GAufzV |
| LF-05 | Wesentliche immaterielle Werte | §4 Abs. 1 Nr. 2 GAufzV |
| LF-06 | Funktions- und Risikoanalyse | §4 Abs. 1 Nr. 3 GAufzV |
| LF-07 | Wertschöpfungskette | §4 Abs. 1 Nr. 3 GAufzV |
| LF-08 | Zeitpunkt der Verrechnungspreisbestimmung | §4 Abs. 1 Nr. 4 GAufzV |
| LF-09 | Wahl der Verrechnungspreismethode | §4 Abs. 1 Nr. 4 GAufzV |
| LF-10 | Berechnungsunterlagen zur Methode | §4 Abs. 1 Nr. 4 GAufzV |
| LF-11 | Fremdvergleich / Vergleichsdaten | §4 Abs. 1 Nr. 4 GAufzV |
| MF-01 | Stammdokumentation, wenn der genannte Vorjahresumsatz 100 Millionen Euro erreicht | §90 Abs. 3 AO |
| FR-01 | Veraltete 60-Tage-Vorlagefrist statt 30 Tagen | §90 Abs. 4 AO |
| FR-02 | 30 Tage nach Bekanntgabe der Prüfungsanordnung keine Vorlage vermerkt: Tage und Mindestzuschlag | §90 Abs. 4, §162 Abs. 4 AO |

## Wie die Frist gerechnet wird

Steht in der Datei „Prüfungsanordnung bekanntgegeben am JJJJ-MM-TT", zählt die Erweiterung 30 Tage weiter. Ohne Vermerk „vorgelegt am JJJJ-MM-TT" und nach Fristende meldet FR-02 die vollen Tage der Überschreitung und den Mindestzuschlag von 100 € je vollem Tag (gedeckelt bei 1.000.000 €). Vor Fristende hängt jede Meldung die verbleibenden Tage an.

## Grenzen

Die Prüfung ist eine Vollständigkeitsprüfung der Pflichtangaben: Sie findet fehlende Abschnitte und veraltete Fristangaben. Ob ein Verrechnungspreis fremdüblich ist, beurteilt sie nicht. Kein Ersatz für steuerliche Beratung.

## Befehle

- **Verrechnungspreis Doku Check: aktuelle Datei prüfen** — Befunde im Problems-Panel.
- Die Vollversion prüft alle Dokumentationen im Workspace auf einmal und speichert den Befundbericht als Datei für die Prüfungsakte (Lizenzschlüssel).

## Maßstab

Steuerberater-Zeitgebühr nach §13 StBVV: 16,50 bis 41 Euro je angefangene Viertelstunde (66 bis 164 Euro je Stunde).

## Datenschutz

Alles läuft lokal im Editor bzw. im Browser. Der Dateiinhalt verlässt den Rechner nicht.
