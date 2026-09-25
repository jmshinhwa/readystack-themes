# Rollout-Doku Lint – Betriebsrat & IT-Einführung

![Rollout-Doku Lint – Betriebsrat & IT-Einführung](https://getreadystack.com/img/promo/sku242269_result_card.jpg)

**Betriebsrat Mitbestimmung Check für Systembeschreibungen:** Rollout-Doku Lint prüft die Markdown-Systembeschreibung eines neuen IT-Tools (Anlage zur IT-Rahmenbetriebsvereinbarung) mit 15 Regeln gegen § 87 Abs. 1 Nr. 6, § 90, § 80 Abs. 3 und § 121 BetrVG — bevor sie beim Betriebsrat liegt und bevor das Tool live geht.

Werkzeug-Seite (läuft auch im Browser): https://getreadystack.com/de/tools/rollout-doku-betriebsrat-lint

## Warum

- Ein Tool, das Verhalten oder Leistung der Beschäftigten erfassen *kann*, ist mitbestimmungspflichtig (§ 87 Abs. 1 Nr. 6 BetrVG). Die Absicht zählt nicht: Objektive Eignung zählt (BAG 1 ABR 7/15, 13.12.2016).
- Der Arbeitgeber muss den Betriebsrat über die Planung technischer Anlagen und über Arbeitsverfahren „einschließlich des Einsatzes von Künstlicher Intelligenz“ rechtzeitig unterrichten (§ 90 Abs. 1 Nr. 2 und Nr. 3 BetrVG).
- Wer diese Unterrichtung nicht, unvollständig oder verspätet erfüllt, handelt ordnungswidrig: bis zu €10.000 Bußgeld (§ 121 BetrVG).
- Muss der Betriebsrat KI beurteilen, gilt ein Sachverständiger als erforderlich (§ 80 Abs. 3 BetrVG).

## Was geprüft wird (15 Regeln)

| Regel | Prüft | Grundlage |
|---|---|---|
| RD01 | Zweck beschrieben | § 90 Abs. 1 BetrVG |
| RD02 | Datenkategorien genannt | § 87 Abs. 1 Nr. 6 BetrVG |
| RD03 | Auswertungen/Reports festgelegt | § 87 Abs. 1 Nr. 6 BetrVG |
| RD04 | Rollen und Zugriffsrechte | Art. 5 Abs. 1 lit. f DSGVO |
| RD05 | Löschfrist vorhanden | Art. 5 Abs. 1 lit. e DSGVO |
| RD06 | keine unbegrenzte Speicherung | Art. 5 Abs. 1 lit. e DSGVO |
| RD07 | Schnittstellen / Auftragsverarbeiter | Art. 28 DSGVO |
| RD08 | „Kontrolle nicht beabsichtigt“ als Argument | BAG 1 ABR 7/15 |
| RD09 | Mitbestimmung wird verneint | § 87 Abs. 1 Nr. 6 BetrVG |
| RD10 | KI ohne § 90 Abs. 1 Nr. 3 / § 80 Abs. 3 | BetrVG |
| RD11 | Audit-Log ohne Zweckbindung + Verwertungsverbot | § 87 Abs. 1 Nr. 6 BetrVG |
| RD12 | Unterrichtung nach dem Go-Live-Datum | § 90, § 121 BetrVG |
| RD13 | § 26 BDSG als einzige Rechtsgrundlage | EuGH C-34/21 |
| RD14 | Änderungsverfahren für Updates | § 87 Abs. 1 Nr. 6 BetrVG |
| RD15 | Bezug auf Betriebsvereinbarung / Einigungsstelle | § 87 Abs. 2 BetrVG |

## Beispiel

Die mitgelieferte Beispiel-Doku (`_fixtures/dirty.md`, ein Ticketsystem mit KI-Assistent) liefert 11 Befunde. Darunter:

```
Unterrichtung Betriebsrat: 2026-11-16      -> liegt nach Go-Live 2026-11-02 (§ 121 BetrVG: bis zu €10.000)
Die Mitbestimmung ... nicht erforderlich   -> Zustimmung nach § 87 Abs. 1 Nr. 6 BetrVG
Verhaltenskontrolle ist nicht beabsichtigt -> Objektive Eignung zählt (BAG 1 ABR 7/15)
Audit-Log mit User-ID, IP-Adresse          -> Zweckbindung + Verwertungsverbot festhalten
Protokolle werden unbegrenzt gespeichert   -> Löschfrist, z. B. 90 Tage
```

Die korrigierte Fassung (`_fixtures/clean.md`) liefert 0 Befunde.

## Benutzung

Markdown-Datei öffnen — die Befunde erscheinen im Problems-Panel, zeilengenau. Das Datum darf als `2026-11-02` oder `02.11.2026` stehen; die Regel RD12 vergleicht die Zeile mit „Go-Live“ und die Zeile mit „Unterrichtung“.

## Kostenlos und Vollversion

Kostenlos: jede offene Systembeschreibung mit allen 15 Regeln, ohne Key. Vollversion ($29 einmalig, ein Lizenzschlüssel pro Person oder Team-Platz): Workspace-Prüfbericht über alle Systembeschreibungen als Datei, als Anlage für die Unterrichtung des Betriebsrats — [Vollversion](https://buy.polar.sh/polar_cl_utqay8UfgX9jPpOHCwY0fnE0JzNYfGbQiWTRw3Y7hTR).

Zum Vergleich: Anwalt nach RVG: 1,3 Geschäftsgebühr (Nr. 2300 VV) bei €5.000 Gegenstandswert = €480,85 netto.

Keine Rechtsberatung. Das Werkzeug prüft Vollständigkeit und typische Formulierungen, nicht den Einzelfall.
