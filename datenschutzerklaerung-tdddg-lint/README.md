# Datenschutzerklärung Check – TDDDG, DDG, DPF

![Datenschutzerklärung Check – TDDDG, DDG, DPF](https://getreadystack.com/img/promo/sku303592_result_card.jpg)

**Findet veraltete Gesetzeszitate und fehlende Pflichtangaben in Datenschutzerklärungen – Zeile für Zeile, mit Ersatzformulierung.** 16 rules · 1 file pro Lauf · läuft lokal, ohne Upload.

Seit dem 14.05.2024 gelten das Digitale-Dienste-Gesetz (DDG) und das TDDDG. Das TMG ist aufgehoben, das TTDSG heißt jetzt TDDDG. Eine Datenschutzerklärung von vor diesem Stichtag zitiert tote Gesetze, und Textgeneratoren und KI-Chatbots liefern solche Zitate teils bis heute. Dazu kommen Übergangsfristen, die längst abgelaufen sind: Die alten Standardvertragsklauseln (2010/87/EU) durften nur bis 27.12.2022 weiterlaufen, der EU-US Privacy Shield ist seit dem 16.07.2020 ungültig.

Weitere Informationen: https://getreadystack.com/tools/datenschutzerklaerung-tdddg-lint

## Beispiel: unsere Testdatei

Die mitgelieferte Testdatei (eine typische Datenschutzerklärung aus der Zeit vor 2024) ergibt **6 Fehler**:

| Veraltete Stelle | Ersatz |
|---|---|
| Beschwerderecht fehlt | Art. 77 DSGVO ergänzen |
| § 15 Abs. 3 TMG | DDG, § 25 TDDDG |
| § 25 Abs. 2 TTDSG | § 25 TDDDG |
| Universal Analytics, anonymizeIp | Google Analytics 4 (GA4) |
| EU-US Privacy Shield | EU-US Data Privacy Framework |
| SCC 2010/87/EU | SCC 2021/914 |

Die saubere Vergleichsdatei ergibt 0 Fehler.

## Die 16 Regeln

**Veraltete Rechtsgrundlagen**
1. TMG zitiert – aufgehoben seit 14.05.2024 (Ersatz: DDG)
2. TTDSG zitiert – umbenannt in TDDDG seit 14.05.2024
3. EU-US Privacy Shield – ungültig seit EuGH C-311/18 vom 16.07.2020
4. Safe Harbor – ungültig seit EuGH C-362/14 vom 06.10.2015
5. Alte Standardvertragsklauseln (2010/87/EU, 2004/915/EG, 2001/497/EG) – Übergangsfrist endete 27.12.2022 (Art. 4 Abs. 4 Durchführungsbeschluss (EU) 2021/914)
6. Altes BDSG (§ 4a BDSG, BDSG a.F.) – seit 25.05.2018 gilt die DSGVO
7. Universal Analytics / anonymizeIp – seit 01.07.2023 abgeschaltet
8. Datenschutzbeauftragter ab „10 Personen“ – seit 26.11.2019 gilt 20 Personen (§ 38 Abs. 1 BDSG)
9. Google Fonts vom Google-Server – LG München I, 20.01.2022, 3 O 17493/20 (100 € Schadensersatz an einen Besucher)
10. Übermittlung in die USA ohne Data Privacy Framework oder Standardvertragsklauseln (Art. 44 ff. DSGVO)
11. „Stand:“-Datum vor dem Stichtag 14.05.2024

**Fehlende Pflichtangaben nach Art. 13 DSGVO**
12. Verantwortlicher (Art. 13 Abs. 1 lit. a)
13. Rechtsgrundlage nach Art. 6 Abs. 1 (Art. 13 Abs. 1 lit. c)
14. Speicherdauer (Art. 13 Abs. 2 lit. a)
15. Widerruf der Einwilligung (Art. 13 Abs. 2 lit. c)
16. Beschwerderecht bei einer Aufsichtsbehörde (Art. 13 Abs. 2 lit. d, Art. 77)

Jeder Treffer nennt die Zeile, die Regel, die Ersatzformulierung und seit wie vielen Tagen die alte Fassung nicht mehr gilt. Zeilenumbrüche mitten im Satz stören nicht – der Text wird vor der Prüfung zusammengezogen.

## Warum das zählt

Verstöße gegen die Informationspflichten nach Art. 13 DSGVO können nach Art. 83 Abs. 5 DSGVO mit Bußgeldern bis 20 Mio. Euro oder 4 % des weltweiten Jahresumsatzes geahndet werden. Ein allgemeiner Chatbot kennt Ihre Datei nicht und prüft nicht Zeile für Zeile gegen die Stichtage; ein Generator erzeugt einen neuen Text, zeigt aber nicht, was im bestehenden Text veraltet ist.

**Maßstab:** Eine anwaltlich erstellte Datenschutzerklärung kostet laut Kanzlei-Preisangaben 300 bis 3.000 Euro. Dieses Werkzeug ersetzt keine Rechtsberatung – es zeigt, welche Stellen Sie oder Ihr Anwalt anfassen müssen.

## Benutzung

- Datei öffnen (.md, .html, .txt) → Befehlspalette → „Datenschutzerklärung Check“.
- Treffer erscheinen im Problems-Panel mit Zeilennummer.
- Die Web-Version unter dem Link oben nutzt dieselbe Prüflogik.

## Workspace-Prüfung

Die Prüfung einer geöffneten Datei ist vollständig und kostenlos. Mit einem Lizenzschlüssel prüft die Erweiterung alle Datenschutzerklärungen eines Workspace (alle Kundenseiten) in einem Lauf und speichert einen Prüfbericht als Markdown-Datei für die Kundenakte.
