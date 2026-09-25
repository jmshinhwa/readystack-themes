# Belegfelder-Lint für Getränkehandel

![Belegfelder-Lint für Getränkehandel](https://getreadystack.com/img/promo/sku178344_result_card.jpg)

Dieses Lint liest die Rechnungs-, Lieferschein- und Begleitdokument-Vorlagen im Repository
(`**/*.{md,html,twig}`) und meldet jede Stelle, an der ein Nachweisfeld der deutschen
Alkoholsteuer fehlt oder das falsche Format hat. Es prüft Text, nicht Buchungen: genau das,
was im Shop-Repository liegt und beim nächsten Deployment an Kundinnen und Kunden geht.

Hub: https://getreadystack.com/de/tools/getraenke-beleg-lint-de

## Was geprüft wird

15 Regeln in `ext/rules.json`, drei Familien:

**Felder, die ganz fehlen.** Nennt ein Beleg das Steueraussetzungsverfahren, EMCS oder ein
e-VD, dann muss ein ARC-Feld da sein. Nennt er ein Steuerlager, dann eine
Verbrauchsteuernummer und eine Anschrift. Nennt er ein Erzeugnis wie Gin, Rum oder Korn,
dann einen Alkoholgehalt in % vol — ohne ihn lässt sich der reine Alkohol nicht berechnen.
Nennt er Alkoholsteuer, dann die Bemessungsgrundlage hl rA und die Literangabe, aus der sie
hervorgeht.

**Felder mit falschem Format.** Der ARC hat 21 Zeichen; das Lint zählt sie und schreibt die
gefundene Länge in die Meldung. Die Verbrauchsteuernummer folgt dem SEED-Muster DE plus 11
Zeichen, zusammen 13 Stellen. Die deutsche USt-IdNr. besteht aus DE und genau 9 Ziffern.
Beträge tragen ein Komma, kein englisches Dezimalpunkt-Cent. Daten stehen als TT.MM.JJJJ,
nicht als ISO-Zeichenkette.

**Werte, die veraltet oder unersetzt sind.** Weicht ein Steuersatz je hl rA vom Regelsatz
1.303 EUR nach § 2 Abs. 1 AlkStG ab, meldet das Lint den gefundenen Wert; ermäßigte Sätze
gelten nur für die dort genannten Brennereien, deshalb ist das eine Warnung und kein Fehler.
Unersetzte Platzhalter (`{{…}}`, `XXXXX`, `TODO`) sind ein Fehler: sie gehen so an den Kunden
und in die Betriebsprüfung. Und eine Rechnungsvorlage ohne strukturiertes Format
(XRechnung, ZUGFeRD, EN 16931) bekommt ab dem Stichtag 01.01.2027 eine datierte Meldung mit
der Zahl der verbleibenden Tage — danach wird aus der Warnung ein Fehler.

## Gemessen an den mitgelieferten Vorlagen

| Vorlage | Funde |
|---|---|
| `_fixtures/clean.md` (geprüfte Rechnungsvorlage) | 0 |
| `_fixtures/dirty.md` (dieselbe Vorlage vor der Korrektur) | 7 — davon 4 Fehler, 3 Warnungen |

Gerechnetes Beispiel aus `clean.md`: 12 Flaschen à 0,7 Liter mit 40,0 % vol sind 3,36 Liter
reiner Alkohol, also 0,0336 hl rA. Mal 1.303 EUR je hl rA ergibt 43,78 EUR Alkoholsteuer.
Steht in der Vorlage stattdessen 1.216 EUR je hl rA, sind das 87 EUR Unterschied je
Hektoliter reinen Alkohols.

## Frei und kostenpflichtig

Kostenlos und ohne Schlüssel: die geöffnete Vorlage prüfen. Jeder Fund kommt mit Regel-ID,
Zeilennummer und dem gefundenen Wert in das Problems-Panel. Diese Arbeit ist damit fertig.

Mit Schlüssel: derselbe Lauf über das ganze Repository, als Prüfbericht in Markdown und CSV
exportiert — Regel-ID, Datei, Zeile, Fundstelle — zum Ablegen in der Betriebsprüfungsakte.
$29 einmal. Schlüssel: https://buy.polar.sh/polar_cl_i9r8oIzjOLN6FVG0UJVXokAfRM2sX7sY0d0Th2OMHSz

Vergleichsmaßstab: eine Belegprüfung durch die Steuerberatung wird nach Zeitgebühr
abgerechnet, 30 bis 75 EUR je angefangene halbe Stunde (StBVV).

## Grenzen

Das Lint liest Text. Es kennt weder den Umsatz des Betriebs noch den Status im EMCS und
ersetzt keine steuerliche Beratung. Es sagt, welche Felder im Beleg fehlen und welche das
falsche Format haben — mehr nicht, und das vollständig.
