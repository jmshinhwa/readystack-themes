# Löschkonzept-Prüfer – Aufbewahrungsfristen 2026

![Löschkonzept-Prüfer – Aufbewahrungsfristen 2026 — finds the line](https://getreadystack.com/img/promo/loeschkonzept-fristen-lint_demo.gif)

![Löschkonzept-Prüfer – Aufbewahrungsfristen 2026](https://getreadystack.com/img/promo/sku330609_result_card.jpg)

Prüft Löschkonzepte und Löschfristen-Tabellen (Markdown) gegen die Aufbewahrungsfristen 2026 — zeilengenau im Editor. Dieselbe Prüfung im Browser: https://getreadystack.com/de/tools/loeschkonzept-fristen-lint

**Stand 2026:** Seit 01.01.2025 (BEG IV) gelten für Buchungsbelege und Rechnungen acht statt zehn Jahre (§ 147 Abs. 3 AO, § 257 Abs. 4 HGB, § 14b Abs. 1 UStG). Die Fristen nach § 147 Abs. 3 AO lauten jetzt zehn, acht und sechs Jahre. Wer länger speichert als nötig, verletzt die Speicherbegrenzung nach Art. 5 Abs. 1 lit. e DSGVO — bis zu €20.000.000 Bußgeld oder 4 % des weltweiten Jahresumsatzes (Art. 83 Abs. 5 lit. a DSGVO).

## Was geprüft wird (16 Regeln)

| Regel | Prüft | Norm |
|---|---|---|
| LF01 | Zollunterlagen zehn Jahre | § 147 Abs. 1 Nr. 4a, Abs. 3 AO |
| LF02 | Lohnkonten sechs Jahre | § 41 Abs. 1 S. 9 EStG |
| LF03 | Lieferscheine ohne Belegfunktion: Ende mit Erhalt oder Versand der Rechnung | § 147 Abs. 3 S. 3 und 4 AO |
| LF04 | Verfahrensdokumentation und Organisationsunterlagen zehn Jahre | § 147 Abs. 1 Nr. 1 AO |
| LF05 | Bücher, Inventare, Jahresabschlüsse zehn Jahre | § 147 Abs. 3 AO, § 257 Abs. 4 HGB |
| LF06 | Buchungsbelege acht Jahre (zehn für Kreditinstitute, Versicherer, Wertpapierinstitute) | § 147 Abs. 3 AO, § 257 Abs. 4 HGB |
| LF07 | Rechnungen acht Jahre | § 14b Abs. 1 UStG |
| LF08 | Handels- und Geschäftsbriefe sechs Jahre | § 147 Abs. 3 AO, § 257 Abs. 4 HGB |
| LF09 | Bewerbungsunterlagen nicht vor zwei Monaten nach der Absage löschen | § 15 Abs. 4 AGG, Art. 17 Abs. 3 lit. e DSGVO |
| LF10 | keine unbegrenzte Speicherung | Art. 5 Abs. 1 lit. e DSGVO |
| LF11 | keine pauschalen zehn Jahre für alle Unterlagen | § 147 Abs. 3 AO |
| LF12 | jede Tabellenzeile mit Frist nennt ihre Rechtsgrundlage | Art. 5 Abs. 2 DSGVO |
| LF13 | Fristbeginn mit dem Schluss des Kalenderjahres | § 147 Abs. 4 AO, § 257 Abs. 5 HGB |
| LF14 | keine Löschung, solange die Festsetzungsfrist läuft | § 147 Abs. 3 S. 5 AO |
| LF15 | Bezug auf Speicherbegrenzung oder Art. 17 DSGVO | Art. 5 Abs. 1 lit. e, Art. 17 DSGVO |
| LF16 | TTDSG heißt seit 14.05.2024 TDDDG | TDDDG |

## Beispiel

Die mitgelieferte Vorlage (Stand 2023) liefert 18 Befunde, darunter: Buchungsbelege 10 statt 8 Jahre, Rechnungen 10 statt 8 Jahre, Geschäftsbriefe 10 statt 6 Jahre, Lohnkonten 10 statt 6 Jahre, Jahresabschlüsse 6 statt 10 Jahre, Newsletter-Daten unbegrenzt.

```
| Buchungsbelege (Kontoauszüge, Kassenbelege) | 10 Jahre | § 147 AO |
→ LF06 Buchungsbelege: 10 Jahre im Konzept, gesetzlich 8 Jahre (§ 147 Abs. 3 AO, § 257 Abs. 4 HGB).
```

## Benutzung

- Eine `.md`-Datei öffnen: Befunde erscheinen im Problems-Fenster und direkt an der Zeile.
- Befehlspalette: „Löschkonzept-Prüfer“ eingeben, um die aktuelle Datei neu zu prüfen.
- Ohne Installation: dieselbe Prüfung im Browser unter https://getreadystack.com/de/tools/loeschkonzept-fristen-lint

## Kostenlos und Vollversion

Kostenlos: jede offene Datei mit allen 16 Regeln, ohne Key. Vollversion ($29 einmalig · ein Lizenzschlüssel pro Person oder Team-Platz): Ordner-Prüfbericht über alle Löschkonzepte eines Workspace als Datei, als Nachweis nach Art. 5 Abs. 2 DSGVO — [Vollversion holen](https://buy.polar.sh/polar_cl_j0sYK5M2L5REhRw2p2PONeb8WtblzQWGCbVU82rwl6B).

Zum Vergleich: Steuerberater nach § 13 StBVV: Zeitgebühr €16,50 bis €41 je angefangene Viertelstunde.

## Grenzen

Das Werkzeug liest Text. Es erkennt Kategorien an üblichen Begriffen (Buchungsbelege, Rechnungen, Lohnkonten, Geschäftsbriefe …) und die erste Jahresangabe der Zeile. Branchenrecht (z. B. Patientenakten, Geldwäschegesetz) ist nicht enthalten. Es ersetzt keine Rechtsberatung.

## Quellen

§ 147 AO, § 257 HGB, § 14b UStG, § 41 EStG, § 15 AGG, § 13 StBVV (gesetze-im-internet.de, Stand 27.09.2026); Art. 5, 17, 83 DSGVO.
