# Wahlausschreiben Fristen-Check (BetrVG · WO)

![Wahlausschreiben Fristen-Check (BetrVG · WO)](https://getreadystack.com/img/promo/sku257499_result_card.jpg)

**Prüft das Wahlausschreiben einer Betriebsratswahl, bevor es aushängt:** Einspruchs- und Vorschlagsfrist, sechs Wochen bis zur Stimmabgabe, Sitzzahl, Mindestsitze des Geschlechts in der Minderheit und Stützunterschriften. Jeder Befund nennt die Zeile, das richtige Datum oder die richtige Zahl und die Fundstelle.

Werkzeugseite und Web-Version: https://getreadystack.com/de/tools/wahlausschreiben-fristen-check

Maßstab: Eine Wahlvorstandsschulung kostet bei Seminaranbietern zwischen 169 € und 999 € je Teilnehmer zzgl. MwSt. – dieser Check ersetzt keine Schulung, er rechnet nur die Zahlen im Aushang nach.

## Beispiel (Datei `_fixtures/dirty.md`, 6 Befunde)

| Im Wahlausschreiben | Richtig |
|---|---|
| Erlass 11.12.2026, Stimmabgabe 19.01.2027 | Erlass spätestens 08.12.2026 (§ 3 Abs. 1 WO) |
| 5 Betriebsratsmitglieder | 7 bei 180 Arbeitnehmern (§ 9 BetrVG) |
| 1 Mindestsitz für Frauen | 2 nach d'Hondt bei 48 Frauen, 132 Männern (§ 15 Abs. 2 BetrVG, § 5 WO) |
| Einsprüche bis 25.12.2026 | 28.12.2026 (§ 4 Abs. 1 WO, § 193 BGB) |
| Wahlvorschläge bis 24.12.2026 | 28.12.2026 (§ 6 Abs. 1 WO, § 193 BGB) |
| 3 Stützunterschriften | 9 bei 172 Wahlberechtigten (§ 14 Abs. 4 BetrVG) |

Warum der 28.12.2026? Zwei Wochen ab Erlass am Freitag, 11.12.2026 enden rechnerisch am 25.12.2026. Das ist der 1. Weihnachtstag, danach folgen Samstag und Sonntag. Über § 41 WO gilt § 193 BGB: Die Frist endet am nächsten Werktag, Montag, 28.12.2026.

## Die 14 Checks

| ID | Prüfung | Fundstelle |
|---|---|---|
| WA01 | Datum des Erlasses angegeben | § 3 Abs. 2 WO |
| WA02 | Tag der Stimmabgabe angegeben | § 3 Abs. 2 WO |
| WA03 | Erlass spätestens sechs Wochen vor dem ersten Tag der Stimmabgabe | § 3 Abs. 1 WO |
| WA04 | Letzter Tag der Einspruchsfrist angegeben | § 3 Abs. 2, § 4 Abs. 1 WO |
| WA05 | Einspruchsfrist richtig berechnet (zwei Wochen, Wochenende und bundesweite Feiertage) | § 4 Abs. 1, § 41 WO, § 193 BGB |
| WA06 | Letzter Tag der Frist für Wahlvorschläge angegeben | § 3 Abs. 2, § 6 Abs. 1 WO |
| WA07 | Frist für Wahlvorschläge richtig berechnet | § 6 Abs. 1, § 41 WO, § 193 BGB |
| WA08 | Zahl der Betriebsratsmitglieder nach der Staffel | § 9 BetrVG |
| WA09 | Mindestsitze des Geschlechts in der Minderheit (Höchstzahlverfahren) | § 15 Abs. 2 BetrVG, § 5 WO |
| WA10 | Mindestzahl der Stützunterschriften (bis 20: keine · 21–100: 2 · darüber 1/20, mind. 3, höchstens 50) | § 14 Abs. 4 BetrVG |
| WA11 | Ort, Tag und Zeit der öffentlichen Stimmauszählung | § 3 Abs. 2, § 13 WO |
| WA12 | Ort, an dem Wählerliste und Wahlordnung ausliegen | § 3 Abs. 2 WO |
| WA13 | Betriebsadresse des Wahlvorstands | § 3 Abs. 2 WO |
| WA14 | 5 bis 100 Wahlberechtigte: vereinfachtes Wahlverfahren ist Pflicht | § 14a BetrVG |

## So schreiben Sie das Wahlausschreiben, damit der Check es liest

Eine Angabe pro Zeile, Datum als `TT.MM.JJJJ`:

```
Erlassen am: 11.12.2026
Arbeitnehmer im Betrieb: 180
Wahlberechtigte Arbeitnehmer: 172
Frauen im Betrieb: 48
Männer im Betrieb: 132
Zahl der zu wählenden Betriebsratsmitglieder: 7
Mindestsitze für das Geschlecht in der Minderheit: 2
Einsprüche gegen die Wählerliste können nur bis zum 28.12.2026 ... eingelegt werden.
Wahlvorschläge sind bis zum 28.12.2026 beim Wahlvorstand einzureichen.
Jeder Wahlvorschlag muss von mindestens 9 Wahlberechtigten unterzeichnet sein.
Stimmabgabe: 19.01.2027 ...
```

## Grenzen

- Feiertage: nur die bundesweiten (Neujahr, Karfreitag, Ostermontag, 1. Mai, Christi Himmelfahrt, Pfingstmontag, 3. Oktober, 25./26. Dezember). Landesfeiertage am Betriebssitz prüfen Sie selbst.
- Das vereinfachte Wahlverfahren (§§ 28 ff. WO) hat eigene Fristen; der Check meldet nur, dass es Pflicht ist.
- Kein Rechtsrat. Die Verantwortung für die Wahl bleibt beim Wahlvorstand.

## Befehle

- **Wahlausschreiben prüfen** – prüft die offene Datei, Befunde erscheinen unter „Probleme“.
- Vollversion: Alle Wahlausschreiben im Ordner auf einmal prüfen und Prüfbericht mit Paragraf je Befund als Datei für die Wahlakte exportieren. [Vollversion](https://buy.polar.sh/polar_cl_4SEro9hA8nfEdiXqenQRjTT3DTqjHtqdlCfpw4OP17i) · $29 einmalig, ein Lizenzschlüssel pro Person oder Team-Platz.

Die freie Prüfung braucht keinen Schlüssel und kein Konto; der Text verlässt den Rechner nicht.
