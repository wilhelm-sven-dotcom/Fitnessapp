# Training

Hochpersonalisierte Trainings-App für Muskelaufbau — 3× pro Woche Ganzkörper
(A/B/C), 20–30 Minuten pro Einheit, mit besonderem Augenmerk auf einen
empfindlichen unteren Rücken.

## Features

- **RIR-Autoregulation** — Gewicht steigt/sinkt anhand der Reps-in-Reserve pro
  Satz (alle Sätze RIR 0–1 → +2,5 kg; RIR 2 → +1 Wdh; RIR ≥3 → eine Stufe runter).
- **Rücken-Intelligenz** — Ampel nach jeder Einheit; rot priorisiert beim
  nächsten Mal Rücken-Stabis und ersetzt schwere Hinges. 2× rot → Arzt-Hinweis.
- **Automatische Aufwärmsätze** (40 % / 65 %), aus der Progression ausgeschlossen.
- **Coaching-Hinweise**, Wochen-Streak, Notizen, Körperdaten-Kurven.
- **Animierte Übungsfiguren** (grüne Linie = Wirbelsäule) für alle 32 Übungen.
- **Gym-Modus (hands-free)** — Sprach-Ansagen für die Satzpause und neue
  Rekorde, Sätze per Stimme eintragen, Hantel-Hinweis, Supersätze.
- **KI-Coach** — Chat und Wochen-Recap auf Basis deiner echten Trainingsdaten
  (Claude, serverseitig; siehe Umgebungsvariablen).
- **Export/Import** als JSON.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS v3 ·
Framer Motion. Persistenz über `localStorage`, abstrahiert in `lib/storage.ts`
(Supabase-Naht vorbereitet: ein Adapter-Tausch genügt).

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # Produktions-Build
```

## Umgebungsvariablen

Siehe `.env.local.example`. Für den KI-Coach wird `ANTHROPIC_API_KEY`
**serverseitig** benötigt (lokal in `.env.local`, in Produktion in den Vercel-
Projekt-Einstellungen). Der Schlüssel verlässt nie den Server. Ohne Schlüssel
zeigt der Coach „noch nicht eingerichtet" — der Rest der App funktioniert normal.

## Struktur

- `app/` — Seiten: Start (`/`), Einheit (`/workout/[key]`), Fortschritt,
  Verlauf, Programm/Einstellungen
- `components/` — Workout-, Fortschritts-, Figuren- und UI-Komponenten
- `lib/` — Typen, Übungsdaten, Progression (RIR), Coaching, Stats, Storage

Daten bleiben auf dem Gerät. Schlüssel: `wilhelm-training-{log,equip,choices,custom,body}`.
