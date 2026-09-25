# Antragsfrist-Lint — Förderfristen nach § 31 Abs. 3 VwVfG

![Antragsfrist-Lint: Förderfristen (§ 31 VwVfG)](https://getreadystack.com/img/promo/sku189191_result_card.jpg)

Prüft Markdown-Seiten von Förderprogrammen auf Fristangaben, die rechtlich
anders enden als sie dort stehen.

Viel Seitentext für Förderaufrufe entsteht inzwischen mit KI-Unterstützung.
Ein Sprachmodell liest „14.11.2026" als Datum, rechnet aber den Wochentag
nicht nach — und § 31 Abs. 3 Satz 1 VwVfG hängt genau am Wochentag: Fällt das
Ende einer Frist auf einen Sonntag, einen gesetzlichen Feiertag oder einen
Sonnabend, endet die Frist erst mit Ablauf des nächstfolgenden Werktags.
Eine Seite, die den Sonnabend als letzten Tag nennt, ist damit falsch.

## Was geprüft wird

Die Erweiterung liest eine geöffnete `.md`-Datei, sucht Zeilen mit einem
Fristbegriff (Antragsfrist, Ausschlussfrist, Einreichungsfrist, Abgabefrist,
Bewerbungsfrist, Einreichungstag, Fristende, Stichtag) und wendet darauf
**9 Checks** an:

| Check | Was auffällt |
|---|---|
| `frist_abgelaufen` | Fristdatum liegt vor dem Prüfdatum |
| `fristende_wochenende` | Fristende ist ein Sonnabend oder Sonntag |
| `fristende_feiertag` | Fristende ist ein bundesweiter gesetzlicher Feiertag |
| `frist_ohne_jahr` | „31.10." ohne Jahreszahl |
| `zugang_poststempel` | „Poststempel" statt Zugang bei der Behörde |
| `datumsformat_iso` | ISO-Datum (JJJJ-MM-TT) auf einer deutschen Fristzeile |
| `rueckwirkend_zugesagt` | rückwirkende Antragstellung in Aussicht gestellt |
| `frist_widerspruch` | zwei verschiedene Fristdaten in einer Zeile |
| `richtlinie_ohne_stand` | Förderrichtlinie ohne Fassungsdatum |

Bei `fristende_wochenende` und `fristende_feiertag` nennt die Meldung den
nächstfolgenden Werktag. Der Feiertagskalender umfasst die bundesweiten
Feiertage 2026 bis 2028; bewegliche Termine (Karfreitag, Ostermontag, Christi
Himmelfahrt, Pfingstmontag) sind je Jahr hinterlegt.

## Prüfdatum

Alle datumsabhängigen Checks rechnen gegen ein Prüfdatum. Ohne Angabe ist das
der 22.09.2026; in der Weboberfläche ist es ein Eingabefeld. Dieselbe Datei
kann damit zu verschiedenen Prüfdaten unterschiedliche Befunde liefern — eine
Seite ohne Befund am 22.09.2026 meldet am 01.01.2027 die dann abgelaufene
Frist.

## Messwerte der mitgelieferten Beispiele

- `_fixtures/clean.md` — 0 Befunde zum Prüfdatum 22.09.2026, 1 Befund zum
  Prüfdatum 01.01.2027
- `_fixtures/dirty.md` — 6 Befunde zum Prüfdatum 22.09.2026 (5 Fehler,
  1 Hinweis)

Im Beispiel `dirty.md` steht der 14.11.2026 als Ausschlussfrist; das ist ein
Sonnabend, die Frist endet nach § 31 Abs. 3 S. 1 VwVfG am 16.11.2026. Der
genannte Einreichungstag 25.12.2026 ist ein Feiertag, gefolgt von Sonnabend
und Sonntag — Fristende ist der 28.12.2026.

## Umfang

Kostenlos wird die geöffnete Datei geprüft; das Ergebnis steht vollständig im
Problems-Panel. Die Vollversion prüft den ganzen Ordner auf einmal, nimmt die
Feiertagsliste eines Bundeslandes und schreibt den Fristenreport als CSV oder
Markdown heraus.

## Maßstab

Eine anwaltliche Durchsicht im Verwaltungsrecht wird üblicherweise mit
250 € je Stunde abgerechnet.

## Web-Version und Hub

Dieselbe Prüflogik läuft ohne Installation unter
<https://getreadystack.com/de/tools/antragsfrist-lint-vwvfg>.

## Grenzen

Geprüft werden Textzeilen, nicht Bescheide. Landesrechtliche Feiertage (etwa
Fronleichnam oder Reformationstag) sind nicht im kostenlosen Kalender; die
Fristberechnung nach § 31 Abs. 1 VwVfG i. V. m. §§ 187 ff. BGB für Fristen,
die durch ein Ereignis ausgelöst werden, ersetzt die Erweiterung nicht.

## Lizenz

Siehe `LICENSE.txt`.
