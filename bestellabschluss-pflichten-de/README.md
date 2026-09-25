# Bestellabschluss-Check DE: Button & Pflichten

![Bestellabschluss-Check DE: Button & Pflichten](https://getreadystack.com/img/promo/sku186594_result_card.jpg)

Schreibt eine KI die Kassenseite eines deutschen Onlineshops, steht auf dem Bestellbutton fast immer
"Jetzt bestellen" oder "Bestellung abschicken". Beide Beschriftungen erfüllen § 312j Abs. 3 BGB nicht.
Die Folge steht in Absatz 4 desselben Paragrafen: Der Vertrag kommt nicht zustande. Jede Bestellung,
die über diesen Button gelaufen ist, ist nicht bindend — und der Verstoß ist von außen sichtbar,
also abmahnfähig.

Diese Erweiterung liest Vorlagen der Bestellstrecke (HTML, Twig, JSX, TSX, Vue) und prüft sie gegen
15 Regeln aus BGB, EGBGB und PAngV. Jeder Fund nennt die Zeile, den Paragrafen und bei fehlenden
Pflichtangaben, seit wann die Pflicht gilt — in Tagen gerechnet, damit klar ist, wie lange die Vorlage
schon so ausgeliefert wird.

## Was geprüft wird (15 Regeln)

**Bestellbutton (2)**
- `bestellbutton_wording` — Buttontext ist "Bestellen", "Jetzt bestellen", "Absenden", "Weiter",
  "Anmelden", "Submit" oder "Bestellung abschicken" (§ 312j Abs. 3 BGB).
- `bestellbutton_fehlt` — nirgends in der Datei eine eindeutige Formulierung wie
  "Zahlungspflichtig bestellen" (§ 312j Abs. 3 BGB).

**Pflichtangaben unmittelbar vor dem Button (5)**
- `gesamtpreis_fehlt`, `versandkosten_fehlt`, `merkmale_fehlt`, `lieferzeit_fehlt`, `laufzeit_fehlt`
  (§ 312j Abs. 2 BGB i. V. m. Art. 246a § 1 EGBGB).

**Verbraucherinformation (3)**
- `widerruf_fehlt` (Art. 246a § 1 Abs. 2 EGBGB), `agb_fehlt` (§ 305 Abs. 2 BGB),
  `mwst_hinweis_fehlt` (§ 3 Abs. 1 PAngV).

**Häkchen und Entgelte (2)**
- `vorangekreuzte_checkbox` — `checked` auf einer Zustimmungs- oder Einwilligungsbox
  (§ 312a Abs. 3 BGB, Art. 4 Nr. 11 DSGVO).
- `zahlungsentgelt` — Entgelt für ein gängiges Zahlungsmittel (§ 312a Abs. 4 BGB).

**Kündigung im Dauerschuldverhältnis (3)**
- `kuendigungsbutton_fehlt`, `kuendigungsbutton_wording`, `bestaetigungsseite_fehlt`
  (§ 312k Abs. 2 und 3 BGB, in Kraft seit dem 1. Juli 2022, ISO 2022-07-01).

Die Regeln zur Kündigung laufen nur an, wenn die Datei ein Dauerschuldverhältnis erkennen lässt
("Abo", "Abonnement", "Mitgliedschaft", "monatlich"). Dateien ohne Merkmale einer Bestellstrecke
werden übersprungen, damit ein Blog-Template keine Funde erzeugt.

## Gemessen an den mitgelieferten Vorlagen

- `_fixtures/clean.html` — 0 Funde.
- `_fixtures/dirty.html` — 15 Funde: 10 Fehler und 5 Warnungen aus 14 verschiedenen Regeln.
- § 312k BGB gilt seit 2022-07-01; am 2026-09-22 sind das 1544 Tage.
- § 312j Abs. 3 BGB gilt seit 2012-08-01; am 2026-09-22 sind das 5165 Tage.
- 6 Zeilen der fehlerhaften Vorlage betreffen den Bestellbutton selbst: Beschriftung, Gesamtpreis,
  Versandkosten, wesentliche Merkmale, Lieferzeit sowie Laufzeit und Kündigungsfrist.

## Bedienung

- `Bestellabschluss: Datei prüfen` — prüft die geöffnete Datei.
- `Bestellabschluss: Ordner prüfen` — prüft alle Vorlagen im Arbeitsbereich.

Die Funde erscheinen als Diagnosen im Problemfenster, mit Zeilennummer und Paragraf. Dieselbe Engine
läuft in der Erweiterung und auf der Webseite; die Regeln stehen in `ext/rules.json`, eine Zeile je Regel.

## Vollversion

Die Vollversion exportiert das datierte Prüfprotokoll mit Fundstelle und Paragraf je Verstoß für
Akte, Kanzlei und CI und erlaubt die Nutzung im Team und in Kundenprojekten.

Zum Vergleich: Eine IT-Recht-Kanzlei prüft die Bestellstrecke zum Stundensatz, 250 bis 350 Euro je
Stunde sind in Deutschland marktüblich.

## Grenzen

Die Erweiterung liest statisches Markup. Wird der Buttontext erst zur Laufzeit gesetzt oder aus einer
Übersetzungsdatei geladen, sieht sie ihn nicht. Sie ersetzt keine Rechtsberatung; sie zeigt, welche
Stellen einer Vorlage den genannten Vorschriften nicht entsprechen.

Weitere Werkzeuge: https://getreadystack.com/de/tools/bestellabschluss-pflichten-de
