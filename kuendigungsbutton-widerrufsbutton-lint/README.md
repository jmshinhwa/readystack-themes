# Kündigungsbutton & Widerrufsbutton Check (BGB)

![Kündigungsbutton & Widerrufsbutton Check (BGB)](https://getreadystack.com/img/promo/sku208193_result_card.jpg)

Prüft Shop- und Abo-Templates auf die drei Pflicht-Schaltflächen im BGB – direkt im Editor, Zeile für Zeile:

| Schaltfläche | Pflichtbeschriftung | Norm |
|---|---|---|
| Bestellbutton | „zahlungspflichtig bestellen“ | § 312j Abs. 3 BGB |
| Kündigungsschaltfläche | „Verträge hier kündigen“ | § 312k Abs. 2 BGB |
| Bestätigung der Kündigung | „jetzt kündigen“ | § 312k Abs. 2 S. 3 Nr. 2 BGB |
| Widerrufsfunktion | „Vertrag widerrufen“ | § 356a Abs. 1 BGB |
| Bestätigung des Widerrufs | „Widerruf bestätigen“ | § 356a Abs. 3 BGB |

Neu seit 19. Juni 2026: § 356a BGB (Umsetzung der Richtlinie (EU) 2023/2673) verlangt für Fernabsatzverträge über eine Online-Benutzeroberfläche eine **Widerrufsfunktion**. Viele Templates und ältere Checklisten kennen nur Bestell- und Kündigungsbutton.

Werkzeugseite: https://getreadystack.com/de/tools/kuendigungsbutton-widerrufsbutton-lint

## Was geprüft wird (16 Regeln)

- **ORDER_LABEL** – Absende-Button eines Bestellformulars heißt „Jetzt bestellen“, „Weiter“ oder „Absenden“. Ohne eindeutige Beschriftung kommt nach § 312j Abs. 4 BGB kein Vertrag zustande.
- **CANCEL_BUTTON_MISSING** – Abo-Seite ohne Schaltfläche „Verträge hier kündigen“. Folge nach § 312k Abs. 6 BGB: der Kunde darf jederzeit ohne Kündigungsfrist kündigen.
- **CANCEL_LABEL** – Link zur Kündigung heißt „Abo verwalten“ oder „Mein Konto“.
- **CANCEL_CONFIRM_LABEL** – Absende-Button der Bestätigungsseite heißt nicht „jetzt kündigen“.
- **CANCEL_FIELD_ART · _IDENT · _VERTRAG · _ZEITPUNKT · _EMAIL** – Bestätigungsseite fragt nicht nach Art der Kündigung (und Grund), Name oder Kundennummer, Vertrag, Beendigungszeitpunkt und E-Mail für die Bestätigung (§ 312k Abs. 2 S. 3 Nr. 1 a–e BGB).
- **WIDERRUF_MISSING** – Shop-Seite mit Widerrufsrecht, aber ohne Schaltfläche „Vertrag widerrufen“.
- **WIDERRUF_LABEL** – Link zum Widerruf heißt „Rücksendung starten“ oder „Retoure“.
- **WIDERRUF_CONFIRM_LABEL** – Absende-Button des Widerrufsformulars heißt nicht „Widerruf bestätigen“.
- **WIDERRUF_FIELD_NAME · _VERTRAG · _KANAL** – Widerrufsformular fragt nicht nach Name, Bestell- oder Vertragsnummer und E-Mail für die Eingangsbestätigung (§ 356a Abs. 2 Nr. 1–3 BGB).
- **BELEHRUNG_FUNKTION** – Widerrufsbelehrung erwähnt das Muster-Widerrufsformular, aber nicht die Widerrufsfunktion (Art. 246a § 1 Abs. 2 S. 1 Nr. 1 EGBGB).

## Beispiel

Das mitgelieferte Beispiel-Template `_fixtures/dirty.html` (ein fiktives Kaffee-Abo) ergibt 14 Fundstellen: 12 Fehler und 2 Warnungen. Die korrigierte Fassung `_fixtures/clean.html` ergibt 0.

## Was es kostet, wenn der Button falsch heißt

Zum Vergleich: Abmahnung nach RVG: 1.225,10 € netto bei 25.000 € Gegenstandswert (1,3 Geschäftsgebühr Nr. 2300 VV RVG + 20 € Pauschale Nr. 7002 VV RVG). Bei weitverbreiteten Verstößen sieht Art. 246e § 2 EGBGB Bußgelder bis 50.000 € oder 4 Prozent des Jahresumsatzes vor.

## Benutzung

1. Template öffnen (HTML, Vue, JSX, TSX, Twig, Liquid, PHP).
2. Befehlspalette → „Check this file“. Die Fundstellen erscheinen als Diagnosen mit Zeile und Paragraf.
3. Gratis und ohne Schlüssel: jede geöffnete Datei gegen alle 16 Regeln.

Vollversion (einmaliger Lizenzschlüssel): den ganzen Workspace auf einmal prüfen und einen datierten Prüfbericht mit Paragraf je Fundstelle exportieren – [Lizenzschlüssel holen](https://buy.polar.sh/polar_cl_gJYUBlVfPxyTv3iMWKy68W7IuyvuUHUEaTC292iB3Uw).

## Grenzen

Der Check liest Beschriftungen, Links und Formularfelder im Template-Code. Beschriftungen aus Übersetzungsdateien (`{{ 'key'|trans }}`) werden übersprungen. Er ersetzt keine Rechtsberatung: ob eine andere Formulierung „entsprechend eindeutig“ ist, entscheiden im Streitfall Gerichte.

Quellen: BGB §§ 312j, 312k, 356a und EGBGB Art. 246a, 246e in der konsolidierten Fassung auf gesetze-im-internet.de; RVG § 13 Tabelle.
