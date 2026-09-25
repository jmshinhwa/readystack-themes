# Grundsteuer Fristen-Check für Objektlisten

![Grundsteuer Fristen-Check für Objektlisten](https://getreadystack.com/img/promo/sku236605_result_card.jpg)

Prüft eine Objekt-Änderungsliste (CSV) auf **Grundsteuer-Anzeigefristen nach § 228 Abs. 2 BewG**: Jede Änderung der tatsächlichen Verhältnisse (Anbau, Ausbau, Abriss, Nutzungsänderung, Neubau, Teilung) ist bis zum **31. März des Folgejahres** beim Finanzamt anzuzeigen. Für Änderungen aus 2025 lief die Frist am **31.03.2026** ab, für Änderungen aus 2026 läuft sie am **31.03.2027** ab.

Werkzeugseite: https://getreadystack.com/de/tools/grundsteuer-anzeige-fristen-check

Maßstab: Steuerberater rechnen Grundsteuer-Erklärungen nach § 24 Abs. 1 Nr. 11a StBVV ab — 1/20 bis 9/20 einer vollen Gebühr nach Tabelle A, Gegenstandswert mindestens 25.000 €.

## Was geprüft wird (9 Checks)

| Check | Stufe | Grundlage |
|---|---|---|
| SPALTE_FEHLT | Fehler | Pflichtspalten der Liste |
| DATUM_UNGUELTIG | Fehler | Datum existiert nicht (z. B. 31.02.2025) |
| ANZEIGE_VERSAEUMT | Fehler | § 228 Abs. 2 BewG, Frist verstrichen, keine Anzeige |
| ANZEIGE_VERSPAETET | Fehler | Anzeige nach dem 31. März abgegeben |
| ANZEIGE_OFFEN | Warnung | Frist läuft noch, Datum wird genannt |
| WERTFORTSCHREIBUNG | Warnung | § 222 Abs. 1 BewG, Abweichung über 15.000 € nach Abrundung auf volle 100 € |
| LANDESMODELL | Warnung | BW, BY, HH, HE, NI: eigenes Landesgesetz |
| EIGENTUEMERWECHSEL | Hinweis | Zurechnungsfortschreibung zum 1. Januar, § 9 Abs. 1 und § 10 GrStG |
| EREIGNIS_UNKLAR | Warnung | Ereignis keiner Anzeigeart zuordenbar |

Verspätete oder fehlende Anzeigen sind Steuererklärungen im Sinne der AO; ein Verspätungszuschlag nach § 152 AO ist möglich, höchstens 25.000 €.

## Format der Liste

```
objekt;bundesland;ereignis;datum;wert_alt;wert_neu;angezeigt_am
Musterstraße 12, Köln;NW;Anbau Wintergarten;14.06.2025;182.400;214.700;
```

Trennzeichen `;` oder `,`. Datum als `TT.MM.JJJJ` oder `JJJJ-MM-TT`. Beträge mit oder ohne Tausenderpunkt. `wert_alt`/`wert_neu` sind optional.

## Beispiel

Die mitgelieferte Beispielliste mit sechs Objekten ergibt sieben Befunde, darunter:

- Musterstraße 12, Köln: Anbau vom 14.06.2025 war bis 31.03.2026 anzuzeigen — keine Anzeige eingetragen.
- Grundsteuerwert steigt um 32.300 € (182.400 € → 214.700 €) — Wertfortschreibung zum 01.01.2026.
- Hafenstraße 9, Kiel: Nutzungsänderung vom 01.02.2026, Anzeige fällig bis 31.03.2027.

## Nutzung

Öffnen Sie eine `.csv`-Datei; Befunde erscheinen im Problems-Fenster. Die Prüfung läuft lokal, keine Daten verlassen den Rechner. Kein Ersatz für steuerliche Beratung.

## Vollversion

Prüfbericht als Datei für die Akte exportieren und ganze Bestände in einem Lauf dokumentieren: [Vollversion](https://buy.polar.sh/polar_cl_viWtkgRdhf2KL72cK2dwQCKIarBhVp4klmrfd455YEp)
