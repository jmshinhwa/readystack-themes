# Impressum-Check DE: Pflichtangaben

![Impressum-Check DE: Pflichtangaben](https://getreadystack.com/img/promo/sku185448_result_card.jpg)

Diese Erweiterung liest eine Impressum-Seite im Editor und meldet, welche Pflichtangabe fehlt, falsch steht oder auf eine Rechtsgrundlage zeigt, die es nicht mehr gibt. Sie arbeitet offline auf der geöffneten Datei; kein Upload, keine Registrierung.

Hub: https://getreadystack.com/de/tools/impressum-check-ddg-de

## Warum das 2026 wieder wichtig ist

Die Impressumspflicht stand jahrzehntelang in § 5 TMG. Seit dem Digitale-Dienste-Gesetz (BGBl. I 2024 Nr. 149) steht sie in § 5 DDG. Der inhaltlich Verantwortliche journalistisch-redaktioneller Angebote steht nicht mehr in § 55 Abs. 2 RStV, sondern in § 18 Abs. 2 MStV. Generative Assistenten geben beim Satz "Angaben gemäß …" bis heute überwiegend die alte Norm aus, weil ihr Trainingsmaterial aus Millionen alter Impressum-Seiten besteht. Wer diesen Satz ungeprüft in ein neues Repository kopiert, verbreitet eine Angabe, die nicht richtig ist.

## Was geprüft wird

§ 5 Abs. 1 DDG zählt acht Nummern auf. Die Regeldatei `ext/rules.json` bildet sie zusammen mit zwei Nachbarnormen ab:

| Regel | Rechtsgrundlage |
| --- | --- |
| ddg_veraltete_grundlage | § 5 DDG (TMG abgelöst) |
| rstv_veraltet | § 18 Abs. 2 MStV (RStV abgelöst) |
| anschrift_fehlt | § 5 Abs. 1 Nr. 1 DDG |
| postfach_als_anschrift | § 5 Abs. 1 Nr. 1 DDG |
| email_fehlt | § 5 Abs. 1 Nr. 2 DDG |
| email_verschleiert | § 5 Abs. 1 Nr. 2 DDG |
| vertretungsberechtigter_fehlt | § 5 Abs. 1 Nr. 1 DDG |
| handelsregister_fehlt | § 5 Abs. 1 Nr. 4 DDG |
| registernummer_fehlt | § 5 Abs. 1 Nr. 4 DDG |
| ustid_fehlerhaft | § 5 Abs. 1 Nr. 6 DDG, § 27a UStG |
| kammerangaben_fehlen | § 5 Abs. 1 Nr. 5 DDG |
| aufsichtsbehoerde_fehlt | § 5 Abs. 1 Nr. 3 DDG |
| vsbg_hinweis_fehlt | § 36 Abs. 1 VSBG |
| platzhalter_live | § 5 Abs. 1 DDG |

Die mitgelieferte Beispieldatei `_fixtures/dirty.md` löst genau 6 dieser Regeln aus, davon 4 in der Stufe HIGH. `_fixtures/clean.md` läuft ohne Befund durch.

## Jeder Befund nennt seine Norm

Ein Treffer besteht aus Regel-Kennung, Schwere, Zeilennummer, der Rechtsgrundlage und einem Satz, der sagt, was stattdessen dort stehen muss. Beispiel aus der Beispieldatei, Zeile 8:

    HIGH  L8  ddg_veraltete_grundlage
    § 5 DDG - Veraltete Rechtsgrundlage: das TMG gilt nicht mehr.
    "Angaben gemäß § 5 TMG" durch "Angaben gemäß § 5 DDG" ersetzen.

## Der Maßstab

§ 33 Abs. 2 Nr. 1 in Verbindung mit § 33 Abs. 6 Nr. 3 DDG stellt das Nichtbereithalten einer Angabe aus § 5 Abs. 1 als Ordnungswidrigkeit mit einer Geldbuße bis zu 50.000 Euro unter Sanktion. Davor steht meist die Abmahnung eines Mitbewerbers: bei einem Gegenstandswert von 5.000 Euro ergibt § 13 Abs. 1 RVG eine 1,0-Gebühr von 354,50 Euro, die 1,3-Geschäftsgebühr nach Nr. 2300 VV RVG also 460,85 Euro.

Eine Ausnahme kennt § 36 Abs. 3 VSBG: Wer am 31. Dezember des Vorjahres zehn oder weniger Personen beschäftigt hat, muss die Teilnahmebereitschaft nach § 36 Abs. 1 Nr. 1 VSBG nicht erklären.

## Frei und erweitert

Frei: die im Editor geöffnete Impressum-Datei, vollständig, mit Zeilennummern.
Erweitert (Lizenzschlüssel): alle Impressum-Dateien eines Workspace in einem Durchlauf plus CSV-Export des Befundes für die Akte. Schlüssel: https://buy.polar.sh/polar_cl_s6zfYCCfWl8ARCXpcK9KeQEBq8ewxMClTx9uU2cCOiT

## Grenzen

Die Prüfung ist eine Textprüfung und ersetzt keine Rechtsberatung. Sie erkennt, dass eine Angabe fehlt oder formal falsch aussieht; ob eine Tätigkeit im Einzelfall erlaubnispflichtig ist oder ein Angebot journalistisch-redaktionell im Sinne des § 18 Abs. 2 MStV ist, entscheidet sie nicht.
