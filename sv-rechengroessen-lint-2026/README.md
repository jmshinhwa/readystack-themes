# SV-Rechengrößen 2026 Lint (Lohn-Konfig)

![SV-Rechengrößen 2026 Lint (Lohn-Konfig)](https://getreadystack.com/img/promo/sku190337_result_card.jpg)

Prüft Lohn- und HR-Konfigurationsdateien (YAML, JSON, .properties, .env, .ini) auf deutsche
Sozialversicherungs-Werte, die am 1. Januar 2026 ungültig geworden sind — direkt im Editor,
mit Zeilennummer, altem Wert und dem Wert, der ab 2026-01-01 gilt.

Für wen: Entwicklerinnen und Entwickler von Lohnsoftware, Lohnbüros mit eigener
Parameterdatei, HR-Teams, die Beitragssätze in einer Konfig pflegen, und alle, die eine
Abrechnung in Deutschland aus einer Datei statt aus einem Handbuch speisen.

## Was die Prüfung findet

Die Rechengrößen der Sozialversicherung wechseln jeden 1. Januar. Eine Konfigurationsdatei
merkt davon nichts: sie liefert den alten Wert weiter, die Abrechnung läuft ohne Fehler durch,
und der Unterschied fällt erst bei der Betriebsprüfung oder bei der Jahresmeldung auf.

Die 12 Regeln dieser Erweiterung:

| Regel | Findet |
| --- | --- |
| `bbg_rv_alv_2025` | Beitragsbemessungsgrenze RV/ALV 96.600 / 8.050 statt 101.400 / 8.450 |
| `bbg_kv_pv_2025` | Beitragsbemessungsgrenze KV/PV 66.150 / 5.512,50 statt 69.750 / 5.812,50 |
| `jaeg_2025` | Jahresarbeitsentgeltgrenze 73.800 statt 77.400 |
| `bezugsgroesse_2025` | Bezugsgröße 44.940 / 3.745 statt 47.460 / 3.955 |
| `minijob_grenze_alt` | Geringfügigkeitsgrenze 556 (oder 538 / 520 / 450) statt 603 |
| `mindestlohn_alt` | Mindestlohn 12,82 statt 13,90 je Stunde |
| `zusatzbeitrag_alt` | Durchschnittlicher GKV-Zusatzbeitrag 2,5 statt 2,9 Prozent |
| `pflege_satz_alt` | Pflegeversicherung 3,4 statt 3,6 Prozent |
| `pflege_kinderabschlag_fehlt` | Pflegesatz ohne Schlüssel für die Kinderzahl (0,25 Prozentpunkte je Kind, 2. bis 5. Kind) |
| `bbg_ost_west_getrennt` | Getrennte BBG Ost/West — seit 01.01.2025 gibt es nur noch einen Wert |
| `rechtsstand_fehlt` | SV-Werte ohne `gueltig_ab` / `valid_from` |
| `insolvenzgeldumlage_alt` | Insolvenzgeldumlage 0,06 statt 0,15 Prozent |

An der mitgelieferten Beispieldatei `_fixtures/dirty.yml` — 17 Zeilen — meldet die Prüfung
15 Funde; die gepflegte Datei `_fixtures/clean.yml` bleibt bei 0.

## Benutzung

1. Datei öffnen (YAML, JSON, .properties, .env, .ini).
2. Befehlspalette → **SV-Rechengrößen: Datei prüfen**.
3. Die Funde stehen als Diagnose in der Datei und als Text im Ausgabefenster.

Die Prüfung läuft vollständig lokal. Es geht keine Zeile dieser Konfiguration ins Netz.

## Frei und Vollversion

Frei: die geöffnete Datei, alle 12 Regeln, jeder Fund mit Zeile, altem Wert und dem ab
2026-01-01 gültigen Wert. Das reicht, um eine Parameterdatei fertig zu prüfen.

Vollversion: derselbe Lauf über das ganze Projekt — alle Konfigurationsdateien auf einmal —
und ein datierter Prüfbericht als Datei, den man der Revision, der Betriebsprüfung oder dem
Steuerberater vorlegen kann. https://buy.polar.sh/polar_cl_k1patBdgF4uEFoIlelfb7vl3l5byXNJS0QMyy4fdTtd

Maßstab: dieselbe Durchsicht als Zeitgebühr beim Steuerberater kostet nach § 13 StBVV
30 bis 75 EUR je angefangene halbe Stunde.

## Grundlagen

Sozialversicherungsrechengrößen-Verordnung 2026 (Werte ab 2026-01-01), § 8 Abs. 1a SGB IV
(Geringfügigkeitsgrenze, gekoppelt an den Mindestlohn von 13,90 EUR), § 55 SGB XI
(Kinderlosenzuschlag und Abschlag je Kind), Bekanntmachung des durchschnittlichen
Zusatzbeitragssatzes für 2026.

Werkzeugseite: https://getreadystack.com/tools/sv-rechengroessen-lint-2026
