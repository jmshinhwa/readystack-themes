# Auftragsverarbeitung Lint – AVV nach Art. 28 DSGVO prüfen

![Auftragsverarbeitung Lint – AVV nach Art. 28 DSGVO](https://getreadystack.com/img/promo/sku360983_result_card.jpg)

**17 rules** für Ihren AVV (Auftragsverarbeitungsvertrag, englisch DPA) als Markdown-Datei: **13 Pflichtpunkte** aus Art. 28 Abs. 3 DSGVO und **4 veraltete Transfer-Grundlagen** (Privacy Shield, Safe Harbor, Standardvertragsklauseln 2010/87/EU, § 11 BDSG a.F.). Jede Lücke erscheint mit Zeilennummer, Fundstelle und Korrekturtext direkt im Editor.

Für wen: Webagenturen, Freelancer und Hoster in Deutschland, Österreich und der EU, die für Kunden Websites betreiben (WordPress, Breakdance, Shops) und dafür einen AVV unterschreiben oder vorlegen.

Web-Version ohne Installation: https://getreadystack.com/de/tools/auftragsverarbeitung-avv-lint

## Was geprüft wird

| Gruppe | Regeln |
|---|---|
| Art. 28 Abs. 3 Satz 1 | Gegenstand und Dauer · Art und Zweck · Art der personenbezogenen Daten · Kategorien betroffener Personen |
| Art. 28 Abs. 3 lit. a–h | dokumentierte Weisung inkl. Drittland · Vertraulichkeit · Art. 32 TOM · Unterauftragsverarbeiter mit Einspruchsrecht · Betroffenenrechte (Kapitel III) · Meldung nach Art. 33 Abs. 2 · Löschung oder Rückgabe nach Ende · Nachweise und Inspektionen |
| Art. 28 Abs. 3 UAbs. 2 | Hinweispflicht bei rechtswidriger Weisung |
| Veraltet | Privacy Shield (unwirksam seit 2020-07-16, EuGH C-311/18) · Safe Harbor (seit 2015-10-06, EuGH C-362/14) · SCC 2010/87/EU (seit 2022-12-27, Durchführungsbeschluss (EU) 2021/914) · § 11 BDSG a.F. (seit 2018-05-25) |

## Beispiel

Die mitgelieferte Beispiel-Vorlage im Stil eines Musters von 2018 ergibt **6 Lücken**:

```
L1   r28-weisung-rechtswidrig     Hinweispflicht bei rechtswidriger Weisung fehlt
L1   alt-bdsg-11                  Verweis auf § 11 BDSG a.F.
L22  r28a-weisung-drittland       Weisung ohne Drittland-Übermittlung
L31  r28d-unterauftrag-einspruch  Subunternehmer ohne Einspruchsrecht
L34  alt-privacy-shield           Privacy Shield seit 2020-07-16 unwirksam
L35  alt-scc-2010                 SCC 2010/87/EU seit 2022-12-27 überholt
```

Ein vollständiger AVV ergibt 0 Treffer. Das Stichtag-Feld rechnet mit: jede Meldung nennt, seit wie vielen Tagen eine Grundlage überholt ist (Stand 2026-09-28: Privacy Shield seit 2.265 Tagen).

## Warum das zählt

Verstöße gegen die Pflichten aus Art. 28 fallen unter Art. 83 Abs. 4 lit. a DSGVO: Bußgeld bis 10 Mio. € oder bis 2 % des weltweiten Jahresumsatzes, je nachdem, welcher Betrag höher ist. Ein Muster-AVV zeigt, was drinstehen sollte – nicht, was in Ihrem Vertrag fehlt. Diese Erweiterung liest Ihre Datei Zeile für Zeile.

Zum Vergleich: Eine individuell angepasste AVV beim Anwalt beginnt bei 490 € (comp/lex, Stand 2026-09).

## Benutzung

1. AVV als `.md` öffnen.
2. Befehlspalette: **AVV Lint: Datei prüfen**.
3. Treffer erscheinen im Problems-Panel mit Zeile und Korrekturtext.

Die Prüfung läuft lokal. Kein Text verlässt Ihren Rechner.

## Vollversion

Kostenlos: eine Datei, alle 17 rules, ohne Konto und ohne Limit. Die Vollversion (einmalig, ein Lizenzschlüssel pro Person oder Team-Platz) prüft alle AVVs eines Ordners auf einmal und exportiert das Prüfprotokoll als Markdown für die Datenschutz-Akte.

## Hinweis

Keine Rechtsberatung. Die Regeln prüfen, ob die Pflichtpunkte im Text vorkommen, nicht ob sie inhaltlich angemessen sind.
