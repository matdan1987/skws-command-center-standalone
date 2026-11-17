# Admin-Freigabe im unabhängigen SKWS Command Center

Die öffentliche Webseite verwendet ausschließlich das neue Supabase-Projekt **yptvjhqqdqrfanixqafg**. Die ursprüngliche produktive SKWS-Squads-Datenbank und deren GitHub-Repository sind nicht betroffen.

## Eingegangene Meldungen prüfen

Öffne im neuen Supabase-Projekt den SQL Editor und führe die folgende Abfrage aus:

```sql
SELECT id, name, squads, submitted_at
FROM public.cc_submissions
WHERE status = 'pending'
ORDER BY submitted_at ASC;
```

Prüfe die Identität beziehungsweise Spielzugehörigkeit der einsendenden Person über euren internen Allianzprozess. Ohne Anmeldung kann die Webseite noch nicht garantieren, dass jemand wirklich der ausgewählte Spieler ist.

## Meldung freigeben

Kopiere die UUID aus der Spalte id und verwende:

```sql
SELECT public.cc_review_submission('UUID-DER-MELDUNG', true);
```

Dadurch wird **nur im eigenständigen Command-Center-Projekt** der zugehörige Truppeneintrag aktualisiert und die Meldung auf approved gesetzt. Bei vorhandenen Einträgen wird der alte Wert überschrieben; bei neuen Einträgen wird einer erzeugt. Die Webseite lädt die aktualisierten Daten beim erneuten Öffnen oder nach Klick auf Online aktualisieren.

## Meldung ablehnen

```sql
SELECT public.cc_review_submission('UUID-DER-MELDUNG', false);
```

Dadurch wird nur der Status auf rejected gesetzt. Die Truppendaten bleiben unverändert.

## Sicherheit und offene Punkte

- Die Webseite enthält ausschließlich einen Supabase-Publishable-Key und **keinen** privilegierten Datenbank-Schlüssel.
- Row Level Security (RLS) erlaubt Besuchern die öffentliche Leseansicht und das Einreichen neuer Meldungen. Sie können freigegebene Werte und eingegangene private Meldungen nicht eigenmächtig ändern oder einsehen.
- Maximal drei noch ausstehende Meldungen pro Spieler innerhalb von zehn Minuten.
- Die Webseite hat keine identitätsgeprüfte Spielerkonten-Verknüpfung; ein eigener Admin-Login und Spieler-Verifikation sind sinnvolle nächste Ausbaustufen.
- E-Mail-Reminder wurden bislang **nicht** aktiviert.
- Änderungen an alten SKWS-Squads-Tabellen, -Secrets, -API-URLs oder -GitHub-Repositories sind ausdrücklich tabu.
