# Vergabe Schwellenwerte Check 2026

![Vergabe Schwellenwerte Check 2026](https://getreadystack.com/img/promo/sku278273_result_card.jpg)

Findet veraltete EU-Schwellenwerte in Vergabe-Vorlagen, Dienstanweisungen und Konfigurationsdateien (Markdown, JSON, YAML, Text) und nennt pro Zeile den Wert, der seit 2026-01-01 gilt.

Werkzeugseite: https://getreadystack.com/tools/vergabe-schwellenwerte-check-2026

**Maßstab:** Ein Nachprüfungsverfahren vor der Vergabekammer kostet mindestens 2.500 € Gebühr (§182 Abs. 2 GWB) — ein einziger falsch eingeordneter Auftrag ist teurer als jede Prüfung vorher.

## Warum jetzt

Die EU-Kommission hat die Schwellenwerte mit den Delegierten Verordnungen (EU) 2025/2150, 2025/2151 und 2025/2152 neu festgesetzt. Sie gelten seit 2026-01-01 unmittelbar, §106 GWB verweist dynamisch darauf:

| Auftragsart | 2024/25 (alt) | seit 2026-01-01 |
|---|---|---|
| Bauaufträge und Konzessionen | 5.538.000 € | 5.404.000 € |
| Liefer- und Dienstleistungen (Kommunen, Länder, übrige Auftraggeber) | 221.000 € | 216.000 € |
| Liefer- und Dienstleistungen oberer und oberster Bundesbehörden | 143.000 € | 140.000 € |
| Liefer- und Dienstleistungen Sektoren (SektVO) und Verteidigung (VSVgV) | 443.000 € | 432.000 € |

Die Werte sind gesunken. Wer noch mit 221.000 € rechnet, schreibt einen Auftrag über 218.000 € national aus, obwohl er EU-weit hätte ausgeschrieben werden müssen. Ein solcher Vertrag kann nach §135 GWB im Nachprüfungsverfahren von Anfang an unwirksam erklärt werden.

## Was geprüft wird — 13 rules

- 11 Regeln für alte Schwellenwerte aus 2020/21, 2022/23 und 2024/25 (Bau, Liefer-/Dienstleistungen, Bundesbehörden, Sektoren/Verteidigung) in allen Schreibweisen: `221.000`, `221000`, `221,000`, `221 000`.
- 1 Regel für abgelaufene Zeitraum-Angaben wie „Schwellenwerte 2024/2025“.
- 1 Regel für Verweise auf alte TED-Standardformulare — seit 2023-10-25 gibt es nur noch eForms (DVO (EU) 2019/1780, in Deutschland eForms-DE).

Eine Zahl wird nur gemeldet, wenn in derselben Zeile oder den zwei Zeilen davor ein Vergabe-Begriff steht (Schwellenwert, Vergabe, Auftragswert, GWB, VgV, SektVO, KonzVgV, VSVgV, EU-weit, threshold). So bleiben Preise, Artikelnummern und Summen wie 1.221.000 € ungemeldet. Unveränderte Werte wie 750.000 € für soziale Dienstleistungen bleiben ebenfalls still.

## Beispiel

In einer Beispiel-Dienstanweisung einer Stadt meldet der Check 6 Treffer: 5.538.000, 221.000, 143.000, 443.000, 5.382.000 und die Überschrift „EU-Schwellenwerte 2024/2025“. Jede Meldung nennt den gültigen Wert und die Tage seit dem Stichtag.

## Nutzung

- Befehl „Vergabe Schwellenwerte: Datei prüfen“ auf der offenen Datei — das Ergebnis erscheint als Problem-Liste mit Zeilennummern.
- Dieselbe Prüfung läuft ohne Installation auf der Werkzeugseite im Browser. Die Datei verlässt den Rechner nicht.

## Für wen

Vergabestellen in Kommunen, Landkreisen und Stadtwerken, zentrale Beschaffungsstellen, Vergabeberater und Entwickler von e-Vergabe- und Vergabemanagement-Software, die Schwellenwerte in Konfigurationsdateien pflegen.

## Grenzen

Nationale Wertgrenzen der Länder (UVgO, VOB/A Abschnitt 1, Landesvergabegesetze) unterscheiden sich je Bundesland und werden nicht geprüft. Der Check ersetzt keine Rechtsberatung und keine Auftragswertschätzung nach §3 VgV.

Lizenz: siehe LICENSE.txt
