# Platte 311

Hochpersonalisierte Trainings-App für Muskelaufbau — als **Muybridge-
Bewegungslabor**: jede Einheit ist eine „Studie", gespeichert eine „Platte"
mit laufender Nummer, jeder Satz ein „Kader", und ATLAS ist der
**Studienleiter**, der jede Studie frisch anordnet und live begleitet.
Ganzkörper-Fokus, 20–90 Minuten je nach Zeitfenster, mit besonderem
Augenmerk auf einen empfindlichen unteren Rücken.

## Wie die App funktioniert

**Heute (`/`)** — ATLAS ordnet jeden Tag eine neue Studie aus dem gesamten
Register an: bedarfsgerecht (Wochen-Volumen-Defizit + Tage seit letztem
Reiz je Muskel), abwechslungsreich (am längsten nicht verwendete Übung je
Muster) und passend zum Zeitbudget. Keine festen Pläne, keine Vorlagen. Die
Studie ist frei editierbar (tauschen, ergänzen, Sätze ändern, Wunsch-Feld
„heute bitte Oberkörper"), Varianten: Rücken-Reset (gewichtsfrei) und
„Die Prüfung" (Maximalkraft-Test). Der Karteikopf trägt Plattennummer und
Datum, das **Phasenband** zeigt die Studie als Filmstreifen.

**Fokus-Modus (`/workout`)** — läuft IMMER im dunklen „Atelier" (Theme-Lock):
Check-in (Tagesform) → Akt I „Kalibrierung der Apparatur" (geführtes
Aufwärmen) → eine Übung nach der anderen auf der Bühne (Zoetrop-Phasenfigur)
→ Auswertung. Sätze werden lokal gepuffert eingetragen (kein Re-Render pro
Tastendruck), die **Verschlusszeit** (Satzpause) läuft inline als fallende
Striche, und der Live-Zustand ist bei jedem Commit gerätelokal persistiert —
ein Reload oder Crash mitten im Satz kostet nichts (Resume). ATLAS reagiert
auf **jeden Kader**: sofort deterministisch, und mit Server-Key ersetzt die
KI-Reaktion die Zeile — mit Blick auf das komplette Studien-Transkript,
inklusive übernehmbarer Eingriffe (Gewicht, Verschlusszeit). Ein Maximum
endet auf der „Tafel des Maximums" samt teilbarem Cyanotypie-Poster.

**ATLAS (`/coach`)** — Missions-Status, Tages-Direktive, Wochen-Protokoll
(Folio; deterministisch sofort, ATLAS-Fassung gestreamt) und der Chat mit
persistiertem Verlauf — Antworten rendern als Studienprotokoll
(Beobachtung/Hypothese/Versuchsanordnung).

