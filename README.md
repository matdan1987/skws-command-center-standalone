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


## Eigenständiges Supabase-Backend (17.11.2026)

Die GitHub-Pages-Anwendung verwendet das **neu angelegte** Supabase-Projekt `yptvjhqqdqrfanixqafg`. Das produktive SKWS-Squads-Projekt ist nicht verbunden und wurde nicht verändert.

- `cc_members`: 99 Mitglieder (96 bisherige Spieleraliasse plus 3 Gruppenpersonen ohne bisherige Squad-Daten)
- `cc_groups`: 5 bestätigte Mentorengruppen
- `cc_squads`: 30 vorhandene T1–T4-Datensätze
- `cc_submissions`: neue Meldungen mit Status `pending`; öffentlich nicht lesbar
- RLS: öffentliche Leserechte nur auf die drei Listen, Einreichen nur in die geschützte Warteschlange; **keine direkten Änderungsrechte** auf Gruppen, Mitglieder oder bestätigte Squad-Werte.

Spieler wählen ihren Namen und tragen T1 verpflichtend sowie T2–T4 optional ein. Nach dem Absenden ist die Meldung **online gespeichert**, aber noch nicht öffentlich sichtbar. Die Freigabe kann der Betreiber im eigenständigen Supabase-Dashboard vornehmen. Dieser Schutz verhindert, dass eine beliebige Person allein mit der Auswahl eines anderen Spielernamens fremde Werte überschreibt. Ein komfortables Admin-Interface und automatische E-Mail-Erinnerungen sind noch nicht implementiert.

`backend.js` enthält ausschließlich den für Browser bestimmten **Publishable API Key**, keinen geheimen Service-Key. Die statische `snapshot.js` wird nur als Reserveanzeige genutzt, wenn die Online-Datenbank nicht erreichbar ist. Es gibt keinen automatischen Zugriff auf die produktive Datenbank.
