# Verfahrensdokumentation Check (GoBD, §147 AO)

![Verfahrensdokumentation Check](https://getreadystack.com/img/promo/sku178092_result_card.jpg)

Prüft eine Verfahrensdokumentation im Markdown-Format gegen **17 Regeln** aus den
GoBD (BMF-Schreiben vom 28.11.2019) und der Abgabenordnung — in VS Code, offline,
ohne Upload und ohne Konto.

Werkzeug-Seite: <https://getreadystack.com/tools/verfahrensdoku-gobd-check>

## Warum es das gibt

Eine Verfahrensdokumentation wird einmal geschrieben und dann jahrelang nicht
angefasst. In der Außenprüfung fällt auf, was fehlt. Zwei Dinge sind seit 2025 neu:

* **Buchungsbelege sind acht Jahre aufzubewahren, nicht zehn.** §147 Abs. 3 Satz 1
  AO nennt heute drei Fristen nebeneinander — zehn Jahre für Bücher, Inventare,
  Jahresabschlüsse, Lageberichte und die Eröffnungsbilanz, **acht Jahre für
  Buchungsbelege**, sechs Jahre für die sonstigen Unterlagen. Sprachmodelle und
  ältere Muster-Vorlagen geben weiterhin durchgängig zehn Jahre an.
* Die Frist beginnt nicht am Belegdatum, sondern **mit dem Schluss des
  Kalenderjahrs** (§147 Abs. 4 AO).

## Die 17 Regeln

| Gruppe | Prüfung | Fundstelle |
| --- | --- | --- |
| Pflichtteile | Allgemeine Beschreibung, Anwenderdokumentation, Technische Systemdokumentation, Betriebsdokumentation | GoBD Rz. 153 |
| Fassung | Versionsnummer, Gültigkeitsbeginn, Änderungshistorie, Freigabe, Alter der Fassung | GoBD Rz. 154 |
| Fristen | Buchungsbelege nicht mit 10 Jahren, Buchungsbelege mit 8 Jahren, Sechs-Jahres-Frist, Fristbeginn | §147 Abs. 3 und 4 AO |
| Prüfbarkeit | Datenzugriff Z1, Z2 und Z3 | §147 Abs. 6 AO |
| Kontrolle | Internes Kontrollsystem, Unveränderbarkeit, Datensicherungskonzept | GoBD Rz. 100 und 103, §146 Abs. 4 AO |

Jeder Befund nennt die Zeilennummer, die Regelkennung und die Fundstelle im Gesetz
oder im BMF-Schreiben.

## Beispiel

Die mitgelieferte Beispieldatei `_fixtures/dirty.md` — eine kurze, typische
Verfahrensdokumentation von 2019 — ergibt **12 Befunde: 9 Fehler und 3 Hinweise**.
Darunter „Buchungsbelege bewahren wir 10 Jahre auf" in Zeile 22, die fehlende
Betriebsdokumentation und der fehlende Abschnitt zum Datenzugriff Z1 bis Z3.
Die Gegendatei `_fixtures/clean.md` ergibt **0 Befunde**.

## Was kostenlos ist

Die vollständige Prüfung der geöffneten Datei: alle 17 Regeln, jeder Befund mit
Zeilennummer und Fundstelle. Das ist eine abgeschlossene Arbeit, keine
beschnittene Vorführung — keine Wasserzeichen, keine Zeitsperre, keine
Begrenzung auf N Durchläufe.

Dazu kommt der Lauf über **alle** Verfahrensdokumentationen im Workspace zusammen
mit der übergabefertigen Berichtsdatei für den Prüfer oder den Steuerberater;
dieser Teil fragt nach einem Lizenzschlüssel: <https://buy.polar.sh/polar_cl_4ecG2oZhrU4pZhXKIDTco78th6R0swStXdKD63nSxy6>
— $29 einmalig, ein Schlüssel je Person oder Team-Platz, 7 Tage volle Rückgabe.

## Maßstab

Die Zeitgebühr eines Steuerberaters beträgt nach §13 StBVV **16,50 € bis 41 € je
angefangene Viertelstunde**, also 66 € bis 164 € je Stunde. Kommt ein
Steuerpflichtiger in der Außenprüfung dem Datenzugriff nach §147 Abs. 6 AO nicht
nach, kann nach §146 Abs. 2c AO ein **Verzögerungsgeld von 2.500 € bis
250.000 €** festgesetzt werden.

## Grenzen

Das Werkzeug liest Text. Es prüft, ob die geforderten Teile, Fristen und
Zugriffsarten beschrieben sind — es beurteilt nicht, ob die Beschreibung
inhaltlich zu Ihrem Betrieb passt. Es ersetzt keine steuerliche Beratung.
