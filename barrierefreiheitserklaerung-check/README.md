# Barrierefreiheitserklärung Check (BFSG, BITV)

![Barrierefreiheitserklärung Check (BFSG, BITV)](https://getreadystack.com/img/promo/sku319907_result_card.jpg)

Prüft Ihre **Erklärung zur Barrierefreiheit** (Markdown oder HTML) direkt in VS Code auf die Pflichtangaben nach **BFSG Anlage 3 Nr. 1 a bis d** (Onlineshops und andere Dienstleistungen für Verbraucher) und **BITV 2.0 § 7 / § 12b Abs. 2 BGG** (öffentliche Stellen des Bundes). Jede Lücke erscheint im Problems-Fenster mit Zeile, Fundstelle und einer Korrekturzeile zum Einfügen.

Online-Version (gleiche Prüflogik, läuft im Browser): https://getreadystack.com/tools/barrierefreiheitserklaerung-check

## Warum das zählt

Für Dienstleistungen, die seit 28. Juni 2025 für Verbraucher erbracht werden, verlangt § 14 Abs. 1 Nr. 2 BFSG die Informationen nach Anlage 3. Wer die Dienstleistung ohne diese Angaben anbietet, handelt ordnungswidrig: Bußgeld bis €100.000 (§ 37 BFSG). Öffentliche Stellen müssen ihre Erklärung nach BITV 2.0 § 7 Abs. 6 jährlich und bei jeder wesentlichen Änderung aktualisieren.

Maßstab: Wortlaut von BFSG, BITV 2.0 und BGG auf gesetze-im-internet.de, gelesen am 23.09.2026.

## Was geprüft wird (16 Regeln)

Die Erweiterung erkennt selbst, ob es sich um eine Shop-Erklärung (BFSG) oder eine Behörden-Erklärung (BITV 2.0) handelt, und wendet nur die passenden Regeln an.

| Regel | Bereich | Fundstelle | Befund |
|---|---|---|---|
| `bfsg-a3-a-beschreibung` | BFSG | BFSG Anlage 3 Nr. 1 a | Allgemeine Beschreibung der Dienstleistung fehlt |
| `bfsg-a3-b-durchfuehrung` | BFSG | BFSG Anlage 3 Nr. 1 b | Erläuterungen zur Durchführung der Dienstleistung fehlen |
| `bfsg-a3-c-anforderungen` | BFSG | BFSG Anlage 3 Nr. 1 c | Keine Beschreibung, wie die Anforderungen der BFSGV erfüllt werden |
| `bfsg-a3-d-behoerde` | BFSG | BFSG Anlage 3 Nr. 1 d | Zuständige Marktüberwachungsbehörde nicht angegeben |
| `bfsg-falsche-stelle` | BFSG | BFSG Anlage 3 Nr. 1 d | Stelle aus BITV 2.0 / BGG genannt – für BFSG-Dienstleistungen ist die Marktüberwachungsbehörde anzugeben |
| `alt-standard` | beide | BFSG § 14 Abs. 3 / BITV 2.0 § 3 | Veralteter Standard zitiert (EN 301 549 V3.2.1 verweist auf WCAG 2.1) |
| `platzhalter` | beide | BFSG Anlage 3 / BITV 2.0 § 7 Abs. 4 | Platzhalter aus der Vorlage steht noch in der Erklärung |
| `bitv-stand-vereinbarkeit` | BITV | BITV 2.0 § 7 Abs. 3 | Stand der Vereinbarkeit (vollständig / teilweise / nicht vereinbar) fehlt |
| `bitv-12b-nicht-barrierefrei` | BITV | § 12b Abs. 2 Nr. 1 a BGG | Nicht barrierefreie Inhalte werden nicht benannt |
| `bitv-12b-gruende` | BITV | § 12b Abs. 2 Nr. 1 b BGG | Gründe für die nicht barrierefreie Gestaltung fehlen |
| `bitv-12b-feedback` | BITV | § 12b Abs. 2 Nr. 2 BGG | Feedback-Mechanismus mit elektronischer Kontaktmöglichkeit fehlt |
| `bitv-12b-schlichtung` | BITV | § 12b Abs. 2 Nr. 3 a BGG | Hinweis auf das Schlichtungsverfahren nach § 16 BGG fehlt |
| `bitv-12b-schlichtung-link` | BITV | § 12b Abs. 2 Nr. 3 b BGG | Schlichtungsstelle wird erwähnt, aber nicht verlinkt |
| `bitv-7-5-bewertung` | BITV | BITV 2.0 § 7 Abs. 5 | Nicht angegeben, ob die Bewertung selbst oder durch Dritte erfolgte |
| `bitv-datum` | BITV | BITV 2.0 § 7 Abs. 4 / (EU) 2018/1523 | Kein Erstellungs- oder Aktualisierungsdatum |
| `bitv-7-6-jaehrlich` | BITV | BITV 2.0 § 7 Abs. 6 | Letzte Aktualisierung älter als ein Jahr – § 7 Abs. 6 BITV 2.0 verlangt jährliche Aktualisierung |

## Beispiel

Die Beispiel-Erklärung eines Teeshops (`Stand: [Datum]`, „orientiert sich an den WCAG 2.0“, „Überwachungsstelle des Bundes“ als Beschwerdestelle) ergibt 6 Befunde: Platzhalter, veralteter Standard, falsche Stelle und die fehlenden Angaben nach Anlage 3 Nr. 1 b, c und d. Die Korrekturzeilen nennen z. B. „EN 301 549 V3.2.1 / WCAG 2.1 Stufe AA“ und die Marktüberwachungsstelle der Länder (MLBF).

## Benutzung

1. Erklärung öffnen (`*barrierefrei*.md` oder `.html`).
2. In der Befehlspalette den Befehl von „Barrierefreiheitserklärung Check“ ausführen – die Befunde erscheinen sofort.
3. Kostenlos: die geöffnete Datei vollständig prüfen, ohne Konto und ohne Upload.

## Vollversion

Alle Erklärungen im Workspace auf einmal prüfen und einen Prüfbericht mit Fundstellen als Datei exportieren – für Agenturen mit mehreren Kunden-Websites. $29 einmalig, ein Lizenzschlüssel pro Person oder Team-Platz: https://buy.polar.sh/polar_cl_myfdxREGxjoxoH0ISSufXMIE8hj3KYQmGVhZ63hu5W4

## Grenzen

Die Erweiterung prüft den Text der Erklärung, nicht die Barrierefreiheit der Website selbst. Ob Kleinstunternehmen (weniger als 10 Beschäftigte, höchstens 2 Mio. € Jahresumsatz oder Jahresbilanzsumme) ausgenommen sind, prüft sie nicht. Keine Rechtsberatung.
