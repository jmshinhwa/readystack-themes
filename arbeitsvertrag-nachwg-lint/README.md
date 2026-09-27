# Arbeitsvertrag prüfen – NachwG Lint

![Arbeitsvertrag prüfen – NachwG Lint](https://getreadystack.com/img/promo/sku307943_result_card.jpg)

Prüft Arbeitsvertrag-Vorlagen (.md, .txt, .html) direkt in VS Code gegen die Pflichtangaben des Nachweisgesetzes (§2 NachwG), die Angaben bei Auslandseinsatz und EU-Entsendung, die Schriftform der Kündigung (§623 BGB), den Mindesturlaub (§3 BUrlG) und den Mindestlohn zum Stichtag. Jede Meldung nennt Zeile, Paragraf und einen Korrekturtext.

Web-Version und Hintergrund: https://getreadystack.com/de/tools/arbeitsvertrag-nachwg-lint

## Warum

Seit dem 1. August 2022 verlangt §2 NachwG 15 Angaben im schriftlichen Nachweis der wesentlichen Arbeitsbedingungen, darunter Ruhepausen und Ruhezeiten, Fälligkeit und Art der Auszahlung des Entgelts und die Frist für die Kündigungsschutzklage. Wer sie nicht, nicht richtig, nicht vollständig oder nicht rechtzeitig aushändigt, handelt ordnungswidrig: Geldbuße bis zu 2.000 € (§4 NachwG).

Fristen für die Aushändigung (§2 Abs. 1 Satz 4 NachwG): Name und Anschrift, Entgelt und Arbeitszeit am ersten Arbeitstag; Beginn, Befristung, Arbeitsort, Tätigkeit, Probezeit, Arbeit auf Abruf und Überstunden spätestens am siebten Kalendertag; alle übrigen Angaben spätestens nach einem Monat.

Seit dem 1. Januar 2025 darf der Nachweis in Textform erteilt werden, wenn der Arbeitgeber zum Empfangsnachweis auffordert – nicht in den Branchen nach §2a SchwarzArbG. Der Mindestlohn steigt von 13,90 € (seit 1. Januar 2026) auf 14,60 € ab 1. Januar 2027.

Bei Entsendung in einen anderen EU-Mitgliedstaat verlangt §2 Abs. 3 NachwG zusätzlich den Hinweis auf die Entlohnung nach dem Recht des Aufnahmestaats und den Link zur offiziellen nationalen Website über die dort zwingenden Arbeitsbedingungen (Richtlinie 96/71/EG).

## Die 14 Checks

| Check | Grundlage | Was gemeldet wird |
|---|---|---|
| kuendigung_textform | §623 BGB | Kündigung per E-Mail, Fax oder in Textform |
| klagefrist_fehlt | §2 Abs. 1 Nr. 14 NachwG, §4 KSchG | keine Drei-Wochen-Frist für die Kündigungsschutzklage |
| klagefrist_falsch | §4 KSchG | andere Frist als drei Wochen |
| urlaub_fehlt | §2 Abs. 1 Nr. 11 NachwG | keine Urlaubsdauer |
| urlaub_unter_minimum | §3 BUrlG | unter 20 Arbeitstagen bei 5-Tage-Woche (anteilig bei Teilzeit) |
| mindestlohn | §1 MiLoG | Stundenlohn unter 12,82 € / 13,90 € / 14,60 € je Stichtag |
| entgelt_faelligkeit_fehlt | §2 Abs. 1 Nr. 7 NachwG | Entgelt ohne Fälligkeit und Auszahlung |
| ueberstunden_pauschal | §307 BGB | alle Überstunden pauschal abgegolten |
| ruhepausen_fehlt | §2 Abs. 1 Nr. 8 NachwG | Arbeitszeit ohne Ruhepausen und Ruhezeiten |
| tarifhinweis_fehlt | §2 Abs. 1 Nr. 15 NachwG | kein Hinweis auf Tarifverträge oder Betriebsvereinbarungen |
| bav_traeger_fehlt | §2 Abs. 1 Nr. 13 NachwG | Altersversorgung ohne Versorgungsträger und Anschrift |
| ausland_angaben_fehlen | §2 Abs. 2 NachwG | Auslandseinsatz über vier Wochen ohne Dauer, Währung oder Rückkehr |
| eu_entsendung_website | §2 Abs. 3 NachwG | EU-Entsendung ohne Link zur nationalen Website |
| textform_ohne_empfangsnachweis | §2 Abs. 1 NachwG | Textform ohne Aufforderung zum Empfangsnachweis |

## Beispiel

Muster-Arbeitsvertrag Servicetechniker 2026 (`_fixtures/dirty.md`), Stichtag 26.09.2026: sechs Fehler (6) im Arbeitsvertrag nach NachwG. Die geprüfte Fassung (`_fixtures/clean.md`): 0.

## Benutzung

Vorlage öffnen, Befehl „Arbeitsvertrag prüfen“ ausführen. Die Meldungen erscheinen im Problems-Fenster. Der Stichtag (Arbeitsbeginn oder Prüfdatum) bestimmt den Mindestlohn.

## Kostenlos und Vollversion

Kostenlos: eine Vorlage prüfen, alle 14 Checks, ohne Anmeldung.
Vollversion ($29 einmalig, ein Lizenzschlüssel pro Person oder Team-Platz): alle Vertragsvorlagen des Workspace in einem Lauf prüfen und den Prüfbericht als Datei exportieren – [Vollversion](https://buy.polar.sh/polar_cl_IhWOfBlAPx0TZH26gpai1VFhLyRLEPvOEe9tO4BVOBg).

Maßstab: Anwaltliche Erstberatung kostet Verbraucher bis zu 190 € zzgl. USt (§34 Abs. 1 RVG); für Arbeitgeber gilt diese Kappung nicht.

Der Lint ersetzt keine Rechtsberatung. Stand der Regeln: 26.09.2026.
