# Auslandsbeteiligung Meldepflicht-Check (§ 138 AO)

![Auslandsbeteiligung Meldepflicht-Check (§ 138 AO)](https://getreadystack.com/img/promo/sku218747_result_card.jpg)

Prüft Ihr Beteiligungsregister (`beteiligungen.csv`) Zeile für Zeile gegen die Mitteilungspflicht nach **§ 138 Abs. 2 AO** und sagt pro Auslandsgesellschaft: meldepflichtig ja/nein, nach welcher Nummer, bis zu welchem Datum – und ob die Frist schon verstrichen ist.

Online ohne Installation: https://getreadystack.com/de/tools/auslandsbeteiligung-meldepflicht-check

**Maßstab:** Gesetzestext § 138 Abs. 2, 3 und 5 AO, § 170 Abs. 7 AO, § 379 Abs. 2 Nr. 1 AO (Bußgeld bis 25.000 €), Stand der Regeln 2026-09.

## Für wen

- Gründerinnen und Gründer in Deutschland mit einer US-Inc., UK-Ltd. oder LLC (z. B. über Stripe Atlas gegründet)
- Holdings und Mittelständler mit Töchtern, Betriebsstätten oder Minderheitsbeteiligungen im Ausland
- Steuerberater und Buchhaltung, die das Register ihrer Mandanten vor der Steuererklärung durchsehen

## Was geprüft wird (14 Regeln)

| Regel | Rechtsgrund | Was passiert |
|---|---|---|
| NR1_BETRIEBSSTAETTE | § 138 Abs. 2 Nr. 1 AO | Gründung/Erwerb einer Betriebsstätte im Ausland ist meldepflichtig |
| NR2_PERSONENGESELLSCHAFT | Nr. 2 | Ausländische Personengesellschaft – ohne Schwelle |
| NR3A_ZEHN_PROZENT | Nr. 3 a | unmittelbar **oder mittelbar** mindestens 10 % |
| NR3B_150000_EURO | Nr. 3 b | Anschaffungskosten je Gesellschaft über 150.000 € – auch bei 4 % |
| NR4_DRITTSTAAT_EINFLUSS | Nr. 4, Abs. 3 | beherrschender Einfluss auf Gesellschaft außerhalb EU/EFTA (Schweiz, Norwegen, Island, Liechtenstein sind **keine** Drittstaaten) |
| FRIST_VERPASST | § 138 Abs. 5, § 379 AO | Mitteilung fehlt, Frist verstrichen |
| FRIST_LAEUFT | § 138 Abs. 5 AO | Mitteilung fehlt, Frist läuft – mit Resttagen |
| VERSPAETET_GEMELDET | § 138 Abs. 5 AO | gemeldet, aber nach Fristende |
| ANLAUFHEMMUNG_170_7 | § 170 Abs. 7 AO | Drittstaat-Gesellschaft ungemeldet: Festsetzungsfrist beginnt nicht |
| LLC_EINORDNUNG | Typenvergleich | LLC ohne Einordnung als kapg/persg |
| LAND_UNKLAR, ANGABE_FEHLT, DATUM_UNGUELTIG, SPALTE_FEHLT | Registerformat | Daten, ohne die keine Frist berechenbar ist |

## Die Frist

Die Mitteilung ist **zusammen mit der Einkommen-, Körperschaft- oder Feststellungserklärung** für das Jahr des Ereignisses abzugeben, **spätestens 14 Monate nach Ende dieses Jahres** (§ 138 Abs. 5 AO). Für ein Ereignis in 2024 endete die Frist am 28.02.2026, für 2025 endet sie am 28.02.2027. Wer die Erklärung früher abgibt, trägt `erklaerung_am` ein – dann gilt dieses Datum.

## Registerformat

Semikolon oder Komma, erste Zeile = Kopfzeile:

```
gesellschaft;land;rechtsform;einordnung;ereignis;datum;anteil;mittelbar;anschaffungskosten;beherrschend;erklaerung_am;gemeldet_am
Nordwind Ltd;GB;Ltd;;erwerb;2024-03-15;25;;12.000;nein;;
Boreal AB;SE;AB;;erwerb;2024-11-20;4;;180.000;nein;;2026-04-10
```

`land` als ISO-Code, `ereignis` = erwerb, gruendung, veraeusserung, aufgabe oder aenderung, Datum als JJJJ-MM-TT oder TT.MM.JJJJ. Zeilen mit `land = DE` werden übersprungen.

## Beispiel (Stichtag 23.09.2026)

Im Beispielregister (7 Zeilen) findet der Check 6 Befunde: Nordwind Ltd – Frist 28.02.2026 seit 207 Tagen verstrichen; Boreal AB – 4 % aber 180.000 € Anschaffungskosten, am 10.04.2026 gemeldet, 41 Tage zu spät; Atlas Labs Inc. – Nr. 3a + Nr. 4, melden bis 28.02.2027, Festsetzungsfrist läuft bis dahin nicht an; Harbor Tools LLC – Einordnung fehlt, melden bis 28.02.2027.

## Benutzung

Datei `*beteiligung*.csv` öffnen – Befunde erscheinen im Problems-Panel. Befehl „Auslandsbeteiligung: Register prüfen“ in der Befehlspalette.

## Vollversion

Vollversion: alle Register im Workspace prüfen und einen Bericht mit Frist, Rechtsgrund und Status für die Steuerakte schreiben. $39 einmalig, ein Lizenzschlüssel pro Person oder Team-Platz: https://buy.polar.sh/polar_cl_8JI95U8rbDCUA7ICnp4TnHvZiEgAlSlU1SW8O0S5lT3

Keine Steuerberatung. Der Check ersetzt nicht die Prüfung im Einzelfall, insbesondere nicht die Einordnung ausländischer Rechtsformen.
