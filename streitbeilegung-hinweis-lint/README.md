# Streitbeilegung-Hinweis Lint (VSBG § 36 · OS-Link)

![Streitbeilegung-Hinweis Lint (VSBG § 36 · OS-Link)](https://getreadystack.com/img/promo/sku271720_result_card.jpg)

Findet in Impressum-, AGB- und Footer-Dateien (HTML, Markdown, PHP-, Twig- und Liquid-Templates) den alten Absatz zur EU-Plattform für Online-Streitbeilegung und prüft den Pflichthinweis nach § 36 VSBG. Kostenlose Web-Version und Hintergrund: https://getreadystack.com/de/tools/streitbeilegung-hinweis-lint

## Warum jetzt

Die ODR-Verordnung (VO (EU) Nr. 524/2013) wurde durch die VO (EU) 2024/3228 mit Wirkung zum **20.07.2025** aufgehoben; die OS-Plattform unter `ec.europa.eu/consumers/odr` ist abgeschaltet. Die Pflicht aus Art. 14 ODR-VO, auf diese Plattform zu verlinken, ist damit entfallen. Wer den Absatz weiter im Impressum stehen hat, verweist auf eine Plattform, die es nicht mehr gibt – Kanzleien und Handelskammern raten, ihn zu löschen, weil er eine Abmahnung nach UWG auslösen kann.

Der Absatz steht selten nur an einer Stelle: Impressum-Seite, AGB, Footer-Partial des Themes, E-Mail-Vorlagen. Ein neuer Text aus einem Generator ersetzt eine Seite, aber nicht die Kopien in den Templates.

Was bleibt, ist § 36 VSBG: Unternehmer mit Webseite oder AGB müssen angeben, inwieweit sie bereit oder verpflichtet sind, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Ausnahme: höchstens 10 Beschäftigte am 31.12. des Vorjahres (§ 36 Abs. 3 VSBG).

## Die 8 Checks

| ID | Check | Grundlage | Stufe |
|----|-------|-----------|-------|
| SB01 | Link auf `ec.europa.eu/consumers/odr` | VO (EU) 2024/3228 | Fehler |
| SB02 | Text zur „Plattform zur Online-Streitbeilegung (OS)“ | VO (EU) 2024/3228 | Fehler |
| SB03 | Zitat „Art. 14 Abs. 1 ODR-VO“ / „524/2013“ | VO (EU) Nr. 524/2013 | Fehler |
| SB04 | Baustein „Unsere E-Mail-Adresse finden Sie oben im Impressum“ | alter OS-Text | Warnung |
| SB05 | Impressum/AGB ohne Hinweis nach § 36 VSBG | § 36 Abs. 1 VSBG | Fehler |
| SB06 | nur „nicht verpflichtet“, Bereitschaft offen | § 36 Abs. 1 Nr. 1 VSBG | Warnung |
| SB07 | Teilnahme zugesagt, Stelle ohne Anschrift und Webseite | § 36 Abs. 2 VSBG | Fehler |
| SB08 | „Allgemeine Verbraucherschlichtungsstelle“ (seit 01.01.2020 Universalschlichtungsstelle des Bundes) | § 29 VSBG | Warnung |

SB01–SB04 sind an das Prüfdatum gebunden: vor dem 20.07.2025 bleiben sie still, danach melden sie sich.

## Beispiel

Muster-Impressum `impressum.html` (Muster-Shop GmbH, 24 Beschäftigte), geprüft am 25.09.2026: **6 Funde** – 3 Fehler (SB02, SB03, SB01) und 3 Warnungen (SB04, SB08, SB06). Dieselbe Datei mit Prüfdatum 01.07.2025: 2 Funde (SB08, SB06). Der korrigierte Text

> Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).

ergibt 0 Funde.

## Benutzung

Datei öffnen – die Funde erscheinen im Problems-Panel mit Paragraf und Ersatztext. Befehl: „Streitbeilegung-Hinweis: Datei prüfen“.

## Maßstab

Rechtstext-Abos für Shops (z. B. IT-Recht Kanzlei, Basispaket) kosten ab 9,90 € im Monat und liefern neue Texte; dieses Tool sucht die alten Kopien in Ihren eigenen Dateien.

## Vollversion

Workspace-Scan aller Shop- und Theme-Dateien auf einmal plus Prüfbericht als Markdown-Export für Mandanten – $29 einmalig, ein Lizenzschlüssel pro Person oder Team-Platz: https://buy.polar.sh/polar_cl_e8Qb9idojU90cbyA5zq0zEDev1Nm3bSKAsdth3PnbVO

Hinweis: Das Tool ersetzt keine Rechtsberatung; es zeigt Textstellen und ihre Rechtsgrundlage.
