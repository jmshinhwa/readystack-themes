# Bescheid-Vorlagen Lint – Abgabenbescheid prüfen

![Abgabenbescheid prüfen – Bescheid-Vorlagen Lint](https://getreadystack.com/img/promo/sku298741_result_card.jpg)

Prüft Abgabenbescheid-Vorlagen (Grundbesitzabgaben, Gebühren, Beiträge nach dem Kommunalabgabengesetz) direkt in VS Code: Rechtsbehelfsbelehrung, Bekanntgabe, aufschiebende Wirkung und Säumniszuschlag. Jede Meldung nennt Zeile, Paragraf und einen Korrekturtext.

Web-Version und Hintergrund: https://getreadystack.com/de/tools/bescheid-vorlage-lint-kag

## Warum

Eine unrichtige oder fehlende Rechtsbehelfsbelehrung verlängert die Anfechtungsfrist von einem Monat auf ein Jahr (§58 Abs. 2 VwGO). Seit dem 1. Januar 2025 gilt ein Brief am **vierten** Tag nach Aufgabe zur Post als bekanntgegeben (§122 Abs. 2 Nr. 1 AO, §41 Abs. 2 VwVfG) – viele Vorlagen nennen noch den dritten Tag.

## Die 10 Checks

| Check | Grundlage | Was gemeldet wird |
|---|---|---|
| bekanntgabe_dritter_tag | §122 Abs. 2 Nr. 1 AO, §41 Abs. 2 VwVfG | „dritter Tag nach Aufgabe zur Post“ ab dem Prüfdatum 1. Januar 2025 |
| rbb_fehlt | §58 Abs. 2 VwGO | keine Rechtsbehelfsbelehrung in der Vorlage |
| frist_nicht_monat | §70 Abs. 1, §74 Abs. 1 VwGO | Frist in Wochen oder Tagen statt „eines Monats“ |
| form_ohne_niederschrift | §70 Abs. 1 VwGO | nur „schriftlich“, ohne Niederschrift oder elektronische Form (Warnung) |
| aufschiebende_wirkung | §80 Abs. 2 Satz 1 Nr. 1 VwGO | Aussage, der Widerspruch halte die Zahlung auf |
| saeumnis_satz | §240 Abs. 1 AO | Säumniszuschlag mit anderem Satz als 1 % |
| saeumnis_voller_monat | §240 Abs. 1 AO | „voller Monat“ statt „angefangener Monat“ |
| klage_ohne_gericht | §58 Abs. 1 VwGO | Klage genannt, aber kein Verwaltungsgericht |
| land_nw_widerspruch | §110 JustG NRW | NRW-Vorlage belehrt über Widerspruch statt Klage |
| fristbeginn_erhalt | §70 Abs. 1 VwGO | Frist „nach Erhalt/Zugang“ statt „nach Bekanntgabe“ (Warnung) |

## Beispiel

Die mitgelieferte Muster-Vorlage Grundbesitzabgaben 2027 (`_fixtures/dirty.md`) ergibt 6 Fehler, die korrigierte Fassung (`_fixtures/clean.md`) 0:

| Satz in der Vorlage | Korrektur |
|---|---|
| gilt am dritten Tag als bekanntgegeben | vierter Tag, seit 1. Januar 2025 |
| Säumniszuschlag von 0,5 % | 1 % je angefangenen Monat |
| für jeden vollen Monat | für jeden angefangenen Monat |
| innerhalb von zwei Wochen | innerhalb eines Monats |
| Widerspruch hat aufschiebende Wirkung | keine aufschiebende Wirkung |
| kann Klage erhoben werden | Klage beim Verwaltungsgericht mit Sitz |

## Benutzung

- Datei öffnen (`.md`, `.txt`, `.html`) – Befunde erscheinen im Problems-Panel.
- Oder über die Befehlspalette (Strg+Umschalt+P) die Befehle des Lints aufrufen.
- Das Prüfdatum ist der heutige Tag; die Bekanntgabe-Regel greift ab dem 1. Januar 2025.
- Vorlagen, die „Nordrhein-Westfalen“ oder „NRW“ enthalten, werden zusätzlich auf den Klageweg ohne Widerspruchsverfahren geprüft.

## Kostenlos und Vollversion

Kostenlos: eine Vorlage prüfen, alle 10 Checks, ohne Anmeldung. Vollversion: alle Bescheid-Vorlagen des Workspace in einem Lauf prüfen und den Prüfbericht als Datei für die Akte exportieren – [Vollversion](https://buy.polar.sh/polar_cl_eEpIwBvT0supsvrXX6qpFUt72aCExhobroZFI2NR3Um).

## Maßstab

Anwaltliche Erstberatung kostet Verbraucher bis zu 190 € zzgl. USt (§34 Abs. 1 RVG); für Kommunen und Softwarehäuser gilt diese Kappung nicht.

## Grenzen

Der Lint erkennt Formfehler in Textmustern. Er ersetzt keine Rechtsberatung und prüft keine Festsetzungsbeträge, Satzungen oder Landesbesonderheiten außerhalb der oben genannten Checks.
