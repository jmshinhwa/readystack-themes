# Spirituosen-Lint: Mindestalkohol & Alkoholsteuer

![Spirituosen-Lint: Mindestalkohol & Alkoholsteuer](https://getreadystack.com/img/promo/sku363502_result_card.jpg)

**Für Shop-Entwickler von Brennereien und Spirituosenhändlern in Deutschland:** Die Erweiterung liest die Produkt-CSV (Shopware-, Shopify- oder WooCommerce-Export) und markiert jede Zeile, deren Verkehrsbezeichnung, Flaschengröße, Alkoholangabe oder Alkoholsteuer nicht zum Recht passt — direkt im Editor, mit Zeilennummer und Rechtsgrundlage.

Gemessen an der Beispieldatei `dirty.csv` (7 Produkte): **12 Befunde** — darunter eine 0,75-l-Gin-Flasche (keine zulässige Nennfüllmenge), ein Eierlikör mit 12 % vol (Mindestalkohol 14 % vol), ein Whisky mit 4 g/l Zucker (darf nicht gesüßt werden) und ein Spiced Rum mit „Alkoholsteuer 3,00 € angegeben, fällig sind 3,42 €“.

Web-Version ohne Installation: https://getreadystack.com/de/tools/spirituosen-shop-lint

Maßstab: VO (EU) 2019/787 Anhang I · RL 2007/45/EG Anhang · LMIV Art. 9 und Anhang XII · AlkStG § 2 (1.303 € je hl reiner Alkohol) · AlkopopStG § 2 (5.550 € je hl reiner Alkohol) · JuSchG § 9 Abs. 4.

## Was geprüft wird — 40 Regeln

- **23 Kategorien Mindestalkohol** (VO (EU) 2019/787 Anhang I): Eierlikör 14 % vol, Likör 15 % vol, Crème de Cassis 15 % vol, Crème de … 15 % vol, Bitter 15 % vol, Sloe Gin 25 % vol, Spirituose mit Wacholder 30 % vol, Kümmel 30 % vol, Korn 32 % vol, Brandy / Weinbrand 36 % vol, Gin, London Gin, Wodka, Rum, Tresterbrand, Obstbrand, Geist, Aquavit und Enzian je 37,5 % vol, Sambuca und Hefebrand je 38 % vol, Whisky und Pastis je 40 % vol.
- **11 Zuckergrenzen**: Mindestzucker für Likör 100 g/l, Eierlikör 150 g/l, Crème de … 250 g/l, Sambuca 350 g/l, Crème de Cassis 400 g/l; Höchstwerte für London Gin und „Dry“ Gin 0,1 g/l, Wodka 8 g/l, Rum 20 g/l, Brandy 35 g/l; Whisky darf nicht gesüßt werden.
- **6 Etikett- und Steuerregeln**: Alkoholgehalt fehlt; mehr als eine Dezimalstelle; Einheit nicht „% vol“ (ABV, proof); Nennfüllmenge außerhalb 100, 200, 350, 500, 700, 1000, 1500, 1750, 2000 ml; trinkfertige Mischgetränke mit Spirituose unter 10 % vol (Alkopopsteuer je Gebinde und Pflichthinweis nach § 9 Jugendschutzgesetz); Spalte `alkoholsteuer` weicht vom Betrag Nennfüllmenge × % vol × 1.303 € je hl reiner Alkohol ab.

Kategorie und Produktname werden gemeinsam gelesen, die spezifischere Kategorie gewinnt (London Gin vor Gin, Eierlikör vor Likör). Zeilen mit höchstens 1,2 % vol werden übersprungen.

## CSV-Spalten

Die Kopfzeile wird automatisch erkannt (Trennzeichen `;`, `,` oder Tab, Dezimalkomma erlaubt): `name`/`titel`, `kategorie`/`typ`, `alkoholgehalt`/`abv`, `inhalt`/`volumen` (ml, cl oder l), `zucker_g_l`, `alkoholsteuer_eur`. Fehlende Spalten schalten nur die zugehörigen Regeln ab.

## Rechenbeispiel

0,7 l × 37,5 % vol = 0,2625 l reiner Alkohol × 13,03 € = **3,42 €** Alkoholsteuer. Gin Tonic 0,33 l mit 5,9 % vol: 0,01947 l reiner Alkohol × 55,50 € = **1,08 €** Alkopopsteuer je Gebinde.

## Grenzen

Die Erweiterung prüft Stammdaten, keine Laborwerte und keine geografischen Angaben (g.A.) außer den genannten. Ermäßigte Steuersätze für Klein- und Abfindungsbrennereien werden nicht gerechnet. Kein Ersatz für eine Rechtsberatung.

## Freie und erweiterte Nutzung

Frei: Die offene Produkt-CSV wird komplett geprüft — alle 40 Regeln, jede Zeile, ohne Konto. Mit Lizenzschlüssel: alle CSV-Dateien des Workspace in einem Lauf plus Prüfbericht als Datei (Zeile, Regel, Soll/Ist, Alkoholsteuer je Artikel).

Mehr: https://getreadystack.com/de/tools/spirituosen-shop-lint
