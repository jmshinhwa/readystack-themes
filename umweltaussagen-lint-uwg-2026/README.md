# Green-Claims-Lint: Umweltaussagen nach UWG 2026

![Green-Claims-Lint: Umweltaussagen nach UWG 2026](https://getreadystack.com/img/promo/sku214993_result_card.jpg)

Ab dem **27. September 2026** sind im deutschen Wettbewerbsrecht neue Verbote für Umweltwerbung anwendbar (Drittes Gesetz zur Änderung des UWG, BGBl. 2026 I Nr. 43, Umsetzung der EU-Richtlinie 2024/825 „EmpCo“). Wörter wie „umweltfreundlich“, „nachhaltig“ oder „klimaneutral“ stehen dann auf der schwarzen Liste im Anhang zu § 3 Abs. 3 UWG – sie sind ohne Abwägung unzulässig. Diese Erweiterung markiert solche Aussagen direkt in Produkttexten, Shop-Templates und JSON-Produktfeeds (`.md`, `.html`, `.json`, `.txt`) und nennt zu jedem Treffer die Anhang-Nummer und eine zulässige Fassung.

Web-Version und Hintergrund: https://getreadystack.com/tools/umweltaussagen-lint-uwg-2026

## Was geprüft wird (17 Regeln)

| Anhang | Was markiert wird |
|---|---|
| Nr. 4a | allgemeine Umweltaussagen ohne Spezifizierung: umweltfreundlich, klimafreundlich, nachhaltig, ökologisch, naturfreundlich, „grüne Wahl“, biologisch abbaubar, energieeffizient, eco-friendly, sustainable |
| Nr. 4c | klimaneutral, CO2-neutral, klimapositiv, net zero, „Emissionen kompensiert“ – auf Kompensation gestützte Produktwirkung |
| Nr. 2a | eigene Nachhaltigkeitssiegel ohne Zertifizierungssystem |
| Nr. 4b | „100 % recycelbar“ für das ganze Produkt, wenn es nur ein Teil ist |
| Nr. 10a | gesetzliche Pflichten als Vorteil (FCKW-frei, asbestfrei) |
| § 5 UWG | Zukunftsaussagen („bis 2030 klimaneutral“) ohne Umsetzungsplan und unabhängige Prüfung |
| Nr. 23d ff. | unbelegte Haltbarkeitsaussagen („hält ein Leben lang“) |

Eine Nr.-4a-Aussage wird **nicht** markiert, wenn in derselben Zeile eine Spezifizierung steht: eine Prozentangabe, eine Begründung („weil“, „dank“), eine Energieeffizienzklasse, eine EN-Norm oder eine anerkannte Umweltleistung (Blauer Engel, EU Ecolabel, ISO 14024). Für Nr. 4c gilt das nicht: „klimaneutral dank Kompensation“ bleibt verboten, auch mit Zahl.

## Beispiel

Im mitgelieferten Beispieltext (Produktseite einer Trinkflasche) findet die Prüfung **12 Treffer: 9 Verstöße und 3 Warnungen**. Die umformulierte Fassung derselben Seite ergibt 0 Treffer.

| verbotene Aussage | zulässige Fassung |
|---|---|
| „umweltfreundlich“ | „Verpackung aus 80 % Recyclingkarton“ |
| „ein klimaneutrales Produkt“ | streichen (Nr. 4c) |
| „unser eigenes Nachhaltigkeitssiegel“ | Siegel mit Drittprüfung, z. B. Blauer Engel |
| „FCKW-frei“ | streichen (Nr. 10a) |
| „100 % recycelbar“ | „Umverpackung zu 100 % recycelbar“ |

## Bedienung

Datei öffnen – die Treffer erscheinen im Problems-Fenster mit Zeile, Anhang-Nummer und Fix. Befehl „Umweltaussagen prüfen“ startet die Prüfung manuell.

## Was es kostet, wenn es schiefgeht

Eine anwaltliche Abmahnung kostet nach RVG bei 25.000 € Gegenstandswert 1.225,10 € netto (1,3 Geschäftsgebühr Nr. 2300 VV RVG = 1.205,10 € + 20 € Pauschale Nr. 7002). Dazu kommen Unterlassungserklärung und gegebenenfalls Vertragsstrafe. Eine Übergangsfrist für bereits gedruckte Verpackungen enthält das Gesetz nicht.

## Grenzen

Die Prüfung ist eine Wortmuster-Prüfung, keine Rechtsberatung. Ob eine Spezifizierung „klar und deutlich“ genug ist, entscheidet im Streitfall ein Gericht. Bilder, Logos und Siegel-Grafiken werden nicht gelesen.

## Vollversion

Die offene Datei wird ohne Schlüssel vollständig geprüft. Den ganzen Workspace auf einmal prüfen und alle Treffer als CSV (Datei, Zeile, Anhang-Nummer) für die Rechtsprüfung exportieren: $29 einmalig, ein Lizenzschlüssel pro Person oder Team-Platz – https://buy.polar.sh/polar_cl_lH315waELkLkSZWOv1OkxCZIYMib44YdKos5w3goOW7
