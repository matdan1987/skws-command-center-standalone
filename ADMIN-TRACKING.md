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

## VS-Wochenstrategien: Eco, Eco Plus, All In

Die Strategien sind in der neuen, **nur öffentlich lesbaren** Tabelle `public.cc_vs_week_strategies` abgelegt. Nur ein privilegierter Admin darf sie verändern. Die Anzeige ermittelt die Bewertung **für jeden Spieler und jeden VS-Tag von Montag bis Samstag** aus `cc_metric_entries`. Der Sonntag zählt nicht zur VS-Wertung. Es werden **keine echten Last-War-Punkte gelöscht oder abgezogen**. Die negative Kennzeichnung ist eine strategische Eco-Abweichung und kein nachweisbarer Ressourcenverlust.

- **Eco:** Jeden Tag sind 7.200.000 VS-Punkte das Allianz-Ziel; jeder Punkt darüber wird als Eco-Überschuss (negativ) markiert. Unter dem Ziel bleibt neutral, gerade bei Zwischenständen.
- **Eco Plus:** Truhenziel zuerst; Tagesgewinn nur mit dem nötigen Zusatz. Überschüsse bleiben als prüfbedürftig markiert, jedoch ohne automatische negative Wertung, solange der tatsächliche nötige Gewinnwert unbekannt ist.
- **All In:** Keine Eco-Abweichung, maximale Punkte sind erlaubt.

Für die Woche ab **Montag, 16.11.2026** wurde `eco` mit Tagesziel `7200000` hinterlegt. Die Wochenstrategie gilt bis einschließlich Samstag, 21.11.2026. Das Frontend zeigt auch historische Wochen mit vorhandenen Werten an.

**Neue oder geänderte Wochenstrategie per SQL-Editor festlegen:**

```sql
INSERT INTO public.cc_vs_week_strategies (week_start, mode, daily_target_points, notes)
VALUES ('2026-11-23', 'eco_plus', 7200000, 'Gegen gegnerische VS-Punktzahl abgleichen')
ON CONFLICT (week_start) DO UPDATE
SET mode = EXCLUDED.mode,
    daily_target_points = EXCLUDED.daily_target_points,
    notes = EXCLUDED.notes,
    updated_at = now();
```

Erlaubt sind `eco`, `eco_plus` und `all_in`. Immer das **Montagsdatum** als `week_start` angeben. Fehlt für eine Woche ein Eintrag, zeigt die Seite *Strategie nicht festgelegt* und verzichtet auf eine negative Wertung.

Hinweis: 7,2 Millionen sind die allgemeine Schwelle für die neunte Tagestruhe, wenn die nötigen VS-Forschungen freigeschaltet sind. Neue Sonderbelohnungen (z. B. Infinite Roulette, je nach Serververfügbarkeit) und Punktgewinne ohne Ressourceneinsatz können den tatsächlichen Nutzen des Überschusses verändern. Deshalb ist die Kennzeichnung eine **bewusst festgelegte Allianzregel**, kein automatischer Nachweis für Verschwendung.

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
