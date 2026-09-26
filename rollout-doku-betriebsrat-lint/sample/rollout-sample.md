# Systembeschreibung HelpFlow (Ticketsystem)

## Zweck
HelpFlow ersetzt das alte Ticketsystem im IT-Support. Ein KI-Assistent schlägt Antworten vor und sortiert Tickets.

## Verarbeitete Daten
Name, E-Mail, Abteilung, Ticket-Inhalte, Bearbeitungszeiten je Ticket.

## Protokollierung
Das System schreibt ein Audit-Log mit User-ID, IP-Adresse und Login-Zeit jeder Aktion.
Die Protokolle werden unbegrenzt gespeichert.

## Zugriffsrechte
Admins: IT-Leitung. Agenten sehen eigene und Team-Tickets.

## Schnittstellen
REST-API zum HR-System, Hosting beim Auftragsverarbeiter in Irland.

## Rechtsgrundlage
§ 26 BDSG.

## Betriebsrat
Eine Leistungs- oder Verhaltenskontrolle ist nicht beabsichtigt.
Die Mitbestimmung des Betriebsrats ist daher nicht erforderlich.

## Zeitplan
Go-Live: 2026-11-02
Unterrichtung Betriebsrat: 2026-11-16
