# Energielabel Feed Check – EU-Energielabel im Shop-Feed

![Energielabel Feed Check](https://getreadystack.com/img/promo/sku341521_result_card.jpg)

Prüft Produkt-Feeds (CSV) gegen das EU-Energielabel, Zeile für Zeile, direkt im Problems-Panel von VS Code.

Web-Version und Hintergrund: https://getreadystack.com/de/tools/energielabel-feed-lint-eu

Maßstab: Nach Paragraf 15 EnVKG kann die Marktüberwachung fehlende Energieverbrauchskennzeichnung mit bis zu 50.000 Euro Bußgeld ahnden.

## Was geprüft wird

| Check | Was | Schwere |
|---|---|---|
| EL01 | Label-pflichtiges Gerät ohne Energieeffizienzklasse | error |
| EL02 | Alte Plus-Klasse (A+, A++, A+++) auf einer reskalierten Gerätegruppe nach deren Stichtag | error |
| EL03 | Wert ist keine gültige Klasse (z. B. „A++++“, „H“) | error |
| EL04 | Kein Link zum Label-Bild | error |
| EL05 | Kein Link zum Produktdatenblatt | error |
| EL06 | Smartphone oder Tablet ohne Klasse ab 20.06.2025 (Verordnung (EU) 2023/1669) | error |
| EL07 | Klasse E, F oder G bei Klima- oder Heizgerät (Skala A+++ bis D) | warning |

Stichtage der Skala A bis G je Gerätegruppe:

- Kühl- und Gefriergeräte, Geschirrspüler, Waschmaschinen, Waschtrockner, Fernseher und Monitore: 01.03.2021
- Leuchtmittel: 01.09.2021
- Smartphones und Tablets: 20.06.2025
- Wäschetrockner: 01.07.2025
- Klimageräte, Heizgeräte, Warmwasserbereiter: weiter A+++ bis D

## Beispiel: Muster-Feed dirty.csv

Neun Zeilen, Prüfdatum 27.09.2026, sechs Fundstellen:

| Feed-Zeile (falsch) | Fix (Check · Stichtag) |
|---|---|
| Kühlschrank · A++ | EL02 · Skala A bis G seit 01.03.2021 |
| Smartphone · Klasse leer | EL06 · Pflicht seit 20.06.2025 |
| Wäschetrockner · A+++ | EL02 · Skala A bis G seit 01.07.2025 |
| Waschmaschine · kein Datenblatt | EL05 · Link zum Produktdatenblatt |
| Fernseher · kein Label-Bild | EL04 · Label-Bild neben den Preis |
| Geschirrspüler · Klasse leer | EL01 · Klasse aus EPREL eintragen |

Nicht gemeldet: Klimagerät mit A++ (gültige Skala), LED-Lampe mit F, Haartrockner ohne Klasse (nicht label-pflichtig). Mit Prüfdatum 01.06.2025 meldet derselbe Feed vier Fundstellen, weil die Stichtage für Smartphones und Wäschetrockner noch nicht erreicht waren.

## Feed-Format

- Trennzeichen: Komma, Semikolon oder Tab, erkannt an der Kopfzeile
- Spalten (deutsch oder englisch): id/sku/artikelnummer, title/titel/name, category/kategorie/product_type/google_product_category, energy_efficiency_class/energieeffizienzklasse/effizienzklasse, energy_label_url/energielabel, datasheet_url/produktdatenblatt/datenblatt
- Die Gerätegruppe wird aus Kategorie und Titel gelesen

## Benutzung

Eine .csv-Datei öffnen oder speichern – die Fundstellen erscheinen im Problems-Panel mit Zeile, Check-ID und Fix. Über die Befehlspalette lässt sich die Prüfung auch manuell starten. Das Prüfdatum ist standardmäßig heute.

## Kostenlos und Vollversion

Kostenlos: ein ganzer Feed mit allen sieben Checks, ohne Konto, ohne Limit, in VS Code und in der Web-Version.

Vollversion (Lizenzschlüssel): Bericht als Datei für Händler und Agentur exportieren und alle Feeds eines Projektordners in einem Lauf prüfen. [Vollversion](https://buy.polar.sh/polar_cl_IoyEvSEqdORuNlNTskd5DO8U8TzwXLfrjWtAZ2wkFhJ)

## Grenzen

Das Tool prüft die Angaben im Feed, nicht das Label selbst und nicht die Darstellung im Template. Die Klasse muss aus dem EPREL-Eintrag des Modells stammen; ob der Wert dort stimmt, kann kein Feed-Check wissen. Keine Rechtsberatung.
