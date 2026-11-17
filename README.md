# SKWS Command Center · Standalone

Eigenständige GitHub-Pages-Anwendung für Skywalkers / Last War Server 1858. **Kein Fork, keine produktive Abhängigkeit.**

## Öffentliche Testversion mit echten Daten
Die Seite lädt aus `snapshot.js` eine **einmalige Momentaufnahme** der echten Mitgliederdaten, die ausschließlich mit lesenden Datenbankabfragen erstellt wurde.

- 96 Mitglieder mit Spieleralias und Rang
- 30 dazu passende Meldungen mit T1–T4-Truppentypen und Kampfkraft
- Mitgliederliste, Suche, Filter, Rangliste und Meldestatistik
- Erfassungsformular und Export als JSON/CSV
- Fehlende Mentorengruppen bleiben ausdrücklich **nicht zugeordnet**. Diese Information war in der Datenquelle nicht vorhanden.

**Öffentliche Daten:** Die Spieleraliasse, Ränge und Truppenwerte sind in dieser GitHub-Pages-Website und in diesem öffentlichen GitHub-Repository sichtbar. Es wurden keine E-Mail-Adressen, Passwörter, Tokens, Zugangsdaten, internen Logs oder Admin-Einstellungen kopiert.

## Strikte Isolation
- Bestehendes GitHub-Repository, Produktivdatenbank und Google-Tabelle bleiben unverändert.
- Die öffentlich erreichbare Anwendung greift **zur Laufzeit niemals** auf diese Systeme zu.
- Alle Änderungen in dieser Phase werden ausschließlich im Browser des jeweiligen Nutzers (localStorage) gespeichert. Deshalb sind neue Meldungen noch **nicht für andere Spieler sichtbar**.
- Keine automatische Synchronisation. Der echte Datenstand in snapshot.js ist eine statische Kopie.

## Geplante Erweiterung
Ein **neues, vollständig separates Supabase-Projekt**, eigene Benutzeranmeldung und Schreibberechtigungen sowie ein eigenständiger E-Mail-Erinnerungsdienst. Keine gemeinsame Infrastruktur mit dem bestehenden SKWS-Squads-System.

## Technik
Statisches HTML, CSS und JavaScript ohne Framework oder Build-Pipeline. GitHub Pages veröffentlicht den main-Branch.

Details zur Datenkopie unter [DATA-COPY.md](DATA-COPY.md).


## Fünf Mentorengruppen (Stand 17.11.2026)

`groups.js` enthält die fünf R4-Kontrollgruppen mit **78 Spielern inklusive 11 Mentoren, zuzüglich 5 R4**. Drei Namen fehlen weiterhin unter exakt derselben Schreibweise in der Squad-Datenkopie und werden deshalb getrennt markiert: sike, Hadès 930, Ccalley. Die R4-Schreibweise Bedraloc ist dem vorhandenen Squad-Eintrag Bedraloç zugeordnet. Der vormals als Harald Thorsson/Harald Thorsten bezeichnete Mentor heißt laut Bestätigung jetzt Harald. Gruppe 1 verwendet den aktuellen Spielernamen Harald und übernimmt dessen vorhandene T1–T4-Daten aus der unveränderten Datenkopie. Die Gruppenpläne sind vom produktiven System getrennt; es erfolgen keinerlei produktive Schreibzugriffe.
