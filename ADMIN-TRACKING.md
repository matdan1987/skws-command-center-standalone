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


## Wüstensturm: getrennte Teams A und B

Die bisherige unspezifische Kategorie storm_score wurde aus der öffentlichen Punktmeldung entfernt und ist **kein Ersatz** für echte Wüstensturm-Einsätze. Die getrennten Tabellen im unabhängigen SKWS-Supabase-Projekt sind:

- public.cc_desert_storm_matches: eine Begegnung pro Team A/B und Eventdatum, mit Gegner, eigener Startzeit, Ergebnis und Teampunkten
- public.cc_desert_storm_roster: tatsächliche Spieleraufstellungen und Ersatzbank je Begegnung, jeweils mit Teilnahme und individuellen Wüstensturm-Punkten
- public.cc_activity_rules: administrativ einstellbare Anforderungen und Gewichte der Gesamtstatistik

Die Daten sind öffentlich nur lesbar; nur der privilegierte Datenbankadministrator kann sie schreiben. Das System stellt **keine** Spielsynchronisation oder Mitgliedsverifikation bereit.

### Wüstensturm-Begegnung anlegen

Team A und Team B separat erfassen. Bei der Uhrzeit den tatsächlichen Server-Zeitzonenoffset angeben, wenn bekannt:

\`\`\`sql
INSERT INTO public.cc_desert_storm_matches (event_date,team,starts_at,opponent,result,notes)
VALUES ('2026-11-20','A',NULL,'','pending','')
ON CONFLICT(event_date,team) DO NOTHING;
\`\`\`

Für B den Teamcode B verwenden. Bei unbekanntem Termin oder Gegner NULL bzw. leer lassen, keine Uhrzeit erfinden. Wenn das Match stattgefunden hat:

\`\`\`sql
UPDATE public.cc_desert_storm_matches
SET result='win', own_points=12345, enemy_points=10000, updated_at=now()
WHERE event_date='2026-11-20' AND team='A';
\`\`\`

**Zahlen oben sind ausschließlich technische Beispieldaten**, keine Spielergebnisse; unbedingt mit den tatsächlich dokumentierten Werten ersetzen.

### Stammspieler, Ersatz, Anwesenheit

\`\`\`sql
INSERT INTO public.cc_desert_storm_roster (match_id,member_name,slot,attendance)
SELECT id,'SPIELERNAME','starter','unknown'
FROM public.cc_desert_storm_matches
WHERE event_date='2026-11-20' AND team='A'
ON CONFLICT(match_id,member_name) DO NOTHING;
\`\`\`

Slot = starter (max. 20) oder substitute (max. 10). Das Datenbank-Trigger prüft die Plätze und verhindert, dass ein Spieler am gleichen Tag Team A und B gleichzeitig belegt. Eine reine Aufstellung beweist noch keine Anwesenheit. Anwesenheit separat prüfen: unknown, present, absent oder not_called. Nicht eingewechselte Ersatzspieler müssen not_called heißen und werden **nicht** als Fehlteilnahme bewertet. Ein bestätigtes Fernbleiben wird nur bei Stammspielern negativ berücksichtigt.

Punkte nach geprüftem Gefecht eintragen:

\`\`\`sql
UPDATE public.cc_desert_storm_roster
SET attendance='present', individual_points=10000, updated_at=now()
WHERE member_name='SPIELERNAME' AND match_id=(
 SELECT id FROM public.cc_desert_storm_matches
 WHERE event_date='2026-11-20' AND team='A'
);
\`\`\`

Auch hier sind Werte nur Platzhalter; eine unbekannte Punktzahl bleibt NULL. 0 Punkte bedeutet **bekannt und bestätigt null**, nicht unbekannt.

### Gesamtstatistik: Mindestanforderungen und Gewichtung

Die neue Ansicht Gesamtstatistik berücksichtigt individuell dokumentierte VS-Tageswerte, Allianzspenden, echte Wüstensturm-Teilnahme **und die dokumentierte T1-Kampfkraft**. Für eine belastbare Highlight-/Lowlight-Einordnung sind Daten aus **mindestens zwei Aktivitätsbereichen (VS, Spenden, Wüstensturm)** erforderlich und mindestens 3 abgeschlossene VS- oder Spendentage (einstellbar). Fehlende Meldungen sind **keine** Nullwerte. Nicht nominierte Spieler erhalten keinen Wüstensturm-Abzug.

Startwerte, ausdrücklich **nicht von der Allianzleitung bestätigte Pflichten**:

- VS: Tagesziel laut konfigurierter Eco-/Eco-Plus-/All-In-Woche, standardmäßig 7,2 Mio.
- Spenden: 5.000 Punkte pro erfasstem Tag als veränderbarer Vorschlagswert
- Wüstensturm: Teilnahme zählt mit; 10.000 individuelle Punkte sind eine anpassbare Vergleichsmarke **nur nach verifizierter Teilnahme**
- Gewichtung: VS 40 %, Spenden 25 %, Wüstensturm 20 %, **T1-Kampfkraft 15 %**; nur Kategorien mit tatsächlich vorhandenen Daten werden in den Index eingerechnet
- Kampfkraft: Aktuell gemeldeter T1-Wert in Millionen im Verhältnis zum 90. Perzentil der bekannten SKWS-T1-Werte. Maximal 100 Punkte für die Teilkategorie. T2 bis T4 werden als zusätzlicher Überblick gezeigt, fließen nicht in die Gewichtung ein.
- Historische Auswertungen: Kein rückwirkender T1-Kraftindex für vergangene Wochen, weil bisher keine datierten Kampfkraft-Snapshots archiviert sind. Angezeigte Kampfkraft ist die aktuell gemeldete, nicht die historische Stärke.
- Highlights: Index ab 85, Lowlights: bis 55, **nur** bei ausreichender geprüfter Datengrundlage
- Zwischenstände: nur unverbindliche Trends, Eco-Abweichungen und Prüfhinweise; keine endgültigen Lowlights

Mindestanforderungen können nach interner SKWS-Entscheidung so geändert werden:

\`\`\`sql
UPDATE public.cc_activity_rules
SET min_daily_donations=5000,
    min_storm_individual_points=10000,
    min_final_vs_days=3,
    min_final_donation_days=3,
    weight_vs=40,
    weight_donations=25,
    weight_storm=20,
    weight_power=15,
    highlight_score=85,
    lowlight_score=55,
    updated_at=now()
WHERE id=1;
\`\`\`

Summe der vier Gewichte muss 100 sein. Ein fehlender T1-Meldewert wird **nicht mit null** bewertet. Der Wert allein zählt nicht als Aktivitätsnachweis. Wenn in der laufenden Woche die T1-Meldung fehlt, bleibt die endgültige Highlight-/Lowlight-Einordnung ausgesetzt, statt einen ohne Kampfkraftdaten künstlich erhöhten Index zu vergeben. Eine Änderung wirkt sich auf die aktuelle Anzeige aus, ohne die Originalmeldungen zu verändern. Die Gesamtstatistik ist **keine automatische Strafe**, sondern ein transparentes Instrument für Mentoren und R4/R5.


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