**Katalog (`/uebungen`)** — 114 Übungen als Register („Nr. 311-XX") mit
deutschem Voll-Content (Ausführung, Rücken-Hinweis, leichtere Variante,
Phasenfigur-Piktogramm), filterbar nach Muster, Muskel und vorhandenen
Geräten. Eigene Übungen sind erstklassig: voller Editor (Muskeln, Equipment,
Schema, Cues) — sie fließen automatisch in Pools, Wochenvolumen und ATLAS'
Auswahl.

**Fortschritt (`/fortschritt`)** — vier Register: Übersicht (Level, Phase,
Tafel des Maximums, Volumen je Woche, Übungs-Trends als Treppen-Charts),
Verlauf (Folio-Timeline für Kraft **und** Ausdauer inkl. Strava-Importe,
jede Platte mit Mini-Phasenband), Körper (Gewicht, Bauchumfang,
Vorher/Nachher-Platten) und Myologie (Muskel-Tafel in vier Blaustufen).

## Weitere Features

- **RIR-Autoregulation** — Gewichtsempfehlung aus Reps-in-Reserve; Tagesform
  (Check-in + Sprungtest) skaliert Last und Satzzahl.
- **Rücken-Intelligenz** — Ampel nach jeder Studie; „rot" erzwingt
  rückenschonende Auswahl, 2× rot → Arzt-Hinweis; Rücken-Reset-Studie.
- **Automatische Kalibrier-Sätze** (40 %/65 %) + geführtes Aufwärm-Programm.
- **Gym-Modus** — Sprach-Ansagen, Wake-Lock, Spotify-Now-Playing.
- **ATLAS-Server-API** (`/api/atlas/*`) — session (Komposition, Opus),
  set (Live-Reaktion, Sonnet), debrief, chat, briefing (Streams); gemeinsames
  gecachtes System-Präfix, strikte Tools, Server-Sanitizer, Rate-Limits.
- **Cloud-Sync** — optionaler Login (Supabase), localStorage bleibt die
  Wahrheit; der Live-Trainingszustand synct bewusst NICHT (gerätelokal).
- **Export/Import** als JSON („Archiv exportieren / Backup einspielen").

## Design

„Platte 311" — fotografisches Systemdesign: helles Albumin-Papier
(„Archiv") und Kollodium-Dunkelkammer („Atelier"), Siegellack-Akzent,
Cyanotypie und Messing, Old Standard TT (Kursive) + IBM Plex Mono (trägt
den Body), Radius 3/2/1 px, null Schatten, „Filmtransport"-Motion (harte
Rucks, Kreide-Blitz, Zoetrop mit 8 B/s). Das App-Icon ist die Marey-Spur:
die Referenzfigur dreimal überlagert, Kreide auf Kollodium. Beim Kaltstart
läuft eines von drei Startbildern („Belichtung", „Zoetrop", „Walze") — immer
im Atelier, abschaltbar unter Einstellungen · Aussehen. Verbindliche Tokens,
Rezepte und Verbote: `.claude/skills/ui-style/SKILL.md`.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS v3 ·
Framer Motion · @anthropic-ai/sdk. Persistenz über `localStorage`,
abstrahiert in `lib/storage.ts` (Supabase-Spiegel optional).

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # Produktions-Build
npm run smoke    # End-to-End-Smoke gegen den Build (ohne API-Key = Fallback-Pfade)
```

## Umgebungsvariablen

Siehe `.env.local.example`. Für ATLAS' KI wird `ANTHROPIC_API_KEY`
**serverseitig** benötigt (lokal in `.env.local`, in Produktion in den
Vercel-Projekt-Einstellungen). Der Schlüssel verlässt nie den Server. Ohne
Schlüssel läuft die App vollständig über die deterministischen Fallbacks
(Basis-Planer, Live-Zeilen, Debrief).

Für Cloud-Sync werden `NEXT_PUBLIC_SUPABASE_URL` und
`NEXT_PUBLIC_SUPABASE_ANON_KEY` gesetzt und die Migration
`supabase/migrations/0001_app_state.sql` ausgeführt (Tabelle `app_state` mit
Row-Level-Security pro Nutzer). Ohne Konfiguration bleiben die Daten lokal.

## Struktur

- `app/` — Seiten: Heute (`/`), Fokus-Modus (`/workout`), ATLAS (`/coach`),
  Katalog (`/uebungen`), Fortschritt, Einstellungen + `api/atlas/*`
- `components/session/` — der Fokus-Stepper (Runner, Bühne, Verschlusszeit,
  ATLAS-Panel, Übersicht, Auswertung)
- `components/phasen/` — Phasenfiguren (freeze/zoetrop/marey) + Myologie;
  `components/ui/Phasenband.tsx` — der Filmstreifen der Studie
- `components/` — Home-, Coach-, Fortschritts- und UI-Komponenten
- `lib/` — Session-Modell (`session-model`, `session-fallback`,
  `active-session`), ATLAS (`atlas/*`), Übungsregister, Progression (RIR),
  Volumen/Trainer-Engine, Platten-Nummern (`platte.ts`), Storage

Daten-Schlüssel: `wilhelm-training-{log,equip,custom,body,cardio,gyms,settings,
mission,jumps,today,chat}` (synct) und `wilhelm-training-active` (bewusst nur
lokal — der Live-Zustand einer laufenden Studie).
