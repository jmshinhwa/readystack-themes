# Dienstplan-Check: Ruhezeit und Pausen (ArbZG)

![Dienstplan-Check: Ruhezeit und Pausen (ArbZG) — finds the line](https://getreadystack.com/img/promo/dienstplan-ruhezeit-check_demo.gif)

![Dienstplan-Check: Ruhezeit und Pausen (ArbZG)](https://getreadystack.com/img/promo/sku297576_result_card.jpg)

**Schichtplaner in Pflege, Gastronomie, Handel und Logistik:** Prüfe den Dienstplan, bevor er aushängt. Die Erweiterung liest den Dienstplan als CSV (Excel-Export) und markiert jede Zeile, die gegen das Arbeitszeitgesetz (ArbZG) oder das Jugendarbeitsschutzgesetz (JArbSchG) verstößt: mit Zeile, Paragraf und dem Wert, der erlaubt wäre.

**12 rules · 1 CSV file · Ruhezeit, Pausen, Nachtarbeit, Jugendliche.**

## Beispiel: 6 Verstöße im Dienstplan

Der mitgelieferte Beispielplan (13 Schichten, 4 Mitarbeitende, Oktober 2026) ergibt 6 Verstöße:

| Zeile im Plan | Was das Gesetz verlangt |
|---|---|
| Anna: 7,5 h Ruhezeit | mind. 11 h Ruhezeit (§ 5 ArbZG) |
| Ben: 11,5 h Schicht | max. 10 h (§ 3 ArbZG) |
| Ben: 30 Min Pause | 45 Min ab 9 h (§ 4 ArbZG) |
| Dana: 63 h Woche | max. 60 h (§ 3 ArbZG) |
| Lea, 17: 11 h Freizeit | 12 h für unter 18 (§ 13 JArbSchG) |
| Lea, 17: bis 21:30 Uhr | nur 6 bis 20 Uhr (§ 14 JArbSchG) |

Verstöße gegen § 3, § 4 und § 5 ArbZG sind Ordnungswidrigkeiten nach § 22 ArbZG: Bußgeld bis 30.000 Euro je Verstoß.

## Warum nicht einfach einen Chatbot fragen?

Ein Chatbot rechnet nicht jede Zeile eines echten Plans durch, und er verwechselt die Regeln: Für Jugendliche gilt nach § 18 Abs. 2 ArbZG nicht das ArbZG, sondern das JArbSchG, also 12 h Freizeit statt 11 h Ruhezeit, 8 h statt 10 h am Tag und 60 Min Pause ab mehr als 6 h. Die Erweiterung wählt die Regel pro Person anhand der Spalte `Alter`.

## Die 12 Regeln

| Regel | Norm | Prüft |
|---|---|---|
| ARBZG-3-TAG | § 3 ArbZG | mehr als 10 h Arbeitszeit (ohne Pausen) an einem Tag |
| ARBZG-3-WOCHE | § 3, § 11 Abs. 2 ArbZG | mehr als 60 h in einer Kalenderwoche (6 Werktage x 10 h, Sonntage zählen mit) |
| ARBZG-4-PAUSE | § 4 ArbZG | mehr als 6 h: 30 Min, mehr als 9 h: 45 Min Pause |
| ARBZG-5-RUHEZEIT | § 5 ArbZG | weniger als 11 h zwischen Schichtende und nächstem Beginn |
| ARBZG-6-NACHT | § 6 Abs. 2 ArbZG | Nachtschicht (mehr als 2 h zwischen 23 und 6 Uhr) über 8 h (Hinweis) |
| ARBZG-11-ERSATZRUHETAG | § 11 Abs. 3 ArbZG | Sonntagsarbeit ohne freien Werktag innerhalb von 2 Wochen |
| JARBSCHG-8-TAG | § 8 JArbSchG | unter 18: mehr als 8 h am Tag |
| JARBSCHG-8-WOCHE | § 8 JArbSchG | unter 18: mehr als 40 h in der Woche |
| JARBSCHG-11-PAUSE | § 11 JArbSchG | unter 18: mehr als 4,5 h: 30 Min, mehr als 6 h: 60 Min |
| JARBSCHG-13-FREIZEIT | § 13 JArbSchG | unter 18: weniger als 12 h Freizeit |
| JARBSCHG-14-NACHT | § 14 JArbSchG | unter 18: Arbeit zwischen 20 und 6 Uhr |
| CSV-ZEILE | Dienstplan-CSV | Zeile ohne lesbares Datum, Uhrzeit oder Namen |

Ruhezeit auf 10 h verkürzt? § 5 Abs. 2 ArbZG erlaubt das nur in Krankenhäusern, Pflege, Gastronomie, Verkehr, Rundfunk und Landwirtschaft, und nur mit Ausgleich auf 12 h innerhalb eines Kalendermonats oder 4 Wochen. Die Meldung nennt diese Ausnahme, wenn die Lücke zwischen 10 und 11 h liegt.

## CSV-Format

Kopfzeile mit den Spalten `Mitarbeiter;Datum;Beginn;Ende;Pause` und optional `Alter`. Trenner Semikolon, Komma oder Tab. Datum `2026-10-05` oder `05.10.2026`, Uhrzeit `07:00`, Pause in Minuten. Endet eine Schicht vor ihrem Beginn, läuft sie über Mitternacht.

```
Mitarbeiter;Datum;Beginn;Ende;Pause;Alter
Anna K.;2026-10-05;14:00;22:30;30;34
Anna K.;2026-10-06;06:00;14:30;30;34
```

Jede Meldung sagt außerdem, in wie vielen Tagen die Schicht beginnt, damit du weißt, wie viel Zeit zum Umplanen bleibt.

## Benutzung

Öffne eine `.csv` in VS Code: die Befunde erscheinen im Problems-Panel. Die gleiche Prüfung läuft ohne Installation im Browser: https://getreadystack.com/de/tools/dienstplan-ruhezeit-check

## Kostenlos und Vollversion

Kostenlos: einen Dienstplan (CSV) prüfen, jede Verletzung von Ruhezeit, Pausen und Höchstarbeitszeit mit Zeile und Paragraf. Vollversion: alle Dienstpläne eines Ordners auf einmal prüfen und das Prüfprotokoll als CSV für Betriebsrat oder Aufsicht exportieren. Einmal 29 US-Dollar, ein Lizenzschlüssel pro Person oder Team-Platz.

Die Erweiterung ersetzt keine Rechtsberatung. Tarifverträge und Betriebsvereinbarungen nach § 7 ArbZG können abweichende Regeln erlauben; die Erweiterung prüft den gesetzlichen Rahmen.
