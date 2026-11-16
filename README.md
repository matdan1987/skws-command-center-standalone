# SKWS Command Center · Standalone

Ein **vollständig eigenständiges** Projekt für SKWS / Skywalkers auf Last War Server 1858.

## Aktueller Stand

- Öffentliche GitHub-Pages-Demo mit responsivem Dark-Theme
- Fiktive Mitglieder und Mentorengruppen 1 bis 5
- T1-Truppentyp und Kampfkraft als Pflichtfelder, T2 bis T4 optional
- Mitgliederübersicht, Suche, Gruppenfilter, Meldestatus
- Auswertung und lokales Änderungsjournal
- CSV- und JSON-Export sowie JSON-Import
- Daten verbleiben ausschließlich im jeweiligen Browser (localStorage)

**Noch nicht enthalten:** Gemeinsame persistente Datenbank, sichere Spieleranmeldung, automatische E-Mail-Erinnerungen, echte Mitglieder. Eine statische GitHub-Pages-Seite allein kann keine gemeinsame Datenhaltung gewährleisten.

## Schutz des produktiven SKWS Squads Systems

Dies ist ein **neues GitHub-Repository**, kein Fork und keine Kopie der Produktivbereitstellung. Die Anwendung nutzt **keine** vorhandenen Produktions-URLs, Supabase-Referenzen, API-Schlüssel, Secrets oder produktiven Google-Tabellen. Änderungen in dieser Demo können das bestehende SKWS Squads Script technisch nicht beeinflussen.

Für den produktiven, unabhängigen Ausbau ist **ein komplett neues Supabase-Projekt** mit getrennter Authentifizierung und Datenbank notwendig. Das bestehende Supabase-Projekt und Repository dürfen niemals zur Laufzeit angebunden oder modifiziert werden.

## Weiterentwicklung

1. Neues, unabhängiges Backend-Projekt und Zugriffsregeln planen.
2. Sicherheit gegen unberechtigte Änderungen implementieren, Spieleridentitäten verifizieren.
3. Optional eine ausdrücklich freigegebene *Kopie* der Mitgliederliste übernehmen; nie schreibend aufs Live-System zugreifen.
4. Wöchentliche Erinnerung erst nach Double-Opt-in mit Abmeldemöglichkeit einrichten.
5. End-to-End-Test mit Testspielern vor Nutzung in der Allianz.

## Entwicklung

Ohne Framework oder Build-Prozess. Bearbeite index.html, styles.css, app.js. GitHub Pages veröffentlicht den Stand des Repositorys. SQL- oder Service-Schlüssel gehören niemals ins öffentliche Repo.

© Eigenständige Demo, nicht offiziell mit Last War verbunden.
