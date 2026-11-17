# SKWS Command Center · Freigabe der neuen Tracking-Funktionen

Diese Anleitung gilt **ausschließlich** für das neue Supabase-Projekt:

https://supabase.com/dashboard/project/yptvjhqqdqrfanixqafg

Das bestehende skws-squads-Produktivsystem wird weder abgefragt noch verändert.

## VS, Spenden, Stürme, Kills und Zug

Neue Meldungen ansehen:

```sql
SELECT id, member_name, metric, metric_value, recorded_on, notes, submitted_at
FROM public.cc_metric_reports
WHERE status = 'pending'
ORDER BY submitted_at;
```

Einen Wert nach Prüfung veröffentlichen:

```sql
SELECT public.cc_review_metric('UUID-DER-MELDUNG', true);
```

Ablehnen:

```sql
SELECT public.cc_review_metric('UUID-DER-MELDUNG', false);
```

Die freigegebene Tagesmeldung wird in cc_metric_entries abgelegt. Eine zweite Freigabe für **denselben Spieler, dieselbe Kategorie und dasselbe Datum** ersetzt den vorherigen Tageswert, statt ihn doppelt zu zählen. Eine Kategorie pro Tag eignet sich für einen Tagesgesamtwert. Teilmeldungen innerhalb eines Tages werden nicht automatisch aufaddiert.

## Schildmeldungen

```sql
SELECT id, member_name, shield_status, expires_at, notes, submitted_at
FROM public.cc_shield_reports
WHERE status = 'pending'
ORDER BY submitted_at;
```

Freigeben:

```sql
SELECT public.cc_review_shield('UUID-DER-MELDUNG', true);
```

Ablehnen:

```sql
SELECT public.cc_review_shield('UUID-DER-MELDUNG', false);
```

Ein bestätigter Schildstatus ersetzt den bisherigen Eintrag für diesen Spieler. Ablaufdaten werden im Browser auf abgelaufen geprüft, wenn sie angegeben wurden. Diese Werte stammen von manuell bestätigten Meldungen, **nicht** automatisch aus Last War.

## Eventvorschläge

```sql
SELECT id, requester_name, title, category, starts_at, ends_at, description, submitted_at
FROM public.cc_event_proposals
WHERE status = 'pending'
ORDER BY submitted_at;
```

Freigeben:

```sql
SELECT public.cc_review_event('UUID-DER-MELDUNG', true);
```

Ablehnen:

```sql
SELECT public.cc_review_event('UUID-DER-MELDUNG', false);
```

Ein freigegebener Eventvorschlag erzeugt einen veröffentlichten Eintrag in cc_events.

## Saisons administrieren

Saisonphasen sind nicht durch Spieler öffentlich beschreibbar. Admins pflegen sie direkt im **neuen** Supabase-Projekt:

```sql
INSERT INTO public.cc_seasons (title,phase,starts_on,ends_on,notes,is_published)
VALUES ('Saisonname','planned',NULL,NULL,'',true);
```

Erlaubte Phasen: planned, current, after, completed. Termine können leer bleiben, wenn sie nicht bestätigt sind.

## Datenschutz und Identitätsprüfung

- Die öffentliche Webseite kennt keine tatsächliche Last-War-Identität eines Einsenders. Ein Spielername im Formular ist **kein Authentizitätsbeweis**.
- Deshalb darf niemand ohne Moderation veröffentlichte Statistiken verändern.
- Alle öffentlichen Tracking-Tabellen sind nur lesbar; private Prüfmeldungen haben keine öffentlichen SELECT-Rechte.
- Moderationsfunktionen sind für die Rollen anon und authenticated gesperrt. Nur ein privilegierter Administrator kann sie per SQL-Editor ausführen.
- Ein publizierbarer Supabase-Schlüssel ist kein Administratorschlüssel.
- Für echte Spielerverifikation, Admin-Login oder automatische E-Mail-Erinnerungen sind weitere getrennte Funktionen erforderlich.
