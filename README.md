# Training

Hochpersonalisierte Trainings-App für Muskelaufbau — mit ATLAS, dem
KI-Trainer, der **jede Einheit frisch komponiert** und live durchs Training
coacht. Ganzkörper-Fokus, 20–90 Minuten je nach Zeitfenster, mit besonderem
Augenmerk auf einen empfindlichen unteren Rücken.

## Wie die App funktioniert

**Heute (`/`)** — ATLAS stellt jeden Tag eine neue Einheit aus dem gesamten
Katalog zusammen: bedarfsgerecht (Wochen-Volumen-Defizit + Tage seit letztem
Reiz je Muskel), abwechslungsreich (am längsten nicht verwendete Übung je
Muster) und passend zum Zeitbudget. Keine festen Pläne, keine Vorlagen. Die
Einheit ist frei editierbar (tauschen, ergänzen, Sätze ändern, Wunsch-Feld
„heute bitte Oberkörper"), Varianten: Rücken-Reset (gewichtsfrei) und
„Die Prüfung" (Maximalkraft-Test).

**Training (`/workout`)** — ein Fokus-Stepper: Check-in (Tagesform) →
geführtes Aufwärmen → eine Übung nach der anderen auf der Bühne → Abschluss.
Sätze werden lokal gepuffert eingetragen (kein Re-Render pro Tastendruck),
die Pause läuft inline statt als Overlay, und der Live-Zustand ist bei jedem
Commit gerätelokal persistiert — ein Reload oder Crash mitten im Satz kostet
nichts (Resume). ATLAS reagiert auf **jeden Satz**: sofort deterministisch,
und mit Server-Key ersetzt die KI-Reaktion die Zeile — mit Blick auf das
komplette Session-Transkript, inklusive übernehmbarer Eingriffe (Gewicht,
Pause).

**Coach (`/coach`)** — Missions-Status, Tages-Direktive, Wochen-Rapport
(deterministisch sofort, ATLAS-Fassung gestreamt) und der Chat mit
persistiertem Verlauf.

**Übungen (`/uebungen`)** — 114 Übungen mit deutschem Voll-Content
(Ausführung, Rücken-Hinweis, leichtere Variante, animierte Figur), filterbar
nach Muster, Muskel und vorhandenen Geräten. Eigene Übungen sind
erstklassig: voller Editor (Muskeln, Equipment, Schema, Cues) — sie fließen
automatisch in Pools, Wochenvolumen und ATLAS' Auswahl.

**Fortschritt (`/fortschritt`)** — drei Segmente: Übersicht (Level, Phase,
Rekorde, Muskel-Volumen & -Balance, Übungs-Trends), Verlauf (eine Timeline
für Kraft **und** Ausdauer inkl. Strava-Importe) und Körper (Gewicht,
Bauchumfang, Vorher/Nachher-Fotos).

## Weitere Features

- **RIR-Autoregulation** — Gewichtsempfehlung aus Reps-in-Reserve; Tagesform
  (Check-in + Sprungtest) skaliert Last und Satzzahl.
- **Rücken-Intelligenz** — Ampel nach jeder Einheit; „rot" erzwingt
  rückenschonende Auswahl, 2× rot → Arzt-Hinweis; Rücken-Reset-Einheit.
- **Automatische Aufwärmsätze** (40 %/65 %) + geführtes Aufwärm-Programm.
- **Gym-Modus** — Sprach-Ansagen, Wake-Lock, Spotify-Now-Playing.
- **ATLAS-Server-API** (`/api/atlas/*`) — session (Komposition, Opus),
  set (Live-Reaktion, Sonnet), debrief, chat, briefing (Streams); gemeinsames
  gecachtes System-Präfix, strikte Tools, Server-Sanitizer, Rate-Limits.
- **Cloud-Sync** — optionaler Login (Supabase), localStorage bleibt die
  Wahrheit; der Live-Trainingszustand synct bewusst NICHT (gerätelokal).
- **Export/Import** als JSON.

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

- `app/` — Seiten: Heute (`/`), Training (`/workout`), Coach, Übungen,
  Fortschritt, Einstellungen + `api/atlas/*`
- `components/session/` — der Fokus-Stepper (Runner, Bühne, Pause,
  ATLAS-Panel, Übersicht, Abschluss)
- `components/` — Home-, Coach-, Fortschritts-, Figuren- und UI-Komponenten
- `lib/` — Session-Modell (`session-model`, `session-fallback`,
  `active-session`), ATLAS (`atlas/*`), Übungskatalog, Progression (RIR),
  Volumen/Trainer-Engine, Storage

Daten-Schlüssel: `wilhelm-training-{log,equip,custom,body,cardio,gyms,settings,
mission,jumps,today,chat}` (synct) und `wilhelm-training-active` (bewusst nur
lokal — der Live-Zustand einer laufenden Einheit).
