# Platte 311

Hochpersonalisierte Trainings-App für Muskelaufbau mit **ATLAS**, dem
KI-Coach, der jede Einheit frisch zusammenstellt und live durchs Training
begleitet. Das Aussehen zitiert Muybridges Chronofotografie — daher der Name;
die Bedienung spricht schlichtes Deutsch. Ganzkörper-Fokus, 20–90 Minuten je
nach Zeitfenster, mit besonderem Augenmerk auf einen empfindlichen unteren
Rücken.

## Wie die App funktioniert

**Heute (`/`)** — ATLAS stellt jeden Tag eine neue Einheit aus dem gesamten
Katalog zusammen: bedarfsgerecht (Wochen-Volumen-Defizit + Tage seit letztem
Reiz je Muskel), abwechslungsreich (am längsten nicht verwendete Übung je
Muster) und passend zum Zeitbudget. Keine festen Pläne, keine Vorlagen. Die
Einheit ist frei editierbar (tauschen, ergänzen, Sätze ändern, Wunsch-Feld
„heute bitte Oberkörper"), Varianten: Rücken-Reset (gewichtsfrei) und
„Die Prüfung" (Maximalkraft-Test). Der Kopf trägt Nummer und Datum, das
**Phasenband** zeigt die Einheit als Filmstreifen.

**Training (`/workout`)** — läuft IMMER dunkel (Theme-Lock): Check-in
(Tagesform) → geführtes Aufwärmen → eine Übung nach der anderen (mit
animierter Phasenfigur) → Abschluss. Sätze werden lokal gepuffert eingetragen
(kein Re-Render pro Tastendruck), die Satzpause läuft inline als fallende
Striche, und der Live-Zustand ist bei jedem Commit gerätelokal persistiert —
ein Reload oder Crash mitten im Satz kostet nichts (Resume). ATLAS reagiert
auf **jeden Satz**: sofort deterministisch, und mit Server-Key ersetzt die
KI-Reaktion die Zeile — mit Blick auf das komplette Transkript der Einheit,
inklusive übernehmbarer Eingriffe (Gewicht, Pause). Ein neuer Rekord bekommt
seinen eigenen Moment samt teilbarem Poster.

**ATLAS (`/coach`)** — Missions-Status, Tages-Direktive, Wochen-Rückblick
(deterministisch sofort, ATLAS-Fassung gestreamt) und der Chat mit
persistiertem Verlauf — Antworten rendern strukturiert
(Beobachtung/Einschätzung/Plan).

**Katalog (`/uebungen`)** — 114 Übungen mit deutschem Voll-Content (Ausführung, Rücken-Hinweis, leichtere Variante,
Phasenfigur-Piktogramm), filterbar nach Muster, Muskel und vorhandenen
Geräten. Eigene Übungen sind erstklassig: voller Editor (Muskeln, Equipment,
Schema, Cues) — sie fließen automatisch in Pools, Wochenvolumen und ATLAS'
Auswahl.

**Fortschritt (`/fortschritt`)** — vier Register: Übersicht (Level, Phase,
Rekorde, Volumen je Woche, Übungs-Trends als Treppen-Charts), Verlauf
(Timeline für Kraft **und** Ausdauer inkl. Strava-Importe, jede Einheit mit
Mini-Phasenband), Körper (Gewicht, Bauchumfang, Vorher/Nachher-Fotos) und
Muskeln (Wochenarbeit in vier Blaustufen).

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

## Design

„Platte 311" — fotografisches Systemdesign: helles Albumin-Papier
(„Archiv") und Kollodium-Dunkelkammer („Atelier"), Siegellack-Akzent,
Cyanotypie und Messing, Old Standard TT (Kursive) + IBM Plex Mono (trägt
den Body), Radius 3/2/1 px, null Schatten, „Filmtransport"-Motion (harte
Rucks, Kreide-Blitz, Zoetrop mit 8 B/s). Das App-Icon ist die Marey-Spur:
die Referenzfigur dreimal überlagert, Kreide auf Kollodium. Beim Kaltstart
läuft ein Startbild (Vorgabe „311", dazu zwei Alternativen) — immer dunkel,
abschaltbar unter Einstellungen · Darstellung. **Die Metapher steckt im
Aussehen, nicht in den Wörtern:** die Bedienung sagt Einheit, Satz, Pause,
Rekord. Verbindliche Tokens, Rezepte und Verbote:
`.claude/skills/ui-style/SKILL.md`.

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
`NEXT_PUBLIC_SUPABASE_ANON_KEY` gesetzt und das SQL aus
[`supabase/SETUP.md`](supabase/SETUP.md) eingespielt (Tabelle `app_state` mit
Row-Level-Security pro Nutzer, privater Bucket für die Fortschrittsfotos).
Ohne Konfiguration bleiben die Daten lokal.

### Anmeldung ohne Mail-Limit

Der **eingebaute Supabase-Mailer hat eine harte Stundenrate** (eine Handvoll
Mails, projektweit). Das ist eine Projekt-Einstellung, keine Code-Frage — im
Repo lässt sie sich nicht ändern. Die App umgeht sie deshalb: Anmelden **und**
Kontoanlegen laufen über E-Mail + Passwort und brauchen gar keine Mail. Der
Magic-Link bleibt nur als Notausgang.

Damit das Anlegen wirklich mailfrei durchläuft, müssen im Supabase-Projekt zwei
Auth-Schalter stehen. Die Befehle dafür — und das SQL für Tabelle und
Foto-Bucket — stehen zum Kopieren in **[`supabase/SETUP.md`](supabase/SETUP.md)**.

## Struktur

- `app/` — Seiten: Heute (`/`), Training (`/workout`), ATLAS (`/coach`),
  Katalog (`/uebungen`), Fortschritt, Einstellungen + `api/atlas/*`
- `components/session/` — der Fokus-Stepper (Runner, Übungsansicht, Pause,
  ATLAS-Panel, Übersicht, Abschluss)
- `components/phasen/` — Phasenfiguren (freeze/zoetrop/marey) + Myologie;
  `components/ui/Phasenband.tsx` — der Filmstreifen der Einheit
- `components/` — Home-, Coach-, Fortschritts- und UI-Komponenten
- `lib/` — Session-Modell (`session-model`, `session-fallback`,
  `active-session`), ATLAS (`atlas/*`), Übungskatalog, Progression (RIR),
  Volumen/Trainer-Engine, Einheiten-Nummern (`platte.ts`), Storage

Daten-Schlüssel: `wilhelm-training-{log,equip,custom,body,cardio,gyms,settings,
mission,jumps,today,chat}` (synct) und `wilhelm-training-active` (bewusst nur
lokal — der Live-Zustand einer laufenden Einheit).
