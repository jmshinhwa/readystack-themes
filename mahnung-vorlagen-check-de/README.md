# Mahnung Vorlagen Check – BGB 288, ZPO 692

![Mahnung Vorlagen Check – BGB 288, ZPO 692 — finds the line](https://getreadystack.com/img/promo/mahnung-vorlagen-check-de_demo.gif)

![Mahnung Vorlagen Check – BGB 288, ZPO 692](https://getreadystack.com/img/promo/sku331854_result_card.jpg)

Prüft Mahnungs-Vorlagen (.md, .txt, .html, .twig) auf falsche Fristen, falsche Verzugszinsen, eine unzulässige 40-Euro-Pauschale und nahende Verjährung – jede Stelle mit Zeile und Korrektur. 14 Regeln, läuft lokal, kein Upload.

Web-Version und Rechtsgrundlagen: https://getreadystack.com/de/tools/mahnung-vorlagen-check-de

**Gemessen an unserer Testdatei** (letzte Mahnung an eine Verbraucherin, Rechnung vom 14.03.2023 über 1.180,00 €, geprüft am 27.09.2026): **6 Fehler**. Saubere Vergleichsdatei: 0 Fehler.

| Stelle in der Vorlage | Korrektur |
|---|---|
| Widerspruch „innerhalb von vier Wochen“ | zwei Wochen ab Zustellung (§ 692 Abs. 1 Nr. 3 ZPO) |
| Einspruch „innerhalb eines Monats“ | zwei Wochen, Notfrist (§ 700 Abs. 1, § 339 Abs. 1 ZPO) |
| 9 Prozentpunkte über dem Basiszinssatz | 5 Prozentpunkte gegenüber Verbrauchern (§ 288 Abs. 1 BGB) |
| Verzugspauschale von 40,00 € | streichen – § 288 Abs. 5 BGB nur gegen Nicht-Verbraucher |
| „Diese Mahnung hemmt die Verjährung“ | falsch – erst der Mahnbescheid hemmt (§ 204 Abs. 1 Nr. 3 BGB) |
| Rechnung vom 14.03.2023 | verjährt am 31.12.2026 – noch 95 Tage |

## Für wen

Buchhaltungen, Inkasso-Teams und Entwickler von Rechnungs- und Mahnsoftware in Deutschland, die Mahnstufen-Texte als Vorlagen pflegen – und dieselbe Vorlage an Verbraucher und an Unternehmer schicken.

## Was geprüft wird (14 Regeln)

- **Fristen im Mahnverfahren:** Widerspruch gegen den Mahnbescheid (zwei Wochen, § 692 Abs. 1 Nr. 3 ZPO) und Einspruch gegen den Vollstreckungsbescheid (zwei Wochen, § 700 Abs. 1, § 339 Abs. 1 ZPO). Zahlwörter und Ziffern werden erkannt („vier Wochen“, „14 Tagen“, „eines Monats“).
- **Verjährung:** Rechnungsdatum wird gelesen; drei Jahre ab Jahresende (§§ 195, 199 BGB). Meldung ab 120 Tagen vor dem 31.12. und nach Ablauf. Dazu die falsche Aussage „Mahnung hemmt die Verjährung“ (§ 204 BGB).
- **Kundentyp:** Kopfzeile `kundentyp: verbraucher` oder `kundentyp: unternehmer`. Verbraucher: 5 Prozentpunkte, keine 40-Euro-Pauschale. Unternehmer: 9 Prozentpunkte, Pauschale nach § 288 Abs. 5 BGB. Fehlt die Kopfzeile, gibt es einen Hinweis.
- **Weitere:** fest eingetragener Basiszinssatz (ändert sich zum 1. Januar und 1. Juli, § 247 BGB), fester Verzugszinssatz ohne Basiszins, Mahngebühr schon in der ersten Mahnung, Auskunftei-Meldung ohne Vier-Wochen-Hinweis (§ 31 Abs. 2 BDSG), fehlende Rechnungsnummer.

## Nutzung

Vorlage öffnen → Befehl **Mahnung Vorlagen Check – BGB 288, ZPO 692: Check this file**. Treffer erscheinen im Problems-Fenster mit Zeile und Korrektur. Das Prüfdatum ist heute; die Web-Version erlaubt ein anderes Datum.

## Kostenlos und Workspace

Kostenlos: die geöffnete Vorlage gegen alle 14 Regeln, ohne Limit.
Mit Lizenzschlüssel ($29 einmalig): alle Mahnstufen-Vorlagen eines Workspace in einem Lauf plus Prüfbericht als Markdown-Datei – [Lizenzschlüssel](https://buy.polar.sh/polar_cl_eZP9pyjgTF2eaTIdu4HwEZ24gOC5MQGyqtlKp2NPMtB).

## Maßstab

Anwaltliche Erstberatung: bis 190 Euro für Verbraucher (§ 34 RVG). Keine Rechtsberatung – der Check zeigt Stellen, die ein Mensch prüfen sollte.
