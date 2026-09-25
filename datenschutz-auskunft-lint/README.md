# Datenschutz-Auskunft Linter (Art. 15 DSGVO)

![Datenschutz-Auskunft Linter (Art. 15 DSGVO)](https://getreadystack.com/img/promo/sku183178_result_card.jpg)

Diese Erweiterung liest ein Auskunftsschreiben im Markdown-Format und meldet, welche
Pflichtangabe fehlt, welcher Baustein rechtlich nicht hineingehört und wann die
Monatsfrist nach Art. 12 Abs. 3 DSGVO abläuft. Sie ist für die Vorlagen gedacht, mit
denen Datenschutzbeauftragte in deutschen Behörden, Kliniken, Hochschulen und KMU
Auskunftsanträge beantworten.

Jeder Fund nennt die Rechtsgrundlage, den Grund und die Zeilennummer. Die Prüfung läuft
lokal im Editor; es wird kein Text an einen Server geschickt.

## Die 15 Regeln

| # | Regel | Grundlage |
|---|-------|-----------|
| 1 | Zwecke der Verarbeitung genannt | Art. 15 Abs. 1 lit. a DSGVO |
| 2 | Kategorien personenbezogener Daten genannt | Art. 15 Abs. 1 lit. b DSGVO |
| 3 | Empfänger oder Kategorien von Empfängern genannt | Art. 15 Abs. 1 lit. c DSGVO |
| 4 | Speicherdauer oder deren Kriterien genannt | Art. 15 Abs. 1 lit. d DSGVO |
| 5 | Berichtigung, Löschung, Einschränkung und Widerspruch vollständig | Art. 15 Abs. 1 lit. e DSGVO |
| 6 | Beschwerderecht bei der Aufsichtsbehörde genannt | Art. 15 Abs. 1 lit. f DSGVO |
| 7 | Herkunft der Daten genannt | Art. 15 Abs. 1 lit. g DSGVO |
| 8 | Automatisierte Entscheidungsfindung und Profiling beantwortet | Art. 15 Abs. 1 lit. h DSGVO |
| 9 | Kopie der verarbeiteten Daten angeboten | Art. 15 Abs. 3 DSGVO |
| 10 | Drittlandsübermittlung und Garantien beantwortet | Art. 15 Abs. 2 DSGVO |
| 11 | Kein Entgelt für die erste Kopie | Art. 12 Abs. 5 DSGVO |
| 12 | Ausweiskopie nur mit Schwärzungshinweis | Art. 5 Abs. 1 lit. c, Art. 12 Abs. 6 DSGVO |
| 13 | Keine offenen Platzhalter im Serienbrief | Art. 12 Abs. 1 DSGVO |
| 14 | Einschränkung der Auskunft nennt § 34 BDSG | § 34 BDSG |
| 15 | Monatsfrist ab Eingang des Antrags | Art. 12 Abs. 3 DSGVO |

## Die Frist

Regel 15 liest die Zeile `Eingang des Antrags: TT.MM.JJJJ` (auch `JJJJ-MM-TT`) und
rechnet einen Monat dazu. Steht im Text eine Verlängerung, rechnet sie mit drei Monaten,
wie es Art. 12 Abs. 3 Satz 2 DSGVO vorsieht. Sieben Tage vor Ablauf kommt eine Warnung,
danach ein Fehler mit der Zahl der überfälligen Tage. Das Prüfdatum ist einstellbar,
damit man ein altes Schreiben auch rückwirkend beurteilen kann.

## Gemessen an den mitgelieferten Beispielen

`_fixtures/dirty.md` ist eine Serienbriefvorlage eines Bürgeramts mit Eingang am
05.08.2026. Am Prüfdatum 22.09.2026 meldet die Erweiterung 7 von 15 Regeln: Herkunft,
automatisierte Entscheidungsfindung, Kopie und Drittland fehlen, eine Bearbeitungsgebühr
von 25,00 Euro steht drin, ein Platzhalter `[Name der betroffenen Person]` ist offen und
die Frist war am 05.09.2026 abgelaufen, also 17 Tage überfällig. Setzt man das Prüfdatum
auf den 10.08.2026, sind es 6 Funde – die Frist schweigt, weil sie noch lief.
`_fixtures/clean.md` meldet am selben Tag 0 Funde.

## Frei und kostenpflichtig

Frei: die geöffnete Datei wird vollständig geprüft, alle 15 Regeln, jeder Fund mit
Artikel, Grund und Zeilennummer, ohne Wasserzeichen und ohne Zähler.

Kostenpflichtig ist eine andere Achse, nämlich Umfang und Mitnahme: der ganze Ordner auf
einmal und ein datierter Nachweis-Bericht für die Akte.
Lizenz: https://buy.polar.sh/polar_cl_L1T6oCyVJvmCPSj0Gs7SN6KRhS2VcgbkcA1KQ1oguQG

## Maßstab

Eine Kanzlei oder ein externer Datenschutzbeauftragter prüft ein Auskunftsschreiben
üblicherweise für 90 bis 150 Euro pro Stunde, und zwar je Schreiben.

## Grenzen

Die Erweiterung prüft Text, nicht Ihre Aktenlage. Ob eine Angabe inhaltlich stimmt, ob
§ 34 BDSG im Einzelfall wirklich greift und ob die Kopie vollständig ist, bleibt die
Entscheidung der verantwortlichen Stelle. Die Erweiterung ist keine Rechtsberatung.

Alle Werkzeuge: https://getreadystack.com/de/tools/datenschutz-auskunft-lint
